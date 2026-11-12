export const INBOX_MODALS_HTML = `
  <!-- ======================================================================= -->
  <!-- MODAL: LIGHTBOX DE VISUALIZAÇÃO & DOWNLOAD DE FOTO                      -->
  <!-- ======================================================================= -->
  <div id="imageLightboxModal" onclick="if (event.target === this) closeImageLightbox()" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-[60] flex items-center justify-center p-4 hidden">
    <div class="relative max-w-4xl w-full flex flex-col items-center gap-3">
      <div class="w-full flex items-center justify-between text-white text-xs px-1">
        <span class="font-semibold flex items-center gap-2"><i class="fa-regular fa-image text-emerald-400"></i> Foto do paciente</span>
        <div class="flex items-center gap-2">
          <a id="lightboxDownloadBtn" href="#" download class="px-3 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold flex items-center gap-1.5 transition">
            <i class="fa-solid fa-download text-[11px]"></i> Baixar foto
          </a>
          <button onclick="closeImageLightbox()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <img id="lightboxImg" src="" alt="Foto ampliada" class="max-h-[80vh] max-w-full rounded-xl shadow-2xl object-contain bg-slate-950">
    </div>
  </div>

  <!-- ======================================================================= -->
  <!-- MODAL: NOVO AGENDAMENTO DE CONSULTA                                     -->
  <!-- ======================================================================= -->
  <div id="appointmentModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-900 dark:text-white">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2">
          <i class="fa-solid fa-calendar-plus text-emerald-500"></i>
          <span>Registrar Agendamento de Consulta</span>
        </h3>
        <button onclick="closeAppointmentModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form onsubmit="handleSaveAppointment(event)" class="space-y-3 pt-4 text-xs">
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nome do Paciente</label>
          <input type="text" id="appPatientName" required placeholder="Ex: Mariana Silveira"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">WhatsApp</label>
          <input type="text" id="appPatientPhone" required placeholder="Ex: 5511988881234"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Serviço</label>
          <select id="appProcedure" required onchange="onAppointmentTimeOrProcChange()"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
            <!-- Preenchido dinamicamente com base nos serviços cadastrados -->
          </select>
        </div>

        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Profissional</label>
          <select id="appProfessional" onchange="onAppointmentTimeOrProcChange()"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
            <option value="">Selecione o profissional</option>
          </select>
        </div>

        <div>
          <div class="grid grid-cols-2 gap-3">
            <label class="aura-field col-span-2" for="appDate">Dia da consulta<input type="date" id="appDate" required onchange="onAppointmentTimeOrProcChange()"></label>
            <label class="aura-field" for="appHourSelect">Hora<select id="appHourSelect" onchange="onAppointmentTimeOrProcChange()"></select></label>
            <label class="aura-field" for="appMinuteSelect">Minutos<select id="appMinuteSelect" onchange="onAppointmentTimeOrProcChange()"><option value="00">00</option><option value="10">10</option><option value="20">20</option><option value="30">30</option><option value="40">40</option><option value="50">50</option></select></label>
          </div>
          <!-- FEEDBACK DE CONSUMO DE TEMPO & VERIFICAÇÃO DE CONFLITO EM TEMPO REAL -->
          <div id="appTimeSlotFeedback" class="mt-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 text-[11px] transition-all">
            <!-- Preenchido dinamicamente por onAppointmentTimeOrProcChange() -->
          </div>
        </div>

        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Status</label>
          <select id="appStatus" class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none">
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Observações Clínicas / Preferências</label>
          <textarea id="appNotes" rows="4" placeholder="Ex: Paciente tem preferência por horário matutino, histórico de sensibilidade, regras específicas..."
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069] leading-relaxed resize-none"></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeAppointmentModal()" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">Cancelar</button>
          <button type="submit" id="btnSaveAppointmentModal" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold shadow-sm transition">Salvar consulta</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ======================================================================= -->
  <!-- MODAL 3: DETALHES COMPLETOS & EDIÇÃO DO AGENDAMENTO (VER MAIS / EDITAR) -->
  <!-- ======================================================================= -->
  <div id="appointmentDetailsModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-900 dark:text-white space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2">
          <i class="fa-solid fa-notes-medical text-emerald-500"></i>
          <span>Informações do Atendimento</span>
        </h3>
        <button onclick="closeAppointmentDetailsModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <input type="hidden" id="detAppId">

      <!-- CARDS DE INFORMAÇÕES RESUMIDAS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Paciente</span>
          <div class="font-bold text-sm text-slate-900 dark:text-white truncate" id="detPatientName">-</div>
          <div class="flex items-center justify-between pt-1">
            <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400" id="detPatientPhone">-</span>
            <button id="detBtnOpenChat" type="button" onclick="handleDetailOpenChat()" class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
              <i class="fa-brands fa-whatsapp"></i> Conversar
            </button>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Procedimento & Duração</span>
          <div class="font-bold text-sm text-slate-900 dark:text-white truncate" id="detProcedure">-</div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-1">
            <i class="fa-regular fa-clock text-emerald-500"></i>
            <span id="detDuration">-</span>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1 sm:col-span-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Data & Horário Agendado</span>
            <span id="detConfirmationBadge" class="text-[10px] font-bold"></span>
          </div>
          <div class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <i class="fa-regular fa-calendar-check text-[#008069]"></i>
            <span id="detScheduledAt">-</span>
          </div>
        </div>
      </div>

      <!-- CAMPOS EDITÁVEIS: PROFISSIONAL, STATUS & OBSERVAÇÕES -->
      <div class="space-y-3 pt-1 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Profissional Responsável</label>
            <select id="detProfessional" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#008069]">
              <option value="">Agenda Geral</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Alterar Status da Consulta</label>
            <select id="detStatus" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#008069]">
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Observações Clínicas, Histórico & Anotações
            <span class="text-[10px] text-slate-400 font-normal ml-1">(Espaço amplo para anotações detalhadas)</span>
          </label>
          <textarea id="detNotes" rows="6" placeholder="Registre aqui todas as observações do atendimento, sintomas relatados, preferências de horário, materiais necessários..."
            class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-[#008069]"></textarea>
        </div>
      </div>

      <!-- RODAPÉ DE AÇÕES -->
      <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onclick="handleDeleteDetailAppointment()" class="px-3 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition flex items-center gap-1.5">
          <i class="fa-regular fa-trash-can"></i>
          <span>Excluir</span>
        </button>
        <div class="flex items-center gap-2">
          <button type="button" onclick="closeAppointmentDetailsModal()" class="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition">Fechar</button>
          <button type="button" onclick="handleSaveAppointmentDetails()" id="btnSaveAppointmentDetails" class="px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#006a57] text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ======================================================================= -->
  <!-- MODAL 4: GERENCIAR PROFISSIONAIS (DENTISTAS / ESTETICISTAS)             -->
  <!-- ======================================================================= -->
  <div id="professionalsModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-900 dark:text-white overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div>
          <h3 class="text-sm font-bold flex items-center gap-2">
            <i class="fa-solid fa-user-doctor text-sky-500"></i>
            <span>Equipe de Profissionais & Grades Independentes</span>
          </h3>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">Cadastre dentistas e esteticistas com horários e dias próprios. A IA respeita a agenda de cada profissional.</p>
        </div>
        <button onclick="closeProfessionalsModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="flex-1 overflow-y-auto custom-scroll p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- LISTA DE PROFISSIONAIS -->
        <div class="lg:col-span-5 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Profissionais Cadastrados</span>
            <button type="button" onclick="resetProfessionalForm()" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
              <i class="fa-solid fa-plus"></i> Novo
            </button>
          </div>
          <div id="professionalsList" class="space-y-2.5">
            <div class="p-4 text-center text-xs text-slate-400">Carregando...</div>
          </div>
        </div>

        <!-- FORMULÁRIO DE CADASTRO / EDIÇÃO -->
        <form onsubmit="handleSaveProfessional(event)" class="lg:col-span-7 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <input type="hidden" id="profEditId">
          <div class="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h4 id="profFormTitle" class="font-bold text-slate-900 dark:text-white">Novo Profissional</h4>
            <div class="flex items-center gap-1.5" id="profColorSwatches">
              <button type="button" onclick="selectProfColor('#10b981')" data-color="#10b981" class="prof-color-btn w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-offset-2 ring-emerald-500"></button>
              <button type="button" onclick="selectProfColor('#0ea5e9')" data-color="#0ea5e9" class="prof-color-btn w-5 h-5 rounded-full bg-sky-500"></button>
              <button type="button" onclick="selectProfColor('#8b5cf6')" data-color="#8b5cf6" class="prof-color-btn w-5 h-5 rounded-full bg-violet-500"></button>
              <button type="button" onclick="selectProfColor('#f59e0b')" data-color="#f59e0b" class="prof-color-btn w-5 h-5 rounded-full bg-amber-500"></button>
              <button type="button" onclick="selectProfColor('#ec4899')" data-color="#ec4899" class="prof-color-btn w-5 h-5 rounded-full bg-pink-500"></button>
              <button type="button" onclick="selectProfColor('#14b8a6')" data-color="#14b8a6" class="prof-color-btn w-5 h-5 rounded-full bg-teal-500"></button>
            </div>
            <input type="hidden" id="profColor" value="#10b981">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block font-semibold mb-1">Nome Completo *</label>
              <input type="text" id="profName" required placeholder="Ex: Dra. Ana Paula Costa"
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1">Especialidade</label>
              <input type="text" id="profSpecialty" placeholder="Ex: Harmonização / Ortodontia"
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1">CRO / CRM</label>
              <input type="text" id="profCro" placeholder="Ex: CRO-SP 123456"
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#008069]">
            </div>
          </div>

          <div>
            <label class="block font-semibold mb-1.5">Dias de Atendimento *</label>
            <div class="flex flex-wrap gap-1.5">
              <label class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer flex items-center gap-1"><input type="checkbox" name="profWorkDay" value="0"><span>Dom</span></label>
              <label class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer flex items-center gap-1"><input type="checkbox" name="profWorkDay" value="1" checked><span>Seg</span></label>
              <label class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer flex items-center gap-1"><input type="checkbox" name="profWorkDay" value="2" checked><span>Ter</span></label>
              <label class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer flex items-center gap-1"><input type="checkbox" name="profWorkDay" value="3" checked><span>Qua</span></label>
              <label class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer flex items-center gap-1"><input type="checkbox" name="profWorkDay" value="4" checked><span>Qui</span></label>
              <label class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer flex items-center gap-1"><input type="checkbox" name="profWorkDay" value="5" checked><span>Sex</span></label>
              <label class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer flex items-center gap-1"><input type="checkbox" name="profWorkDay" value="6"><span>Sáb</span></label>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label class="block font-semibold mb-1">Início *</label>
              <input type="time" id="profStartHour" value="08:00" required class="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none">
            </div>
            <div>
              <label class="block font-semibold mb-1">Fim *</label>
              <input type="time" id="profEndHour" value="18:00" required class="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none">
            </div>
            <div>
              <label class="block font-semibold mb-1">Almoço Início</label>
              <input type="time" id="profBreakStart" value="12:00" class="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none">
            </div>
            <div>
              <label class="block font-semibold mb-1">Almoço Fim</label>
              <input type="time" id="profBreakEnd" value="13:00" class="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none">
            </div>
          </div>

          <div>
            <label class="block font-semibold mb-1">Procedimentos que realiza <span class="text-[10px] font-normal text-slate-400">(deixe todos desmarcados para atender qualquer procedimento)</span></label>
            <div id="profProceduresCheckboxes" class="max-h-32 overflow-y-auto custom-scroll p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-1.5"></div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onclick="resetProfessionalForm()" class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium">Limpar</button>
            <button type="submit" id="btnSaveProfessional" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold shadow-sm transition">Salvar Profissional</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ======================================================================= -->
  <!-- MODAL 5: CRIAR / EDITAR USUÁRIO DA CLÍNICA (EQUIPE INTERNA)             -->
  <!-- ======================================================================= -->
  <div id="clinicUserModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-900 dark:text-white">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2">
          <i class="fa-solid fa-user-plus text-emerald-500"></i>
          <span id="cuModalTitle">Novo Usuário da Equipe</span>
        </h3>
        <button type="button" onclick="closeClinicUserModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form onsubmit="handleSaveClinicUser(event)" class="space-y-3 pt-4 text-xs">
        <input type="hidden" id="cuEditId">
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nome Completo *</label>
          <input type="text" id="cuName" required placeholder="Ex: Recepção Manhã"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#008069]">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">E-mail de Login *</label>
          <input type="email" id="cuEmail" required placeholder="atendimento@clinica.com.br"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#008069]">
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Cargo / Permissão</label>
            <select id="cuRole" class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#008069]">
              <option value="staff">Atendente / Recepção</option>
              <option value="admin" disabled>Administrador</option>
            </select>
          </div>
          <div>
            <label id="cuPasswordLabel" class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Senha Inicial *</label>
            <input type="password" id="cuPassword" minlength="6" placeholder="Mín. 6 caracteres"
              class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#008069]">
          </div>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400">
          <strong>Atendente / Recepção</strong> opera o atendimento WhatsApp e a Agenda. <strong>Administrador</strong> também gerencia equipe, dados da clínica e conexão WhatsApp.
        </p>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeClinicUserModal()" class="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
          <button type="submit" id="btnSaveClinicUser" class="px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#006a57] text-white font-bold shadow-sm transition">Salvar Usuário</button>
        </div>
      </form>
    </div>
  </div>

  <!-- TOAST DE NOTIFICAÇÃO FLUTUANTE -->
  <div id="toastNotification" class="fixed bottom-6 right-6 z-50 transform translate-y-20 opacity-0 transition-all duration-300 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold">
    <i id="toastIcon" class="fa-solid fa-circle-check text-emerald-400"></i>
    <span id="toastMsg">Alterações salvas com sucesso!</span>
  </div>
`;
