# Aura — regras e entrega da reestruturação

## Decisões aprovadas em 11/11/2026

- Perfil: autônomo ou clínica, independentemente de odontologia ou estética.
- Cadastro gratuito não inicia teste. O perfil completo é exigido antes de criar negócio e administrador.
- Test Drive: 30 respostas por conta, compartilhadas por dois modos explícitos (paciente e dúvidas sobre o Aura), sem reposição automática. Sem leitura/escrita na agenda real e sem WhatsApp.
- Teste operacional: 168 horas ou 100 respostas automáticas aceitas pela API do WhatsApp, o que ocorrer primeiro. Começa somente após preparação e ativação pelo responsável. Sem cartão e sem conversão automática em assinatura.
- Envios humanos e lembretes ficam fora dessa cota; são bloqueados junto com a operação. Custos da Meta são separados.
- Plano mensal R$ 199; anual R$ 2.148 (equivalente a R$ 179/mês), com renovação informada e aceita no checkout.
- O proprietário ainda não tem as configurações externas: preparar código e documentação, mantendo Paddle desabilitado até configurar e validar (acesso apenas via e-mail e senha; login Google removido).

## Implementação

| Parte | Situação |
|---|---|
| Cadastro gratuito e quatro perfis | Implementado |
| Condição comercial separada da preparação | Implementado |
| Matriz aplicada nas APIs, fila e cron | Implementado |
| Dois modos de Test Drive, quota atômica e isolamento | Implementado |
| Revisão do treinamento e preparação explícita | Implementado |
| Disponibilidade por profissional e bloqueios sem pacientes | Implementado |
| CSV Aura com prévia, confirmação e desfazer lote | Implementado; não representa compatibilidade com sistemas externos |
| Ativação, prazo e cota do teste | Implementado |
| Login por e-mail e senha | Implementado (login Google removido por decisão do proprietário) |
| Checkout e webhooks Paddle | Implementado e testado com API simulada; aguarda conta sandbox, credenciais e validação externa |
| Dados comerciais, treinamento, WhatsApp e Minha conta | Separados na navegação |
| Contas anteriores | Preservadas como `legacy`; não convertidas automaticamente |
| Métricas de cobrança da Meta | Indisponíveis; nenhuma estimativa fictícia |
| Coexistência e histórico de números existentes | Não comprovados; bloqueados para novas conexões de contas novas |
| Conferência visual no navegador | Pendente: ferramenta negou acesso ao endereço local |

Os testes antigos que exigiam iniciar o prazo no cadastro e criar consultas pelo simulador foram substituídos por testes da nova jornada. A suíte de autenticação, equipe e conexão anterior continua executada.

## Acesso e preparação

`commercial_status` usa `free`, `preparing`, `trial`, `active`, `ended`; `legacy` é exclusivamente uma condição de transição das contas anteriores. Expiração de prazo/cota é calculada no momento da operação, mesmo que o valor persistido ainda seja `trial`.

Treinamento revisado, agenda preparada, WhatsApp diagnosticado e ativação operacional são informações próprias. Pagar não preenche essas informações. Salvar treinamento exige nova revisão; alterar a disponibilidade de profissionais exige nova confirmação da agenda. O relógio de 168 horas é contínuo.

| Recurso | Gratuito | Preparação | Teste/assinatura | Encerrado |
|---|---|---|---|---|
| Negócio, treinamento, conta | Editar conforme cargo | Editar | Editar | Editar conforme cargo |
| Test Drive | Cota própria; paciente exige treinamento mínimo | Cota própria | Cota própria | Cota própria |
| Agenda | Exemplo identificado | Profissionais, disponibilidade e bloqueios | Consultas e preparação | Histórico |
| WhatsApp | Orientação | Conectar e diagnosticar | Gerenciar | Diagnóstico e desconexão |
| Conversas | Sem operação | Sem operação | Histórico e envios | Histórico; sem envios |

Contas antigas mantêm o comportamento operacional anterior até revisão individual. O Test Drive é isolado também para elas. Consultas antigas do simulador não são removidas: precisam de conferência antes de limpeza.

## Agenda

São oferecidas agenda principal no Aura, períodos exclusivos e atualização manual das ocupações externas. Profissionais e expedientes são estruturados; o treinamento textual não substitui essa validação.

CSV aceito: `profissional,inicio,fim`, com nomes de profissionais já cadastrados e datas de Brasília no formato `AAAA-MM-DD HH:MM`. São até 40 ocupações por lote. Importar grava apenas bloqueios. Repetir a confirmação não duplica o lote; desfazer só remove seus bloqueios. Importação inicial não sincroniza remarcações e compromissos futuros.

Números existentes, exportações de iClinic/Feegow/Clinicorp/Simples Dental e outros sistemas exigem prova específica antes de qualquer promessa. PDFs, imagens e formatos arbitrários não são importadores suportados.

## Configurações externas a preencher depois

Em produção: Cloudflare → Workers & Pages → `odonto-whatsapp-ai` → Settings → Variables and Secrets. Adicione chaves privadas como **Secret**, nunca em arquivos versionados. O Worker usa `keep_vars=true` para preservar variáveis cadastradas no painel nas próximas publicações. Localmente, copie `.dev.vars.example` para `.dev.vars` e preencha somente no computador. O exemplo contém apenas marcadores.

### Meta / conexão rápida

| Campo | Tipo | Uso |
|---|---|---|
| `META_APP_ID` | Variável | Identificador do aplicativo Meta do Aura |
| `META_EMBEDDED_CONFIG_ID` | Variável | Configuração Facebook Login for Business / Embedded Signup |
| `META_APP_SECRET` | Secret, opcional | Secret desse aplicativo; fallback para o primeiro `META_APP_SECRETS` |
| `META_APP_SECRETS` | Secret | Segredos aceitos na assinatura do webhook |
| `WA_VERIFY_TOKEN` | Secret | Verificação do webhook `/webhook` |

O caminho manual continua disponível durante a preparação, com credencial própria do negócio. Para contas novas, o diagnóstico precisa confirmar o aplicativo do Aura entre os aplicativos inscritos no WABA, além do número e token. Inscrição de outro fornecedor não comprova conexão do Aura.

O Embedded Signup depende também de configuração e permissões do aplicativo na Meta. Preencher IDs sozinho não comprova onboarding completo ou coexistência. A operação com um número real deve ser verificada após configurar a conta externa.

### Paddle

Comece com uma conta **sandbox** e preços recorrentes sem trial adicional: mensal BRL `19900` centavos/mês e anual BRL `214800` centavos/ano, frequência 1. O servidor confere os preços antes de abrir o checkout.

| Campo | Tipo | Uso |
|---|---|---|
| `PADDLE_ENABLED` | Variável | `false` inicialmente; `true` depois de configurar o ambiente |
| `PADDLE_ENVIRONMENT` | Variável | `sandbox` ou `live`, sem misturar credenciais |
| `PADDLE_API_KEY` | Secret | API key com `price.read`, `transaction.read/write`, `subscription.read` e `customer_portal_session.write` |
| `PADDLE_CLIENT_TOKEN` | Variável | Token público do Paddle.js |
| `PADDLE_WEBHOOK_SECRET` | Secret | Secret do destino de notificações |
| `PADDLE_MONTHLY_PRICE_ID` | Variável | Price ID mensal |
| `PADDLE_YEARLY_PRICE_ID` | Variável | Price ID anual |
| `PADDLE_SANDBOX_ENTITLEMENTS` | Variável | `false` por padrão. `true` somente no ambiente de testes isolado para exercitar a liberação de acesso |

Configure o destino de notificações como `https://SEU-DOMINIO/api/webhooks/paddle`, com eventos de assinatura (`subscription.created`, `activated`, `updated`, `resumed`, `past_due`, `paused`, `canceled`). Configure também o domínio de checkout na Paddle.

O servidor cria a transação e seu vínculo com o negócio. A confirmação no navegador não libera acesso. Webhooks assinados conferem o vínculo e o preço; a vigência paga só avança com transação `completed` confirmada na API Paddle, com cliente, assinatura, contratação, preço, quantidade e período compatíveis. `transaction.completed` também consulta a assinatura atual para funcionar independentemente da ordem dos eventos. Duplicados e eventos antigos não revertem o estado. Falhas ou atraso na consulta pedem reenvio (não retornam sucesso sem persistência). Cancelar a renovação mantém o período pago até seu fim; cancelamento efetivo/inadimplência suspendem a operação.

Sem configuração, os botões ficam desabilitados. Sandbox não concede acesso operacional por padrão. Antes de ativar `live`, conferir checkout, webhooks, portal, renovação e cancelamento na sandbox e aprovação do domínio/negócio na Paddle.

A página pública `/checkout` é o destino preparado para o **Default payment link** da Paddle. Ela carrega somente o token público, reconhece `_ptxn`, permite reabrir um pagamento fechado e mantém o acesso dependente do webhook. Não usa cache e não inclui API key ou secret de assinatura. Configure o link no domínio do ambiente correspondente; não aponte a sandbox para um serviço de produção com outro conjunto de credenciais.

O checkout recusa pares de credenciais incompatíveis: sandbox exige token `test_` e chave `pdl_sdbx_apikey_`; produção exige token `live_` e chave `pdl_live_apikey_`. Variáveis exportadas em outro terminal não ficam automaticamente disponíveis para o agente ou para o Worker. Na máquina local, use `.dev.vars`; na publicação, use Variables and Secrets da Cloudflare.

Referências: https://developer.paddle.com/webhooks/signature-verification/ ; https://developer.paddle.com/api-reference/transactions/create-transaction/ ; https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session/

### Integração Paddle sandbox — 12/11/2026

- O proprietário escolheu configurar e testar na **sandbox primeiro**. Preços e renovação seguem as regras aprovadas; não foi criado trial adicional na Paddle.
- A conexão do plugin disponível é `paddle-live`, autenticada por OAuth, apenas com permissões de leitura. Ela não fornece uma credencial de servidor para o Aura nem acesso à sandbox.
- Auditoria somente de leitura em produção: nenhum produto/preço ativo ou token público retornado; nenhum domínio ou link padrão de pagamento configurado. A consulta de destinos não retornou registros, embora a estimativa de paginação indique dois; confirmar no painel antes de criar destinos em produção. A verificação do negócio não pôde ser consultada por falta de `verification.read`.
- Nenhuma configuração da conta de produção foi alterada. Formas de pagamento, modo de impostos e moeda de repasse não foram modificados.
- A chave sandbox foi lida do arquivo local ignorado pelo Git e autenticada na API sandbox. API key e secret de assinatura nunca foram impressos ou versionados. Secrets de implantação ficam na Cloudflare do Worker sandbox; arquivos privados auxiliares ficam em `.wrangler/`, ignorada pelo Git.
- Worker separado: `aura-paddle-sandbox`, configuração `wrangler.paddle-sandbox.jsonc`, em `https://aura-paddle-sandbox.pedrogutierres.workers.dev`. Banco novo `aura-paddle-sandbox-db` (`898f5577-5cac-4810-a03e-c3f0f1daf6cc`), com migrations `0001`–`0014`; banco de produção não foi modificado.
- O Worker sandbox não tem filas, tokens Meta ou IA; o cron acrescentado posteriormente executa somente faturamento. O entry point `src/paddle-sandbox.ts` exige configuração sandbox, bloqueia atendimento real e identifica as páginas como ambiente de testes. O teste operacional real fica desabilitado; pagamento sandbox não inicia o prazo do teste.
- Produto `Aura`, categoria `saas`, preços recorrentes sem trial adicional, quantidade fixa 1. Nenhuma configuração de impostos, câmbio de repasse ou formas de pagamento foi alterada; preços usam a configuração tributária existente da sandbox.

| Recurso sandbox | Identificador |
|---|---|
| Produto Aura | `pro_01m76xyq9xd2w8g4ya93kd66th` |
| Mensal BRL 19900 | `pri_01m76xyrdy3c4zhyf97am83bsd` |
| Anual BRL 214800 | `pri_01m76xyrmqs8w1kd01bgxzy1at` |
| Notificações | `ntfset_01m76xysetgmkgcsg3s3pmw964` |
| Link padrão de pagamento | `https://aura-paddle-sandbox.pedrogutierres.workers.dev/checkout` |

- Notificações configuradas para `subscription.created`, `activated`, `updated`, `resumed`, `past_due`, `paused`, `canceled` e `transaction.completed`, com tráfego de plataforma e simulação.
- Validação externa: o proprietário concluiu o pagamento sandbox por Pix, transação `txn_01m76y31bvdgnmf1hthgfrvdz5`, BRL 19900, capturada e `completed`; assinatura `sub_01m76y7g7xatptycsrrevntkkt`. Webhooks entregues com sucesso e primeira tentativa. Cadastro permaneceu sem início de trial e sem operação real.
- Portal sandbox gerado pela API autenticada. Reenvio de `transaction.completed` entregue com sucesso após a conferência de captura. Cancelamento agendado manteve o período pago; cancelamento imediato efetivo foi refletido no Aura e bloqueou o acesso. A assinatura de teste terminou cancelada, sem novas renovações sandbox.
- A primeira simulação genérica enviada pela Paddle sem `custom_data` foi recusada como contratação desconhecida (409). Simulações vinculadas verificaram a entrega; a compra Pix e os cancelamentos acima foram verificados contra entidades reais **da sandbox**, não apenas payloads inventados.
- Tipagem, 70 testes locais e builds Cloudflare aprovados. Menu/calendário e retorno do checkout têm testes offline; isso não é inspeção visual do formulário hospedado da Paddle. O cartão de teste informado não foi aceito na tentativa do proprietário; o fluxo de cartão continua pendente de reprodução/validação.
- Renovação futura com captura real ainda não foi observada. Segundo a documentação Paddle, Pix Automático pode capturar renovações dias após o vencimento. A regra atual não estende acesso sem período pago confirmado; uma eventual tolerância precisa ser decidida antes de oferecer Pix em produção. Não foram adicionadas tolerância, troca de plano paga ou cobranças proporcionais.
- Próxima etapa de produção: concluir verificação do negócio e domínio, preparar catálogo/credenciais próprios de produção, confirmar políticas públicas e validar os meios de pagamento. A conta Paddle de produção e a cobrança real permanecem inalteradas/desabilitadas.

Publicar somente a sandbox: `npx wrangler deploy --config wrangler.paddle-sandbox.jsonc`. Secrets já configurados no Worker são preservados. Migrations de sandbox devem sempre usar esse arquivo de configuração e o nome `aura-paddle-sandbox-db`; nunca o banco de produção. Não copie os IDs ou os secrets sandbox para produção.

Referência de Pix e captura: https://developer.paddle.com/concepts/payment-methods/pix/ .

## Publicação e recuperação

1. Executar `npm run typecheck` e `npm test`.
2. Exportar o D1 remoto para `.wrangler/backups/` (ignorado pelo Git); conferir inventário das contas.
3. Aplicar migrations aditivas `0010` a `0014`. Elas não reiniciam testes nem atribuem pagamento a contas existentes.
4. Versionar somente arquivos desta entrega, preservando alterações anteriores e excluindo segredos.
5. Publicar o Worker e os assets juntos. Conferir saúde, páginas, bloqueio sem sessão e inventário remoto.
6. Manter Paddle desabilitado até sua validação externa. `OPERATIONAL_TRIAL_ENABLED=false` interrompe novas ativações sem apagar cadastros ou reiniciar testes existentes.

Se necessário, reverter o Worker para a versão anterior; manter as colunas aditivas do banco. Reversão de dados exige analisar as gravações posteriores ao backup, evitando sobrescrever consultas legítimas.

Reservas interrompidas em uma falha abrupta podem permanecer pendentes para revisão. Não é seguro liberar automaticamente uma resposta cujo resultado de envio externo seja desconhecido. Uma confirmação da API Meta representa aceite do envio, não comprova entrega ao destinatário.

## Pendências que não dependem apenas do código

- Configurar e validar Meta Embedded Signup e Paddle com as contas do proprietário.
- Conferir visualmente cadastro, menus, bloqueios e experiência móvel em navegador autorizado.
- Classificar individualmente as 15 contas anteriores antes de remover a condição de transição.
- Validar consequências de números existentes e acesso às métricas financeiras Meta.
- Validar arquivos de cada sistema externo e uma política sustentável de manutenção das agendas.
- Definir retenção/exportação e eventual política de uso do plano pago antes de ampliar a oferta.


## Registro de publicação — 11/11/2026

- Backup anterior à migração: `.wrangler/backups/aura-before-restructure-20261111.sql` (não versionado).
- Migrations `0010`–`0014` aplicadas no D1 remoto. Inventário comparado com o backup: 15 contas, 16 usuários, 3 consultas, 56 mensagens e contador anterior total de 14 usos, preservados.
- Worker e assets publicados. Metadados da versão ativa conferidos na API Cloudflare.
- `npm run typecheck` e 49 testes aprovados. Bundle Cloudflare gerado com sucesso.
- As requisições HTTP automatizadas ao domínio público foram bloqueadas pela Cloudflare (403 / erro 1010), antes do código do aplicativo. Não foi alterada a proteção nem contornado o bloqueio.
- A ferramenta de navegador também negou acesso à origem local. Validação visual e validação com contas externas permanecem pendentes; não são equivalentes aos testes simulados aprovados.

## Revisão da interface — entrega de 11/11/2026

- Landing page, entrada e cadastro com texto mais curto e identidade visual compartilhada. Cadastro gratuito e início explícito do teste continuam distintos.
- Navegação lateral no computador e menu recolhível no celular. Sete áreas com nomes consistentes e indicação da página atual.
- Seletores de opções, calendário e horário compartilhados, com busca em listas longas, teclado e indicação de campos desabilitados. Campos originais mantêm valores, validação e eventos existentes.
- Agenda prioriza consultas e disponibilidade. Bloqueios usam dia e horários separados, com término em outro dia explícito; os dados enviados à API mantêm o formato anterior e o horário de Brasília.
- Treinamento organizado em seções; informações técnicas da conexão recolhidas; ajuda contextual em ações menos evidentes. Salvar treinamento não é descrito como ativar o serviço.
- Sem migrations, alteração de regras comerciais ou mudança intencional dos dados existentes. Paddle e conexão guiada Meta permanecem indisponíveis sem configuração.
- Tipagem, 49 testes de backend, 13 testes de frontend e build Cloudflare aprovados. Os testes offline cobrem controles, bloqueios, login, cadastro e inicialização/navegação do painel. Eles não renderizam a página e não validam aparência ou integrações externas.
- O proprietário aprovou o visual apresentado e solicitou push e deploy deste conjunto. A inspeção visual automatizada em computador e celular permanece pendente por bloqueio da ferramenta de navegador; a aprovação do proprietário não é registrada como essa inspeção.
- Publicação deste conjunto sem migrations ou operações de escrita nos dados existentes. As próximas melhorias de organização serão tratadas em etapas menores conforme os problemas identificados.

## Organização de contas — 12/11/2026

O proprietário usa exclusivamente /admin: login direcionado aos relatórios, APIs administrativas de escrita removidas e APIs operacionais bloqueadas para esse perfil. Relatórios excluem aura-owner e não retornam conversas, tokens, hashes ou métricas de mensagens de pacientes. O titular é o primeiro usuário admin da operação (contas históricas sem admin aparecem sem titular identificado).

Migration 0015 adiciona is_test/test_label, restritos à apresentação administrativa. O CHECK de business_sector permanece dentistry/aesthetics: o relatório reconhece both, mas persistir esse valor exige futura migration de reconstrução testada; nenhuma trigger de cota ou agenda foi alterada.

seeds/lab.sql é um reset destrutivo explícito, não uma migration nem seed automático. Exige backup antes de reaplicar. Cria três tenants e três acessos com PBKDF2; as duas operações de teste começam sem atividade de pacientes e com treinamento/profissional/agenda inicial. Credenciais de implantação são fornecidas pelo proprietário, não documentadas em texto aberto. Backups ficam em .wrangler/backups, ignorados pelo Git.

O inbox não tem header desktop: operação, titular, plano, tema e saída ficam no rodapé lateral. Mobile preserva o acionador compacto de navegação. Integrações Meta/Paddle não foram validadas por esse reset.

## Quiz e áreas combinadas — 12/11/2026

/register e /cadastro exibem o mesmo quiz de cinco etapas: titular, e-mail, perfil, áreas e senha confirmada. Telefone e nome da operação são opcionais na API; o nome é derivado do titular quando omitido. O endpoint mantém compatibilidade com cadastros anteriores e não inicia operação real.

Migration 0016 adiciona business_sectors e faz backfill, sem reconstruir tenants ou alterar suas triggers. Leituras priorizam a nova coluna. Cadastros de ambas as áreas gravam dentistry na coluna legada e both na nova, com seis procedimentos iniciais e especialidade combinada.

Após resposta 201, o quiz desfoca e apresenta três mensagens durante quatro segundos. Depois a preparação dissolve em blur por 450 ms e navega para o Simulador. Um marcador de sessionStorage inicia a entrada do dashboard após init com blur e opacidade por 550 ms, sem cortina ou clip-path, com limpeza das classes ao final e fallback de 12 segundos. Movimento reduzido elimina a espera pelas transições e o deslocamento. Não há pré-carga de mensagens nem acesso automático ao WhatsApp.

Validação: suíte automatizada de cadastro, escolhas, confirmação de senha, temporização e revelação; prévias do quiz conferidas em navegador desktop e 390 px. A fluidez de 60 fps não foi medida em dispositivos reais.

## Treinamento estruturado — Etapa 3

Treinar IA carrega formato e áreas do perfil do quiz, permite ajustá-los e sincroniza as três colunas de perfil da operação autenticada ao salvar. Ambas as áreas seguem a convenção dentistry na coluna legada e both em business_sectors. O nome da operação é editável no card de Identidade e sincronizado com os dados cadastrais.

Horários usam sete linhas com habilitação por dia, seletores de 24 horas e minutos a cada dez minutos. schedule_days persiste o estado; o servidor valida a estrutura e gera hours para o prompt. Texto inicial padrão recebe segunda a sexta 08h–18h. Outros textos históricos ficam preservados, com aviso, até editar a grade; não são reinterpretados silenciosamente. Esses horários descrevem o atendimento no treinamento; os expedientes operacionais dos profissionais continuam na Agenda.

Durações, conselho/UF, atrasos, pagamento/parcelas, convênios e acesso recebem opções estruturadas. Valores antigos fora das opções são mantidos visíveis como opção ou marcação adicional; registro profissional antigo não reconhecido permanece preservado até editar seus seletores. O prompt continua recebendo os campos textuais anteriores. Nenhuma migration ou integração externa é necessária nesta etapa.

Validação cobre grade, perfil, durações personalizadas, valores legados, opções rápidas e persistência isolada; prévia de navegador em desktop e 390 px com dados fictícios. Testes de API não comprovam atendimento real em Meta/Paddle.

## Atualização automática de status — correção

A consulta de /api/onboarding a cada 30 segundos reutilizava o mesmo toast das ações explícitas e exibia diretamente error.message. Uma rejeição de fetch reproduzida nos testes mostrava Failed to fetch sem ação do usuário. Não há registro do episódio original para determinar se o transporte falhou por rede, navegador, proxy ou disponibilidade da infraestrutura.

Agora o polling tem modo background, limite de dez segundos, evita consultas sobrepostas e descarta respostas superadas. Falhas temporárias conservam o estado e os campos em edição, mostram aviso discreto na sidebar e tentam novamente no ciclo seguinte; sucesso limpa o aviso. Sessão expirada ou acesso negado continuam exibindo aviso explícito. Erros inesperados continuam no console. Fora da aba de plano, o polling não repete a consulta de billing. Reinicializar o painel substitui o timer anterior. O salvamento do treinamento e as regras de autorização não foram alterados.

## Webhooks Paddle duráveis e diagnóstico

Migration 0017 adiciona paddle_webhook_inbox sem alterar contas, cotas ou tabelas de atendimento. A assinatura preserva a janela de cinco segundos nos dois sentidos; o booleano verifyPaddleSignature continua compatível e inspectPaddleSignature fornece motivos internos seguros. A resposta pública de assinatura permanece genérica (401).

O receptor não faz consultas externas: grava um snapshot mínimo autenticado e responde 200. O processamento e a conferência de pagamento passam para um cron por minuto com lotes de cinco, lease e token de execução, retries com backoff e recuperação de interrupções. O endpoint não confirma recebimento se a gravação falhar. Não há renovação de trial nem liberação de atendimento real pelo recebimento; todas as conferências de vínculo, preço, captura, idempotência e ordem foram preservadas.

Os crons de produção separam faturamento por minuto e confirmações de véspera às 23h UTC. O entrypoint sandbox mantém seus bloqueios de Meta/IA/atendimento e tem somente cron de faturamento. As alterações do Worker sandbox exigem sua publicação própria; não foi feito deploy manual.

Backups prévios em .wrangler/backups/odonto-before-paddle-inbox-0017-20261112.sql e sandbox-before-paddle-inbox-0017-20261112.sql. Migration aplicada no D1 local de produção e nos bancos remotos de produção e sandbox (neste último, também as aditivas 0015 e 0016 pendentes). Nenhum seed ou reset foi executado.

Validação automatizada usa APIs simuladas: janela temporal nos limites, diagnóstico HMAC, resposta sem chamadas Paddle, persistência, retries após falha, consumidor concorrente, lease expirado, rejeição e replay, cron sandbox e produção. Entrega real da Paddle, latência de produção, credenciais externas e deploy automático não foram comprovados por esses testes.

## Refinamento de movimento do cadastro

O avanço sai para a esquerda em 200 ms e entra da direita em 260 ms; voltar inverte essas direções. Um lock cobre saída e entrada, desabilita botões e usa inert nos passos em transição. O foco vai ao primeiro input ou opção selecionada apenas ao concluir a entrada; valores permanecem no DOM. Com prefers-reduced-motion a navegação é síncrona.

A entrada do dashboard usa apenas classes temporárias para opacity/filter/transform, removidas após 550 ms para liberar o stacking context. Os testes controlam os timers e cobrem direção, cliques repetidos, foco, movimento reduzido, saída da preparação e consumo do marcador. Fluidez em todos os dispositivos não é garantida por testes de DOM.

No quiz, etapas de escolha recebem foco no título ao entrar; campos de texto continuam recebendo foco no input. Rádio e checkbox não herdam dimensões ou sombra de campos textuais. A navegação por Tab preserva indicador de foco no card, evitando o contorno oval automático no primeiro rádio.

Sidebar simplificada: operação e badge comercial deixam de ser visíveis. Rodapé contém ícones de conta e tema. Conta abre popover fixo fora da sidebar com Conta, Plano e Sair; IDs antigos seguem ocultos para compatibilidade. Fechamento por clique externo/Escape, navegação por setas e posicionamento limitado à viewport.
