// Tudo que fala com o WhatsApp (Meta): validar quem mandou, ler o que chegou, baixar mídias e enviar resposta.
import type { Env, InboundJob } from "./types";

// A Meta assina cada mensagem com o "app secret". Se a assinatura não bater,
// alguém está fingindo ser a Meta e a requisição é descartada.
export async function verifySignature(
  raw: ArrayBuffer,
  header: string | null,
  secrets: string,
): Promise<boolean> {
  if (!header || !header.startsWith("sha256=")) return false;
  const hex = header.slice(7);
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return false;
  const sig = new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

  for (const secret of (secrets ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    // crypto.subtle.verify compara em tempo constante
    if (await crypto.subtle.verify("HMAC", key, sig, raw)) return true;
  }
  return false;
}

// Transforma o JSON da Meta numa lista simples de mensagens (texto, áudio ou imagem).
// Avisos de "entregue/lido" (statuses) são ignorados aqui de propósito.
export function extractJobs(payload: any): InboundJob[] {
  const jobs: InboundJob[] = [];
  if (payload?.object !== "whatsapp_business_account") return jobs;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const m of value.messages ?? []) {
        const contact = (value.contacts ?? []).find((c: any) => c.wa_id === m.from);
        let text: string | null = null;
        let mediaId: string | undefined;
        let mimeType: string | undefined;

        if (m.type === "text") {
          text = m.text?.body ?? null;
        } else if (m.type === "audio" || m.type === "voice") {
          const audioObj = m.audio ?? m.voice;
          mediaId = audioObj?.id;
          mimeType = audioObj?.mime_type;
        } else if (m.type === "image") {
          mediaId = m.image?.id;
          mimeType = m.image?.mime_type;
          text = m.image?.caption ?? null;
        }

        jobs.push({
          phoneNumberId,
          from: m.from,
          contactName: contact?.profile?.name,
          waMessageId: m.id,
          type: m.type,
          text,
          ...(mediaId ? { mediaId } : {}),
          ...(mimeType ? { mimeType } : {}),
        });
      }
    }
  }
  return jobs;
}

export interface DownloadedWhatsAppMedia {
  bytes: ArrayBuffer;
  mimeType: string;
}

// Baixa mídia recebida via WhatsApp Cloud API (1: consulta URL temporária, 2: baixa bytes com Bearer token).
export async function downloadWhatsAppMedia(
  env: Env,
  token: string,
  mediaId: string,
  maxBytes = 10 * 1024 * 1024,
): Promise<DownloadedWhatsAppMedia> {
  const metaRes = await fetch(`https://graph.facebook.com/${env.GRAPH_VERSION}/${encodeURIComponent(mediaId)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    throw new Error(`Meta media lookup ${metaRes.status}: ${(await metaRes.text()).slice(0, 300)}`);
  }

  const meta = (await metaRes.json()) as { url?: string; mime_type?: string; file_size?: number };
  if (!meta.url) {
    throw new Error("Meta media lookup não retornou URL temporária.");
  }
  if (typeof meta.file_size === "number" && meta.file_size > maxBytes) {
    throw new Error(`Arquivo de mídia excede o limite (${meta.file_size} bytes).`);
  }

  const binRes = await fetch(meta.url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!binRes.ok) {
    throw new Error(`Meta media download ${binRes.status}`);
  }

  const bytes = await binRes.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    throw new Error(`Arquivo de mídia excede o limite (${bytes.byteLength} bytes).`);
  }

  return {
    bytes,
    mimeType: meta.mime_type || binRes.headers.get("content-type") || "application/octet-stream",
  };
}

// Converte ArrayBuffer para Base64 em blocos para evitar estouro de pilha em arquivos grandes.
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join(""));
}

// Envia uma mensagem de texto pelo número da clínica.
export async function sendText(
  env: Env,
  phoneNumberId: string,
  token: string,
  to: string,
  body: string,
): Promise<string | null> {
  const res = await fetch(`https://graph.facebook.com/${env.GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const data = (await res.json()) as { messages?: { id: string }[] };
  return data.messages?.[0]?.id ?? null;
}
