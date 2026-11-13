import { AURA_STYLE_LINKS } from "./brand";
import { inboxPlanView } from "./inbox/plan-view";
import type { PlanOffer } from "../plans";
import { INBOX_ACCOUNT_VIEW_HTML } from "./inbox/account-view";
import { INBOX_ONBOARDING_VIEW_HTML } from "./inbox/onboarding-view";
import { INBOX_ACCOUNT_ACTIONS_HTML, INBOX_HEADER_HTML } from "./inbox/header";
import { INBOX_CHAT_VIEW_HTML } from "./inbox/chat-view";
import { INBOX_AGENDA_VIEW_HTML } from "./inbox/agenda-view";
import { INBOX_TRAINING_VIEW_HTML } from "./inbox/training-view";
import { INBOX_SETTINGS_VIEW_HTML } from "./inbox/settings-view";
import { INBOX_SIMULATOR_VIEW_HTML } from "./inbox/simulator-view";
import { INBOX_MODALS_HTML } from "./inbox/modals";

const ASSET_VERSION = "41";

export function inboxHtml(offers?:Record<string,PlanOffer>) { return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu atendimento | Aura</title>
  <script>try{if(sessionStorage.getItem('aura_entry_reveal')==='1'){if(!localStorage.getItem('aura_theme'))localStorage.setItem('aura_theme','light');document.documentElement.classList.toggle('dark',localStorage.getItem('aura_theme')!=='light');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('aura-entry-pending');setTimeout(()=>{document.documentElement.classList.remove('aura-entry-pending','aura-entry-revealing');sessionStorage.removeItem('aura_entry_reveal');},12000);}}catch{}</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { darkMode: 'class' };
  </script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  ${AURA_STYLE_LINKS}
</head>
<body class="aura-dashboard h-screen flex flex-col overflow-hidden">
${INBOX_HEADER_HTML}
  <header class="aura-dashboard-page-header"><h1 id="dashboardPageHeader">Conversas</h1>${INBOX_ACCOUNT_ACTIONS_HTML}</header>

  <!-- BANNER GLOBAL DE TRIAL EXPIRADO OU LIMITE ATINGIDO -->
  <div id="globalTrialExpiredBanner" class="hidden px-4 py-2.5 text-xs shadow-md shrink-0 flex items-center justify-between z-20 transition-all">
    <div class="flex items-center gap-2.5 max-w-4xl">
      <i class="fa-solid fa-triangle-exclamation text-base animate-pulse"></i>
      <div>
        <span class="font-extrabold" id="trialExpiredTitle">Período de testes ou cota de 100 mensagens atingida!</span>
        <span class="opacity-90 block sm:inline sm:ml-1" id="trialExpiredSubtitle">
          O atendimento real está pausado. Seu histórico continua disponível.
        </span>
      </div>
    </div>
    <a href="#plano" onclick="selectNavigationTab('plan');return false" id="btnTrialUpgrade"
       class="px-3.5 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-neutral-100 font-bold text-xs shadow-sm transition whitespace-nowrap flex items-center gap-1.5 ml-3">
      <i class="fa-solid fa-crown text-amber-500"></i>
      <span>Ver plano</span>
    </a>
  </div>

${INBOX_ACCOUNT_VIEW_HTML}
${INBOX_ONBOARDING_VIEW_HTML}
${inboxPlanView(offers)}
${INBOX_CHAT_VIEW_HTML}
${INBOX_AGENDA_VIEW_HTML}
${INBOX_TRAINING_VIEW_HTML}
${INBOX_SETTINGS_VIEW_HTML}
${INBOX_SIMULATOR_VIEW_HTML}
${INBOX_MODALS_HTML}
  <script src="/js/ui.js?v=5"></script>
  <!-- SCRIPTS MODULARES DA PLATAFORMA (Cloudflare Static Assets) -->
  <script src="/js/inbox/billing.js?v=${ASSET_VERSION}"></script>
  <script src="/js/inbox/onboarding.js?v=${ASSET_VERSION}"></script>
  <script src="/js/inbox/core.js?v=${ASSET_VERSION}"></script>
  <script src="/js/inbox/chat.js?v=${ASSET_VERSION}"></script>
  <script src="/js/inbox/professionals.js?v=${ASSET_VERSION}"></script>
  <script src="/js/inbox/agenda.js?v=${ASSET_VERSION}"></script>
  <script src="/js/inbox/training.js?v=${ASSET_VERSION}"></script>
  <script src="/js/inbox/settings.js?v=${ASSET_VERSION}"></script>
  <script src="/js/inbox/simulator.js?v=${ASSET_VERSION}"></script>
</body>
</html>
`; }
export const INBOX_HTML=inboxHtml();
