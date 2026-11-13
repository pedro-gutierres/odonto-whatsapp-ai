export const INBOX_HEADER_HTML = `
<button class="aura-nav-backdrop" onclick="closeVerticalMenu()" aria-label="Fechar navegação" tabindex="-1"></button>
<aside id="verticalMenuContainer" class="aura-sidebar" aria-label="Navegação do Aura">
  <a href="/inbox" class="aura-brand" aria-label="Aura, início"><span class="aura-brand-mark" aria-hidden="true"></span><span class="aura-brand-name">aura</span></a>
  <nav id="verticalMenuDropdown" aria-label="Menu principal">
    <button class="aura-nav-item" data-nav-tab="onboarding" aria-label="Início" title="Início" onclick="selectNavigationTab('onboarding')"><i class="fa-solid fa-house" aria-hidden="true"></i><span>Início</span></button>
    <p class="aura-nav-label">Atendimento</p>
    <button class="aura-nav-item" data-nav-tab="chat" aria-label="Conversas" title="Conversas" onclick="selectNavigationTab('chat')"><i class="fa-regular fa-comments" aria-hidden="true"></i><span>Conversas</span></button>
    <button class="aura-nav-item" data-nav-tab="agenda" aria-label="Agenda" title="Agenda" onclick="selectNavigationTab('agenda')"><i class="fa-regular fa-calendar" aria-hidden="true"></i><span>Agenda</span></button>
    <p class="aura-nav-label aura-nav-settings-label">Configurações</p>
    <button class="aura-nav-item" data-nav-tab="config" aria-label="Parâmetros de atendimento" title="Parâmetros de atendimento" onclick="selectNavigationTab('config')"><i class="fa-solid fa-sliders" aria-hidden="true"></i><span>Parâmetros de atendimento</span></button>
    <button class="aura-nav-item aura-nav-simulator" data-nav-tab="simulator" aria-label="Simulador da IA" title="Simulador da IA" onclick="selectNavigationTab('simulator')"><i class="fa-regular fa-message" aria-hidden="true"></i><span>Simulador da IA</span><span class="aura-nav-pill">Testar</span></button>
    <button class="aura-nav-item" data-nav-tab="settings" aria-label="Seu número" title="Seu número" onclick="selectNavigationTab('settings')"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i><span>Seu número</span><span id="menuWhatsappStatusDot" class="w-2.5 h-2.5 rounded-full bg-neutral-300 ml-auto" title="Verificando conexão"></span></button>
  </nav>
  <p id="onboardingRefreshNotice" class="hidden aura-field-hint" role="status" aria-live="polite"></p>
  <div class="hidden"><div id="topClinicNameBadge">Meu negócio</div><div id="businessSubtitle">Seu espaço no Aura</div></div>
  <div class="aura-sidebar-footer">
    <button id="sidebarCollapseTrigger" type="button" class="aura-icon-button aura-sidebar-collapse" onclick="toggleSidebarCollapse()" aria-label="Recolher menu" aria-expanded="true" aria-controls="verticalMenuDropdown" title="Recolher menu"><span class="aura-sidebar-mode-icon" aria-hidden="true"></span></button>
  </div>
  <div class="aura-topbar-title"><button id="verticalMenuTrigger" class="aura-icon-button aura-menu-toggle" onclick="toggleVerticalMenu(event)" aria-label="Abrir navegação" aria-expanded="false" aria-controls="verticalMenuContainer"><i class="fa-solid fa-bars" aria-hidden="true"></i></button><span id="selectedMenuIcon" hidden></span><h1 id="selectedMenuLabel" class="aura-page-title">Conversas</h1></div>
</aside>
<div id="accountQuickMenu" class="aura-account-menu hidden" aria-label="Opções da conta"><button data-nav-tab="account" onclick="accountMenuNavigate('account')"><i class="fa-regular fa-user" aria-hidden="true"></i><span>Conta</span></button><button data-nav-tab="plan" onclick="accountMenuNavigate('plan')"><i class="fa-regular fa-credit-card" aria-hidden="true"></i><span>Plano</span></button><button onclick="toggleTheme();updateAccountThemeLabel()"><i id="themeIcon" class="fa-solid fa-moon" aria-hidden="true"></i><span id="accountThemeLabel">Modo escuro</span></button><button onclick="closeAccountMenu();handleLogout()"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i><span>Sair</span></button></div>
`;

export const INBOX_ACCOUNT_ACTIONS_HTML = `
<div class="aura-header-account"><button id="accountMenuTrigger" type="button" class="aura-icon-button" onclick="toggleAccountMenu()" aria-label="Conta e opções" aria-haspopup="true" aria-expanded="false" aria-controls="accountQuickMenu"><span class="aura-account-icon"><i class="fa-regular fa-user" aria-hidden="true"></i></span><span id="headerAccountName" class="aura-account-name"></span></button>
    <button id="staffLogout" type="button" class="aura-icon-button" onclick="handleLogout()" aria-label="Sair" title="Sair" hidden><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i></button>
    <button id="trialStatusWidget" class="hidden" onclick="selectNavigationTab('onboarding')" title="Ver situação da conta e plano"><i id="trialStatusIcon" hidden></i><span id="trialDaysBadge">Minha conta</span><span id="trialMessagesBadge" hidden></span></button>
    <div class="hidden"><div class="aura-user-details"><p class="aura-field-hint">Titular da Conta (Pessoa Física)</p><div id="topUserName" class="aura-user-name"></div><div id="topUserEmail" class="aura-user-email"></div></div><button onclick="handleLogout()" class="aura-icon-button" title="Sair da conta" aria-label="Sair da conta"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i></button></div>
  </div>
`;
