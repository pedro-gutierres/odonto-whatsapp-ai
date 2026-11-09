// Tipos compartilhados. Descrevem "que formato têm os dados" em cada parte do sistema.

export interface Env {
  // Recursos da Cloudflare (ligados em wrangler.jsonc)
  DB: D1Database;
  INBOX: Queue<InboundJob>;

  // Segredos (guardados na Cloudflare, nunca no código)
  META_APP_SECRETS: string; // um ou mais "app secrets" da Meta, separados por vírgula
  WA_VERIFY_TOKEN: string;  // frase que você inventa; a Meta devolve na verificação do webhook
  ANTHROPIC_API_KEY: string;
  WA_LAB_TOKEN: string;     // token da Meta usado só na fase de laboratório
  AUTH_SECRET?: string;     // segredo HMAC para sessões (opcional, fallback interno)

  // Variáveis comuns (wrangler.jsonc)
  GRAPH_VERSION: string;
  CLAUDE_MODEL: string;
  CLAUDE_EFFORT: string;
}

// Uma mensagem recebida do paciente, já "limpa", que viaja pela fila.
export interface InboundJob {
  phoneNumberId: string; // número da clínica que recebeu (chave de roteamento)
  from: string;          // número do paciente
  contactName?: string;
  waMessageId: string;
  type: string;          // "text", "image", "audio"...
  text: string | null;   // só preenchido quando type === "text"
}

export interface Tenant {
  id: string;
  name: string;
  phone_number_id: string;
  waba_id: string | null;
  access_token_enc: string | null;
  bot_config: string; // JSON em texto; veja BotConfig
  active: number;
}

export interface CustomProcedure {
  name: string;
  category?: string;
  duration?: string;
  note?: string;
}

// O que cada clínica configura (fica em tenants.bot_config)
export interface BotConfig {
  clinic_name: string;
  doctor_name?: string;
  doctor_cro?: string;
  specialties?: string[];
  tone?: "acolhedor" | "sofisticado" | "clinico" | string;
  procedures?: string[];
  custom_procedures?: CustomProcedure[];
  price_strategy?: "avaliacao" | "a_partir_de" | "tabela_fixa" | string;
  prices_note?: string;
  payment_methods?: string;
  insurance?: string;
  address?: string;
  parking?: string;
  hours?: string;
  delay_tolerance?: string;
  emergency_contact?: string;
  clinical_rules?: string;
  extra?: string; // qualquer regra específica da clínica
}

export interface ConversationSummary {
  contact_wa_id: string;
  contact_name: string;
  last_body: string | null;
  last_direction: "in" | "out";
  last_status: string;
  last_created_at: string;
  ai_paused: number;
  message_count: number;
}

export interface ConversationMessage {
  id: number;
  tenant_id: string;
  contact_wa_id: string;
  contact_name: string | null;
  direction: "in" | "out";
  body: string | null;
  status: string;
  created_at: string;
}
