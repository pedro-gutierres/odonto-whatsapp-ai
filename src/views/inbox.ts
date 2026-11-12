import { INBOX_ACCOUNT_VIEW_HTML } from "./inbox/account-view";
import { INBOX_ONBOARDING_VIEW_HTML } from "./inbox/onboarding-view";
import { INBOX_HEADER_HTML } from "./inbox/header";
import { INBOX_CHAT_VIEW_HTML } from "./inbox/chat-view";
import { INBOX_AGENDA_VIEW_HTML } from "./inbox/agenda-view";
import { INBOX_TRAINING_VIEW_HTML } from "./inbox/training-view";
import { INBOX_SETTINGS_VIEW_HTML } from "./inbox/settings-view";
import { INBOX_SIMULATOR_VIEW_HTML } from "./inbox/simulator-view";
import { INBOX_MODALS_HTML } from "./inbox/modals";

const ASSET_VERSION = "7";

export const INBOX_HTML = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu atendimento | Aura</title>
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
  <link rel="stylesheet" href="/css/aura.css?v=5">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .wa-bg-light {
      background-color: #efeae2;
      background-image: radial-gradient(#d1d7db 1px, transparent 1px);
      background-size: 18px 18px;
    }
    .wa-bg-dark {
      background-color: #0b141a;
      background-image: radial-gradient(#1f2c34 1px, transparent 1px);
      background-size: 18px 18px;
    }
    .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.25); border-radius: 9999px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.45); }
  </style>
</head>
<body class="aura-dashboard bg-slate-100 dark:bg-[#0b0f17] text-slate-800 dark:text-slate-100 h-screen flex flex-col overflow-hidden selection:bg-[#008069] selection:text-white transition-colors duration-200">
${INBOX_HEADER_HTML}

  <!-- BANNER GLOBAL DE TRIAL EXPIRADO OU LIMITE ATINGIDO -->
  <div id="globalTrialExpiredBanner" class="hidden bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white px-4 py-2.5 text-xs shadow-md shrink-0 flex items-center justify-between z-20 transition-all">
    <div class="flex items-center gap-2.5 max-w-4xl">
      <i class="fa-solid fa-triangle-exclamation text-base animate-pulse"></i>
      <div>
        <span class="font-extrabold" id="trialExpiredTitle">Período de testes ou cota de 100 mensagens atingida!</span>
        <span class="opacity-90 block sm:inline sm:ml-1" id="trialExpiredSubtitle">
          O atendimento real está pausado. Seu histórico continua disponível.
        </span>
      </div>
    </div>
    <a href="#plano" onclick="selectNavigationTab('onboarding','Preparação e plano','fa-solid fa-list-check','emerald');return false" id="btnTrialUpgrade"
       class="px-3.5 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-slate-100 font-bold text-xs shadow-sm transition whitespace-nowrap flex items-center gap-1.5 ml-3">
      <i class="fa-solid fa-crown text-amber-500"></i>
      <span>Ver plano</span>
    </a>
  </div>

${INBOX_ACCOUNT_VIEW_HTML}
${INBOX_ONBOARDING_VIEW_HTML}
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
`;
