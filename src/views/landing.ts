export const LANDING_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Dental & Estética | Secretária de Inteligência Artificial 24h no WhatsApp</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .hero-glow {
      background: radial-gradient(circle at 50% 20%, rgba(0, 128, 105, 0.15) 0%, rgba(15, 23, 42, 0) 70%);
    }
  </style>
</head>
<body class="bg-[#0b0f17] text-slate-100 min-h-screen selection:bg-[#008069] selection:text-white flex flex-col">

  <!-- NAV SUPERIOR -->
  <header class="border-b border-slate-800/80 bg-[#0b0f17]/90 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#008069] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-[#008069]/20 font-bold text-lg">
          <i class="fa-solid fa-sparkles"></i>
        </div>
        <div>
          <span class="text-lg font-extrabold tracking-tight text-white">Aura<span class="text-emerald-400">AI</span></span>
          <span class="text-[10px] block font-semibold text-slate-400 uppercase tracking-widest -mt-1">Odonto & Estética 24h</span>
        </div>
      </div>

      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
        <a href="#beneficios" class="hover:text-emerald-400 transition">Como Funciona</a>
        <a href="#metricas" class="hover:text-emerald-400 transition">Retorno sobre Investimento</a>
      </nav>

      <div class="flex items-center gap-3">
        <a id="navLoginBtn" href="/login" 
          class="text-xs font-semibold text-slate-300 hover:text-white transition px-3 py-2 flex items-center gap-1.5">
          <i class="fa-solid fa-lock text-xs text-slate-400"></i>
          <span>Entrar</span>
        </a>
        <a id="navRegisterBtn" href="/cadastro" 
          class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2">
          <i class="fa-solid fa-sparkles text-xs"></i>
          <span>Começar Teste Grátis</span>
        </a>
      </div>
    </div>
  </header>

  <!-- HERO SECTION -->
  <main class="flex-1 hero-glow">
    <section class="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
      
      <!-- Pill Badge -->
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-8">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Tecnologia Oficial WhatsApp Cloud API & Claude AI</span>
      </div>

      <h1 class="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
        A Secretária IA que <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">fecha consultas de alto ticket</span> no seu WhatsApp 24h por dia.
      </h1>

      <p class="text-base sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
        Recupere pacientes que enviam mensagem às 23h de sexta ou no domingo à tarde. Resposta humanizada em 10 segundos, triagem inteligente de procedimentos (Botox, Clareamento, Implantes) e pré-agendamento automático.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto mb-16">
        <a href="/cadastro" class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5">
          <i class="fa-solid fa-sparkles text-xs"></i>
          <span>Começar Teste Grátis (7 Dias)</span>
          <i class="fa-solid fa-arrow-right text-xs"></i>
        </a>
        <a href="/login" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold text-sm transition flex items-center justify-center gap-2">
          <i class="fa-solid fa-lock text-xs text-slate-400"></i>
          <span>Já sou cliente / Entrar</span>
        </a>
      </div>

      <!-- MÉTRICAS DE IMPACTO -->
      <div id="metricas" class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-800/80 max-w-4xl mx-auto text-left">
        <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div class="text-3xl font-extrabold text-white mb-1"><span class="text-emerald-400">10</span> seg</div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tempo de Primeira Resposta</p>
          <p class="text-xs text-slate-500">Impede que o paciente busque a clínica concorrente no Google enquanto espera.</p>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div class="text-3xl font-extrabold text-white mb-1"><span class="text-emerald-400">+42%</span></div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Conversão Fora do Horário</p>
          <p class="text-xs text-slate-500">Mais de 40% das mensagens de anúncios chegam no almoço, noite ou finais de semana.</p>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div class="text-3xl font-extrabold text-white mb-1"><span class="text-emerald-400">100%</span></div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Intervenção Humana</p>
          <p class="text-xs text-slate-500">A sua recepcionista pode pausar a IA com 1 clique a qualquer momento e assumir.</p>
        </div>
      </div>
    </section>

    <!-- CARACTERÍSTICAS EM DESTAQUE -->
    <section id="beneficios" class="max-w-6xl mx-auto px-6 py-20 border-t border-slate-800/60">
      <div class="text-center mb-16">
        <h2 class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Engenharia de Conversão</h2>
        <h3 class="text-3xl font-extrabold text-white">Construído para clínicas que valorizam cada lead.</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-7 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mb-5">
            <i class="fa-solid fa-headset"></i>
          </div>
          <h4 class="text-lg font-bold text-white mb-2">Atendimento Humanizado</h4>
          <p class="text-xs text-slate-400 leading-relaxed">
            Nada de menus com "Digite 1 para agendar". A IA conversa como uma secretária sênior empática, tirando dúvidas reais com elegância.
          </p>
        </div>

        <div class="p-7 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mb-5">
            <i class="fa-solid fa-calendar-check"></i>
          </div>
          <h4 class="text-lg font-bold text-white mb-2">Painel de Pré-Agendamento</h4>
          <p class="text-xs text-slate-400 leading-relaxed">
            Todas as consultas combinadas pela IA caem direto em uma tabela de agendamentos organizada por horário e procedimento para sua equipe confirmar.
          </p>
        </div>

        <div class="p-7 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mb-5">
            <i class="fa-solid fa-users"></i>
          </div>
          <h4 class="text-lg font-bold text-white mb-2">Multi-Atendimento Web</h4>
          <p class="text-xs text-slate-400 leading-relaxed">
            Sua recepcionista não precisa ficar no celular da clínica. Ela acessa o painel no computador, vê todos os chats ao vivo e envia respostas manuais.
          </p>
        </div>
      </div>
    </section>

    <!-- CHAMADA FINAL -->
    <section class="max-w-4xl mx-auto px-6 py-16 text-center">
      <div class="p-10 rounded-3xl bg-gradient-to-b from-slate-900 to-[#0e1626] border border-slate-800 relative overflow-hidden">
        <h3 class="text-2xl sm:text-3xl font-extrabold text-white mb-4">Pronto para nunca mais perder uma paciente?</h3>
        <p class="text-sm text-slate-400 max-w-xl mx-auto mb-8">
          Acesse a central com as credenciais da sua clínica para gerenciar atendimentos, agenda e treinamento da IA.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/cadastro" class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
            <i class="fa-solid fa-sparkles text-xs"></i>
            <span>Criar Conta & Testar Grátis</span>
          </a>
          <a href="/login" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold text-xs transition flex items-center justify-center gap-2">
            <i class="fa-solid fa-lock text-xs text-slate-400"></i>
            <span>Já possui conta? Entrar</span>
          </a>
        </div>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="border-t border-slate-800/80 bg-[#080c14] py-8 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="font-bold text-slate-400">Aura AI Odonto & Estética</span>
        <span>•</span>
        <span>Tecnologia Oficial Meta Cloud API</span>
      </div>
      <div>
        <span>Plataforma SaaS Segura • Brasil 2026</span>
      </div>
    </div>
  </footer>

  <script>
    // Se o usuário já tiver sessão autenticada (cookie HttpOnly), ajusta o botão para levar direto ao painel
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated) {
          const regBtn = document.getElementById('navRegisterBtn');
          if (regBtn) {
            regBtn.href = '/inbox';
            regBtn.innerHTML = '<i class="fa-solid fa-chart-pie text-xs"></i><span>Meu Painel</span>';
          }
          const loginBtn = document.getElementById('navLoginBtn');
          if (loginBtn) {
            loginBtn.style.display = 'none';
          }
        }
      })
      .catch(() => {});
  </script>
</body>
</html>`;
