    // 4. ATENDIMENTO WHATSAPP MULTI-CHAT
    async function loadConversations(isAutoRefresh = false) {
      try {
        const res = await fetch('/api/conversations');
        const data = await res.json();
        if (data.server_time) syncServerTime(data.server_time);
        conversations = data.conversations || [];

        const countSpan = document.getElementById('chatCount');
        if (countSpan) countSpan.innerText = `${conversations.length} conversas ativas`;

        renderConversationList();

        if (activePhone) {
          const current = conversations.find(c => c.contact_wa_id === activePhone);
          if (current && typeof current.ai_paused !== 'undefined') {
            activeAiPaused = current.ai_paused === 1;
            updateAiStatusUI();
          }
        }

        if (!activePhone && conversations.length > 0 && !isAutoRefresh) {
          selectChat(conversations[0].contact_wa_id);
        }
      } catch (err) {
        console.error("Erro ao carregar conversas:", err);
        const container = document.getElementById('conversationList');
        if (container && conversations.length === 0) {
          container.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">Erro ao sincronizar pacientes. Tentando reconectar...</div>';
        }
      }
    }

    function renderConversationList() {
      const container = document.getElementById('conversationList');
      const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

      const filtered = conversations.filter(c => 
        (c.contact_name || '').toLowerCase().includes(search) || 
        (c.contact_wa_id || '').includes(search) ||
        (c.last_body || '').toLowerCase().includes(search)
      );

      if (filtered.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">Nenhum paciente encontrado.</div>';
        return;
      }

      const trainingComplete = isCrucialTrainingComplete();

      container.innerHTML = filtered.map(c => {
        const isSelected = c.contact_wa_id === activePhone;
        const initial = (c.contact_name || c.contact_wa_id)[0].toUpperCase();
        const timeStr = formatConversationItemTime(c.last_created_at);
        const isAiOn = trainingComplete && c.ai_paused === 0;
        const statusDotClass = !trainingComplete ? 'bg-rose-500' : (isAiOn ? 'bg-emerald-500' : 'bg-amber-500');
        const statusBadgeClass = !trainingComplete
          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
          : (isAiOn
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40');
        const statusBadgeText = !trainingComplete ? 'IA Desligada' : (isAiOn ? 'IA respondendo' : 'IA Pausada');

        return `
          <div onclick="selectChat('${c.contact_wa_id}')" 
            class="p-3.5 flex items-center gap-3 cursor-pointer transition select-none ${
              isSelected 
                ? 'bg-slate-100 dark:bg-slate-800/90 border-l-4 border-[#008069]' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }">
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm uppercase">
                ${initial}
              </div>
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#111827] ${statusDotClass}"></span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate">${c.contact_name || c.contact_wa_id}</h4>
                <span class="text-[10px] text-slate-400 font-medium">${timeStr}</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                ${c.last_direction === 'out' ? '<span class="text-slate-400">Você: </span>' : ''}${escapeHtml((c.last_body || 'Sem mensagens').replace(/^\[Áudio transcrito\]:\s*/i, '🎙️ '))}
              </p>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded ${statusBadgeClass}">
                  ${statusBadgeText}
                </span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    async function selectChat(phone) {
      if (activePhone === phone && highestActiveMsgId > 0) return;
      activePhone = phone;
      highestActiveMsgId = 0;

      const target = conversations.find(c => c.contact_wa_id === phone);
      const name = target?.contact_name || phone;
      const initial = name[0].toUpperCase();

      document.getElementById('activeContactName').innerText = name;
      document.getElementById('activeContactPhone').innerText = phone;
      document.getElementById('activeAvatar').innerText = initial;

      document.getElementById('sideContactName').innerText = name;
      document.getElementById('sideContactPhone').innerText = phone;
      document.getElementById('sideAvatar').innerText = initial;

      // Habilita controles
      document.getElementById('messageInput').disabled = false;
      document.getElementById('messageInput').placeholder = "Escreva sua mensagem";
      document.getElementById('sendBtn').disabled = false;
      applyCommercialLocks();
      document.getElementById('btnScheduleThisPatient').disabled = !isCrucialTrainingComplete();
      document.getElementById('btnClearChat').disabled = false;

      // Atualiza imediatamente o status da IA para o contato selecionado
      activeAiPaused = target ? target.ai_paused === 1 : false;
      updateAiStatusUI();

      renderConversationList();

      document.getElementById('messagesArea').innerHTML = `
        <div class="h-full flex items-center justify-center text-slate-400 text-xs">
          <i class="fa-solid fa-circle-notch fa-spin text-sm mr-2"></i> Abrindo conversa...
        </div>
      `;

      await loadActiveMessages();
    }

    async function loadActiveMessages() {
      if (!activePhone) return;
      try {
        const res = await fetch(`/api/messages?phone=${encodeURIComponent(activePhone)}`);
        const data = await res.json();
        if (data.server_time) syncServerTime(data.server_time);
        const msgs = data.messages || [];

        activeAiPaused = !!data.ai_paused;
        updateAiStatusUI();

        if (msgs.length > 0) {
          highestActiveMsgId = Math.max(...msgs.map(m => m.id));
        }

        renderMessages(msgs);
        detectProcedureFromChat(msgs);
      } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
      }
    }

    let currentlyPlayingAudioId = null;

    function formatAudioSeconds(sec) {
      if (!isFinite(sec) || sec < 0) return '0:00';
      const total = Math.floor(sec);
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function toggleAudioPlayback(msgId) {
      const audio = document.getElementById('audioEl_' + msgId);
      const icon = document.getElementById('audioIcon_' + msgId);
      if (!audio || !icon) return;

      if (currentlyPlayingAudioId && currentlyPlayingAudioId !== msgId) {
        const prevAudio = document.getElementById('audioEl_' + currentlyPlayingAudioId);
        const prevIcon = document.getElementById('audioIcon_' + currentlyPlayingAudioId);
        if (prevAudio) prevAudio.pause();
        if (prevIcon) prevIcon.className = 'fa-solid fa-play text-[11px] ml-0.5';
      }

      if (audio.paused) {
        const playPromise = audio.play();
        currentlyPlayingAudioId = msgId;
        icon.className = 'fa-solid fa-pause text-[11px]';
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            icon.className = 'fa-solid fa-play text-[11px] ml-0.5';
            showToast('Não foi possível reproduzir este formato diretamente; use o ícone de download.', 'amber');
          });
        }
      } else {
        audio.pause();
        icon.className = 'fa-solid fa-play text-[11px] ml-0.5';
      }
    }

    function toggleAudioTranscript(msgId) {
      const box = document.getElementById('transcriptBox_' + msgId);
      const lbl = document.getElementById('btnTranscriptText_' + msgId);
      if (!box || !lbl) return;
      const willShow = box.classList.contains('hidden');
      if (willShow) {
        box.classList.remove('hidden');
        lbl.innerText = 'Ocultar transcrição';
      } else {
        box.classList.add('hidden');
        lbl.innerText = 'Exibir transcrição';
      }
    }

    function openImageLightbox(msgId) {
      const modal = document.getElementById('imageLightboxModal');
      const img = document.getElementById('lightboxImg');
      const dl = document.getElementById('lightboxDownloadBtn');
      if (!modal || !img || !dl) return;
      img.src = '/api/media?msg_id=' + encodeURIComponent(msgId);
      dl.href = '/api/media?msg_id=' + encodeURIComponent(msgId) + '&download=1';
      modal.classList.remove('hidden');
    }

    function closeImageLightbox() {
      const modal = document.getElementById('imageLightboxModal');
      const img = document.getElementById('lightboxImg');
      if (modal) modal.classList.add('hidden');
      if (img) img.src = '';
    }

    function bindAudioPlayers() {
      const audios = document.querySelectorAll('audio[data-msg-id]');
      audios.forEach(audio => {
        const msgId = audio.getAttribute('data-msg-id');
        const range = document.getElementById('audioRange_' + msgId);
        const timeLbl = document.getElementById('audioTime_' + msgId);
        const icon = document.getElementById('audioIcon_' + msgId);
        const controls = document.getElementById('audioControls_' + msgId);
        const expiredBadge = document.getElementById('audioExpired_' + msgId);

        audio.addEventListener('loadedmetadata', () => {
          if (timeLbl && isFinite(audio.duration)) {
            timeLbl.innerText = formatAudioSeconds(audio.duration);
          }
        });

        audio.addEventListener('timeupdate', () => {
          if (range && isFinite(audio.duration) && audio.duration > 0) {
            range.value = String(Math.round((audio.currentTime / audio.duration) * 100));
          }
          if (timeLbl) {
            const totalStr = isFinite(audio.duration) ? ' / ' + formatAudioSeconds(audio.duration) : '';
            timeLbl.innerText = formatAudioSeconds(audio.currentTime) + totalStr;
          }
        });

        audio.addEventListener('ended', () => {
          if (icon) icon.className = 'fa-solid fa-play text-[11px] ml-0.5';
          if (range) range.value = '0';
          if (timeLbl && isFinite(audio.duration)) {
            timeLbl.innerText = formatAudioSeconds(audio.duration);
          }
          if (currentlyPlayingAudioId === Number(msgId)) currentlyPlayingAudioId = null;
        });

        audio.addEventListener('error', () => {
          if (controls) controls.classList.add('hidden');
          if (expiredBadge) expiredBadge.classList.remove('hidden');
        });

        if (range) {
          range.addEventListener('input', () => {
            if (isFinite(audio.duration) && audio.duration > 0) {
              audio.currentTime = (Number(range.value) / 100) * audio.duration;
            }
          });
        }
      });
    }

    function renderMessageBodyHtml(m) {
      if (m.media_type === 'audio') {
        const rawBody = String(m.body || '');
        const transcript = rawBody.replace(/^\[Áudio transcrito\]:\s*/i, '').trim();
        const hasTranscript = rawBody.toLowerCase().startsWith('[áudio transcrito]:') && transcript.length > 0;
        const hasMedia = !!m.media_key;

        let html = '<div class="w-60 sm:w-72 max-w-full space-y-2">';
        if (hasMedia) {
          html += '<div id="audioControls_' + m.id + '" class="flex items-center gap-2.5 py-1">' +
            '<button type="button" onclick="toggleAudioPlayback(' + m.id + ')" class="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white flex items-center justify-center shrink-0 shadow-sm transition active:scale-95" title="Reproduzir áudio">' +
              '<i id="audioIcon_' + m.id + '" class="fa-solid fa-play text-[11px] ml-0.5"></i>' +
            '</button>' +
            '<div class="flex-1 min-w-0">' +
              '<input id="audioRange_' + m.id + '" type="range" min="0" max="100" value="0" class="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-[#00a884]">' +
              '<div class="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-300 mt-1">' +
                '<span id="audioTime_' + m.id + '" class="font-mono">0:00</span>' +
                '<span class="flex items-center gap-1.5">' +
                  '<i class="fa-solid fa-microphone text-[#00a884]"></i>' +
                  '<a href="/api/media?msg_id=' + m.id + '&download=1" download title="Baixar áudio" class="hover:text-[#00a884] transition"><i class="fa-solid fa-download"></i></a>' +
                '</span>' +
              '</div>' +
            '</div>' +
            '<audio id="audioEl_' + m.id + '" data-msg-id="' + m.id + '" preload="metadata" src="/api/media?msg_id=' + m.id + '"></audio>' +
          '</div>' +
          '<div id="audioExpired_' + m.id + '" class="hidden text-[11px] text-slate-400 italic py-1"><i class="fa-regular fa-clock mr-1"></i>Áudio expirado (retenção de 30 dias)</div>';
        } else {
          html += '<div class="text-[11px] text-slate-400 italic py-1"><i class="fa-solid fa-microphone-slash mr-1"></i>Áudio indisponível</div>';
        }

        if (hasTranscript) {
          html += '<button type="button" onclick="toggleAudioTranscript(' + m.id + ')" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition">' +
            '<i class="fa-regular fa-file-lines text-[10px] text-[#00a884]"></i>' +
            '<span id="btnTranscriptText_' + m.id + '">Exibir transcrição</span>' +
          '</button>' +
          '<div id="transcriptBox_' + m.id + '" class="hidden p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">' +
            escapeHtml(transcript) +
          '</div>';
        }
        html += '</div>';
        return html;
      }

      if (m.media_type === 'image') {
        const caption = String(m.body || '').trim();
        const showCaption = caption && caption !== '[Imagem enviada pelo paciente]';
        let html = '<div class="space-y-2 max-w-[260px] sm:max-w-[300px]">';
        if (m.media_key) {
          html += '<div class="relative group">' +
            '<img src="/api/media?msg_id=' + m.id + '" alt="Foto enviada pelo paciente" onclick="openImageLightbox(' + m.id + ')" ' +
              'onerror="this.classList.add(\'hidden\'); this.nextElementSibling.classList.remove(\'hidden\');" ' +
              'class="w-full max-h-64 object-cover rounded-xl cursor-zoom-in border border-slate-200/60 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-900">' +
            '<div class="hidden px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/70 text-[11px] text-slate-400 italic"><i class="fa-regular fa-clock mr-1"></i>Foto expirada (retenção de 30 dias)</div>' +
          '</div>' +
          '<div class="flex items-center justify-between gap-2 text-[11px]">' +
            '<button type="button" onclick="openImageLightbox(' + m.id + ')" class="inline-flex items-center gap-1 text-slate-500 dark:text-slate-300 hover:text-[#008069] dark:hover:text-emerald-400 font-semibold transition">' +
              '<i class="fa-solid fa-magnifying-glass-plus text-[10px]"></i><span>Ampliar</span>' +
            '</button>' +
            '<a href="/api/media?msg_id=' + m.id + '&download=1" download class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition">' +
              '<i class="fa-solid fa-download text-[10px] text-[#00a884]"></i><span>Baixar foto</span>' +
            '</a>' +
          '</div>';
        } else {
          html += '<div class="text-[11px] text-slate-400 italic">[Imagem indisponível]</div>';
        }
        if (showCaption) {
          html += '<div class="whitespace-pre-wrap break-words">' + escapeHtml(caption) + '</div>';
        }
        html += '</div>';
        return html;
      }

      return '<div class="whitespace-pre-wrap break-words">' + escapeHtml(m.body) + '</div>';
    }

    function renderMessages(msgs) {
      const area = document.getElementById('messagesArea');
      if (msgs.length === 0) {
        area.innerHTML = '<div class="h-full flex items-center justify-center text-slate-400 text-xs">Nenhuma mensagem nesta conversa ainda.</div>';
        return;
      }

      let lastDateKey = null;
      const htmlParts = [];

      msgs.forEach(m => {
        const d = parseIsoDate(m.created_at);
        const dateKey = d ? getBrasiliaDateKey(d) : 'sem_data';

        if (d && dateKey !== lastDateKey) {
          lastDateKey = dateKey;
          const dividerLabel = getWhatsAppDateDividerLabel(d);
          htmlParts.push(`
            <div class="flex justify-center my-3.5 sticky top-1 z-10 select-none">
              <span class="px-3.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/95 dark:bg-[#182229]/95 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200/70 dark:border-slate-700/60 backdrop-blur-md">
                ${escapeHtml(dividerLabel)}
              </span>
            </div>
          `);
        }

        const isPatient = m.direction === 'in';
        const isHumanAgent = m.status === 'human';
        const timeStr = formatMessageTime(m.created_at);
        const bodyHtml = renderMessageBodyHtml(m);

        if (isPatient) {
          htmlParts.push(`
            <div class="flex flex-col items-start max-w-[85%] md:max-w-[70%]">
              <div class="bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200/50 dark:border-slate-700/30 text-xs leading-relaxed">
                ${bodyHtml}
                <div class="text-[9px] text-slate-400 dark:text-slate-400 text-right mt-1 font-mono">${timeStr}</div>
              </div>
            </div>
          `);
        } else {
          htmlParts.push(`
            <div class="flex flex-col items-end max-w-[85%] md:max-w-[70%] ml-auto">
              <div class="${
                isHumanAgent 
                  ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-200 dark:border-sky-800/60 text-sky-950 dark:text-sky-100' 
                  : 'bg-[#d9fdd3] dark:bg-[#005c4b] border-emerald-200 dark:border-emerald-700/40 text-slate-900 dark:text-white'
              } p-3 rounded-2xl rounded-tr-sm shadow-sm border text-xs leading-relaxed">
                <div class="text-[9px] font-bold uppercase tracking-wider mb-1 ${
                  isHumanAgent ? 'text-sky-600 dark:text-sky-300' : 'text-emerald-700 dark:text-emerald-300'
                }">
                  ${isHumanAgent ? 'Você' : 'Atendente IA'}
                </div>
                ${bodyHtml}
                <div class="text-[9px] opacity-75 text-right mt-1 font-mono flex items-center justify-end gap-1">
                  <span>${timeStr}</span>
                  <i class="fa-solid fa-check-double text-[9px] text-[#53bdeb]" title="Entregue e sincronizado"></i>
                </div>
              </div>
            </div>
          `);
        }
      });

      area.innerHTML = htmlParts.join('');
      bindAudioPlayers();
      area.scrollTop = area.scrollHeight;
    }

    function updateAiStatusUI() {
      const badge = document.getElementById('activeAiBadge');
      const toggleBtn = document.getElementById('toggleAiBtn');
      const toggleText = document.getElementById('toggleAiText');
      const toggleIcon = document.getElementById('toggleAiIcon');
      const sideText = document.getElementById('sideAiStatusText');
      const sideBtn = document.getElementById('sideToggleAiBtn');

      badge.classList.remove('hidden');
      toggleBtn.classList.remove('hidden');

      if (currentAccess && !currentAccess.can_operate) {
        badge.className = 'text-xs text-slate-500';
        badge.textContent = 'Atendimento pausado';
        toggleBtn.classList.add('hidden');
        sideText.textContent = 'Atendimento pausado';
        sideBtn.classList.add('hidden');
        return;
      }

      if (!isCrucialTrainingComplete()) {
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60";
        badge.innerText = "Preencha o treinamento";

        toggleBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition shadow-sm";
        toggleIcon.className = "fa-solid fa-lock text-[10px]";
        toggleText.innerText = "Preencher informações";

        sideText.innerText = "Aguardando treinamento";
        sideText.className = "font-bold text-rose-600 dark:text-rose-400";
        sideBtn.classList.add('hidden');
        return;
      }

      sideBtn.classList.remove('hidden');

      if (activeAiPaused) {
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60";
        badge.innerText = "Com a equipe";

        toggleBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition shadow-sm";
        toggleIcon.className = "fa-solid fa-play text-[10px]";
        toggleText.innerText = "Reativar IA neste Chat";

        sideText.innerText = "IA Pausada (Você no controle)";
        sideText.className = "font-bold text-amber-600 dark:text-amber-400";
      } else {
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60";
        badge.innerText = "IA disponível";

        toggleBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition shadow-sm";
        toggleIcon.className = "fa-solid fa-pause text-[10px]";
        toggleText.innerText = "Pausar IA (Assumir)";

        sideText.innerText = "IA disponível nesta conversa";
        sideText.className = "font-bold text-emerald-600 dark:text-emerald-400";
      }
    }

    async function handleSendMessage(e) {
      e.preventDefault();
      if (currentAccess && !currentAccess.can_operate) return showToast('O atendimento real está desativado.', 'amber');
      const input = document.getElementById('messageInput');
      const text = input.value.trim();
      if (!text || !activePhone) return;

      input.value = '';

      try {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, text })
        });
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erro ao enviar mensagem");
        }
        if (data.warning) {
          showToast(data.warning, "amber");
        }

        activeAiPaused = true;
        const target = conversations.find(c => c.contact_wa_id === activePhone);
        if (target) target.ai_paused = 1;
        updateAiStatusUI();
        renderConversationList();

        await loadActiveMessages();
        await loadConversations(true);
      } catch (err) {
        alert("Erro ao enviar mensagem");
      }
    }

    async function handleToggleAi() {
      if (!activePhone) return;
      if (!isCrucialTrainingComplete()) {
        goToTrainingAndHighlightMissing();
        return;
      }
      const targetState = !activeAiPaused;

      try {
        const res = await fetch('/api/toggle-ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, paused: targetState })
        });
        const data = await res.json();

        activeAiPaused = targetState;
        const target = conversations.find(c => c.contact_wa_id === activePhone);
        if (target) target.ai_paused = targetState ? 1 : 0;
        updateAiStatusUI();
        renderConversationList();

        await loadConversations(true);
      } catch (err) {
        alert("Erro ao alterar status da IA");
      }
    }

    function detectProcedureFromChat(msgs) {
      const container = document.getElementById('sideProcedureDetected');
      const allText = msgs.map(m => m.body).join(' ').toLowerCase();

      const procedures = [
        "botox", "toxina botulínica", "preenchimento", "harmonização", "clareamento", 
        "aparelho", "invisalign", "implante", "lentes", "canal", "limpeza", "siso", "papada"
      ];

      const found = procedures.filter(p => allText.includes(p));
      if (found.length > 0) {
        container.innerHTML = found.map(p => 
          `<span class="inline-block px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] mr-1 mb-1 capitalize border border-emerald-200 dark:border-emerald-800/40">${p}</span>`
        ).join('');
      } else {
        container.innerText = "Em análise pela conversa...";
      }
    }

    function openAppointmentModalForCurrentPatient() {
      if (!activePhone) return;
      const target = conversations.find(c => c.contact_wa_id === activePhone);
      const name = target?.contact_name || '';

      document.getElementById('appPatientName').value = name;
      document.getElementById('appPatientPhone').value = activePhone;
      openAppointmentModal("Avaliação Inicial / Consulta");
    }

    async function handleClearCurrentChat() {
      if (!activePhone) return;
      if (confirm("Tem certeza que deseja apagar o histórico de mensagens deste paciente?")) {
        try {
          await fetch('/api/clear-chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ phone: activePhone })
          });
          await loadActiveMessages();
          await loadConversations(true);
        } catch (err) {
          alert("Erro ao limpar histórico");
        }
      }
    }

    function filterChats() {
      renderConversationList();
    }
