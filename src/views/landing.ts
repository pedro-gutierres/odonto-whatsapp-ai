export const LANDING_HTML = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aura · IA para clínicas de odontologia e estética</title><meta name="description" content="Transforme conversas no WhatsApp em avaliações agendadas. Teste sua IA no Simulador e ative 7 dias grátis no WhatsApp Oficial, sem cartão."><link rel="stylesheet" href="/css/aura.css?v=6"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"></head>
<body class="aura-public aura-commercial">
<header class="aura-public-header">
  <a href="/" class="aura-brand" aria-label="Aura, início"><span class="aura-brand-mark">a</span><span class="aura-brand-name">aura</span></a>
  <nav class="aura-public-nav" aria-label="Navegação principal"><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a><a id="navLoginBtn" href="/login">Entrar</a><a id="navRegisterBtn" href="/register" class="aura-primary">Testar IA agora <span aria-hidden="true">↗</span></a></nav>
</header>
<main class="aura-public-main">
  <section class="aura-hero" aria-labelledby="heroTitle">
    <div><p class="aura-eyebrow">IA Oficial para Odontologia e Estética</p><h1 id="heroTitle">Transforme cliques em pacientes agendados no WhatsApp em segundos.</h1><p>Sua recepção ativa 24h por dia com Inteligência Artificial. O Aura responde dúvidas sobre procedimentos, ouve áudios, envia fotos, consulta a agenda de cada profissional e marca avaliações automaticamente na API Oficial da Meta.</p>
      <div class="aura-hero-actions"><a href="/register" class="aura-primary">Criar conta e simular minha IA <span aria-hidden="true">→</span></a><a href="#planos" class="aura-secondary">Ver planos e teste de 7 dias</a></div>
      <p class="aura-small-note">Teste o Simulador gratuitamente ao criar sua conta. O cadastro não inicia seu teste de 7 dias no WhatsApp — você só ativa quando estiver tudo pronto, sem precisar de cartão.</p>
    </div>
    <div class="aura-chat-preview" aria-label="Exemplo ilustrativo de agendamento no WhatsApp">
      <div class="aura-chat-preview-head"><span class="aura-chat-avatar" aria-hidden="true">a</span><div>Aura · Recepção da clínica<span class="aura-chat-availability"><i aria-hidden="true"></i>Disponível para atender, mesmo à noite</span></div><span class="aura-chat-time">21:42</span></div>
      <div class="aura-chat-preview-body">
        <div class="aura-chat-day">Hoje · fora do expediente</div>
        <div class="aura-preview-bubble is-user">Boa noite! Quero fazer clareamento. Como funciona a avaliação?</div>
        <div class="aura-preview-bubble">Boa noite! Vou te ajudar 😊 Na avaliação inicial, a Dra. Camila conversa sobre o que você busca, examina seu sorriso e orienta sobre as opções de clareamento indicadas para você.</div>
        <div class="aura-preview-bubble">Consultei a agenda da Dra. Camila: amanhã temos <strong>09h ou 15h30</strong> para a avaliação. Qual fica melhor para você?</div>
        <div class="aura-preview-bubble is-user">Amanhã às 15h30 fica ótimo! Pode marcar.</div>
        <div class="aura-preview-bubble">Combinado! Me informe seu nome completo para concluir seu agendamento.</div>
      </div>
      <p class="aura-preview-caption">Conversa ilustrativa. Respostas e horários seguem o treinamento e a disponibilidade da sua clínica.</p>
    </div>
  </section>
  <section id="como-funciona" class="aura-public-section" aria-labelledby="howTitle">
    <p class="aura-eyebrow">DO PRIMEIRO TESTE AO PRIMEIRO PACIENTE</p><h2 id="howTitle">Comece a usar em 3 passos simples</h2>
    <div class="aura-feature-grid">
      <div><div class="aura-feature-index">01 · EXPERIMENTE</div><h3>Simule na hora (já pré-treinada)</h3><p>Ao criar sua conta, a IA já vem configurada com um modelo para Odontologia ou Estética. Converse com ela no Simulador em menos de 1 minuto.</p></div>
      <div><div class="aura-feature-index">02 · PERSONALIZE</div><h3>Personalize sua rotina</h3><p>Ajuste seus procedimentos, valores, regras de avaliação e os horários de cada profissional da sua equipe. O atendimento fica com o jeito da sua clínica.</p></div>
      <div><div class="aura-feature-index">03 · ATIVE QUANDO QUISER</div><h3>Conecte seu WhatsApp e ative 7 dias grátis</h3><p>Vincule seu número na API Oficial da Meta e libere 7 dias de atendimento real ou 100 respostas da IA, o que acontecer primeiro. Sem cartão e sem cobrança automática.</p></div>
    </div>
  </section>
  <section id="recursos" class="aura-public-section" aria-labelledby="featuresTitle">
    <p class="aura-eyebrow">MENOS ESPERA. MAIS CONVERSAS QUE AVANÇAM.</p><h2 id="featuresTitle">Por que clínicas trocam robôs de menu pelo Aura</h2>
    <div class="aura-feature-grid">
      <div><div class="aura-feature-index" aria-hidden="true">01 / ESCUTA</div><h3>Compreensão real de Áudios e Textos</h3><p>Nada de “Digite 1 para agendar”. O paciente manda áudio explicando o que sente ou o que deseja fazer, e a IA responde de forma humana e acolhedora, com as orientações da sua clínica.</p></div>
      <div><div class="aura-feature-index" aria-hidden="true">02 / ORGANIZAÇÃO</div><h3>Agenda Inteligente Multi-Profissional</h3><p>Respeita expedientes individuais, intervalos de almoço, bloqueios de horário e a duração de cada procedimento. Oferece horários disponíveis sem conflitos na agenda do Aura.</p></div>
      <div><div class="aura-feature-index" aria-hidden="true">03 / CONTROLE</div><h3>Transbordo Humano + Espelho no Painel</h3><p>Acompanhe todas as conversas ao vivo. Se a recepcionista assumir o chat com um clique, a IA pausa automaticamente naquele contato. Sua equipe continua no controle.</p></div>
    </div>
  </section>
  <section id="planos" class="aura-public-section" aria-labelledby="pricingTitle">
    <p class="aura-eyebrow">EXPERIMENTE ANTES DE ESCOLHER</p><h2 id="pricingTitle">Investimento transparente que se paga no primeiro agendamento</h2>
    <p class="aura-section-intro">Todas as contas incluem <strong>30 mensagens no Simulador (Test Drive)</strong> + <strong>7 dias grátis de operação real no WhatsApp (até 100 respostas da IA)</strong>. Sem cartão de crédito. Você decide quando ativar o atendimento real.</p>
    <div class="aura-pricing-grid">
      <article class="aura-pricing-card" aria-labelledby="monthlyTitle">
        <div class="aura-pricing-heading"><h3 id="monthlyTitle">Plano Mensal</h3><span class="aura-pricing-period">Flexibilidade para começar</span></div>
        <p class="aura-price-value">R$ 199 <span>/ mês</span></p><p class="aura-pricing-detail">Ideal para validar na rotina da sua clínica.</p>
        <a href="/register" class="aura-secondary" aria-label="Começar pelo teste grátis do Plano Mensal">Começar pelo teste grátis <span aria-hidden="true">→</span></a>
        <ul class="aura-pricing-list"><li>Atendimento IA 24/7 no WhatsApp Oficial</li><li>Agendas de múltiplos profissionais</li><li>Transcrição de áudios e leitura de imagens</li><li>Painel de atendimento em tempo real</li><li>Confirmações de véspera</li></ul>
        <p class="aura-small-note">Contrate depois de experimentar. Sem cobrança automática ao terminar o teste.</p>
      </article>
      <article class="aura-pricing-card is-featured" aria-labelledby="yearlyTitle">
        <div class="aura-pricing-heading"><h3 id="yearlyTitle">Plano Anual</h3><span class="aura-price-badge">Mais escolhido</span></div>
        <p class="aura-price-value">R$ 179 <span>/ mês</span></p><p class="aura-pricing-detail"><strong>R$ 2.148 cobrados anualmente</strong><br>Economia de R$ 240/ano em relação ao mensal.</p>
        <a href="/register" class="aura-primary" aria-label="Começar pelo teste grátis do Plano Anual">Começar pelo teste grátis <span aria-hidden="true">→</span></a>
        <ul class="aura-pricing-list"><li>Atendimento IA 24/7 no WhatsApp Oficial</li><li>Agendas de múltiplos profissionais</li><li>Transcrição de áudios e leitura de imagens</li><li>Painel de atendimento em tempo real</li><li>Confirmações de véspera</li><li>Atendimento prioritário e economia anual</li></ul>
        <p class="aura-small-note">O valor mensal é equivalente. O plano anual é cobrado de uma só vez.</p>
      </article>
    </div>
    <div class="aura-pricing-transparency"><p>Conexão pela <strong>API Oficial da Meta (Cloud API)</strong>, para estabilidade no atendimento. Eventuais tarifas de mensageria da própria Meta são separadas da assinatura do Aura e gerenciadas na conta Meta do seu negócio.</p><p>O teste termina em 7 dias ou 100 respostas da IA, o que acontecer primeiro. Após o teste, você escolhe se deseja contratar um plano. A assinatura escolhida tem renovação automática, informada e aceita no checkout.</p></div>
  </section>
  <section id="duvidas" class="aura-public-section" aria-labelledby="faqTitle">
    <p class="aura-eyebrow">PODE PERGUNTAR</p><h2 id="faqTitle">Tudo claro antes de começar</h2>
    <div class="aura-faq">
      <details><summary>Preciso cadastrar cartão de crédito para testar os 7 dias?</summary><p>Não. Você cria a conta, testa no Simulador e ativa os 7 dias grátis sem cartão. O cadastro não inicia seu teste: o prazo só começa quando você confirma a ativação do atendimento no WhatsApp, com treinamento, conexão e agenda prontos. O limite é de 7 dias ou 100 respostas da IA, o que acontecer primeiro.</p></details>
      <details><summary>E se minha clínica já usar outro sistema de agenda?</summary><p>Você escolhe entre usar a agenda completa do Aura, reservar faixas de horários dedicadas para a IA ou manter sua agenda externa e importar os horários ocupados como bloqueios via CSV. Nos dois últimos modos, sua equipe mantém as disponibilidades atualizadas no Aura; não há sincronização automática com outro sistema.</p></details>
      <details><summary>A IA passa preço de procedimentos ou foca na avaliação?</summary><p>Você escolhe no treinamento: ela pode informar valores exatos, valores “a partir de” ou conduzir direto para o agendamento da avaliação inicial. Personalize os exemplos do seu modelo com os valores e as orientações da sua clínica antes de ativar o atendimento real.</p></details>
      <details><summary>Posso usar no mesmo número de WhatsApp que já tenho hoje?</summary><p>Sim, desde que o número atenda aos requisitos da API Oficial da Meta. Você pode migrar seu número para a Cloud API ou usar um número dedicado. Manter o aplicativo WhatsApp Business junto com a API depende da elegibilidade da conta e da disponibilidade do fluxo de coexistência na conexão Meta. Confira essa opção antes de migrar: a migração convencional pode interromper o uso do número no aplicativo.</p></details>
    </div>
  </section>
  <section class="aura-public-section aura-final-cta" aria-labelledby="finalTitle"><p class="aura-eyebrow">SUA PRÓXIMA CONVERSA PODE VIRAR UMA AVALIAÇÃO</p><h2 id="finalTitle">Veja sua IA atendendo antes de conectar o WhatsApp.</h2><p>Escolha sua área, crie a conta e converse com o modelo pronto para sua clínica.</p><a href="/register" class="aura-primary">Criar conta e simular minha IA <span aria-hidden="true">→</span></a><p class="aura-small-note">30 mensagens no Simulador. Sem cartão. Sem iniciar o prazo do teste real.</p></section>
</main>
<footer class="aura-public-footer"><span>Aura · Atendimento com IA para Odontologia e Estética</span><a href="/login">Já tem conta? Entrar no painel</a></footer>
<script>fetch('/api/auth/me').then(response=>response.ok?response.json():null).then(data=>{if(data&&data.authenticated){const button=document.getElementById('navRegisterBtn');button.href='/inbox';button.textContent='Abrir meu painel';document.getElementById('navLoginBtn').classList.add('hidden');}}).catch(()=>{});</script>
</body></html>`;
