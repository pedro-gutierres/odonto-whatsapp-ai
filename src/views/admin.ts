export const ADMIN_HTML = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Super Admin | Aura AI SaaS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              DEFAULT: '#008069',
              dark: '#006a57',
              light: '#25d366'
            }
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.25); border-radius: 9999px; }
  </style>
</head>
<body class="bg-slate-100 dark:bg-[#0b0f17] text-slate-800 dark:text-slate-100 min-h-screen flex flex-col selection:bg-[#008069] selection:text-white transition-colors duration-200">

  <!-- HEADER -->
  <header class="h-16 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-md font-bold text-base">
        <i class="fa-solid fa-crown"></i>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">Aura<span class="text-emerald-500 dark:text-emerald-400">AI</span></span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/60">
            SUPER ADMIN
          </span>
        </div>
        <span class="text-[10px] block font-medium text-slate-500 dark:text-slate-400">Visão Global do SaaS • Clínicas & Usuários</span>
      </div>
    </div>

    <div class="flex items-center gap-2.5">
      <a href="/inbox" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
        <i class="fa-solid fa-arrow-left text-[10px]"></i>
        <span>Meu Painel</span>
      </a>

      <button onclick="loadOverview()" title="Atualizar Dados" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-xs transition">
        <i id="refreshIcon" class="fa-solid fa-rotate"></i>
      </button>

      <button onclick="toggleTheme()" title="Alternar Modo Escuro/Claro" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-xs transition">
        <i id="themeIcon" class="fa-solid fa-moon"></i>
      </button>

      <div class="pl-2 border-l border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <div class="hidden md:block text-right">
          <span id="adminUserName" class="text-xs font-bold text-slate-900 dark:text-white block leading-none">Super Admin</span>
          <span id="adminUserEmail" class="text-[10px] text-slate-400 font-medium">...</span>
        </div>
        <button onclick="handleLogout()" title="Sair da Plataforma" class="w-8 h-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center text-xs transition">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- CONTEÚDO PRINCIPAL -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-8">

    <!-- KPI CARDS -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clínicas</span>
          <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm"><i class="fa-solid fa-hospital"></i></div>
        </div>
        <div id="kpiTenants" class="text-2xl font-extrabold text-slate-900 dark:text-white">0</div>
        <p id="kpiTenantsSub" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">0 ativas</p>
      </div>

      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">WhatsApp Conectados</span>
          <div class="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-sm"><i class="fa-brands fa-whatsapp"></i></div>
        </div>
        <div id="kpiWhatsapp" class="text-2xl font-extrabold text-slate-900 dark:text-white">0</div>
        <p id="kpiWhatsappSub" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Com Phone Number ID real</p>
      </div>

      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mensagens Totais</span>
          <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-sm"><i class="fa-solid fa-comments"></i></div>
        </div>
        <div id="kpiMessages" class="text-2xl font-extrabold text-slate-900 dark:text-white">0</div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Entrada + Saída (IA/Humano)</p>
      </div>

      <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Agendamentos & Usuários</span>
          <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-sm"><i class="fa-regular fa-calendar-check"></i></div>
        </div>
        <div id="kpiAppointments" class="text-2xl font-extrabold text-slate-900 dark:text-white">0</div>
        <p id="kpiUsersSub" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">0 usuários cadastrados</p>
      </div>
    </section>

    <!-- SEÇÃO 1: CLÍNICAS (TENANTS) -->
    <section class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i class="fa-solid fa-building-user text-emerald-500"></i>
            <span>Clínicas Cadastradas (Tenants)</span>
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Gerencie status, número oficial do WhatsApp e volume operacional de cada clínica.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
            <input type="text" id="tenantSearch" oninput="renderTenantsTable()" placeholder="Buscar clínica ou ID..."
              class="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500">
          </div>
          <button onclick="openNewTenantModal()" class="px-3.5 py-2 rounded-xl bg-[#008069] hover:bg-[#006a57] text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm">
            <i class="fa-solid fa-plus text-[10px]"></i>
            <span>Nova Clínica</span>
          </button>
        </div>
      </div>

      <div class="overflow-x-auto custom-scroll">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-900/60 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th class="py-3 px-4 font-bold">Clínica / ID</th>
              <th class="py-3 px-4 font-bold">Status</th>
              <th class="py-3 px-4 font-bold">WhatsApp & Token</th>
              <th class="py-3 px-4 font-bold">Treinamento IA</th>
              <th class="py-3 px-4 font-bold">Uso</th>
              <th class="py-3 px-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody id="tenantsTableBody" class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <tr><td colspan="6" class="py-8 text-center text-slate-400">Carregando clínicas...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- SEÇÃO 2: USUÁRIOS -->
    <section class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i class="fa-solid fa-users text-sky-500"></i>
            <span>Usuários & Credenciais</span>
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Visualize os acessos por clínica, crie novos usuários ou redefina senhas de suporte.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
            <input type="text" id="userSearch" oninput="renderUsersTable()" placeholder="Buscar e-mail, nome ou clínica..."
              class="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500">
          </div>
          <button onclick="openNewUserModal()" class="px-3.5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-xs flex items-center gap-1.5 transition">
            <i class="fa-solid fa-user-plus text-[10px]"></i>
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      <div class="overflow-x-auto custom-scroll">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-900/60 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th class="py-3 px-4 font-bold">Usuário</th>
              <th class="py-3 px-4 font-bold">E-mail</th>
              <th class="py-3 px-4 font-bold">Clínica (tenant_id)</th>
              <th class="py-3 px-4 font-bold">Perfil</th>
              <th class="py-3 px-4 font-bold">Criado em</th>
              <th class="py-3 px-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody id="usersTableBody" class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <tr><td colspan="6" class="py-8 text-center text-slate-400">Carregando usuários...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

  </main>

  <!-- MODAL 1: NOVA CLÍNICA -->
  <div id="newTenantModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2"><i class="fa-solid fa-hospital text-emerald-500"></i><span>Cadastrar Nova Clínica</span></h3>
        <button onclick="closeModal('newTenantModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form onsubmit="handleCreateTenant(event)" class="space-y-3 pt-4 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold mb-1">Nome da Clínica *</label>
            <input type="text" id="ntName" oninput="syncTenantSlug()" required placeholder="Ex: Clínica Sorriso Real"
              class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="block font-semibold mb-1">ID da Clínica (slug) *</label>
            <input type="text" id="ntId" required pattern="[a-z0-9][a-z0-9-]{1,48}" placeholder="Ex: clinica-sorriso-real"
              class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-emerald-500">
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold mb-1">Phone Number ID (Meta)</label>
            <input type="text" id="ntPhoneId" placeholder="Deixe vazio se ainda não conectou"
              class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="block font-semibold mb-1">WABA ID (opcional)</label>
            <input type="text" id="ntWabaId" placeholder="Ex: 1020304050"
              class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-emerald-500">
          </div>
        </div>
        <div>
          <label class="block font-semibold mb-1">Access Token da Clínica (opcional — criptografado no D1)</label>
          <input type="password" id="ntToken" placeholder="Deixe vazio para usar o fallback WA_LAB_TOKEN"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
        </div>

        <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
          <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Usuário Administrador Inicial (Opcional)</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input type="text" id="ntUserName" placeholder="Nome (ex: Dra. Ana)"
              class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
            <input type="email" id="ntUserEmail" placeholder="E-mail de acesso"
              class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
            <input type="password" id="ntUserPass" placeholder="Senha inicial"
              class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeModal('newTenantModal')" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
          <button type="submit" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold">Criar Clínica</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL 2: EDITAR WHATSAPP & CONFIGURAÇÕES DA CLÍNICA -->
  <div id="editTenantModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2"><i class="fa-brands fa-whatsapp text-emerald-500"></i><span>Configurar Clínica / WhatsApp</span></h3>
        <button onclick="closeModal('editTenantModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form onsubmit="handleEditTenant(event)" class="space-y-3 pt-4 text-xs">
        <input type="hidden" id="etId">
        <div>
          <label class="block font-semibold mb-1">Nome da Clínica</label>
          <input type="text" id="etName" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label class="block font-semibold mb-1">Phone Number ID (Meta)</label>
          <input type="text" id="etPhoneId" placeholder="Deixe vazio para desconectar" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label class="block font-semibold mb-1">WABA ID (opcional)</label>
          <input type="text" id="etWabaId" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label class="block font-semibold mb-1">Novo Access Token da Meta (preencha só para trocar)</label>
          <input type="password" id="etToken" placeholder="Mantém o token atual se ficar em branco" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
          <label class="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" id="etClearToken" class="rounded">
            <span>Remover token próprio desta clínica (voltar para fallback WA_LAB_TOKEN)</span>
          </label>
        </div>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeModal('editTenantModal')" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
          <button type="submit" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold">Salvar Alterações</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL 3: NOVO USUÁRIO -->
  <div id="newUserModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2"><i class="fa-solid fa-user-plus text-sky-500"></i><span>Criar Novo Usuário</span></h3>
        <button onclick="closeModal('newUserModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form onsubmit="handleCreateUser(event)" class="space-y-3 pt-4 text-xs">
        <div>
          <label class="block font-semibold mb-1">Clínica (Tenant) *</label>
          <select id="nuTenantId" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"></select>
        </div>
        <div>
          <label class="block font-semibold mb-1">Nome Completo *</label>
          <input type="text" id="nuName" required placeholder="Ex: Recepção Centro" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label class="block font-semibold mb-1">E-mail de Login *</label>
          <input type="email" id="nuEmail" required placeholder="recepcao@clinica.com.br" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold mb-1">Senha *</label>
            <input type="password" id="nuPassword" required minlength="6" placeholder="Mín. 6 caracteres" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="block font-semibold mb-1">Cargo</label>
            <select id="nuRole" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
              <option value="admin">admin (Clínica)</option>
              <option value="staff">staff (Recepção)</option>
            </select>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeModal('newUserModal')" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
          <button type="submit" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold">Criar Usuário</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL 4: REDEFINIR SENHA -->
  <div id="resetPasswordModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2"><i class="fa-solid fa-key text-amber-500"></i><span>Redefinir Senha</span></h3>
        <button onclick="closeModal('resetPasswordModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form onsubmit="handleResetPassword(event)" class="space-y-3 pt-4 text-xs">
        <input type="hidden" id="rpUserId">
        <p class="text-slate-500 dark:text-slate-400">Nova senha para <strong id="rpUserEmail" class="text-slate-900 dark:text-white"></strong>:</p>
        <input type="password" id="rpNewPass" required minlength="6" placeholder="Digite a nova senha (mín. 6 caracteres)"
          class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500">
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeModal('resetPasswordModal')" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
          <button type="submit" class="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">Atualizar Senha</button>
        </div>
      </form>
    </div>
  </div>

  <!-- TOAST -->
  <div id="toastNotification" class="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none">
    <i id="toastIcon" class="fa-solid fa-circle-check text-emerald-400"></i>
    <span id="toastMsg">Salvo!</span>
  </div>

  <script>
    let adminData = { stats: {}, tenants: [], users: [] };
    let slugTouchedManually = false;

    function initTheme() {
      const saved = localStorage.getItem('aura_theme');
      if (saved === 'light') {
        document.documentElement.classList.remove('dark');
        document.getElementById('themeIcon').className = 'fa-solid fa-sun';
      } else {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').className = 'fa-solid fa-moon';
      }
    }

    function toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('aura_theme', isDark ? 'dark' : 'light');
      document.getElementById('themeIcon').className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }

    function escapeHtml(text) {
      if (text === null || text === undefined) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function showToast(msg, color) {
      const toast = document.getElementById('toastNotification');
      const icon = document.getElementById('toastIcon');
      document.getElementById('toastMsg').innerText = msg;
      icon.className = color === 'amber'
        ? 'fa-solid fa-triangle-exclamation text-amber-400'
        : color === 'rose'
          ? 'fa-solid fa-circle-exclamation text-rose-400'
          : 'fa-solid fa-circle-check text-emerald-400';
      toast.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3500);
    }

    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
    }

    async function init() {
      initTheme();
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.status === 401) { window.location.href = '/login'; return; }
        const meData = await meRes.json();
        if (meData && meData.user) {
          document.getElementById('adminUserName').innerText = meData.user.name || 'Super Admin';
          document.getElementById('adminUserEmail').innerText = meData.user.email || '';
        }
      } catch {}
      await loadOverview();
    }

    async function loadOverview() {
      const icon = document.getElementById('refreshIcon');
      if (icon) icon.classList.add('fa-spin');
      try {
        const res = await fetch('/api/admin/overview');
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (res.status === 403) { window.location.href = '/inbox'; return; }
        const data = await res.json();
        adminData = data;
        renderStats();
        renderTenantsTable();
        renderUsersTable();
      } catch (err) {
        showToast('Erro ao carregar visão geral', 'rose');
      } finally {
        if (icon) icon.classList.remove('fa-spin');
      }
    }

    function renderStats() {
      const s = adminData.stats || {};
      document.getElementById('kpiTenants').innerText = s.tenants_total ?? 0;
      document.getElementById('kpiTenantsSub').innerText = (s.tenants_active ?? 0) + ' ativa(s) de ' + (s.tenants_total ?? 0);
      document.getElementById('kpiWhatsapp').innerText = s.tenants_whatsapp_connected ?? 0;
      document.getElementById('kpiMessages').innerText = s.messages_total ?? 0;
      document.getElementById('kpiAppointments').innerText = s.appointments_total ?? 0;
      document.getElementById('kpiUsersSub').innerText = (s.users_total ?? 0) + ' usuário(s) cadastrado(s)';
    }

    function renderTenantsTable() {
      const tbody = document.getElementById('tenantsTableBody');
      const q = (document.getElementById('tenantSearch').value || '').toLowerCase().trim();
      const filtered = (adminData.tenants || []).filter(t =>
        !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.phone_number_id || '').toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">Nenhuma clínica encontrada.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(t => {
        const statusBadge = t.active
          ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">Ativa</span>'
          : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">Pausada</span>';

        const waBadge = t.whatsapp_configured
          ? '<div class="font-mono text-[11px] text-slate-800 dark:text-slate-200">' + escapeHtml(t.phone_number_id) + '</div>'
          : '<span class="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Não conectado</span>';

        const tokBadge = t.has_custom_token
          ? '<span class="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-semibold">Token próprio</span>'
          : '<span class="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">Fallback WA_LAB_TOKEN</span>';

        const trainBadge = t.training_complete
          ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">Completo</span>'
          : '<span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold text-[10px]">Pendente</span>';

        return '<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">' +
          '<td class="py-3.5 px-4"><div class="font-bold text-slate-900 dark:text-white">' + escapeHtml(t.name) + '</div><div class="font-mono text-[10px] text-slate-400">' + escapeHtml(t.id) + '</div></td>' +
          '<td class="py-3.5 px-4">' + statusBadge + '</td>' +
          '<td class="py-3.5 px-4">' + waBadge + ' ' + tokBadge + '</td>' +
          '<td class="py-3.5 px-4">' + trainBadge + '</td>' +
          '<td class="py-3.5 px-4 text-slate-600 dark:text-slate-300"><div>' + t.messages_count + ' msgs • ' + t.contacts_count + ' contatos</div><div class="text-[10px] text-slate-400">' + t.appointments_count + ' consultas • ' + t.users_count + ' usuário(s)</div></td>' +
          '<td class="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">' +
            '<button onclick="toggleTenantActive(\\'' + escapeHtml(t.id) + '\\', ' + (!t.active) + ')" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-[11px] transition">' + (t.active ? 'Pausar' : 'Ativar') + '</button>' +
            '<button onclick="openEditTenantModal(\\'' + escapeHtml(t.id) + '\\')" class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-semibold text-[11px] transition">Editar</button>' +
            '<button onclick="openNewUserModal(\\'' + escapeHtml(t.id) + '\\')" class="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 font-semibold text-[11px] transition">+ Usuário</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    function renderUsersTable() {
      const tbody = document.getElementById('usersTableBody');
      const q = (document.getElementById('userSearch').value || '').toLowerCase().trim();
      const filtered = (adminData.users || []).filter(u =>
        !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.tenant_id.toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(u => {
        const roleBadge = u.role === 'superadmin'
          ? '<span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold text-[10px]">superadmin</span>'
          : '<span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">' + escapeHtml(u.role) + '</span>';

        return '<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">' +
          '<td class="py-3 px-4 font-bold text-slate-900 dark:text-white">' + escapeHtml(u.name) + '</td>' +
          '<td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">' + escapeHtml(u.email) + '</td>' +
          '<td class="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">' + escapeHtml(u.tenant_id) + '</td>' +
          '<td class="py-3 px-4">' + roleBadge + '</td>' +
          '<td class="py-3 px-4 text-slate-400">' + escapeHtml(u.created_at) + '</td>' +
          '<td class="py-3 px-4 text-right">' +
            '<button onclick="openResetPasswordModal(' + u.id + ', \\'' + escapeHtml(u.email) + '\\')" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold text-[11px] transition">Redefinir Senha</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    function openNewTenantModal() {
      slugTouchedManually = false;
      document.getElementById('ntName').value = '';
      document.getElementById('ntId').value = '';
      document.getElementById('ntPhoneId').value = '';
      document.getElementById('ntWabaId').value = '';
      document.getElementById('ntToken').value = '';
      document.getElementById('ntUserName').value = '';
      document.getElementById('ntUserEmail').value = '';
      document.getElementById('ntUserPass').value = '';
      document.getElementById('newTenantModal').classList.remove('hidden');
    }

    function syncTenantSlug() {
      if (slugTouchedManually) return;
      const name = document.getElementById('ntName').value;
      const slug = name
        .toLowerCase()
        .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
      document.getElementById('ntId').value = slug;
    }

    document.addEventListener('DOMContentLoaded', () => {
      const ntIdEl = document.getElementById('ntId');
      if (ntIdEl) {
        ntIdEl.addEventListener('input', () => { slugTouchedManually = true; });
      }
      init();
    });

    async function handleCreateTenant(e) {
      e.preventDefault();
      const payload = {
        tenantId: document.getElementById('ntId').value.trim(),
        name: document.getElementById('ntName').value.trim(),
        phoneNumberId: document.getElementById('ntPhoneId').value.trim() || null,
        wabaId: document.getElementById('ntWabaId').value.trim() || null,
        accessToken: document.getElementById('ntToken').value.trim() || null,
        adminName: document.getElementById('ntUserName').value.trim() || undefined,
        adminEmail: document.getElementById('ntUserEmail').value.trim() || undefined,
        adminPassword: document.getElementById('ntUserPass').value || undefined,
      };
      try {
        const res = await fetch('/api/admin/tenants', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao criar clínica', 'rose');
          return;
        }
        closeModal('newTenantModal');
        showToast('Clínica criada com sucesso!', 'emerald');
        await loadOverview();
      } catch {
        showToast('Erro na requisição', 'rose');
      }
    }

    function openEditTenantModal(tenantId) {
      const t = (adminData.tenants || []).find(x => x.id === tenantId);
      if (!t) return;
      document.getElementById('etId').value = t.id;
      document.getElementById('etName').value = t.name;
      document.getElementById('etPhoneId').value = t.whatsapp_configured ? t.phone_number_id : '';
      document.getElementById('etWabaId').value = t.waba_id || '';
      document.getElementById('etToken').value = '';
      document.getElementById('etClearToken').checked = false;
      document.getElementById('editTenantModal').classList.remove('hidden');
    }

    async function handleEditTenant(e) {
      e.preventDefault();
      const payload = {
        tenantId: document.getElementById('etId').value,
        name: document.getElementById('etName').value.trim(),
        phoneNumberId: document.getElementById('etPhoneId').value.trim(),
        wabaId: document.getElementById('etWabaId').value.trim(),
        accessToken: document.getElementById('etToken').value.trim(),
        clearToken: document.getElementById('etClearToken').checked,
      };
      try {
        const res = await fetch('/api/admin/tenants', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao salvar clínica', 'rose');
          return;
        }
        closeModal('editTenantModal');
        showToast('Clínica atualizada!', 'emerald');
        await loadOverview();
      } catch {
        showToast('Erro ao atualizar clínica', 'rose');
      }
    }

    async function toggleTenantActive(tenantId, active) {
      try {
        const res = await fetch('/api/admin/tenants', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId, active })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao alterar status', 'rose');
          return;
        }
        showToast(active ? 'Clínica ativada!' : 'Clínica pausada!', 'emerald');
        await loadOverview();
      } catch {
        showToast('Erro de conexão', 'rose');
      }
    }

    function openNewUserModal(preselectedTenantId) {
      const sel = document.getElementById('nuTenantId');
      sel.innerHTML = (adminData.tenants || [])
        .map(t => '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.name) + ' (' + escapeHtml(t.id) + ')</option>')
        .join('');
      if (preselectedTenantId) sel.value = preselectedTenantId;
      document.getElementById('nuName').value = '';
      document.getElementById('nuEmail').value = '';
      document.getElementById('nuPassword').value = '';
      document.getElementById('nuRole').value = 'admin';
      document.getElementById('newUserModal').classList.remove('hidden');
    }

    async function handleCreateUser(e) {
      e.preventDefault();
      const payload = {
        tenantId: document.getElementById('nuTenantId').value,
        name: document.getElementById('nuName').value.trim(),
        email: document.getElementById('nuEmail').value.trim(),
        password: document.getElementById('nuPassword').value,
        role: document.getElementById('nuRole').value,
      };
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao criar usuário', 'rose');
          return;
        }
        closeModal('newUserModal');
        showToast('Usuário criado!', 'emerald');
        await loadOverview();
      } catch {
        showToast('Erro na requisição', 'rose');
      }
    }

    function openResetPasswordModal(userId, email) {
      document.getElementById('rpUserId').value = userId;
      document.getElementById('rpUserEmail').innerText = email;
      document.getElementById('rpNewPass').value = '';
      document.getElementById('resetPasswordModal').classList.remove('hidden');
    }

    async function handleResetPassword(e) {
      e.preventDefault();
      const userId = parseInt(document.getElementById('rpUserId').value, 10);
      const newPassword = document.getElementById('rpNewPass').value;
      try {
        const res = await fetch('/api/admin/users/password', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId, newPassword })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao redefinir senha', 'rose');
          return;
        }
        closeModal('resetPasswordModal');
        showToast('Senha redefinida com sucesso!', 'emerald');
      } catch {
        showToast('Erro na requisição', 'rose');
      }
    }

    async function handleLogout() {
      if (confirm('Deseja sair do painel Super Admin?')) {
        try { await fetch('/api/auth/logout', { method: 'POST' }); }
        finally { window.location.href = '/login'; }
      }
    }
  </script>
</body>
</html>`;
