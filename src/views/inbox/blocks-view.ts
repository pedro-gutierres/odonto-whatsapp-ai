export const INBOX_BLOCKS_VIEW_HTML = `
<section id="agendaBlocksSection" class="aura-card">
  <div class="aura-section-head"><div><h3>Horários bloqueados <button type="button" class="aura-inline-help" aria-label="Para que serve um bloqueio" data-aura-help="Um bloqueio deixa o período indisponível para novas consultas. Use para almoço, compromissos pessoais ou horários já ocupados em outra agenda. Ele não cria um paciente nem envia lembretes.">?</button></h3><p class="aura-field-hint mt-2">Períodos que a IA não pode oferecer. Horário de Brasília.</p></div><button type="button" onclick="openBlockEditor()" class="aura-secondary"><i class="fa-solid fa-plus" aria-hidden="true"></i>Bloquear horário</button></div>
  <details id="blockEditor" class="aura-disclosure"><summary>Adicionar um bloqueio</summary><div class="aura-disclosure-content">
    <form id="agendaBlockForm" onsubmit="saveAgendaBlock(event)">
      <input type="hidden" id="blockStart"><input type="hidden" id="blockEnd">
      <div class="aura-block-layout">
        <label class="aura-field" for="blockProfessional">Profissional<select id="blockProfessional" required></select></label>
        <label class="aura-field" for="blockDate">Dia<input id="blockDate" type="date" required onchange="syncBlockPeriod()"></label>
        <label class="aura-field" for="blockStartTime">Das<input id="blockStartTime" type="time" required onchange="syncBlockPeriod()"></label>
        <label class="aura-field" for="blockEndTime">Até<input id="blockEndTime" type="time" required onchange="syncBlockPeriod()"></label>
        <button class="aura-primary">Salvar bloqueio</button>
      </div>
      <div class="aura-block-options"><label><input id="blockMultipleDays" type="checkbox" onchange="syncBlockPeriod()">Termina em outro dia</label></div>
      <label id="blockEndDateLabel" class="aura-field aura-block-end-date hidden" for="blockEndDate">Dia de término<input id="blockEndDate" type="date" onchange="syncBlockPeriod()"></label>
      <p id="blockPeriodError" class="aura-error mt-3" aria-live="polite"></p>
    </form>
  </div></details>
  <div id="agendaBlocksList" class="aura-block-list" aria-live="polite"></div>
  <details class="aura-disclosure"><summary>Importar horários de outra agenda</summary><div class="aura-disclosure-content space-y-3">
    <p class="aura-description">Use o modelo CSV do Aura, com profissional, início e fim. Até 40 horários por arquivo. A importação não sincroniza mudanças futuras.</p>
    <button onclick="downloadOccupationTemplate()" class="aura-text-button">Baixar modelo CSV <span aria-hidden="true">↓</span></button>
    <label class="aura-field" for="occupationCsv">Arquivo preenchido<input id="occupationCsv" type="file" accept=".csv,text/csv"></label>
    <button id="previewOccupationBtn" onclick="previewOccupationImport()" class="aura-secondary">Conferir horários</button>
    <div id="occupationImportPreview" class="text-sm space-y-2" aria-live="polite"></div>
    <button id="commitOccupationBtn" disabled onclick="commitOccupationImport()" class="aura-primary">Confirmar importação</button>
  </div></details>
</section>`;
