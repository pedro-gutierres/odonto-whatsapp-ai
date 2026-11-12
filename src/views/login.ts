export const LOGIN_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acesso à Plataforma | Aura AI Odonto & Estética</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .bg-pattern {
      background: radial-gradient(circle at 50% 30%, rgba(0, 128, 105, 0.12) 0%, rgba(11, 15, 23, 1) 75%);
    }
  </style>
</head>
<body class="bg-[#0b0f17] text-slate-100 min-h-screen flex items-center justify-center p-4 bg-pattern selection:bg-[#008069] selection:text-white">

  <div class="w-full max-w-md">
    
    <!-- LOGO SUPERIOR -->
    <div class="text-center mb-8">
      <a href="/" class="inline-flex items-center gap-3 group">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#008069] to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-emerald-900/40 font-bold text-xl transition group-hover:scale-105">
          <i class="fa-solid fa-sparkles"></i>
        </div>
        <div class="text-left">
          <span class="text-xl font-extrabold tracking-tight text-white">Aura<span class="text-emerald-400">AI</span></span>
          <span class="text-[11px] block font-semibold text-slate-400 uppercase tracking-widest -mt-1">Painel da Clínica</span>
        </div>
      </a>
    </div>

    <!-- CARD DE LOGIN -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-7 shadow-2xl backdrop-blur-xl">
      <div class="mb-6">
        <h2 class="text-xl font-bold text-white mb-1">Acesse sua Central</h2>
        <p class="text-xs text-slate-400">Entre com o email e senha cadastrados da sua clínica.</p>
      </div>

      <div id="errorAlert" class="hidden mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
        <i class="fa-solid fa-circle-exclamation shrink-0"></i>
        <span id="errorMessage">Email ou senha incorretos.</span>
      </div>

      <div id="googleSignIn"></div><p id="googleSignInNotice" class="text-xs text-emerald-300 my-3" role="status"></p>
      <form onsubmit="handleLogin(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5" for="email">Email Corporativo</label>
          <div class="relative">
            <i class="fa-regular fa-envelope absolute left-3.5 top-3.5 text-slate-500 text-xs"></i>
            <input type="email" id="email" required autocomplete="email" placeholder="recepcao@suaclinica.com" 
              class="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition">
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-slate-300" for="password">Senha de Acesso</label>
            <span class="text-[11px] text-slate-500">Recuperação via Suporte</span>
          </div>
          <div class="relative">
            <i class="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-500 text-xs"></i>
            <input type="password" id="password" required autocomplete="current-password" placeholder="••••••••" 
              class="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition">
            <button type="button" onclick="togglePasswordVisibility()" class="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 text-xs">
              <i class="fa-regular fa-eye" id="toggleIcon"></i>
            </button>
          </div>
        </div>

        <button type="submit" id="submitBtn"
          class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 mt-2">
          <span>Entrar no Painel</span>
          <i class="fa-solid fa-arrow-right text-xs"></i>
        </button>
      </form>

      <!-- LINK PARA CADASTRO PÚBLICO -->
      <div class="mt-5 text-center">
        <p class="text-xs text-slate-400">
          Sua clínica ainda não usa a Aura AI?
          <a href="/cadastro" class="text-emerald-400 font-semibold underline ml-1">
            Começar Teste Grátis de 7 dias
          </a>
        </p>
      </div>

      <!-- CREDENCIAIS DE DEMO / TESTE -->
      <div class="mt-6 pt-5 border-t border-slate-800/80">
        <div class="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-xs">
          <p class="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <i class="fa-solid fa-key text-emerald-400"></i> Acesso de Demonstração / Teste:
          </p>
          <div class="text-[11px] text-slate-400 font-mono space-y-0.5">
            <p>Email: <span class="text-emerald-400 cursor-pointer underline" onclick="fillCreds('admin@clinica.com')">admin@clinica.com</span></p>
            <p>Senha: <span class="text-emerald-400 cursor-pointer underline" onclick="fillCreds('admin@clinica.com')">admin123</span></p>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center mt-6 text-xs text-slate-500">
      <a href="/" class="hover:text-slate-300 transition flex items-center justify-center gap-1.5">
        <i class="fa-solid fa-arrow-left text-[10px]"></i> Voltar à página principal
      </a>
    </div>

  </div>

  <script>
    // Se já estiver logado, redireciona direto
    async function checkExistingAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            window.location.href = '/inbox';
          }
        }
      } catch {}
    }
    checkExistingAuth();

    function fillCreds(email) {
      document.getElementById('email').value = email;
      document.getElementById('password').value = 'admin123';
    }

    function togglePasswordVisibility() {
      const p = document.getElementById('password');
      const icon = document.getElementById('toggleIcon');
      if (p.type === 'password') {
        p.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
      } else {
        p.type = 'password';
        icon.className = 'fa-regular fa-eye';
      }
    }

    async function handleLogin(e) {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('submitBtn');
      const alertEl = document.getElementById('errorAlert');
      const errorMsg = document.getElementById('errorMessage');

      alertEl.classList.add('hidden');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Autenticando...</span>';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          errorMsg.innerText = data.error || 'Credenciais inválidas. Verifique os dados.';
          alertEl.classList.remove('hidden');
          btn.disabled = false;
          btn.innerHTML = '<span>Entrar no Painel</span><i class="fa-solid fa-arrow-right text-xs"></i>';
          return;
        }

        // Login com sucesso!
        window.location.href = '/inbox';
      } catch (err) {
        errorMsg.innerText = 'Falha na conexão com o servidor.';
        alertEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<span>Entrar no Painel</span><i class="fa-solid fa-arrow-right text-xs"></i>';
      }
    }
  </script>
<script src="/js/google-auth.js?v=3"></script>
</body>
</html>`;
