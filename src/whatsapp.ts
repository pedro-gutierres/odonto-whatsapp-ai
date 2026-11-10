// Tudo que fala com o WhatsApp (Meta): validar quem mandou, ler o que chegou, enviar resposta.
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

// Transforma o JSON complicado da Meta numa lista simples de mensagens.
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
        jobs.push({
          phoneNumberId,
          from: m.from,
          contactName: contact?.profile?.name,
          waMessageId: m.id,
          type: m.type,
          text: m.type === "text" ? (m.text?.body ?? null) : null,
        });
      }
    }
  }
  return jobs;
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
