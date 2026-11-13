# Planos e Paddle

| Plano | Mensal | Anual à vista | Respostas/mês | Transcrição/mês | Imagens/mês | Agendas | Voz com IA/mês |
|---|---:|---:|---:|---:|---:|---:|---:|
| Free | Grátis | Grátis | 50 | 5 min | 15 | 1 | — |
| Pro | R$ 129 | R$ 1.188 (R$ 99/mês) | 1.000 | 60 min | 200 | 2 | 15 min |
| Ultra | R$ 249 | R$ 2.388 (R$ 199/mês) | Ilimitadas | Ilimitada | Ilimitadas | Ilimitadas | 60 min |

As ofertas versionadas ficam em `plan_offers` e `plan_offer_prices`. O acesso pago depende do período confirmado na Paddle. O Free inicial repõe as cotas no dia 1, à meia-noite de Brasília. A primeira compra fixa a reposição no aniversário mensal do início do período pago, inclusive no anual. O consumo do Free no mês da compra entra no primeiro ciclo pago. O aniversário e o consumo do ciclo são preservados nas trocas, cancelamentos e novas contratações da mesma clínica. Simulador e atendimento humano não consomem a cota de respostas automáticas.

A agenda usa a ordem salva pelo responsável na página Plano. Por padrão, os profissionais ativos são ordenados pelo cadastro. Cadastros e consultas existentes são preservados ao reduzir a capacidade. Áudio é medido em segundos e, quando o envio por IA está indisponível, a resposta segue em texto.

## Fluxos

- A página Plano informa validade com data e hora de Brasília e o estado da renovação. O botão do plano vigente some; os outros planos continuam disponíveis. Uma troca confirmada recebe o selo de agendamento.
- O seletor mensal ou anual atualiza os preços e o ciclo dos botões de Pro e Ultra. Cada botão abre um checkout com plano e ciclo fixos em `/checkout?plan=...&cycle=...`. Novas contratações têm renovação automática até o cancelamento na Paddle. O servidor mantém uma única transação aberta por clínica e valida preço, moeda, ciclo, quantidade e imposto. O Free não passa pelo formulário de pagamento.
- Uma troca entre planos pagos mostra a prévia da Paddle com a data e o total da próxima cobrança. A cobrança recorrente é ajustada para a mesma data, sem cobrança ou crédito proporcional imediato. Os recursos só mudam após o fim do período atual e a confirmação de pagamento do novo.
- Cancelar pela Paddle preserva a validade já paga e desfaz a troca futura. Se houver renovação esperada em processamento, o Aura mantém o saldo anterior por até sete dias. Recursos ilimitados do Ultra ficam limitados a 50 respostas, 5 minutos de transcrição e 15 imagens em toda a tolerância. Depois desse prazo, aplica-se o Free. Ajustes confirmados de reembolso integral e chargeback afetam somente o período da transação vinculada.
- `transaction.completed` e os eventos `subscription.*` são gravados antes de o Worker confirmar o recebimento. O processamento começa em segundo plano após o recebimento e o cron recupera eventos pendentes. O checkout consulta o plano durante a confirmação. Retorno do navegador, Pix pendente e alteração de itens na Paddle não liberam recursos.
- Se a Paddle bloquear uma troca por causa do meio de pagamento, o checkout mostra a orientação e o link da Paddle para atualizar esse meio. O cliente volta ao checkout para conferir a nova prévia.
- Preços históricos continuam válidos para identificar pagamentos já feitos. Os dois IDs antigos ficam configurados apenas para leitura de eventos; novos checkouts usam exclusivamente os quatro preços atuais.

## Configuração e validação

1. Aplique as migrações até `0020_billing_lifecycle.sql` antes da publicação. Use primeiro o banco isolado `aura-paddle-sandbox-db` e compare datas, ofertas ativas e consumo antes e depois. O Worker sandbox declara os IDs das ofertas iniciais.
2. Configure `PADDLE_ENVIRONMENT`, `PADDLE_ENABLED`, `PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY` e `PADDLE_WEBHOOK_SECRET`. A chave precisa de leitura de preços, leitura/escrita de transações e planos e criação de sessões do portal. Configure o link padrão `/checkout` e o destino `/api/webhooks/paddle` com `transaction.completed`, os eventos de ciclo de vida `subscription.*`, `adjustment.created` e `adjustment.updated`.
3. Preços novos em BRL, com `tax_mode: internal`, quantidade mínima e máxima de 1, ciclo de um mês ou um ano, sem teste ou sobrescritas de moeda: `PADDLE_PRO_MONTHLY_PRICE_ID` = 12900, `PADDLE_PRO_YEARLY_PRICE_ID` = 118800, `PADDLE_ULTRA_MONTHLY_PRICE_ID` = 24900, `PADDLE_ULTRA_YEARLY_PRICE_ID` = 238800 (centavos). IDs e chaves da sandbox não funcionam em produção.
4. No sandbox, valide compra com cartão e Pix, confirmação pendente, troca, desistência, cancelamento e ajuste. Em produção, habilite vendas após validar domínio, credenciais, catálogo e webhooks próprios.

## Operação do catálogo

- `GET /api/admin/billing` lista ofertas, migrações recentes e revisões abertas para o superadministrador. `POST /api/admin/billing/offers` recebe `plan_id`, `version`, `name`, `monthly`, `yearly`, `responses`, `transcription`, `images`, `professionals`, `voice` e `prices: {monthly,yearly}` para ofertas pagas. Preços são em centavos, áudios em segundos e `null` significa ilimitado. Use IDs de preço novos para uma nova versão paga.
- `POST /api/admin/billing/migrations` recebe `tenant_id` e `target_offer_id`. O aviso sai pelo Resend com `BILLING_EMAIL_API_KEY` e `BILLING_EMAIL_FROM`. A chave precisa enviar e consultar mensagens. Entrega verificada a pelo menos 30 dias da renovação abre o aceite na página Plano. Sem entrega válida, a migração aguarda a próxima renovação elegível. O aceite termina duas horas antes da cobrança. Sem aceite, o cron confirma o fim da renovação antiga pela Paddle.
- Confira divergências e ajustes na Paddle antes de fechar uma revisão pelo `POST /api/admin/billing/resolve-review` com `id`. A ação fecha a revisão local. Em uma migração em revisão, a oferta será reavaliada para um próximo período elegível.

Referências: [checkout inline da Paddle](https://developer.paddle.com/build/checkout/build-branded-inline-checkout/), [prévia de alteração](https://developer.paddle.com/api-reference/subscriptions/preview-subscription-update/), [modelos de voz da Cloudflare](https://developers.cloudflare.com/ai/models/xai/grok-tts/).
