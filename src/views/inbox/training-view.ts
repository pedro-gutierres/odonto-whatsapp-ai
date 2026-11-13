export const INBOX_TRAINING_VIEW_HTML = `
  <!-- ======================================================================= -->
  <!-- VIEW 3: CONFIGURAÇÕES & TREINAMENTO DA IA (ODONTO & ESTÉTICA)           -->
  <!-- ======================================================================= -->
  <main id="viewConfig" class="flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 hidden bg-neutral-50 dark:bg-[#101010]">
    <div class="max-w-5xl mx-auto space-y-6">



      <div class="aura-page-heading"><div><h2>Como a IA deve atender?</h2><p class="aura-description">Preencha as informações do negócio. Os campos essenciais estão identificados; os demais são opcionais.</p></div></div>
      <details id="businessRegistrationDetails" class="aura-card"><summary class="text-sm font-semibold">Dados do Consultório / Clínica</summary><div class="aura-disclosure-content"><form id="clinicProfileForm" onsubmit="handleSaveClinicProfile(event)"
          class="lg:col-span-7 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <i class="fa-solid fa-hospital text-neutral-500"></i>
                <span>Dados do Consultório / Clínica</span>
              </h3>
              <p class="text-[11px] text-neutral-500 dark:text-neutral-400">Informações empresariais, CNPJ e contato administrativo da sua conta.</p>
            </div>
          </div>

          <div id="profileStaffReadOnlyNotice" class="hidden p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
            <i class="fa-solid fa-lock text-amber-500"></i>
            <span>Somente leitura: apenas administradores da clínica podem alterar os dados cadastrais. Você pode alterar sua própria senha ao lado.</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="sm:col-span-2">
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Nome do negócio ou profissional *</label>
              <input type="text" id="spClinicName" required maxlength="120" placeholder="Ex: Clínica Sorriso & Estética"
                class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-[var(--aura-accent)]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Razão Social</label>
              <input type="text" id="spLegalName" maxlength="160" placeholder="Ex: Sorriso Odontologia LTDA"
                class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-[var(--aura-accent)]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">CNPJ ou CPF</label>
              <input type="text" id="spCnpj" maxlength="25" placeholder="00.000.000/0001-00"
                class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono focus:outline-none focus:border-[var(--aura-accent)]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Responsável pela Conta</label>
              <input type="text" id="spResponsibleName" maxlength="120" placeholder="Ex: Dra. Fernanda Alves"
                class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-[var(--aura-accent)]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">WhatsApp / Tel. Administrativo</label>
              <input type="text" id="spAdminPhone" maxlength="30" placeholder="(11) 99999-9999"
                class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-[var(--aura-accent)]">
            </div>
            <div class="sm:col-span-2">
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">E-mail Administrativo / Financeiro</label>
              <input type="email" id="spContactEmail" maxlength="160" placeholder="financeiro@suaclinica.com.br"
                class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-[var(--aura-accent)]">
            </div>
          </div>

          <div class="flex items-center justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button type="submit" id="btnSaveClinicProfile"
              class="px-5 py-2.5 rounded-xl aura-filled disabled:opacity-50 font-bold shadow-sm transition flex items-center gap-2">
              <i class="fa-solid fa-floppy-disk"></i>
              <span>Salvar cadastro</span>
            </button>
          </div>
        </form></div></details>
      <!-- FORMULÁRIO COMPLETO DO QUESTIONÁRIO -->
      <form id="clinicConfigForm" onsubmit="event.preventDefault(); saveClinicConfig();" oninput="updateTrainingValidationHighlights()" onchange="updateTrainingValidationHighlights()" class="space-y-6">

        <!-- BANNER EXPLÍCITO DE STATUS DO TREINAMENTO & PENDÊNCIAS EM VERMELHO -->
        <div id="configCrucialStatusBanner" class="hidden rounded-2xl p-5 shadow-md transition-all"></div>

        <div class="aura-card space-y-4"><h3 class="text-sm font-semibold">Quando faltar uma informação</h3><p class="aura-description">Escolha como a IA deve encaminhar perguntas que você não respondeu no treinamento.</p>
          <div class="pt-3 border-t border-neutral-500/20 space-y-2">
            <span class="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
              Encaminhamento padrão
            </span>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-xs">
              <label class="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-white/70 dark:bg-neutral-900/60 cursor-pointer hover:border-neutral-500 transition">
                <input type="radio" name="unfilledFallbackRadio" value="avaliacao" checked class="mt-0.5 text-[var(--aura-accent)] focus:ring-0">
                <div class="text-[11px] leading-snug">
                  <span class="font-bold text-neutral-900 dark:text-white block mb-0.5">Orientar uma avaliação</span>
                  <span class="text-neutral-500 dark:text-neutral-400">Explica que a dúvida será esclarecida na avaliação.</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-white/70 dark:bg-neutral-900/60 cursor-pointer hover:border-neutral-500 transition">
                <input type="radio" name="unfilledFallbackRadio" value="contato_secundario" class="mt-0.5 text-[var(--aura-accent)] focus:ring-0">
                <div class="text-[11px] leading-snug">
                  <span class="font-bold text-neutral-900 dark:text-white block mb-0.5">Indicar outro contato</span>
                  <span class="text-neutral-500 dark:text-neutral-400">Fornece o contato de apoio cadastrado abaixo.</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-white/70 dark:bg-neutral-900/60 cursor-pointer hover:border-neutral-500 transition">
                <input type="radio" name="unfilledFallbackRadio" value="aguardar_humano" class="mt-0.5 text-[var(--aura-accent)] focus:ring-0">
                <div class="text-[11px] leading-snug">
                  <span class="font-bold text-neutral-900 dark:text-white block mb-0.5">Chamar a equipe</span>
                  <span class="text-neutral-500 dark:text-neutral-400">Pede para aguardar atendimento humano neste número.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- CARD 1: IDENTIDADE DA CLÍNICA & RESPONSÁVEL TÉCNICO -->
        <details class="aura-training-section" open><summary>Identidade e tom da conversa</summary><div class="aura-training-body">

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="aura-training-profile"><fieldset><legend>Formato de atuação</legend><label><input type="radio" name="trainingKind" value="solo" onchange="changeTrainingProfile()"> Profissional Autônomo</label><label><input type="radio" name="trainingKind" value="clinic" onchange="changeTrainingProfile()"> Clínica</label></fieldset><fieldset><legend>Área de atuação</legend><label><input type="checkbox" name="trainingSector" value="dentistry" onchange="changeTrainingProfile(this)"> Odontologia</label><label><input type="checkbox" name="trainingSector" value="aesthetics" onchange="changeTrainingProfile(this)"> Estética</label></fieldset></div><label class="aura-field" for="cfgClinicName">Nome do consultório ou clínica<input type="text" id="cfgClinicName" maxlength="120" oninput="document.getElementById('spClinicName').value=this.value"></label>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Doutor(a) Responsável Técnico</label>
              <input type="text" id="cfgDoctorName" placeholder="Ex: Dra. Fernanda Alves"
                class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--aura-accent)]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Registro Profissional (CRO / CRM)</label>
              <input type="hidden" id="cfgDoctorCro"><div id="trainingCouncil"></div>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Tom de Voz da Secretária IA</label>
              <select id="cfgTone"
                class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--aura-accent)] font-medium">
                <option value="acolhedor">🌸 Acolhedor & Gentil (Caloroso, empático, ideal para clínica geral)</option>
                <option value="sofisticado">✨ Sofisticado & Exclusivo (Boutique, foco em estética de alto padrão)</option>
                <option value="clinico">🩺 Clínico & Técnico (Objetivo, seguro, rigor científico e formal)</option>
              </select>
              <label class="aura-checkbox-line mt-3"><input id="cfgVoiceReplies" type="checkbox">Responder áudios com voz de IA</label>
              <p class="aura-field-hint">Disponível nos planos Pro e Ultra, dentro do limite mensal. Ao atingir o limite, a IA responde em texto.</p>
            </div>
          </div>
        </div></details>

        <!-- CARD 2: CATÁLOGO DE PROCEDIMENTOS (ODONTO + ESTÉTICA) -->
        <details class="aura-training-section" open><summary>Serviços e avaliação inicial</summary><div class="aura-training-body">

          <!-- CARD EXCLUSIVO: AVALIAÇÃO INICIAL / CONSULTA -->
          <div id="cardInitEvalContainer" class="p-5 rounded-2xl border-2 border-neutral-500/30 bg-neutral-50/40 dark:bg-neutral-950/20 space-y-3 transition-all">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-neutral-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-neutral-500/20">
                  <i class="fa-solid fa-stethoscope"></i>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Primeira avaliação</h4>
                  <p class="text-[11px] text-neutral-500 dark:text-neutral-400">Card exclusivo para triagem e conversão de novos pacientes em Odontologia ou Estética.</p>
                </div>
              </div>
              <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900/60 text-neutral-800 dark:text-neutral-300">
                ⭐ Principal Porta de Entrada
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label id="lblCfgInitEvalDuration" class="block font-semibold text-[11px] mb-1 text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                  <span>Tempo de Duração da Avaliação Inicial</span>
                  <span id="badgeCfgInitEvalDuration" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400">* Obrigatório</span>
                </label>
                <select id="cfgInitEvalDuration" aria-label="Duração da avaliação inicial"></select>
                <p id="errCfgInitEvalDuration" class="hidden text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1"></p>
              </div>
              <div>
                <label class="block font-semibold text-[11px] mb-1 text-neutral-700 dark:text-neutral-300">
                  Preço da Consulta (se for paga)
                  <span class="text-[10px] text-amber-600 dark:text-amber-400 font-normal ml-1">*(Deixe vazio se for gratuita)*</span>
                </label>
                <input type="text" id="cfgInitEvalPrice" placeholder="Valor ou condição da avaliação"
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[var(--aura-accent)]">
              </div>
            </div>

            <div>
              <label class="block font-semibold text-[11px] mb-1 text-neutral-700 dark:text-neutral-300">Como funciona essa Avaliação Inicial / Consulta?</label>
              <textarea id="cfgInitEvalDetails" rows="3" placeholder="Explique o que acontece na primeira avaliação."
                class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[var(--aura-accent)] leading-relaxed resize-none"></textarea>
            </div>
          </div>

          <!-- ALERTA EM VERMELHO DE PROCEDIMENTOS SEM NOME/DURAÇÃO -->
          <div id="proceduresCrucialAlert" class="hidden p-3.5 rounded-xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2"></div>

          <!-- SEÇÃO 1: ODONTOLOGIA -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <i class="fa-solid fa-tooth"></i> Procedimentos Odontológicos
              </span>
              <button type="button" onclick="addNewProcedureRow('odonto')"
                class="px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300 font-bold text-xs flex items-center gap-1.5 transition border border-neutral-200 dark:border-neutral-800/60">
                <i class="fa-solid fa-plus text-[10px]"></i>
                <span>Adicionar serviço</span>
              </button>
            </div>

            <!-- LISTA VERTICAL DE ODONTO -->
            <div id="odontoList" class="space-y-2">
              <!-- Linhas geradas dinamicamente via JS -->
            </div>
          </div>

          <!-- SEÇÃO 2: ESTÉTICA OROFACIAL & CORPORAL -->
          <div class="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Procedimentos de Estética & Harmonização
              </span>
              <button type="button" onclick="addNewProcedureRow('estetica')"
                class="px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300 font-bold text-xs flex items-center gap-1.5 transition border border-neutral-200 dark:border-neutral-800/60">
                <i class="fa-solid fa-plus text-[10px]"></i>
                <span>Adicionar serviço</span>
              </button>
            </div>

            <!-- LISTA VERTICAL DE ESTÉTICA -->
            <div id="esteticaList" class="space-y-2">
              <!-- Linhas geradas dinamicamente via JS -->
            </div>
          </div>
        </div></details>

        <!-- CARD 3: ESTRATÉGIA COMERCIAL DE PREÇOS & AVALIAÇÃO -->
        <details class="aura-training-section"><summary>Como falar sobre preços</summary><div class="aura-training-body">

          <div class="space-y-2.5 text-xs">
            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 cursor-pointer hover:border-neutral-500 transition">
              <input type="radio" name="priceStrategyRadio" value="avaliacao" checked class="mt-0.5 text-[var(--aura-accent)] focus:ring-0">
              <div>
                <span class="font-bold text-neutral-900 dark:text-white block">🔒 Apenas Avaliação Presencial (Padrão Ouro Recomendado)</span>
                <span class="text-[11px] text-neutral-500 dark:text-neutral-400">A IA nunca dá preços no WhatsApp. Explica com elegância que cada anatomia é única e induz o agendamento da consulta.</span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 cursor-pointer hover:border-neutral-500 transition">
              <input type="radio" name="priceStrategyRadio" value="a_partir_de" class="mt-0.5 text-[var(--aura-accent)] focus:ring-0">
              <div>
                <span class="font-bold text-neutral-900 dark:text-white block">📊 Informar Faixa Inicial ("A partir de R$...")</span>
                <span class="text-[11px] text-neutral-500 dark:text-neutral-400">A IA passa um valor base de referência mas reforça que a consulta presencial é indispensável para o plano definitivo.</span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 cursor-pointer hover:border-neutral-500 transition">
              <input type="radio" name="priceStrategyRadio" value="tabela_fixa" class="mt-0.5 text-[var(--aura-accent)] focus:ring-0">
              <div>
                <span class="font-bold text-neutral-900 dark:text-white block">🏷️ Tabela Fixa Aberta</span>
                <span class="text-[11px] text-neutral-500 dark:text-neutral-400">A IA informa diretamente os valores praticados para quem perguntar e já oferece horários para fechar.</span>
              </div>
            </label>
          </div>

          <div class="pt-2">
            <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300 text-xs">
              A Consulta de Avaliação Inicial é Paga ou Gratuita? (Regras de Cobrança da Consulta)
            </label>
            <p class="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">
              Explique aqui se a clínica cobra pela primeira consulta de avaliação e se esse valor é abatido no tratamento. Assim, a IA responde com precisão quando o paciente perguntar sobre custos da consulta.
            </p>
            <textarea id="cfgPricesNote" rows="4" placeholder="Explique quando informar valores e quando orientar uma avaliação."
              class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[var(--aura-accent)] leading-relaxed"></textarea>
          </div>
        </div></details>

        <!-- CARD 4: FORMAS DE PAGAMENTO, PARCELAMENTO & CONVÊNIOS (12 LINHAS) -->
        <details class="aura-training-section"><summary>Pagamento e convênios</summary><div class="aura-training-body">

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Condições de Pagamento & Parcelamento</label>
              <p class="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">Descontos no Pix/à vista, parcelas no cartão, boleto ou financiamento.</p>
              <input type="hidden" id="cfgPaymentMethods"><div id="trainingPayments"></div>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Política de Convênios & Reembolso</label>
              <p class="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">Particular exclusivo com recibo para reembolso ou convênios atendidos.</p>
              <input type="hidden" id="cfgInsurance"><div id="trainingInsurance"></div>
            </div>
          </div>
        </div></details>

        <!-- CARD 5: HORÁRIOS, LOCALIZAÇÃO & ESTACIONAMENTO (6 LINHAS) -->
        <details class="aura-training-section" open><summary>Horários e localização</summary><div class="aura-training-body">

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="aura-training-hours-column">
              <div class="flex items-center justify-between mb-1">
                <label id="lblCfgHours" class="block font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <span>Horários e Dias de Atendimento</span>
                  <span id="badgeCfgHours" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400">* Obrigatório</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer text-neutral-600 dark:text-neutral-400 font-bold text-[11px]">
                  <input type="checkbox" id="cfgHolidayService" class="rounded text-[var(--aura-accent)] focus:ring-0">
                  <span>Atende em Feriados</span>
                </label>
              </div>
              <input type="hidden" id="cfgHours"><div id="trainingSchedule"></div><p id="trainingScheduleError" class="aura-field-hint" role="status"></p>
              <p id="errCfgHours" class="hidden text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1"></p>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Tolerância para Atrasos & Políticas de Comparecimento</label>
              <select id="cfgDelayTolerance" aria-label="Tolerância para atrasos"></select>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Endereço Completo & Pontos de Referência</label>
              <textarea id="cfgAddress" rows="3" placeholder="Endereço completo e uma referência, se necessário."
                class="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--aura-accent)] leading-relaxed"></textarea>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Estacionamento, Valet & Logística de Chegada</label>
              <input type="hidden" id="cfgParking"><div id="trainingParking"></div>
            </div>
          </div>
        </div></details>

        <!-- CARD 6: REGRAS DE OURO CLÍNICAS & SEGURANÇA JURÍDICA (ESPAÇO AMPLO) -->
        <details class="aura-training-section"><summary>Orientações e limites</summary><div class="aura-training-body">

          <div class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Regras Clínicas Especiais, Contraindicações & Prioridades</label>
              <p class="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">Orientações de biossegurança que a IA deve respeitar rigidamente antes de agendar qualquer tratamento.</p>
              <textarea id="cfgClinicalRules" rows="4" placeholder="Informe os limites do atendimento e o que precisa ser encaminhado à equipe."
                class="w-full px-3.5 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--aura-accent)] leading-relaxed"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">WhatsApp de Transbordo Humano / Urgências</label>
                <p class="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">Telefone para onde a IA direciona casos graves ou quando o paciente solicita a recepção.</p>
                <textarea id="cfgEmergencyContact" rows="3" placeholder="Nome, telefone e horário do contato de apoio."
                  class="w-full px-3.5 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--aura-accent)] leading-relaxed"></textarea>
              </div>
              <div>
                <label class="block font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Diferenciais Tecnológicos & Estrutura da Clínica</label>
                <p class="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">Equipamentos e comodidades que a IA pode citar para encantar e converter o paciente.</p>
                <textarea id="cfgExtra" rows="3" placeholder="Outras informações relevantes para quem procura seu atendimento."
                  class="w-full px-3.5 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--aura-accent)] leading-relaxed"></textarea>
              </div>
            </div>
          </div>
        </div></details>

        <!-- CARD 7: ENCAMINHAMENTO DE CONTATO PÓS-AGENDAMENTO -->
        <details class="aura-training-section"><summary>Contato após o agendamento</summary><div class="aura-training-body">

          <label class="flex items-start gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 cursor-pointer hover:border-neutral-500 transition">
            <input type="checkbox" id="cfgSendSecondaryContact" class="mt-0.5 rounded text-[var(--aura-accent)] focus:ring-0 w-4 h-4 cursor-pointer">
            <div class="text-xs space-y-1">
              <span class="font-bold text-neutral-900 dark:text-white block">
                Ao concluir cada agendamento/avaliação, a IA deve encaminhar o número de telefone secundário da clínica?
              </span>
              <p class="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Se marcado, assim que o paciente informar nome e procedimento preferido, a IA confirma o registro e envia uma mensagem com os dados de contato secundário da recepção/plantão para que o paciente salve e possa continuar por lá se preferir.
              </p>
            </div>
          </label>
        </div></details>

        <!-- BARRA FINAL DE SALVAR (NO RODAPÉ) -->
        <div class="aura-save-bar flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-neutral-200 dark:border-neutral-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-neutral-500 animate-pulse"></span>
            <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Ao salvar os campos essenciais completos, a revisão é automática.</span>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" onclick="selectNavigationTab('support-simular')"
              class="px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300 font-bold text-xs flex items-center gap-2 transition border border-neutral-200 dark:border-neutral-800/60 shadow-sm">
              <i class="fa-solid fa-flask-vial"></i>
              <span>Simular atendimento</span>
            </button>
            <button type="submit" id="btnSaveConfig" class="px-6 py-2.5 rounded-xl aura-filled font-bold text-xs shadow-lg shadow-neutral-500/25 flex items-center gap-2 transition">
              <i class="fa-solid fa-floppy-disk"></i>
              <span id="btnSaveConfigText">Salvar treinamento</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  </main>
`;
