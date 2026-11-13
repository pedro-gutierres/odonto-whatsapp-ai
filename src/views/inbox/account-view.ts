export const INBOX_ACCOUNT_VIEW_HTML = `
<main id="viewAccount" class="hidden flex-1 overflow-y-auto p-4 lg:p-8"><div class="max-w-5xl mx-auto space-y-6">
<section class="aura-card text-xs">
  <label for="accountEmail" class="block font-semibold mb-1">E-mail de acesso</label>
  <div class="flex items-center gap-3"><input id="accountEmail" type="email" disabled class="w-full px-3 py-2"><button type="button" id="accountEmailEdit" class="aura-secondary" onclick="editAccountEmail()">Editar</button></div>
</section>
<form id="ownPasswordForm" onsubmit="handleChangeOwnPassword(event)"
          class="lg:col-span-5 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs self-start">
          <div class="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <i class="fa-solid fa-shield-halved text-neutral-500"></i>
              <span>Senha</span>
            </h3>
            <div class="flex items-center gap-3 mt-3"><input type="password" value="password" disabled aria-label="Senha protegida" class="w-full px-3 py-2"><button type="button" class="aura-secondary whitespace-nowrap" onclick="togglePasswordFields()" aria-expanded="false" aria-controls="passwordFields" id="togglePasswordFields">Alterar senha</button></div>
          </div>

          <div id="passwordFields" hidden>
          <div>
            <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Senha Atual *</label>
            <input type="password" id="spCurrentPassword" required autocomplete="current-password" placeholder="••••••••"
              class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-[var(--aura-accent)]">
          </div>
          <div>
            <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Nova Senha * (mín. 6 caracteres)</label>
            <input type="password" id="spNewPassword" required minlength="6" autocomplete="new-password" placeholder="Mínimo 6 caracteres"
              class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-[var(--aura-accent)]">
          </div>
          <div>
            <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Confirmar Nova Senha *</label>
            <input type="password" id="spConfirmPassword" required minlength="6" autocomplete="new-password" placeholder="Repita a nova senha"
              class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-[var(--aura-accent)]">
          </div>

          <div class="flex items-center justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button type="submit" id="btnChangeOwnPassword"
              class="w-full py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 font-bold shadow-sm transition flex items-center justify-center gap-2">
              <i class="fa-solid fa-key"></i>
              <span>Atualizar Minha Senha</span>
            </button>
          </div>
          </div>
        </form>
<section id="settingsPanelUsers" class="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        <div class="p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <i class="fa-solid fa-users text-neutral-500"></i>
              <span>Equipe</span>
            </h3>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">As pessoas adicionadas terão acesso somente às funções de conversas e agendamento, sem acesso aos dados do administrador.</p>
          </div>

          <button type="button" id="btnOpenNewClinicUser" onclick="openClinicUserModal()"
            class="px-4 py-2 rounded-xl aura-filled disabled:opacity-50 font-bold text-xs flex items-center gap-1.5 shadow-sm transition self-start sm:self-auto">
            <i class="fa-solid fa-user-plus text-[11px]"></i>
            <span>Adicionar pessoa</span>
          </button>
        </div>

        <div class="overflow-x-auto custom-scroll">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-neutral-50 dark:bg-neutral-900/60 text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th class="py-3 px-4 font-bold">Nome</th>
                <th class="py-3 px-4 font-bold">E-mail de Acesso</th>
                <th class="py-3 px-4 font-bold">Cargo</th>
                <th class="py-3 px-4 font-bold">Senha</th>
                <th class="py-3 px-4 font-bold">Criado em</th>
                <th class="py-3 px-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody id="clinicUsersTableBody" class="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              <tr><td colspan="6" class="py-8 text-center text-neutral-400">Carregando equipe...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
</div></main>`;
