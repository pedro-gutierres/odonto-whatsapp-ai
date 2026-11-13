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

type VisionMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
interface TextBlock {
  type: "text";
  text: string;
}
interface ImageBlock {
  type: "image";
  source: { type: "base64"; media_type: VisionMime; data: string };
}
type ClaudeMessage = { role: ChatTurn["role"]; content: string | (TextBlock | ImageBlock)[] };

interface TokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}
interface ClaudeResponse {
  content?: TextBlock[];
  stop_reason?: string;
  usage?: TokenUsage;
}
interface ClaudeOptions {
  apiKey: string;
  model: string;
  effort: string;
  apiVersion: string;
  channel: "whatsapp" | "support" | "simulation";
  signal: AbortSignal;
}

const SUPPORT_API_VERSION = "2026-10-21";

export class ClaudeRequestError extends Error {
  constructor(readonly code: string, readonly status?: number, readonly requestId?: string) {
    super(code);
    this.name = "ClaudeRequestError";
  }
}

function normalizeVisionMime(mimeType: string): VisionMime | null {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  if (base === "image/jpg" || base === "image/jpeg") return "image/jpeg";
  if (base === "image/png" || base === "image/gif" || base === "image/webp") return base;
  return null;
}

async function createMessage(
  options: ClaudeOptions,
  system: string | SystemPromptParts,
  messages: ClaudeMessage[],
): Promise<ClaudeResponse> {
  const stable = typeof system === "string" ? system : system.staticPrompt;
  const dynamic = typeof system === "string" ? "" : system.dynamicContext;
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: options.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": options.apiKey,
        "anthropic-version": options.apiVersion,
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: 2000,
        system: [
          { type: "text", text: stable, cache_control: { type: "ephemeral" } },
          ...(dynamic.trim() ? [{ type: "text", text: dynamic }] : []),
        ],
        messages,
        output_config: { effort: options.effort },
      }),
    });
  } catch {
    throw new ClaudeRequestError(options.signal.aborted ? "CLAUDE_TIMEOUT" : "CLAUDE_NETWORK_ERROR");
  }
  const header = response.headers.get("request-id") || "";
  const requestId = /^req_[A-Za-z0-9]{1,100}$/.test(header) ? header : undefined;
  if (!response.ok) {
    console.warn("[CLAUDE_ERROR]", JSON.stringify({
      channel: options.channel, status: response.status, requestId, elapsedMs: Date.now() - startedAt,
    }));
    throw new ClaudeRequestError("CLAUDE_HTTP_ERROR", response.status, requestId);
  }
  const data = await response.json().catch(() => null) as ClaudeResponse | null;
  if (!Array.isArray(data?.content)) throw new ClaudeRequestError("CLAUDE_INVALID_RESPONSE", response.status, requestId);
  const usage = data.usage;
  if (usage) {
    console.log("[CLAUDE_USAGE]", JSON.stringify({
      channel: options.channel, requestId, elapsedMs: Date.now() - startedAt,
      input: usage.input_tokens ?? 0, output: usage.output_tokens ?? 0,
      cacheWrite: usage.cache_creation_input_tokens ?? 0, cacheRead: usage.cache_read_input_tokens ?? 0,
    }));
  }
  return data;
}

function getTextBlocks(content: TextBlock[]): TextBlock[] {
  return content.filter((block): block is TextBlock => block?.type === "text" && typeof block.text === "string");
}

// Mantém o fluxo de texto e visão que processa as mensagens reais do WhatsApp.
export async function askClaude(
  env: Env,
  system: string | SystemPromptParts,
  history: ChatTurn[],
  latestImage?: ImageAttachment | null,
): Promise<string | null> {
  const messages: ClaudeMessage[] = [...history];
  const latest = history.at(-1);
  const mime = latestImage ? normalizeVisionMime(latestImage.mimeType) : null;
  if (latest?.role === "user" && latestImage && mime) {
    messages[messages.length - 1] = {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mime, data: latestImage.base64Data } },
        { type: "text", text: latest.content || "O paciente enviou esta imagem." },
      ],
    };
  }
  const result = await createMessage({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.CLAUDE_MODEL,
    effort: env.CLAUDE_EFFORT,
    apiVersion: "2023-06-01",
    channel: "whatsapp",
    signal: AbortSignal.timeout(25_000),
  }, system, messages);
  return getTextBlocks(result.content ?? []).map(block => block.text).join("").trim() || null;
}

export async function askSupportClaude(
  env: Env,
  channel: "support" | "simulation",
  system: string | SystemPromptParts,
  history: ChatTurn[],
): Promise<string> {
  if (!env.ANTHROPIC_SUPPORT_API_KEY?.trim()) throw new ClaudeRequestError("CLAUDE_SUPPORT_NOT_CONFIGURED");
  const options: ClaudeOptions = {
    apiKey: env.ANTHROPIC_SUPPORT_API_KEY.trim(),
    model: channel === "simulation"
      ? env.SUPPORT_SIMULATION_MODEL?.trim() || env.CLAUDE_MODEL || "claude-haiku-5-5"
      : env.SUPPORT_CLAUDE_MODEL?.trim() || "claude-sonnet-5-5",
    effort: channel === "simulation" ? env.CLAUDE_EFFORT || "low" : "medium",
    apiVersion: SUPPORT_API_VERSION,
    signal: AbortSignal.timeout(25_000),
    channel,
  };
  const result = await createMessage(options, system, history);
  if (result.stop_reason && result.stop_reason !== "end_turn" && result.stop_reason !== "stop_sequence") {
    throw new ClaudeRequestError("CLAUDE_UNFINISHED_RESPONSE");
  }
  const text = getTextBlocks(result.content ?? []).map(block => block.text).join("").trim();
  if (!text) throw new ClaudeRequestError("CLAUDE_EMPTY_RESPONSE");
  return text;
}
