import worker from './index';
import { processPaddleInbox } from './billing';
import type { Env } from './types';
import { jsonResponse } from './http';

// This entry point is deployed only by wrangler.paddle-sandbox.jsonc.
// Its scheduled handler processes billing only; it never runs real attendance.
export default {
  async scheduled(_controller:ScheduledController,env:Env){
    if(env.PADDLE_ENVIRONMENT==='sandbox'&&env.PADDLE_SANDBOX_ENTITLEMENTS==='true')await processPaddleInbox(env);
  },
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    if (env.PADDLE_ENVIRONMENT !== 'sandbox' || env.PADDLE_SANDBOX_ENTITLEMENTS !== 'true') {
      return jsonResponse({ error: 'Este ambiente exige a configuração sandbox.' }, 503);
    }
    const path = new URL(request.url).pathname;
    const attendance = path === '/webhook' || path.startsWith('/api/admin/')
      || path === '/api/support' || path.startsWith('/api/support/')
      || ['/api/send', '/api/toggle-ai', '/api/clear-chat'].includes(path)
      || path.startsWith('/api/clinic/whatsapp/')
      || (path.startsWith('/api/appointments') && request.method !== 'GET');
    if (attendance) return jsonResponse({ error: 'O ambiente de testes Paddle não executa atendimento real.' }, 403);
    const response = await worker.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (headers.get('content-type')?.includes('text/html')) {
      const html = (await response.text()).replace(/(<body\b[^>]*>)/i,
        '$1<div class="aura-note" role="status" style="margin:0;border-radius:0;text-align:center;flex-shrink:0">Ambiente de testes Paddle · sem cobranças ou atendimento reais</div>');
      headers.delete('content-length');
      return new Response(html, { status: response.status, headers });
    }
    return new Response(response.body, { status: response.status, headers });
  }
};
