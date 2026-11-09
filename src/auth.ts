// Módulo de Autenticação e Sessões (100% nativo com Web Crypto API no Cloudflare Workers)
export interface SessionUser {
  userId: number;
  tenantId: string;
  email: string;
  name: string;
}

const DEFAULT_SECRET = "odonto_ai_secret_jwt_hmac_2026_super_key";

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + ":odonto_salt_2026");
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(password: string, expectedHash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === expectedHash;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret || DEFAULT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(user: SessionUser, secret: string = DEFAULT_SECRET): Promise<string> {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 dias
  const payload = JSON.stringify({ ...user, exp: expiresAt });
  const payloadB64 = btoa(unescape(encodeURIComponent(payload)));

  const key = await getHmacKey(secret);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${payloadB64}.${sigHex}`;
}

export async function verifySessionToken(token: string, secret: string = DEFAULT_SECRET): Promise<SessionUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sigHex] = parts;

    const key = await getHmacKey(secret);
    const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
    const expectedSigHex = Array.from(new Uint8Array(expectedSig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (sigHex !== expectedSigHex) return null;

    const payloadJson = decodeURIComponent(escape(atob(payloadB64)));
    const data = JSON.parse(payloadJson);

    if (Date.now() > data.exp) return null;

    return {
      userId: data.userId,
      tenantId: data.tenantId,
      email: data.email,
      name: data.name,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: Request, secret: string = DEFAULT_SECRET): Promise<SessionUser | null> {
  // 1. Tenta pegar do Header Authorization: Bearer <token>
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const user = await verifySessionToken(token, secret);
    if (user) return user;
  }

  // 2. Tenta pegar do Cookie "auth_session"
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_session=([^;]+)/);
  if (match && match[1]) {
    return await verifySessionToken(match[1], secret);
  }

  return null;
}

export function makeSessionCookie(token: string): string {
  // 7 dias, HttpOnly, SameSite=Lax, Path=/
  return `auth_session=${token}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax`;
}

export function makeLogoutCookie(): string {
  return `auth_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
