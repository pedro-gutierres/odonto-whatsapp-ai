// Tipos compartilhados. Descrevem "que formato têm os dados" em cada parte do sistema.

export interface Env {
  // Recursos da Cloudflare (ligados em wrangler.jsonc)
  DB: D1Database;
  INBOX: Queue<InboundJob>;
  MEDIA_BUCKET?: R2Bucket;
  AI?: Ai;

  // Segredos (guardados na Cloudflare, nunca no código)
  META_APP_SECRETS: string; // um ou mais "app secrets" da Meta, separados por vírgula
  WA_VERIFY_TOKEN: string;  // frase que você inventa; a Meta devolve na verificação do webhook
  ANTHROPIC_API_KEY: string;
  WA_LAB_TOKEN?: string;    // token fallback / laboratório da Meta (quando a clínica não tem access_token_enc)
  AUTH_SECRET?: string;     // segredo HMAC para sessões (configure via wrangler secret put AUTH_SECRET)
  TOKEN_ENCRYPTION_KEY?: string; // chave opcional para criptografia AES-GCM de tokens por clínica (fallback: AUTH_SECRET)

  // Variáveis comuns (wrangler.jsonc)
  GRAPH_VERSION: string;
  CLAUDE_MODEL: string;
  CLAUDE_EFFORT: string;
  SUPERADMIN_EMAILS?: string; // lista separada por vírgula de e-mails autorizados no /admin
}

// Uma mensagem recebida do paciente, já "limpa", que viaja pela fila.
export interface InboundJob {
  phoneNumberId: string; // número da clínica que recebeu (chave de roteamento)
  from: string;          // número do paciente
  contactName?: string;
  waMessageId: string;
  type: string;          // "text", "image", "audio", "voice"...
  text: string | null;   // texto ou legenda da imagem
  mediaId?: string;      // ID da mídia na Meta Cloud API (para baixar áudio/imagem)
  mimeType?: string;     // mime type informado no webhook
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

export interface ProcedureItem {
  name: string;
  checked: boolean;
  duration?: string;
  price?: string;
  note?: string;
  category?: string;
}

export interface CustomProcedure {
  name: string;
  category?: string;
  duration?: string;
  price?: string;
  note?: string;
}

export interface InitialConsultationConfig {
  duration?: string;
  price?: string;
  details?: string;
}

// O que cada clínica configura (fica em tenants.bot_config)
export interface BotConfig {
  clinic_name: string;
  doctor_name?: string;
  doctor_cro?: string;
  specialties?: string[];
  tone?: "acolhedor" | "sofisticado" | "clinico" | string;
  procedures?: string[];
  procedure_items?: ProcedureItem[];
  custom_procedures?: CustomProcedure[];
  initial_consultation?: InitialConsultationConfig;
  price_strategy?: "avaliacao" | "a_partir_de" | "tabela_fixa" | string;
  prices_note?: string;
  payment_methods?: string;
  insurance?: string;
  address?: string;
  parking?: string;
  hours?: string;
  holiday_service?: boolean;
  delay_tolerance?: string;
  emergency_contact?: string;
  clinical_rules?: string;
  unfilled_fallback?: "avaliacao" | "contato_secundario" | "aguardar_humano" | string;
  send_secondary_contact_on_finish?: boolean;
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
  media_key?: string | null;
  media_mime?: string | null;
  media_type?: string | null;
  created_at: string;
}

export interface ProfessionalRecord {
  id: number;
  tenant_id: string;
  name: string;
  specialty: string | null;
  cro_crm: string | null;
  working_days: string; // JSON array de dias 0..6
  start_hour: string;   // HH:MM
  end_hour: string;     // HH:MM
  break_start: string | null;
  break_end: string | null;
  procedures_json: string; // JSON array de nomes de procedimentos
  color: string;
  active: number;
  created_at: string;
}
