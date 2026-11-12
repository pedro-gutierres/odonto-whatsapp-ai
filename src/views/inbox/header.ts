export const INBOX_HEADER_HTML = `
<button class="aura-nav-backdrop" onclick="closeVerticalMenu()" aria-label="Fechar navegação" tabindex="-1"></button>
<aside id="verticalMenuContainer" class="aura-sidebar" aria-label="Navegação do Aura">
  <a href="/inbox" class="aura-brand" aria-label="Aura, início"><span class="aura-brand-mark">a</span><span class="aura-brand-name">aura</span></a>
  <nav id="verticalMenuDropdown" aria-label="Menu principal">
    <p class="aura-nav-label">Começar</p>
    <button class="aura-nav-item" data-nav-tab="onboarding" onclick="selectNavigationTab('onboarding')"><i class="fa-solid fa-house" aria-hidden="true"></i><span>Início &amp; Plano</span></button>
    <button class="aura-nav-item aura-nav-simulator" data-nav-tab="simulator" onclick="selectNavigationTab('simulator')"><i class="fa-regular fa-message" aria-hidden="true"></i><span>Simulador da IA</span><span class="aura-nav-pill">Testar</span></button>
    <p class="aura-nav-label">Atendimento Diário</p>
    <button class="aura-nav-item" data-nav-tab="chat" onclick="selectNavigationTab('chat')"><i class="fa-regular fa-comments" aria-hidden="true"></i><span>Conversas</span></button>
    <button class="aura-nav-item" data-nav-tab="agenda" onclick="selectNavigationTab('agenda')"><i class="fa-regular fa-calendar" aria-hidden="true"></i><span>Agenda &amp; Equipe</span><span id="menuAppointmentsBadge" class="aura-count">0</span></button>
    <p class="aura-nav-label">Configuração da Clínica</p>
    <button class="aura-nav-item" data-nav-tab="config" onclick="selectNavigationTab('config')"><i class="fa-solid fa-sliders" aria-hidden="true"></i><span>Treinar IA</span></button>
    <button class="aura-nav-item" data-nav-tab="settings" onclick="selectNavigationTab('settings')"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i><span>Conectar WhatsApp</span><span id="menuWhatsappStatusDot" class="w-2 h-2 rounded-full bg-slate-300 ml-auto" title="Verificar conexão"></span></button>
    <button class="aura-nav-item" data-nav-tab="account" onclick="selectNavigationTab('account')"><i class="fa-regular fa-user" aria-hidden="true"></i><span>Dados &amp; Acessos</span></button>
  </nav>
  <div class="aura-sidebar-footer">
    <div class="aura-sidebar-business"><div id="topClinicNameBadge" class="aura-business-name">Meu negócio</div><div id="businessSubtitle" class="aura-business-type">Seu espaço no Aura</div></div>
    <a id="superAdminNavBtn" href="/admin" class="aura-nav-item hidden"><i class="fa-solid fa-layer-group" aria-hidden="true"></i><span>Administração</span></a>
  </div>
</aside>
<header class="aura-topbar">
  <div class="aura-topbar-title"><button id="verticalMenuTrigger" class="aura-icon-button aura-menu-toggle" onclick="toggleVerticalMenu(event)" aria-label="Abrir navegação" aria-expanded="false" aria-controls="verticalMenuContainer"><i class="fa-solid fa-bars" aria-hidden="true"></i></button><span id="selectedMenuIcon" hidden></span><h1 id="selectedMenuLabel" class="aura-page-title">Conversas</h1></div>
  <div class="aura-topbar-actions">
    <button id="trialStatusWidget" class="aura-plan-badge hidden" onclick="selectNavigationTab('onboarding')" title="Ver situação da conta e plano"><i id="trialStatusIcon" hidden></i><span id="trialDaysBadge">Minha conta</span><span id="trialMessagesBadge" hidden></span></button>
    <button onclick="toggleTheme()" class="aura-icon-button" title="Mudar aparência" aria-label="Alternar aparência clara e escura"><i id="themeIcon" class="fa-solid fa-moon" aria-hidden="true"></i></button>
    <div class="aura-user"><div class="aura-user-details"><div id="topUserName" class="aura-user-name"></div><div id="topUserEmail" class="aura-user-email"></div></div><button onclick="handleLogout()" class="aura-icon-button" title="Sair da conta" aria-label="Sair da conta"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i></button></div>
  </div>
</header>`;
