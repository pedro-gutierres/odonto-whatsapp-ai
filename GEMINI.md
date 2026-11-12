# Regras e Contexto do Projeto (Aura AI — WhatsApp Odonto & Estética)

## Regras de Entrega e Versionamento

Trabalhar em conjuntos pequenos e completos. Ao concluir um conjunto autorizado para implementação:
1. Validar tipagem (`npm run typecheck`) e testes (`npm test`) antes de registrar no Git / enviar ao GitHub.
2. Atualizar a documentação do comportamento e registrar pendências reais; não marcar integrações como validadas somente por testes simulados.
3. Preparar backup e conferir compatibilidade antes de aplicar migrations remotas (quando aplicável).
4. Registrar as alterações validadas no histórico do GitHub (`git add` seletivo, `git commit`, `git push origin main`). **Não** há obrigação de rodar `npx wrangler deploy`: o Worker de produção na Cloudflare está vinculado ao repositório no GitHub e faz deploy automático a cada push em `main`. Por isso, não enviar edições intermediárias sem validação para `main` e só executar deploy manual via CLI se solicitado explicitamente.
5. **Nunca** commitar `.dev.vars`, `.dev.vars.txt`, `.env`, backups ou segredos. Não incluir alterações pré-existentes de terceiros no commit por conveniência.

Pedidos explícitos de somente análise, implementação local (sem `git push`) ou de deploy manual prevalecem sobre a rotina acima.

## Regras Comerciais e de Ambiente

- Paddle de produção permanece desabilitado até configurar e validar a conta externa. A integração sandbox usa exclusivamente `wrangler.paddle-sandbox.jsonc` (`src/paddle-sandbox.ts`) e seu banco isolado. Nunca publicar secrets ou IDs sandbox na configuração de produção.
- O acesso usa apenas e-mail e senha (login Google removido).
- Não prometer métricas Meta, coexistência ou compatibilidade com agendas externas sem prova específica.
- Contas `legacy` devem preservar sua operação até classificação individual.

## Convenções Críticas de Arquitetura e Segurança

1. **Isolamento Multi-Tenant Estrito**:
   - Toda rota `/api/*` de negócio exige sessão autenticada (`requireSession()` / `authenticatedBusiness()`) e usa **exclusivamente** `session.tenantId` — nunca confie em `tenant` vindo de query string ou body.
   - Nunca faça fallback de `phone_number_id` para o número de laboratório (`lab`) em rotas operacionais (`/api/send`, `runDayBeforeConfirmations`, `processJob`). Se uma clínica ainda não tiver `phone_number_id` real ou token válido, bloqueie o disparo à Meta.
   - `updateTenantConfig` em `src/db.ts` faz `UPDATE` por `id` sem sobrescrever `phone_number_id` (para evitar colisão na constraint `UNIQUE`). Quando cria registro ausente, usa placeholder único `unconfigured:<tenantId>`.
2. **Segredos e Criptografia**:
   - `src/auth.ts` usa PBKDF2 (`pbkdf2_v1:...`) para novos hashes de senha (mantendo verificação retrocompatível para hashes legados SHA-256), HMAC-SHA256 em tempo constante para cookies de sessão (`AUTH_SECRET`) e AES-256-GCM (`enc:v1:...`) para tokens por clínica (`TOKEN_ENCRYPTION_KEY` ou `AUTH_SECRET`).
3. **Performance D1**:
   - Rotas de leitura, escrita, polling (`/api/sync-check`), agenda, atendimento e cron **nunca** executam `CREATE TABLE` ou `ALTER TABLE` em runtime. Alterações de schema ficam exclusivamente em `migrations/` (`0001`–`0014`).

## Referências

- Arquitetura, mapa de arquivos, rotas e comandos: `README.md`.
- Decisões comerciais, transição das contas, validações Paddle sandbox e pendências: `REESTRUTURACAO.md`.
