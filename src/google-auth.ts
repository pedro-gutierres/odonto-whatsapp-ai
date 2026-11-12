import type { Env } from './types';
import { createSessionToken, makeSessionCookie } from './auth';
import { getUserById } from './db';
import { jsonResponse } from './http';

let googleKeys: { keys: (JsonWebKey & {kid?:string})[]; expires: number } | null = null;
function decodePart(part: string) {
  return Uint8Array.from(atob(part.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
}
function nonceCookie(request: Request) {
  return request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('aura_google_nonce='))?.slice('aura_google_nonce='.length);
}
export async function verifyGoogleIdentity(request: Request, env: Env, credential: unknown) {
  if (!env.GOOGLE_CLIENT_ID || typeof credential !== 'string' || credential.length>16000) throw new Error('GOOGLE_UNAVAILABLE');
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new Error('GOOGLE_ORIGIN');
  const parts=credential.split('.');if(parts.length!==3)throw new Error('GOOGLE_TOKEN');
  const header=JSON.parse(new TextDecoder().decode(decodePart(parts[0])));
  const payload=JSON.parse(new TextDecoder().decode(decodePart(parts[1])));
  const now=Date.now()/1000, nonce=nonceCookie(request);
  if(header.alg!=='RS256' || typeof header.kid!=='string' || !nonce || payload.nonce!==nonce
    || !['https://accounts.google.com','accounts.google.com'].includes(payload.iss)
    || payload.aud!==env.GOOGLE_CLIENT_ID || !Number.isFinite(payload.exp) || payload.exp<=now
    || !Number.isFinite(payload.iat) || payload.iat>now+60 || payload.email_verified!==true
    || typeof payload.sub!=='string' || !payload.sub || typeof payload.email!=='string')throw new Error('GOOGLE_TOKEN');
  if(!googleKeys || googleKeys.expires<=Date.now() || !googleKeys.keys.some(key=>key.kid===header.kid)) {
    const response=await fetch('https://www.googleapis.com/oauth2/v3/certs');if(!response.ok)throw new Error('GOOGLE_KEYS');
    const data=await response.json() as {keys:JsonWebKey[]};
    const maxAge=Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 3600);
    googleKeys={keys:data.keys,expires:Date.now()+Math.min(maxAge,86400)*1000};
  }
  const jwk=googleKeys.keys.find(key=>key.kid===header.kid);if(!jwk || jwk.kty!=='RSA')throw new Error('GOOGLE_KEY');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decodePart(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw new Error('GOOGLE_SIGNATURE');
  return {subject:payload.sub,email:payload.email.toLowerCase(),name:typeof payload.name==='string'?payload.name:''};
}

export async function handleGoogleAuth(request: Request, env: Env) {
  if (new URL(request.url).pathname === '/api/auth/google/options' && request.method === 'GET') {
    if(!env.GOOGLE_CLIENT_ID)return jsonResponse({enabled:false});
    const nonce=crypto.randomUUID();
    return jsonResponse({enabled:true,clientId:env.GOOGLE_CLIENT_ID,nonce},200,{'Set-Cookie':`aura_google_nonce=${nonce}; HttpOnly; SameSite=Lax; Path=/api/auth/; Max-Age=600${new URL(request.url).protocol==='https:'?'; Secure':''}`});
  }
  if(request.method!=='POST')return jsonResponse({error:'Método não permitido.'},405);
  try {
    const body=await request.json() as any;const identity=await verifyGoogleIdentity(request,env,body.credential);
    const linked=await env.DB.prepare('SELECT id FROM users WHERE google_subject=?1').bind(identity.subject).first<{id:number}>();
    if(!linked) {
      const local=await env.DB.prepare('SELECT id FROM users WHERE lower(email)=?1').bind(identity.email).first();
      if(local)return jsonResponse({error:'Este e-mail já possui acesso por senha. Entre com sua senha para preservar a conta existente.',code:'ACCOUNT_LINK_REQUIRED'},409);
      return jsonResponse({newAccount:true,email:identity.email,name:identity.name});
    }
    const user=await getUserById(env.DB,linked.id);
    if(!user || user.active===0)return jsonResponse({error:'Usuário inativo.'},403);
    const token=await createSessionToken({userId:user.id,tenantId:user.tenant_id,email:user.email,name:user.name,role:user.role},env.AUTH_SECRET);
    return jsonResponse({success:true,redirect:'/inbox'},200,{'Set-Cookie':makeSessionCookie(token,new URL(request.url).protocol==='https:')});
  }catch{return jsonResponse({error:'Não foi possível validar o acesso Google. Tente novamente pelo botão oficial.'},401);}
}
