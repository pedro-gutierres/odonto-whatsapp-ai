// Tipos compartilhados. Descrevem "que formato têm os dados" em cada parte do sistema.

export interface Env {
  // Recursos da Cloudflare (ligados em wrangler.jsonc)
  DB: D1Database;
  INBOX: Queue<InboundJob>;
  MEDIA_BUCKET?: R2Bucket;
  AI?: Ai;
  ASSETS?: Fetcher;

  // Segredos (guardados na Cloudflare, nunca no código)
  META_APP_SECRETS: string; // um ou mais "app secrets" da Meta, separados por vírgula
  META_APP_SECRET?: string; // app secret específico para troca OAuth do Embedded Signup (fallback: primeiro item de META_APP_SECRETS)
  WA_VERIFY_TOKEN: string;  // frase que você inventa; a Meta devolve na verificação do webhook
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_SUPPORT_API_KEY?: string;
  SUPPORT_CLAUDE_MODEL?: string;
  SUPPORT_SIMULATION_MODEL?: string;
  WA_LAB_TOKEN?: string;    // token fallback / laboratório da Meta (quando a clínica não tem access_token_enc)
  AUTH_SECRET?: string;     // segredo HMAC para sessões (configure via wrangler secret put AUTH_SECRET)
  TOKEN_ENCRYPTION_KEY?: string; // chave opcional para criptografia AES-GCM de tokens por clínica (fallback: AUTH_SECRET)

  // Variáveis comuns (wrangler.jsonc ou dashboard)
  GRAPH_VERSION: string;
  CLAUDE_MODEL: string;
  CLAUDE_EFFORT: string;
  SUPERADMIN_EMAILS?: string; // lista separada por vírgula de e-mails autorizados no /admin
  META_APP_ID?: string;       // App ID público da Meta para inicializar o SDK JS (Embedded Signup)
  META_EMBEDDED_CONFIG_ID?: string; // Configuration ID do Facebook Login for Business (WhatsApp Embedded Signup)
  OPERATIONAL_TRIAL_ENABLED?: string;
  PADDLE_ENABLED?: string;
  PADDLE_ENVIRONMENT?: string;
  PADDLE_API_KEY?: string;
  PADDLE_WEBHOOK_SECRET?: string;
  PADDLE_CLIENT_TOKEN?: string;
  PADDLE_MONTHLY_PRICE_ID?: string;
  PADDLE_YEARLY_PRICE_ID?: string;
  PADDLE_PRO_MONTHLY_PRICE_ID?: string;
  PADDLE_PRO_YEARLY_PRICE_ID?: string;
  PADDLE_ULTRA_MONTHLY_PRICE_ID?: string;
  PADDLE_ULTRA_YEARLY_PRICE_ID?: string;
  PADDLE_SANDBOX_ENTITLEMENTS?: string;
  BILLING_EMAIL_API_KEY?: string;
  BILLING_EMAIL_FROM?: string;
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
  plan_offer_id?: string | null;
  quota_anchor_at?: string | null;
  quota_bridge_at?: string | null;
  paid_transaction_id?: string | null;
  billing_next_at?: string | null;
  paid_access_revoked?: number;
  active_offer?: string | null;
  free_offer?: string | null;
  plan_tier?: 'free' | 'pro' | 'ultra' | null;
  subscription_starts_at?: string | null;
  plan_price_id?: string | null;
  auto_renew?: number;
  commercial_status?: 'legacy' | 'free' | 'preparing' | 'trial' | 'active' | 'ended';
  business_kind?: 'solo' | 'clinic' | null;
  business_sectors?: 'dentistry' | 'aesthetics' | 'both' | null;
  business_sector?: 'dentistry' | 'aesthetics' | null;
  existing_system?: string | null;
  uses_external_schedule?: number | null;
  trial_started_at?: string | null;
  training_reviewed_at?: string | null;
  agenda_ready_at?: string | null;
  schedule_mode?: 'aura' | 'dedicated' | 'external_manual' | 'request' | null;
  whatsapp_diagnosed_at?: string | null;
  operational_enabled?: number;
  demo_messages_used?: number;
  demo_messages_limit?: number;
  subscription_ends_at?: string | null;
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
  billing_event_at?: string | null;
  billing_status?: string | null;
  renewal_canceled_at?: string | null;
  id: string;
  name: string;
  phone_number_id: string;
  waba_id: string | null;
  access_token_enc: string | null;
  bot_config: string; // JSON em texto; veja BotConfig
  active: number;
  legal_name?: string | null;
  cnpj?: string | null;
  admin_phone?: string | null;
  responsible_name?: string | null;
  contact_email?: string | null;
  wa_display_phone?: string | null;
  wa_verified_name?: string | null;
  wa_connected_at?: string | null;
  created_at?: string;
  // Controle de Trial e Planos (Milestone 1 / Etapa 3)
  plan_status?: "trial" | "active" | "past_due" | "canceled" | string;
  trial_ends_at?: string | null;
  trial_messages_used?: number;
  trial_messages_limit?: number;
  billing_cycle?: "monthly" | "yearly" | string | null;
}

export interface ClinicUserSummary {
  id: number;
  tenant_id: string;
  email: string;
  name: string;
  role: string;
  active: number;
  created_at: string;
}

export interface ClinicWhatsAppStatus {
  configured: boolean;
  phone_number_id: string | null;
  raw_phone_number_id: string;
  waba_id: string | null;
  has_custom_token: boolean;
  token_source: "custom_encrypted" | "custom_plain" | "lab_fallback" | "none";
  display_phone_number: string | null;
  verified_name: string | null;
  connected_at: string | null;
  webhook_url: string;
  verify_token_configured: boolean;
  app_secrets_configured: boolean;
  embedded_signup: {
    enabled: boolean;
    app_id: string | null;
    config_id: string | null;
    graph_version: string;
    missing_env: string[];
  };
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
  voice_replies?: boolean;
  business_kind?: 'solo' | 'clinic';
  business_sector?: 'dentistry' | 'aesthetics' | 'both';
  schedule_days?: Array<{day:number;enabled:boolean;startHour:string;startMinute:string;endHour:string;endMinute:string}>;
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

export interface TenantTrialInfo {
  plan_status: "trial" | "active" | "past_due" | "canceled" | string;
  trial_ends_at: string | null;
  trial_messages_used: number;
  trial_messages_limit: number;
  days_remaining: number;
  is_expired: boolean;
  is_limit_reached: boolean;
  can_send_messages: boolean;
}

