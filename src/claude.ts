// Tudo que fala com a Anthropic (Claude), com suporte a Prompt Caching e Visão (imagens).
import type { Env } from "./types";
import type { SystemPromptParts } from "./prompt";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ImageAttachment {
  mimeType: string;
  base64Data: string;
}

type SupportedVisionMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function normalizeVisionMime(mimeType: string): SupportedVisionMime | null {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  if (base === "image/jpg" || base === "image/jpeg") return "image/jpeg";
  if (base === "image/png") return "image/png";
  if (base === "image/gif") return "image/gif";
  if (base === "image/webp") return "image/webp";
  return null;
}

// Devolve o texto da resposta, ou null se o Claude não devolveu texto.
export async function askClaude(
  env: Env,
  system: string | SystemPromptParts,
  history: ChatTurn[],
  latestImage?: ImageAttachment | null,
): Promise<string | null> {
  const systemPayload =
    typeof system === "string"
      ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
      : [
          { type: "text", text: system.staticPrompt, cache_control: { type: "ephemeral" } },
          ...(system.dynamicContext?.trim() ? [{ type: "text", text: system.dynamicContext }] : []),
        ];

  const visionMime = latestImage ? normalizeVisionMime(latestImage.mimeType) : null;
  const messagesPayload = history.map((turn, idx) => {
    const isLastUserTurn = idx === history.length - 1 && turn.role === "user";
    if (isLastUserTurn && latestImage && visionMime) {
      return {
        role: "user" as const,
        content: [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: visionMime,
              data: latestImage.base64Data,
            },
          },
          {
            type: "text" as const,
            text: turn.content || "O paciente enviou esta imagem.",
          },
        ],
      };
    }
    return { role: turn.role, content: turn.content };
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL,
      max_tokens: 2000,
      system: systemPayload,
      messages: messagesPayload,
      output_config: { effort: env.CLAUDE_EFFORT },
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 500)}`);

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };

  if (data.usage) {
    console.log(
      `[CLAUDE_USAGE] in=${data.usage.input_tokens ?? 0} cache_write=${data.usage.cache_creation_input_tokens ?? 0} cache_read=${data.usage.cache_read_input_tokens ?? 0} out=${data.usage.output_tokens ?? 0}`,
    );
  }

  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  return text || null;
}
