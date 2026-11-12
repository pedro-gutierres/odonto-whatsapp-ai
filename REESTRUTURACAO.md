# Aura — regras e entrega da reestruturação

## Decisões aprovadas em 11/11/2026

- Perfil: autônomo ou clínica, independentemente de odontologia ou estética.
- Cadastro gratuito não inicia teste. O perfil completo é exigido antes de criar negócio e administrador.
- Test Drive: 30 respostas por conta, compartilhadas por dois modos explícitos (paciente e dúvidas sobre o Aura), sem reposição automática. Sem leitura/escrita na agenda real e sem WhatsApp.
- Teste operacional: 168 horas ou 100 respostas automáticas aceitas pela API do WhatsApp, o que ocorrer primeiro. Começa somente após preparação e ativação pelo responsável. Sem cartão e sem conversão automática em assinatura.
- Envios humanos e lembretes ficam fora dessa cota; são bloqueados junto com a operação. Custos da Meta são separados.
- Plano mensal R$ 199; anual R$ 2.148 (equivalente a R$ 179/mês), com renovação informada e aceita no checkout.
- O proprietário ainda não tem as configurações externas: preparar código e documentação, mantendo Google/Paddle desabilitados até configurar e validar.

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
| Login Google | Implementado e testado com chaves de teste; aguarda Client ID e validação externa |
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

### Google

Crie um cliente OAuth do tipo aplicativo Web no Google Cloud. Cadastre a origem HTTPS real do Aura em JavaScript origins; para desenvolvimento use a origem local correspondente. O fluxo usa o botão oficial Google e valida assinatura, audiência, emissor, validade, nonce e origem no servidor. Não solicita acesso ao Gmail.

| Campo | Tipo | Uso |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Variável | Client ID do aplicativo Web |

Sem esse campo, o botão Google fica oculto e o cadastro por e-mail continua disponível. Uma conta por senha não é associada ao Google somente por coincidência de e-mail: o acesso existente é preservado.

Referência: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

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
| `PADDLE_API_KEY` | Secret | API key com leitura de preços, criação/edição de transações e criação de sessões do portal |
| `PADDLE_CLIENT_TOKEN` | Variável | Token público do Paddle.js |
| `PADDLE_WEBHOOK_SECRET` | Secret | Secret do destino de notificações |
| `PADDLE_MONTHLY_PRICE_ID` | Variável | Price ID mensal |
| `PADDLE_YEARLY_PRICE_ID` | Variável | Price ID anual |
| `PADDLE_SANDBOX_ENTITLEMENTS` | Variável | `false` por padrão. `true` somente no ambiente de testes isolado para exercitar a liberação de acesso |

Configure o destino de notificações como `https://SEU-DOMINIO/api/webhooks/paddle`, com eventos de assinatura (`subscription.created`, `activated`, `updated`, `resumed`, `past_due`, `paused`, `canceled`). Configure também o domínio de checkout na Paddle.

O servidor cria a transação e seu vínculo com o negócio. A confirmação no navegador não libera acesso. Somente o webhook assinado, reconhecido e com preço autorizado atualiza a vigência; duplicados e eventos antigos não revertem o estado. Cancelar a renovação mantém o período pago até seu fim; cancelamento efetivo/inadimplência suspendem a operação.

Sem configuração, os botões ficam desabilitados. Sandbox não concede acesso operacional por padrão. Antes de ativar `live`, conferir checkout, webhooks, portal, renovação e cancelamento na sandbox e aprovação do domínio/negócio na Paddle.

Referências: https://developer.paddle.com/webhooks/signature-verification/ ; https://developer.paddle.com/api-reference/transactions/create-transaction/ ; https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session/

## Publicação e recuperação

1. Executar `npm run typecheck` e `npm test`.
2. Exportar o D1 remoto para `.wrangler/backups/` (ignorado pelo Git); conferir inventário das contas.
3. Aplicar migrations aditivas `0010` a `0014`. Elas não reiniciam testes nem atribuem pagamento a contas existentes.
4. Versionar somente arquivos desta entrega, preservando alterações anteriores e excluindo segredos.
5. Publicar o Worker e os assets juntos. Conferir saúde, páginas, bloqueio sem sessão e inventário remoto.
6. Manter Google/Paddle desabilitados até suas validações externas. `OPERATIONAL_TRIAL_ENABLED=false` interrompe novas ativações sem apagar cadastros ou reiniciar testes existentes.

Se necessário, reverter o Worker para a versão anterior; manter as colunas aditivas do banco. Reversão de dados exige analisar as gravações posteriores ao backup, evitando sobrescrever consultas legítimas.

Reservas interrompidas em uma falha abrupta podem permanecer pendentes para revisão. Não é seguro liberar automaticamente uma resposta cujo resultado de envio externo seja desconhecido. Uma confirmação da API Meta representa aceite do envio, não comprova entrega ao destinatário.

## Pendências que não dependem apenas do código

- Configurar e validar Google, Meta Embedded Signup e Paddle com as contas do proprietário.
- Conferir visualmente cadastro, menus, bloqueios e experiência móvel em navegador autorizado.
- Classificar individualmente as 15 contas anteriores antes de remover a condição de transição.
- Validar consequências de números existentes e acesso às métricas financeiras Meta.
- Validar arquivos de cada sistema externo e uma política sustentável de manutenção das agendas.
- Definir retenção/exportação e eventual política de uso do plano pago antes de ampliar a oferta.
