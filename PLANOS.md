# Planos e Paddle

| Plano | Mensal | Anual à vista | Respostas/mês | Transcrição/mês | Imagens/mês | Agendas | Voz com IA/mês |
|---|---:|---:|---:|---:|---:|---:|---:|
| Free | Grátis | Grátis | 50 | 5 min | 15 | 1 | — |
| Pro | R$ 129 | R$ 1.188 (R$ 99/mês) | 1.000 | 60 min | 200 | 2 | 15 min |
| Ultra | R$ 249 | R$ 2.388 (R$ 199/mês) | Ilimitadas | Ilimitada | Ilimitadas | Ilimitadas | 60 min |

Os limites comerciais vêm de `src/plans.ts` e o acesso pago depende do período capturado na Paddle. A cota reinicia no primeiro dia de cada mês no fuso `America/Sao_Paulo`, inclusive no anual. O mesmo consumo mensal acompanha a clínica durante uma troca de plano. Simulador e atendimento humano não consomem a cota de respostas automáticas. O Free é o plano inicial de novas contas, sem cartão, sem Paddle e sem prazo de validade; o atendimento real ainda exige a preparação da clínica. Novas ativações não iniciam o teste antigo de sete dias. Testes já iniciados mantêm o prazo registrado e a conta passa ao Free quando ele acaba, se já estiver vinculada a um dos três planos.

A agenda permite novos agendamentos nos primeiros profissionais ativos, por ordem de cadastro, até a capacidade do plano. Um downgrade preserva todos os cadastros e horários existentes; o responsável pode pausar profissionais para escolher quais agendas continuam disponíveis. A resposta por voz é optativa no treinamento, para áudios recebidos, e usa Workers AI (`xai/grok-tts`) em português. O áudio é medido em segundos antes do envio. Se a cota de voz acabou ou o provedor está indisponível, a resposta segue em texto. Áudio de entrada sem duração reconhecida fica disponível para o atendimento humano sem consumir transcrição.

## Fluxos

- A página Plano informa validade com data e hora de Brasília e o estado da renovação. O botão do plano vigente some; os outros planos continuam disponíveis. Uma troca confirmada recebe o selo de agendamento.
- O seletor mensal ou anual atualiza os preços e o ciclo dos botões de Pro e Ultra. Cada botão abre um checkout com plano e ciclo fixos em `/checkout?plan=...&cycle=...`. Novas contratações têm renovação automática até o cancelamento na Paddle. O servidor mantém uma única transação aberta por clínica e valida preço, moeda, ciclo, quantidade e imposto. O Free não passa pelo formulário de pagamento.
- Uma troca entre planos pagos mostra a prévia da Paddle com a data e o total da próxima cobrança. A cobrança recorrente é ajustada para a mesma data, sem cobrança ou crédito proporcional imediato. Os recursos só mudam após o fim do período atual e a confirmação de pagamento do novo.
- Cancelar a renovação preserva a validade já paga. Reativar remove o cancelamento futuro. Para agendar outro plano pago com a renovação desativada, o cliente precisa reativá-la. O Free fica indisponível para seleção durante o período pago. Ao expirar, a conta usa os limites do Free enquanto aguarda uma eventual confirmação de pagamento.
- `transaction.completed` e os eventos `subscription.*` são gravados antes de o Worker confirmar o recebimento. O processamento começa em segundo plano após o recebimento e o cron recupera eventos pendentes. O checkout consulta o plano durante a confirmação. Retorno do navegador, Pix pendente e alteração de itens na Paddle não liberam recursos.
- Se a Paddle bloquear uma troca por causa do meio de pagamento, o checkout mostra a orientação e o link da Paddle para atualizar esse meio. O cliente volta ao checkout para conferir a nova prévia.
- Preços históricos continuam válidos para identificar pagamentos já feitos. Os dois IDs antigos ficam configurados apenas para leitura de eventos; novos checkouts usam exclusivamente os quatro preços atuais.

## Configuração e validação

1. Aplique `migrations/0019_plan_tiers.sql` antes de publicar a aplicação que consulta as novas tabelas. Para testar localmente no Worker isolado: `npx wrangler d1 migrations apply DB --local --config wrangler.paddle-sandbox.jsonc`. O mesmo arquivo contém os quatro IDs que já foram cadastrados na sandbox. `python scripts/paddle_plan_catalog.py --sandbox` é idempotente para recuperar ou recriar esse catálogo com uma chave autorizada.
2. Configure `PADDLE_ENVIRONMENT`, `PADDLE_ENABLED`, `PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY` e `PADDLE_WEBHOOK_SECRET`. A chave do Worker deve poder ler preços, ler/criar/atualizar transações e ler/atualizar planos na Paddle (`subscription.read`, `subscription.write`). Defina `/checkout` como link padrão do domínio do ambiente e inscreva o destino `/api/webhooks/paddle` em `transaction.completed` e nos eventos de ciclo de vida `subscription.*`. A rota `_ptxn` continua disponível para links de pagamento da Paddle.
3. Preços novos em BRL, com `tax_mode: internal`, quantidade mínima e máxima de 1, ciclo de um mês ou um ano, sem teste ou sobrescritas de moeda: `PADDLE_PRO_MONTHLY_PRICE_ID` = 12900, `PADDLE_PRO_YEARLY_PRICE_ID` = 118800, `PADDLE_ULTRA_MONTHLY_PRICE_ID` = 24900, `PADDLE_ULTRA_YEARLY_PRICE_ID` = 238800 (centavos). IDs e chaves da sandbox não funcionam em produção.
4. Na sandbox, faça uma compra com método de teste e valide captura, remoção do botão, alternância de renovação, upgrade/downgrade e Pix pendente. Em uma troca, confirme que a prévia mantém a data de renovação e que os recursos atuais permanecem após a atualização na Paddle. Teste a ativação do próximo período com os testes locais, que simulam a passagem de tempo. Antes de publicar em produção, conclua uma compra sandbox com o catálogo novo, valide a cobrança recorrente e confirme a disponibilidade do provedor de voz no Worker. Nenhuma configuração de produção foi alterada nesta revisão.

Referências: [checkout inline da Paddle](https://developer.paddle.com/build/checkout/build-branded-inline-checkout/), [prévia de alteração](https://developer.paddle.com/api-reference/subscriptions/preview-subscription-update/), [modelos de voz da Cloudflare](https://developers.cloudflare.com/ai/models/xai/grok-tts/).
