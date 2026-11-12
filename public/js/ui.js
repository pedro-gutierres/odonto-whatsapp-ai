/* Shared controls. Native fields retain form values, validation and existing change handlers. */
(() => {
  const controls = new Map();
  let active = null, refreshQueued = false, serial = 0;
  const chevron = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const calendarIcon = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 3v3m7-3v3m-10 3h13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const clockIcon = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M10 6v4l2.5 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
  const button = (text, className, action) => { const element = node('button', className, text); element.type = 'button'; if (action) element.addEventListener('click', action); return element; };
  const two = value => String(value).padStart(2, '0');
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const dayValue = date => date.getFullYear() + '-' + two(date.getMonth() + 1) + '-' + two(date.getDate());
  const fromDay = value => { const parts = value.split('-').map(Number); return new Date(parts[0], parts[1] - 1, parts[2], 12); };
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function labelFor(input) {
    if (controls.has(input)) return controls.get(input).label;
    if (input.getAttribute('aria-label')) return input.getAttribute('aria-label');
    const label = input.labels && input.labels[0] || input.parentElement.querySelector('label');
    if (label) {
      const copy = label.cloneNode(true); copy.querySelectorAll('input,select,textarea,button,.aura-control,small').forEach(element => element.remove());
      const text = copy.textContent.replace(/\s+/g, ' ').trim(); if (text) return text;
    }
    return input.getAttribute('data-label') || input.title || 'Selecionar opção';
  }
  function close(restoreFocus = false) {
    if (!active) return;
    const current = active; active = null;
    current.popup.remove(); current.trigger.setAttribute('aria-expanded', 'false');
    current.trigger.removeAttribute('aria-controls'); current.trigger.removeAttribute('aria-describedby');
    if (restoreFocus && current.trigger.isConnected) current.trigger.focus();
  }
  function position() {
    if (!active) return;
    const { trigger, popup } = active;
    if (!trigger.isConnected || trigger.disabled || !trigger.getClientRects().length) { close(); return; }
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(popup.classList.contains('aura-picker') ? 306 : rect.width, 200), window.innerWidth - 24);
    popup.style.width = width + 'px';
    const height = popup.offsetHeight;
    const below = rect.bottom + 7;
    const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 7);
    popup.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) + 'px';
    popup.style.top = top + 'px'; popup.style.maxHeight = Math.max(140, window.innerHeight - 24) + 'px';
  }
  function mount(trigger, popup, role, label) {
    close(); popup.id = 'aura-popup-' + (++serial); popup.setAttribute('role', role); if (label) popup.setAttribute('aria-label', label);
    trigger.setAttribute('aria-expanded', 'true'); trigger.setAttribute('aria-controls', popup.id);
    if (role === 'tooltip') trigger.setAttribute('aria-describedby', popup.id);
    document.body.append(popup); active = { trigger, popup }; position();
    return popup;
  }
  function commit(input, value) {
    input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
    refresh(); close(true);
  }
  function optionKeys(event, container) {
    const options = [...container.querySelectorAll('button:not(:disabled)')]; if (!options.length) return;
    let index = options.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') index = Math.min(index + 1, options.length - 1);
    else if (event.key === 'ArrowUp') index = Math.max(index - 1, 0);
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = options.length - 1;
    else return;
    event.preventDefault(); options[index].focus();
  }
  function openSelect(input, trigger, query = '') {
    if (input.disabled) return;
    const popup = node('div', 'aura-popover');
    const list = node('div', 'aura-option-list'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', labelFor(input));
    const searchable = input.options.length > 7;
    let search;
    function render() {
      list.replaceChildren(); let count = 0;
      for (const option of input.options) {
        if (option.hidden || !normalize(option.textContent).includes(normalize(search ? search.value : query))) continue;
        const item = button('', 'aura-option', () => commit(input, option.value));
        item.append(node('span', '', option.textContent), node('span', '', option.selected ? '✓' : ''));
        item.setAttribute('role', 'option'); item.setAttribute('aria-selected', String(option.selected));
        item.disabled = option.disabled || option.parentElement.disabled === true; list.append(item); count++;
      }
      if (!count) list.append(node('p', 'aura-empty-options', 'Nenhuma opção encontrada.'));
      position();
    }
    if (searchable) { search = node('input', 'aura-popover-search'); search.type = 'search'; search.placeholder = 'Buscar opção'; search.setAttribute('aria-label', 'Buscar opção'); search.value = query; search.addEventListener('input', render); search.addEventListener('keydown', event => optionKeys(event, list)); popup.append(search); }
    popup.append(list); list.addEventListener('keydown', event => optionKeys(event, list));
    mount(trigger, popup, 'dialog', labelFor(input)); render();
    if (search) search.focus(); else (list.querySelector('[aria-selected=true]') || list.querySelector('button:not(:disabled)'))?.focus();
    list.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
  }
  function openCalendar(input, trigger) {
    if (input.disabled) return;
    let selected = input.value || today(); let focusDay = selected; let month = fromDay(selected);
    month.setDate(1);
    const popup = node('div', 'aura-popover aura-picker');
    function allowed(value) { return (!input.min || value >= input.min) && (!input.max || value <= input.max); }
    function render(focus = false) {
      popup.replaceChildren();
      const head = node('div', 'aura-picker-head');
      head.append(node('span', 'aura-picker-title', month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })));
      const nav = node('div', 'aura-picker-nav');
      for (const [step, text, label] of [[-1, '‹', 'Mês anterior'], [1, '›', 'Próximo mês']]) {
        const control = button(text, '', () => { month.setMonth(month.getMonth() + step); focusDay = dayValue(month); render(); }); control.setAttribute('aria-label', label); nav.append(control);
      }
      head.append(nav); popup.append(head);
      const grid = node('div', 'aura-calendar-grid'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Dias do mês');
      for (const day of ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']) grid.append(node('span', 'aura-weekday', day));
      for (let index = 0; index < month.getDay(); index++) grid.append(node('span'));
      const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= last; day++) {
        const date = new Date(month.getFullYear(), month.getMonth(), day, 12); const value = dayValue(date);
        const control = button(day, 'aura-day', () => commit(input, value));
        control.dataset.date = value; control.dataset.today = String(value === today()); control.tabIndex = value === focusDay ? 0 : -1;
        control.setAttribute('aria-label', date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        control.setAttribute('aria-pressed', String(value === input.value)); control.disabled = !allowed(value);
        control.addEventListener('keydown', event => {
          let offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
          if (event.key === 'PageUp' || event.key === 'PageDown') {
            event.preventDefault(); month.setMonth(month.getMonth() + (event.key === 'PageUp' ? -1 : 1)); focusDay = dayValue(month); render(true); return;
          }
          if (offset === undefined) return;
          event.preventDefault(); const next = fromDay(value); next.setDate(next.getDate() + offset); focusDay = dayValue(next);
          month = new Date(next.getFullYear(), next.getMonth(), 1, 12); render(true);
        }); grid.append(control);
      }
      popup.append(grid);
      const footer = node('div', 'aura-picker-footer'); const todayButton = button('Hoje', 'aura-text-button', () => commit(input, today())); todayButton.disabled = !allowed(today()); footer.append(todayButton);
      if (!input.required) footer.append(button('Limpar', 'aura-text-button', () => commit(input, '')));
      popup.append(footer); position();
      if (focus) (grid.querySelector('[data-date="' + focusDay + '"]:not(:disabled)') || grid.querySelector('button:not(:disabled)'))?.focus();
    }
    mount(trigger, popup, 'dialog', 'Escolher data'); render(true);
  }
  function openTime(input, trigger) {
    if (input.disabled) return;
    const [initialHour, initialMinute] = (input.value || '09:00').split(':').map(Number);
    let hour = initialHour, minute = initialMinute;
    const popup = node('div', 'aura-popover aura-picker'); const head = node('div', 'aura-picker-head');
    const exact = node('input', 'aura-time-exact'); exact.type = 'text'; exact.inputMode = 'numeric'; exact.maxLength = 5; exact.setAttribute('aria-label', 'Horário no formato horas e minutos');
    head.append(node('span', 'aura-picker-title', 'Escolher horário'), exact); popup.append(head);
    const columns = node('div', 'aura-time-columns');
    const lists = [];
    function sync() {
      exact.value = two(hour) + ':' + two(minute);
      for (let column = 0; column < lists.length; column++) for (const item of lists[column].querySelectorAll('button')) item.setAttribute('aria-pressed', String(Number(item.dataset.value) === (column ? minute : hour)));
    }
    for (const [title, limit] of [['Hora', 24], ['Minuto', 60]]) {
      const column = node('div'); column.append(node('p', 'aura-time-column-title', title));
      const list = node('div', 'aura-time-list'); list.setAttribute('role', 'group'); list.setAttribute('aria-label', title);
      for (let value = 0; value < limit; value++) {
        const item = button(two(value), 'aura-time-option', () => { if (limit === 24) hour = value; else minute = value; sync(); }); item.dataset.value = String(value); item.setAttribute('aria-label', value + (limit === 24 ? ' horas' : ' minutos')); list.append(item);
      }
      list.addEventListener('keydown', event => optionKeys(event, list)); lists.push(list); column.append(list); columns.append(column);
    }
    popup.append(columns);
    const error = node('p', 'aura-error'); error.setAttribute('aria-live', 'polite'); popup.append(error);
    function apply() {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(exact.value)) { error.textContent = 'Use um horário entre 00:00 e 23:59.'; exact.focus(); return; }
      if ((input.min && exact.value < input.min) || (input.max && exact.value > input.max)) { error.textContent = 'Escolha um horário dentro do período disponível.'; return; }
      commit(input, exact.value);
    }
    exact.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } });
    const footer = node('div', 'aura-picker-footer');
    footer.append(!input.required ? button('Limpar', 'aura-text-button', () => commit(input, '')) : node('span'));
    footer.append(button('Usar horário', 'aura-primary', apply)); popup.append(footer);
    mount(trigger, popup, 'dialog', 'Escolher horário'); sync();
    for (const list of lists) list.querySelector('[aria-pressed=true]')?.scrollIntoView({ block: 'center' });
    exact.focus(); exact.select();
  }
  function upgrade(input) {
    if (controls.has(input) || input.multiple || input.hasAttribute('data-native')) return;
    const kind = input.tagName === 'SELECT' ? 'select' : input.type;
    const label = labelFor(input), wrapper = node('span', 'aura-control'); wrapper.dataset.for = input.id || '';
    const trigger = button('', 'aura-control-trigger'); const text = node('span'); trigger.append(text); trigger.insertAdjacentHTML('beforeend', kind === 'date' ? calendarIcon : kind === 'time' ? clockIcon : chevron);
    trigger.setAttribute('aria-label', label); trigger.setAttribute('aria-haspopup', kind === 'select' ? 'dialog' : 'dialog'); trigger.setAttribute('aria-expanded', 'false');
    input.parentNode.insertBefore(wrapper, input); wrapper.append(input, trigger); input.classList.add('aura-native-control'); input.tabIndex = -1; input.setAttribute('aria-hidden', 'true');
    const control = { input, wrapper, trigger, text, kind, label }; controls.set(input, control);
    trigger.addEventListener('click', () => { if (active?.trigger === trigger) { close(true); return; } if (kind === 'select') openSelect(input, trigger); else if (kind === 'date') openCalendar(input, trigger); else openTime(input, trigger); });
    trigger.addEventListener('keydown', event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); trigger.click(); } });
    input.addEventListener('invalid', event => { event.preventDefault(); trigger.setAttribute('aria-invalid', 'true'); trigger.focus(); });
    input.addEventListener('change', () => { trigger.removeAttribute('aria-invalid'); sync(control); }); sync(control);
  }
  function sync(control) {
    const { input, trigger, text, kind } = control; if (trigger.disabled !== input.disabled) trigger.disabled = input.disabled;
    let value = '';
    if (kind === 'select') value = input.selectedOptions[0]?.textContent || 'Selecione';
    else if (kind === 'date') value = input.value ? fromDay(input.value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replaceAll('.', '') : 'Escolher data';
    else value = input.value || 'Escolher horário';
    if (text.textContent !== value) text.textContent = value;
    if (trigger.dataset.empty !== String(!input.value)) trigger.dataset.empty = String(!input.value);
    const name = labelFor(input); const accessible = name + ': ' + value; if (trigger.getAttribute('aria-label') !== accessible) trigger.setAttribute('aria-label', accessible);
  }
  function refresh() {
    refreshQueued = false;
    document.querySelectorAll('select,input[type=date],input[type=time]').forEach(upgrade);
    for (const [input, control] of controls) { if (!input.isConnected) controls.delete(input); else sync(control); }
    if (active) position();
  }
  function queueRefresh() { if (!refreshQueued) { refreshQueued = true; requestAnimationFrame(refresh); } }
  document.addEventListener('pointerdown', event => { if (active && !active.popup.contains(event.target) && !active.trigger.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (active && !active.popup.contains(event.target) && !active.trigger.contains(event.target)) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) { event.preventDefault(); close(true); } else if (event.key === 'Tab' && active && !active.popup.contains(event.target)) close(); });
  document.addEventListener('click', event => {
    const help = event.target.closest('[data-aura-help]'); if (!help) return;
    if (active?.trigger === help) { close(true); return; }
    const popup = node('div', 'aura-popover aura-help-content', help.dataset.auraHelp); mount(help, popup, 'tooltip');
  });
  window.addEventListener('resize', position); document.addEventListener('scroll', () => { if (active && !active.popup.contains(document.activeElement)) position(); }, true);
  function init() { refresh(); new MutationObserver(queueRefresh).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'selected', 'hidden', 'min', 'max'] }); }
  window.auraUI = { refresh: queueRefresh, close, today };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
