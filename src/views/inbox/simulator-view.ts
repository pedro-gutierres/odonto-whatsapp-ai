export const INBOX_SIMULATOR_VIEW_HTML = `
<main id="viewSimulator" class="hidden flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-[#0b0f17]">
<div class="p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900">
<div class="flex flex-wrap justify-between items-center gap-3"><h2 class="font-bold">Test Drive</h2><span id="demoQuota" class="text-sm text-purple-600 dark:text-purple-300">30 respostas por conta</span></div>
<p class="text-sm text-slate-500 mt-2">Uma demonstração sem acesso à agenda real e sem envios pelo WhatsApp. Sua cota é compartilhada pelos dois modos.</p>
<div class="flex flex-wrap items-center gap-3 mt-4"><label for="simulatorMode" class="text-sm font-semibold">Quero:</label>
<select id="simulatorMode" onchange="changeSimulatorMode(this.value)" class="rounded-lg p-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700"><option value="patient">Simular um paciente</option><option value="aura">Tirar dúvidas sobre o Aura</option></select>
<button onclick="resetSimulatorChat()" class="text-sm underline">Reiniciar conversa deste modo</button></div>
<div id="simulatorLockBanner" role="status" class="hidden mt-3 text-sm text-amber-700 dark:text-amber-300"></div>
</div>
<div id="simulatorMessagesArea" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll" aria-live="polite"></div>
<form onsubmit="handleSimulatorSubmit(event)" class="p-4 border-t dark:border-slate-800 flex gap-2 bg-white dark:bg-slate-900">
<input id="simulatorMessageInput" maxlength="2000" required placeholder="Digite sua mensagem de demonstração..." class="flex-1 min-w-0 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm disabled:opacity-50">
<button id="simulatorSendBtn" class="bg-purple-600 text-white px-5 rounded-xl text-sm font-bold disabled:opacity-40">Enviar</button></form>
</main>`;
