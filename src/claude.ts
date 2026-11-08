// Tudo que fala com a Anthropic (Claude).
import type { Env } from "./types";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// Devolve o texto da resposta, ou null se o Claude não devolveu texto
// (por exemplo, uma recusa). Nesse caso quem chama usa uma resposta padrão.
export async function askClaude(env: Env, system: string, history: ChatTurn[]): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL,
      // O "pensar" do modelo também conta nesse limite, por isso a folga.
      max_tokens: 2000,
      system,
      messages: history,
      // "low" = respostas mais rápidas e baratas, bom para atendimento simples.
      output_config: { effort: env.CLAUDE_EFFORT },
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 500)}`);

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  return text || null;
}
