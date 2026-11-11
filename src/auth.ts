// Módulo de Autenticação, Sessões e Criptografia de Tokens (Web Crypto API / Cloudflare Workers)
import type { Env, Tenant } from "./types";

export interface SessionUser {
  userId: number;
  tenantId: string;
  email: string;
  name: string;
  role?: string;
}

const DEFAULT_SECRET = "odonto_ai_secret_jwt_hmac_2026_super_key";
const LEGACY_PASSWORD_SALT = ":odonto_salt_2026";
const PBKDF2_ITERATIONS = 100_000;
const ENCRYPTED_TOKEN_PREFIX = "enc:v1:";

let warnedMissingAuthSecret = false;

function getEffectiveAuthSecret(secret?: string): string {
  const trimmed = secret?.trim();
  if (trimmed) return trimmed;
  if (!warnedMissingAuthSecret) {
    warnedMissingAuthSecret = true;
    console.warn("[SECURITY] AUTH_SECRET não configurado nos secrets do Worker. Execute: npx wrangler secret put AUTH_SECRET");
  }
  return DEFAULT_SECRET;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str: string): Uint8Array | null {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hashLegacySha256(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + LEGACY_PASSWORD_SALT);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    256
  );
  return `pbkdf2_v1:${PBKDF2_ITERATIONS}:${bytesToHex(saltBytes)}:${bytesToHex(new Uint8Array(derived))}`;
}

export async function verifyPassword(password: string, expectedHash: string): Promise<boolean> {
  if (!expectedHash) return false;

  if (expectedHash.startsWith("pbkdf2_v1:")) {
    const parts = expectedHash.split(":");
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const saltBytes = hexToBytes(parts[2]);
    const expectedHex = parts[3];
    if (!iterations || !saltBytes || !expectedHex) return false;

    const baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
      baseKey,
      256
    );
    return timingSafeEqualString(bytesToHex(new Uint8Array(derived)), expectedHex);
  }

  // Compatibilidade com hashes legados SHA-256 (64 caracteres hex)
  const computedLegacy = await hashLegacySha256(password);
  return timingSafeEqualString(computedLegacy, expectedHash);
}

async function getHmacKey(secret?: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getEffectiveAuthSecret(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(user: SessionUser, secret?: string): Promise<string> {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 dias
  const payload = JSON.stringify({ ...user, exp: expiresAt });
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(payload));

  const key = await getHmacKey(secret);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigHex = bytesToHex(new Uint8Array(sigBuffer));

  return `${payloadB64}.${sigHex}`;
}

export async function verifySessionToken(token: string, secret?: string): Promise<SessionUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sigHex] = parts;
    const sigBytes = hexToBytes(sigHex);
    if (!sigBytes) return null;

    const key = await getHmacKey(secret);
    const validSig = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payloadB64));
    if (!validSig) return null;

    let payloadJson: string;
    const urlDecoded = base64UrlToBytes(payloadB64);
    if (urlDecoded) {
      payloadJson = new TextDecoder().decode(urlDecoded);
    } else {
      payloadJson = decodeURIComponent(escape(atob(payloadB64)));
    }
    const data = JSON.parse(payloadJson) as Partial<SessionUser> & { exp?: number };

    if (!data.exp || Date.now() > data.exp) return null;
    if (!data.userId || !data.tenantId || !data.email || !data.name) return null;

    return {
      userId: data.userId,
      tenantId: data.tenantId,
      email: data.email,
      name: data.name,
      role: data.role,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: Request, secret?: string): Promise<SessionUser | null> {
  // 1. Header Authorization: Bearer <token>
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const user = await verifySessionToken(token, secret);
    if (user) return user;
  }

  // 2. Cookie "auth_session"
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const name = part.slice(0, eqIdx).trim();
    if (name === "auth_session") {
      const value = part.slice(eqIdx + 1).trim();
      if (value) return await verifySessionToken(value, secret);
    }
  }

  return null;
}

export function makeSessionCookie(token: string, isSecure = false): string {
  // 7 dias, HttpOnly, SameSite=Lax, Path=/ (+ Secure em HTTPS)
  return `auth_session=${token}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

export function makeLogoutCookie(isSecure = false): string {
  return `auth_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

// -----------------------------------------------------------------------------
// CRIPTOGRAFIA E RESOLUÇÃO DE ACCESS TOKENS POR CLÍNICA (MULTI-TENANT)
// -----------------------------------------------------------------------------
async function deriveAesKey(masterSecret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(masterSecret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptTenantToken(plaintext: string, masterSecret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(masterSecret);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext.trim())
  );
  return `${ENCRYPTED_TOKEN_PREFIX}${bytesToBase64Url(iv)}:${bytesToBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptTenantToken(stored: string, masterSecret: string): Promise<string | null> {
  if (!stored.startsWith(ENCRYPTED_TOKEN_PREFIX)) {
    return stored.trim() || null;
  }
  const rest = stored.slice(ENCRYPTED_TOKEN_PREFIX.length);
  const parts = rest.split(":");
  if (parts.length !== 2) return null;

  const iv = base64UrlToBytes(parts[0]);
  const ciphertext = base64UrlToBytes(parts[1]);
  if (!iv || !ciphertext) return null;

  try {
    const key = await deriveAesKey(masterSecret);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted).trim() || null;
  } catch (err) {
    console.error("[AUTH] Falha ao descriptografar access_token_enc da clínica:", String(err));
    return null;
  }
}

export async function encryptTenantTokenForEnv(plaintext: string, env: Env): Promise<string> {
  const masterSecret = env.TOKEN_ENCRYPTION_KEY?.trim() || getEffectiveAuthSecret(env.AUTH_SECRET);
  return encryptTenantToken(plaintext, masterSecret);
}

export function isSuperAdminAuthorized(email: string, role: string, env: Env): boolean {
  if (role !== "superadmin") return false;
  const allowlistRaw = env.SUPERADMIN_EMAILS?.trim();
  if (!allowlistRaw) return true;
  const allowed = allowlistRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  return allowed.includes(email.trim().toLowerCase());
}

export async function resolveTenantAccessToken(
  tenant: Pick<Tenant, "access_token_enc"> | null | undefined,
  env: Env
): Promise<string | null> {
  const raw = tenant?.access_token_enc?.trim();
  if (raw) {
    if (raw.startsWith(ENCRYPTED_TOKEN_PREFIX)) {
      const masterSecret = env.TOKEN_ENCRYPTION_KEY?.trim() || getEffectiveAuthSecret(env.AUTH_SECRET);
      const decrypted = await decryptTenantToken(raw, masterSecret);
      if (decrypted) return decrypted;
    } else {
      return raw;
    }
  }

  return env.WA_LAB_TOKEN?.trim() || null;
}
