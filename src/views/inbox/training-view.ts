export const INBOX_TRAINING_VIEW_HTML = `
  <!-- ======================================================================= -->
  <!-- VIEW 3: CONFIGURAÇÕES & TREINAMENTO DA IA (ODONTO & ESTÉTICA)           -->
  <!-- ======================================================================= -->
  <main id="viewConfig" class="flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 hidden bg-slate-50 dark:bg-[#0b0f17]">
    <div class="max-w-5xl mx-auto space-y-6">

      <!-- FORMULÁRIO COMPLETO DO QUESTIONÁRIO -->
      <form id="clinicConfigForm" onsubmit="event.preventDefault(); saveClinicConfig();" oninput="updateTrainingValidationHighlights()" onchange="updateTrainingValidationHighlights()" class="space-y-6">

        <!-- BANNER EXPLÍCITO DE STATUS DO TREINAMENTO & PENDÊNCIAS EM VERMELHO -->
        <div id="configCrucialStatusBanner" class="hidden rounded-2xl p-5 shadow-md transition-all"></div>

        <!-- AVISO DE FUNCIONAMENTO & CONDUTA PARA CAMPOS NÃO PREENCHIDOS -->
        <div class="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div class="flex items-start gap-3.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-[#008069] dark:text-emerald-400 flex items-center justify-center shrink-0 text-base">
              <i class="fa-solid fa-circle-info"></i>
            </div>
            <div class="flex-1 space-y-1">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Como a IA utiliza estas informações
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">Preenchimento Obrigatório</span>
              </h3>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                A Secretária IA utiliza <strong>todas as informações salvas nesta página</strong> para conduzir o atendimento no WhatsApp com precisão. <strong>Não é obrigatório preencher todos os campos</strong> para ela funcionar.
              </p>
            </div>
          </div>

          <div class="pt-3 border-t border-emerald-500/20 space-y-2">
            <span class="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Caso o paciente pergunte algo sobre um assunto ou procedimento que você deixou em branco, como a IA deve proceder?
            </span>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-xs">
              <label class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 cursor-pointer hover:border-emerald-500 transition">
                <input type="radio" name="unfilledFallbackRadio" value="avaliacao" checked class="mt-0.5 text-[#008069] focus:ring-0">
                <div class="text-[11px] leading-snug">
                  <span class="font-bold text-slate-900 dark:text-white block mb-0.5">🩺 Avaliação Presencial</span>
                  <span class="text-slate-500 dark:text-slate-400">Informa que essas dúvidas são tiradas exclusivamente na consulta presencial.</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 cursor-pointer hover:border-emerald-500 transition">
                <input type="radio" name="unfilledFallbackRadio" value="contato_secundario" class="mt-0.5 text-[#008069] focus:ring-0">
                <div class="text-[11px] leading-snug">
                  <span class="font-bold text-slate-900 dark:text-white block mb-0.5">📞 Contato Secundário</span>
                  <span class="text-slate-500 dark:text-slate-400">Disponibiliza o WhatsApp secundário da clínica para falar direto com a equipe.</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 cursor-pointer hover:border-emerald-500 transition">
                <input type="radio" name="unfilledFallbackRadio" value="aguardar_humano" class="mt-0.5 text-[#008069] focus:ring-0">
                <div class="text-[11px] leading-snug">
                  <span class="font-bold text-slate-900 dark:text-white block mb-0.5">⏳ Aguardar Atendente</span>
                  <span class="text-slate-500 dark:text-slate-400">Avisa com clareza que não pode responder no momento e pede para aguardar resposta humana no mesmo número.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- CARD 1: IDENTIDADE DA CLÍNICA & RESPONSÁVEL TÉCNICO -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Identidade da Clínica & Responsável Técnico</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Dados oficiais que geram autoridade e confiança imediata ao paciente.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label id="lblCfgClinicName" class="block font-semibold mb-1 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Nome Oficial da Clínica</span>
                <span id="badgeCfgClinicName" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400">* Obrigatório</span>
              </label>
              <input type="text" id="cfgClinicName" placeholder="Ex: Clínica Sorriso & Estética Integrada" required
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] transition">
              <p id="errCfgClinicName" class="hidden text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1"></p>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Doutor(a) Responsável Técnico</label>
              <input type="text" id="cfgDoctorName" placeholder="Ex: Dra. Fernanda Alves"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Registro Profissional (CRO / CRM)</label>
              <input type="text" id="cfgDoctorCro" placeholder="Ex: CRO-SP 102.450 / Harmonização Orofacial"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Tom de Voz da Secretária IA</label>
              <select id="cfgTone" 
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] font-medium">
                <option value="acolhedor">🌸 Acolhedor & Gentil (Caloroso, empático, ideal para clínica geral)</option>
                <option value="sofisticado">✨ Sofisticado & Exclusivo (Boutique, foco em estética de alto padrão)</option>
                <option value="clinico">🩺 Clínico & Técnico (Objetivo, seguro, rigor científico e formal)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- CARD 2: CATÁLOGO DE PROCEDIMENTOS (ODONTO + ESTÉTICA) -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Procedimentos, Duração & Observações</h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Ative os procedimentos oferecidos, defina o tempo médio e regras clínicas para a IA informar aos pacientes com precisão.</p>
              </div>
            </div>
          </div>

          <!-- CARD EXCLUSIVO: AVALIAÇÃO INICIAL / CONSULTA -->
          <div id="cardInitEvalContainer" class="p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 transition-all">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-emerald-500/20">
                  <i class="fa-solid fa-stethoscope"></i>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Avaliação Inicial / Consulta Médica</h4>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Card exclusivo para triagem e conversão de novos pacientes em Odontologia ou Estética.</p>
                </div>
              </div>
              <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                ⭐ Principal Porta de Entrada
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label id="lblCfgInitEvalDuration" class="block font-semibold text-[11px] mb-1 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Tempo de Duração da Avaliação Inicial</span>
                  <span id="badgeCfgInitEvalDuration" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400">* Obrigatório</span>
                </label>
                <input type="text" id="cfgInitEvalDuration" placeholder="Ex: 30 min"
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#008069] transition">
                <p id="errCfgInitEvalDuration" class="hidden text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1"></p>
              </div>
              <div>
                <label class="block font-semibold text-[11px] mb-1 text-slate-700 dark:text-slate-300">
                  Preço da Consulta (se for paga)
                  <span class="text-[10px] text-amber-600 dark:text-amber-400 font-normal ml-1">*(Deixe vazio se for gratuita)*</span>
                </label>
                <input type="text" id="cfgInitEvalPrice" placeholder="Ex: R$ 150,00 ou Deixe vazio se gratuita"
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
              </div>
            </div>

            <div>
              <label class="block font-semibold text-[11px] mb-1 text-slate-700 dark:text-slate-300">Como funciona essa Avaliação Inicial / Consulta?</label>
              <textarea id="cfgInitEvalDetails" rows="3" placeholder="Ex: Realizamos exame clínico completo, fotografias digitais intraorais em alta resolução, avaliação do histórico de saúde bucal e apresentação de plano de tratamento personalizado sem compromisso."
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#008069] leading-relaxed resize-none"></textarea>
            </div>
          </div>

          <!-- ALERTA EM VERMELHO DE PROCEDIMENTOS SEM NOME/DURAÇÃO -->
          <div id="proceduresCrucialAlert" class="hidden p-3.5 rounded-xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2"></div>

          <!-- SEÇÃO 1: ODONTOLOGIA -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <i class="fa-solid fa-tooth"></i> Procedimentos Odontológicos
              </span>
              <button type="button" onclick="addNewProcedureRow('odonto')" 
                class="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition border border-emerald-200 dark:border-emerald-800/60">
                <i class="fa-solid fa-plus text-[10px]"></i>
                <span>Adicionar Linha em Odonto</span>
              </button>
            </div>
            
            <!-- LISTA VERTICAL DE ODONTO -->
            <div id="odontoList" class="space-y-2">
              <!-- Linhas geradas dinamicamente via JS -->
            </div>
          </div>

          <!-- SEÇÃO 2: ESTÉTICA OROFACIAL & CORPORAL -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Procedimentos de Estética & Harmonização
              </span>
              <button type="button" onclick="addNewProcedureRow('estetica')" 
                class="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 transition border border-purple-200 dark:border-purple-800/60">
                <i class="fa-solid fa-plus text-[10px]"></i>
                <span>Adicionar Linha em Estética</span>
              </button>
            </div>

            <!-- LISTA VERTICAL DE ESTÉTICA -->
            <div id="esteticaList" class="space-y-2">
              <!-- Linhas geradas dinamicamente via JS -->
            </div>
          </div>
        </div>

        <!-- CARD 3: ESTRATÉGIA COMERCIAL DE PREÇOS & AVALIAÇÃO -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Conduta sobre Preços & Avaliação</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Como a IA deve responder quando o paciente pergunta: "Quanto custa?"</p>
            </div>
          </div>

          <div class="space-y-2.5 text-xs">
            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
              <input type="radio" name="priceStrategyRadio" value="avaliacao" checked class="mt-0.5 text-[#008069] focus:ring-0">
              <div>
                <span class="font-bold text-slate-900 dark:text-white block">🔒 Apenas Avaliação Presencial (Padrão Ouro Recomendado)</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">A IA nunca dá preços no WhatsApp. Explica com elegância que cada anatomia é única e induz o agendamento da consulta.</span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
              <input type="radio" name="priceStrategyRadio" value="a_partir_de" class="mt-0.5 text-[#008069] focus:ring-0">
              <div>
                <span class="font-bold text-slate-900 dark:text-white block">📊 Informar Faixa Inicial ("A partir de R$...")</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">A IA passa um valor base de referência mas reforça que a consulta presencial é indispensável para o plano definitivo.</span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
              <input type="radio" name="priceStrategyRadio" value="tabela_fixa" class="mt-0.5 text-[#008069] focus:ring-0">
              <div>
                <span class="font-bold text-slate-900 dark:text-white block">🏷️ Tabela Fixa Aberta</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">A IA informa diretamente os valores praticados para quem perguntar e já oferece horários para fechar.</span>
              </div>
            </label>
          </div>

          <div class="pt-2">
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300 text-xs">
              A Consulta de Avaliação Inicial é Paga ou Gratuita? (Regras de Cobrança da Consulta)
            </label>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              Explique aqui se a clínica cobra pela primeira consulta de avaliação e se esse valor é abatido no tratamento. Assim, a IA responde com precisão quando o paciente perguntar sobre custos da consulta.
            </p>
            <textarea id="cfgPricesNote" rows="4" placeholder="Ex: A primeira avaliação é gratuita e sem compromisso.&#10;Ex: A consulta de avaliação custa R$ 150 com raio-X incluso, mas esse valor é 100% deduzido caso o tratamento seja iniciado."
              class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
          </div>
        </div>

        <!-- CARD 4: FORMAS DE PAGAMENTO, PARCELAMENTO & CONVÊNIOS (12 LINHAS) -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              4
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Formas de Pagamento & Convênios</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Condições comerciais e facilidades que aumentam a taxa de fechamento de tratamentos.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Condições de Pagamento & Parcelamento</label>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Descontos no Pix/à vista, parcelas no cartão, boleto ou financiamento.</p>
              <textarea id="cfgPaymentMethods" rows="12" placeholder="Ex:&#10;- Pix ou Dinheiro: 10% de desconto à vista.&#10;- Cartão de Crédito: Em até 12x sem juros (parcela mínima de R$ 150).&#10;- Financiamento odontológico/estético: Em até 24x com aprovação imediata no consultório.&#10;- Aceitamos cartões de débito e crédito de todas as bandeiras."
                class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed font-mono text-[11px]"></textarea>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Política de Convênios & Reembolso</label>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Particular exclusivo com recibo para reembolso ou convênios atendidos.</p>
              <textarea id="cfgInsurance" rows="12" placeholder="Ex:&#10;- Atendimento Particular Exclusivo.&#10;- Emitimos nota fiscal detalhada, prontuário e relatório técnico para o paciente solicitar reembolso integral ou parcial no seu plano de saúde/odontológico (como Bradesco, Amil, SulAmérica, Porto Seguro).&#10;- Nossa equipe auxilia no processo de pedido de reembolso caso o paciente precise."
                class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed font-mono text-[11px]"></textarea>
            </div>
          </div>
        </div>

        <!-- CARD 5: HORÁRIOS, LOCALIZAÇÃO & ESTACIONAMENTO (6 LINHAS) -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              5
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Horários, Endereço & Estacionamento</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Informações precisas para que o paciente chegue sem dúvidas à clínica.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label id="lblCfgHours" class="block font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Horários e Dias de Atendimento</span>
                  <span id="badgeCfgHours" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400">* Obrigatório</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  <input type="checkbox" id="cfgHolidayService" class="rounded text-[#008069] focus:ring-0">
                  <span>Atende em Feriados</span>
                </label>
              </div>
              <textarea id="cfgHours" rows="6" placeholder="Ex:&#10;Segunda a Sexta: das 08:00 às 19:30&#10;Sábados: das 08:00 às 13:00&#10;Domingos: Fechado"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed transition"></textarea>
              <p id="errCfgHours" class="hidden text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1"></p>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Tolerância para Atrasos & Políticas de Comparecimento</label>
              <textarea id="cfgDelayTolerance" rows="6" placeholder="Ex:&#10;- Tolerância máxima de 15 minutos para pontualidade de todos os atendimentos.&#10;- Pedimos aviso prévio de 24 horas em caso de reagendamento para liberar a grade para outros pacientes."
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Endereço Completo & Pontos de Referência</label>
              <textarea id="cfgAddress" rows="6" placeholder="Ex:&#10;Av. Paulista, 1800 - Conjunto 124, 12º Andar&#10;Bela Vista - São Paulo/SP&#10;Ponto de referência: Em frente ao metrô Trianon-Masp"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Estacionamento, Valet & Logística de Chegada</label>
              <textarea id="cfgParking" rows="6" placeholder="Ex:&#10;- Estacionamento conveniado no subsolo do edifício com manobrista (cortesia para pacientes na primeira hora).&#10;- Acesso com rampa e elevadores para cadeirantes."
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
            </div>
          </div>
        </div>

        <!-- CARD 6: REGRAS DE OURO CLÍNICAS & SEGURANÇA JURÍDICA (ESPAÇO AMPLO) -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              6
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Regras de Ouro Clínicas & Segurança Jurídica</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Proteção contra processos, erros médicos e proibições éticas expressas.</p>
            </div>
          </div>

          <div class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Regras Clínicas Especiais, Contraindicações & Prioridades</label>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Orientações de biossegurança que a IA deve respeitar rigidamente antes de agendar qualquer tratamento.</p>
              <textarea id="cfgClinicalRules" rows="8" placeholder="Ex:&#10;- Gestantes e lactantes não podem realizar toxina botulínica, preenchedores ou procedimentos invasivos.&#10;- Pacientes com dor de dente aguda, inchaço visível ou trauma têm prioridade absoluta de encaixe no mesmo dia.&#10;- Proibido prescrever analgésicos, anti-inflamatórios ou antibióticos pelo chat.&#10;- Pacientes menores de 18 anos precisam de acompanhante legal."
                class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">WhatsApp de Transbordo Humano / Urgências</label>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Telefone para onde a IA direciona casos graves ou quando o paciente solicita a recepção.</p>
                <textarea id="cfgEmergencyContact" rows="5" placeholder="Ex:&#10;WhatsApp de Urgência: (11) 98888-0000 (Dra. Fernanda)&#10;Telefone Fixo da Recepção: (11) 3333-2222&#10;Horário de plantão telefônico: 24h para pós-operatório."
                  class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
              </div>
              <div>
                <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Diferenciais Tecnológicos & Estrutura da Clínica</label>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Equipamentos e comodidades que a IA pode citar para encantar e converter o paciente.</p>
                <textarea id="cfgExtra" rows="5" placeholder="Ex:&#10;- Escaneamento 3D intraoral sem moldeira de massa.&#10;- Anestesia computadorizada sem dor.&#10;- Ambiente climatizado com aromaterapia e lounge café premium.&#10;- Sedação consciente com óxido nitroso disponível para pacientes ansiosos."
                  class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD 7: ENCAMINHAMENTO DE CONTATO PÓS-AGENDAMENTO -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              7
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Encaminhamento de Contato Pós-Agendamento</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Fluxo de transição e envio de dados para continuidade do atendimento.</p>
            </div>
          </div>

          <label class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
            <input type="checkbox" id="cfgSendSecondaryContact" class="mt-0.5 rounded text-[#008069] focus:ring-0 w-4 h-4 cursor-pointer">
            <div class="text-xs space-y-1">
              <span class="font-bold text-slate-900 dark:text-white block">
                Ao concluir cada agendamento/avaliação, a IA deve encaminhar o número de telefone secundário da clínica?
              </span>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Se marcado, assim que o paciente informar nome e procedimento preferido, a IA confirma o registro e envia uma mensagem com os dados de contato secundário da recepção/plantão para que o paciente salve e possa continuar por lá se preferir.
              </p>
            </div>
          </label>
        </div>

        <!-- BARRA FINAL DE SALVAR (NO RODAPÉ) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 pb-12 border-t border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">As alterações entram em vigor instantaneamente para todas as próximas mensagens.</span>
          </div>
          <div class="flex items-center gap-3">
            <button type="submit" id="btnSaveConfig" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#008069] to-emerald-600 hover:from-[#006a57] hover:to-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition">
              <i class="fa-solid fa-floppy-disk"></i>
              <span id="btnSaveConfigText">Salvar Alterações na IA</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  </main>
`;
