export const REGISTER_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cadastro Grátis (7 Dias) | Aura AI Odonto & Estética</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .bg-pattern {
      background: radial-gradient(circle at 50% 15%, rgba(0, 128, 105, 0.14) 0%, rgba(11, 15, 23, 1) 75%);
    }
  </style>
</head>
<body class="bg-[#0b0f17] text-slate-100 min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-pattern selection:bg-[#008069] selection:text-white antialiased">

  <!-- CABEÇALHO / LOGO -->
  <header class="w-full max-w-5xl mx-auto pt-2 pb-6 flex items-center justify-between">
    <a href="/" class="inline-flex items-center gap-3 group">
      <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#008069] to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-emerald-900/40 font-bold text-lg transition group-hover:scale-105">
        <i class="fa-solid fa-sparkles"></i>
      </div>
      <div class="text-left">
        <span class="text-xl font-extrabold tracking-tight text-white">Aura<span class="text-emerald-400">AI</span></span>
        <span class="text-[11px] block font-semibold text-slate-400 uppercase tracking-widest -mt-1">Odonto & Estética 24h</span>
      </div>
    </a>

    <div class="text-xs text-slate-400">
      Já possui conta?
      <a href="/login" class="text-emerald-400 hover:text-emerald-300 font-bold transition ml-1 inline-flex items-center gap-1">
        <span>Fazer Login</span>
        <i class="fa-solid fa-arrow-right text-[10px]"></i>
      </a>
    </div>
  </header>

  <!-- CONTEÚDO PRINCIPAL (GRID 2 COLUNAS) -->
  <main class="w-full max-w-5xl mx-auto my-auto py-2">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- COLUNA LATERAL ESQUERDA: BENEFÍCIOS & SOCIAL PROOF (5 COLUNAS) -->
      <div class="order-2 lg:order-1 lg:col-span-5 space-y-5">
        
        <!-- CARD PRINCIPAL DE BENEFÍCIOS -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-md">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4">
            <i class="fa-solid fa-gift"></i>
            <span>Teste Grátis de 7 Dias Inclusos</span>
          </div>

          <h3 class="text-xl sm:text-2xl font-extrabold text-white mb-2 leading-tight">
            Sua clínica atendendo 24h por dia no WhatsApp.
          </h3>
          <p class="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
            Crie sua conta em 1 minuto e faça um Test Drive interativo com nossa IA sem precisar conectar seu WhatsApp oficial agora.
          </p>

          <ul class="space-y-4 text-xs sm:text-sm">
            <li class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                <i class="fa-solid fa-calendar-check"></i>
              </div>
              <div>
                <strong class="text-white block font-semibold text-xs sm:text-sm">7 Dias de Acesso Total</strong>
                <span class="text-slate-400 text-xs">Acesso irrestrito a todas as ferramentas, agenda CRM e configurações.</span>
              </div>
            </li>

            <li class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                <i class="fa-brands fa-whatsapp text-sm"></i>
              </div>
              <div>
                <strong class="text-white block font-semibold text-xs sm:text-sm">100 Mensagens no Simulador</strong>
                <span class="text-slate-400 text-xs">Converse com a IA e teste o agendamento de consultas em tempo real.</span>
              </div>
            </li>

            <li class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
              </div>
              <div>
                <strong class="text-white block font-semibold text-xs sm:text-sm">IA Claude 3.5 & 3.7 Sonnet</strong>
                <span class="text-slate-400 text-xs">Treinada especificamente para odontologia, harmonização e estética.</span>
              </div>
            </li>

            <li class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <strong class="text-white block font-semibold text-xs sm:text-sm">Sem Cartão e Sem Fidelidade</strong>
                <span class="text-slate-400 text-xs">Não solicitamos cartão de crédito para começar. Cancele quando quiser.</span>
              </div>
            </li>

            <li class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                <i class="fa-solid fa-bolt"></i>
              </div>
              <div>
                <strong class="text-white block font-semibold text-xs sm:text-sm">Pronta para Usar em 1 Minuto</strong>
                <span class="text-slate-400 text-xs">Já inclui procedimentos base pré-configurados (Botox, Clareamento, Profilaxia).</span>
              </div>
            </li>
          </ul>
        </div>

        <!-- CARD DE PROVA SOCIAL & SEGURANÇA -->
        <div class="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-xs backdrop-blur-sm">
          <p class="text-slate-300 italic mb-3 leading-relaxed">
            "Mais de 42% dos pacientes chamam à noite ou aos fins de semana. Com a Aura AI respondendo em 10 segundos, não perdemos mais nenhuma oportunidade."
          </p>
          <div class="flex items-center justify-between border-t border-slate-800/70 pt-3 text-[11px] text-slate-400">
            <div class="flex items-center gap-1.5 text-amber-400">
              <i class="fa-solid fa-star"></i>
              <i class="fa-solid fa-star"></i>
              <i class="fa-solid fa-star"></i>
              <i class="fa-solid fa-star"></i>
              <i class="fa-solid fa-star"></i>
              <span class="text-slate-300 font-bold ml-1">5.0</span>
            </div>
            <span class="text-slate-500 flex items-center gap-1">
              <i class="fa-solid fa-lock text-[10px] text-emerald-400"></i> Meta Cloud API Oficial
            </span>
          </div>
        </div>

      </div>

      <!-- COLUNA PRINCIPAL DIREITA: FORMULÁRIO DE CADASTRO (7 COLUNAS) -->
      <div class="order-1 lg:order-2 lg:col-span-7">
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          <div class="mb-6">
            <h2 class="text-xl sm:text-2xl font-bold text-white mb-1.5">Cadastre sua Clínica</h2>
            <p class="text-xs sm:text-sm text-slate-400">Preencha os dados abaixo para liberar seu acesso imediato.</p>
          </div>

          <!-- ALERTA DE ERRO -->
          <div id="errorAlert" class="hidden mb-5 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 transition">
            <i class="fa-solid fa-circle-exclamation shrink-0 mt-0.5 text-rose-400 text-sm"></i>
            <div id="errorMessage" class="leading-relaxed"></div>
          </div>

          <!-- FORMULÁRIO -->
          <form onsubmit="handleRegister(event)" class="space-y-4" novalidate>
            
            <!-- CAMPO: NOME DA CLÍNICA -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5" for="clinicName">
                Nome da Clínica <span class="text-emerald-400">*</span>
              </label>
              <div class="relative">
                <i class="fa-solid fa-hospital absolute left-3.5 top-3.5 text-slate-500 text-xs"></i>
                <input type="text" id="clinicName" name="clinicName" required placeholder="Ex: Clínica Sorriso & Harmonização"
                  class="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition">
              </div>
            </div>

            <!-- LINHA DUPLA: RESPONSÁVEL E WHATSAPP -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5" for="adminName">
                  Nome do(a) Responsável <span class="text-emerald-400">*</span>
                </label>
                <div class="relative">
                  <i class="fa-solid fa-user-doctor absolute left-3.5 top-3.5 text-slate-500 text-xs"></i>
                  <input type="text" id="adminName" name="adminName" required placeholder="Ex: Dra. Mariana Silveira"
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition">
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5" for="phone">
                  WhatsApp Corporativo <span class="text-emerald-400">*</span>
                </label>
                <div class="relative">
                  <i class="fa-brands fa-whatsapp absolute left-3.5 top-3.5 text-emerald-400 text-sm"></i>
                  <input type="tel" id="phone" name="phone" required placeholder="(11) 98888-1234" maxlength="15"
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition">
                </div>
              </div>
            </div>

            <!-- LINHA DUPLA: EMAIL E SENHA -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5" for="email">
                  E-mail Corporativo <span class="text-emerald-400">*</span>
                </label>
                <div class="relative">
                  <i class="fa-regular fa-envelope absolute left-3.5 top-3.5 text-slate-500 text-xs"></i>
                  <input type="email" id="email" name="email" required autocomplete="email" placeholder="contato@suaclinica.com"
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition">
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-semibold text-slate-300" for="password">
                    Senha de Acesso <span class="text-emerald-400">*</span>
                  </label>
                  <span class="text-[10px] text-slate-500">Mínimo 6 chars</span>
                </div>
                <div class="relative">
                  <i class="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-500 text-xs"></i>
                  <input type="password" id="password" name="password" required minlength="6" autocomplete="new-password" placeholder="••••••••"
                    class="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition">
                  <button type="button" onclick="togglePasswordVisibility()" title="Exibir ou ocultar senha"
                    class="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 text-xs p-0.5 focus:outline-none">
                    <i class="fa-regular fa-eye" id="toggleIcon"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- BOTÃO DE CADASTRO -->
            <button type="submit" id="submitBtn"
              class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 mt-4 cursor-pointer">
              <span>Criar Conta & Iniciar Teste Grátis</span>
              <i class="fa-solid fa-arrow-right text-xs"></i>
            </button>

            <!-- AVISO DE PRIVACIDADE E CARTÃO -->
            <p class="text-[11px] text-slate-500 text-center mt-2.5">
              Ao cadastrar, você concorda com os termos de uso. Nenhum cartão é solicitado para os 7 dias grátis.
            </p>
          </form>

          <!-- LINK PARA LOGIN -->
          <div class="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <span class="text-xs text-slate-400">Sua clínica já possui cadastro?</span>
            <a href="/login" class="text-xs font-bold text-emerald-400 hover:text-emerald-300 ml-1 transition">
              Fazer Login <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </a>
          </div>

        </div>

        <div class="text-center mt-4 text-xs text-slate-500">
          <a href="/" class="hover:text-slate-300 transition inline-flex items-center gap-1.5">
            <i class="fa-solid fa-arrow-left text-[10px]"></i> Voltar à página principal
          </a>
        </div>
      </div>

    </div>
  </main>

  <!-- RODAPÉ -->
  <footer class="w-full max-w-5xl mx-auto py-4 text-center text-xs text-slate-600">
    <p>Aura AI Odonto & Estética • Tecnologia Oficial WhatsApp Cloud API & Claude AI</p>
  </footer>

  <!-- SCRIPT CLIENT-SIDE -->
  <script>
    // 1. Redirecionamento se já houver sessão ativa
    async function checkExistingAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data && (data.user || data.authenticated)) {
            window.location.href = '/inbox';
          }
        }
      } catch {}
    }
    checkExistingAuth();

    // 2. Formatação reativa da máscara de telefone brasileiro
    function formatPhone(v) {
      const digits = v.replace(/\\D/g, '').slice(0, 11);
      if (digits.length <= 2) return digits ? '(' + digits : '';
      if (digits.length <= 6) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
      if (digits.length <= 10) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
      return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7, 11);
    }

    const phoneEl = document.getElementById('phone');
    if (phoneEl) {
      phoneEl.addEventListener('input', function(e) {
        e.target.value = formatPhone(e.target.value);
      });
    }

    // 3. Alternar visibilidade de senha
    function togglePasswordVisibility() {
      const p = document.getElementById('password');
      const icon = document.getElementById('toggleIcon');
      if (!p || !icon) return;
      if (p.type === 'password') {
        p.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
      } else {
        p.type = 'password';
        icon.className = 'fa-regular fa-eye';
      }
    }

    // 4. Submissão do formulário de cadastro
    async function handleRegister(e) {
      e.preventDefault();
      const clinicName = document.getElementById('clinicName').value.trim();
      const adminName = document.getElementById('adminName').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('submitBtn');
      const alertEl = document.getElementById('errorAlert');
      const errorMsg = document.getElementById('errorMessage');

      alertEl.classList.add('hidden');

      // Validação client-side
      if (!clinicName) {
        showError('Por favor, informe o nome da sua clínica.');
        return;
      }
      if (!adminName) {
        showError('Por favor, informe o nome do(a) responsável.');
        return;
      }
      const cleanPhone = phone.replace(/\\D/g, '');
      if (cleanPhone.length < 10) {
        showError('Informe um WhatsApp válido com DDD (pelo menos 10 dígitos).');
        return;
      }
      const EMAIL_REGEX = /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\\.[a-zA-Z]{2,}$/;
      if (email.length > 254 || !EMAIL_REGEX.test(email)) {
        showError('Por favor, informe um endereço de e-mail corporativo válido.');
        return;
      }
      if (password.length < 6) {
        showError('A senha de acesso deve ter no mínimo 6 caracteres.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Criando sua clínica...</span>';

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ clinicName, adminName, phone, email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          let msg = data.error || 'Erro ao realizar cadastro. Verifique os dados e tente novamente.';
          if (res.status === 409) {
            msg = 'Este e-mail já está cadastrado no sistema. <a href="/login" class="underline font-bold text-white hover:text-emerald-300 ml-1">Fazer login agora &rarr;</a>';
          }
          showError(msg);
          btn.disabled = false;
          btn.innerHTML = '<span>Criar Conta & Iniciar Teste Grátis</span><i class="fa-solid fa-arrow-right text-xs"></i>';
          return;
        }

        // Sucesso no cadastro!
        btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Conta criada com sucesso! Entrando...</span>';
        btn.classList.remove('bg-emerald-500', 'hover:bg-emerald-400');
        btn.classList.add('bg-emerald-600');

        window.location.href = data.redirect || '/inbox';
      } catch (err) {
        showError('Falha de conexão com o servidor. Verifique sua conexão à internet e tente novamente.');
        btn.disabled = false;
        btn.innerHTML = '<span>Criar Conta & Iniciar Teste Grátis</span><i class="fa-solid fa-arrow-right text-xs"></i>';
      }

      function showError(html) {
        errorMsg.innerHTML = html;
        alertEl.classList.remove('hidden');
        alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  </script>
</body>
</html>`;
