export const SIMULATOR_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Simulador de Paciente no WhatsApp | Aura AI</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0b0f17;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .top-nav {
      width: 100%;
      max-width: 420px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 12px;
    }
    .top-nav a {
      color: #10b981;
      text-decoration: none;
      font-weight: 600;
    }
    .phone {
      width: 100%;
      max-width: 420px;
      height: 720px;
      background: #efeae2;
      border-radius: 36px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 0 8px #1e293b;
      position: relative;
    }
    .header {
      background: #008069;
      color: #fff;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 10;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #fff;
      color: #008069;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
    }
    .header-info h1 { font-size: 15px; font-weight: 600; }
    .header-info p { font-size: 11px; opacity: 0.85; }
    .chat {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background-image: radial-gradient(#d1d7db 1px, transparent 1px);
      background-size: 16px 16px;
    }
    .bubble {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
      position: relative;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .bubble.in {
      align-self: flex-end;
      background: #d9fdd3;
      color: #111b21;
      border-top-right-radius: 0;
    }
    .bubble.out {
      align-self: flex-start;
      background: #fff;
      color: #111b21;
      border-top-left-radius: 0;
      box-shadow: 0 1px 0.5px rgba(11,20,26,.13);
    }
    .bubble .time {
      font-size: 10px;
      color: #667781;
      text-align: right;
      margin-top: 4px;
    }
    .bubble.typing {
      font-style: italic;
      color: #667781;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
    .input-bar {
      background: #f0f2f5;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-top: 1px solid #e9edef;
    }
    .input-bar input {
      flex: 1;
      border: none;
      background: #fff;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    .input-bar button {
      background: #008069;
      color: #fff;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .clear-btn {
      background: none;
      border: 1px solid rgba(255,255,255,0.4);
      color: #fff;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      margin-left: auto;
    }
  </style>
</head>
<body>
  <div class="top-nav">
    <a href="/"><i class="fa-solid fa-arrow-left"></i> Voltar ao Site</a>
    <a href="/inbox">Abrir Painel da Recepcionista <i class="fa-solid fa-arrow-right"></i></a>
  </div>

  <div class="phone">
    <div class="header">
      <div class="avatar"><i class="fa-solid fa-sparkles text-sm"></i></div>
      <div class="header-info">
        <h1>Clínica Sorriso & Estética</h1>
        <p>Secretária IA Claude (online 24h)</p>
      </div>
      <button class="clear-btn" onclick="clearHistory()">Limpar</button>
    </div>

    <div class="chat" id="chat">
      <div class="bubble out">
        <span>Olá! Sou a secretária virtual da clínica. Como posso te ajudar hoje? 😊</span>
        <div class="time">Agora</div>
      </div>
    </div>

    <form class="input-bar" onsubmit="sendMessage(event)">
      <input type="text" id="input" placeholder="Digite uma dúvida como paciente..." autocomplete="off" />
      <button type="submit"><i class="fa-solid fa-paper-plane text-xs"></i></button>
    </form>
  </div>

  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    let lastLoadedCount = 0;

    function renderMessages(messages) {
      chat.innerHTML = '';
      if (!messages || messages.length === 0) {
        chat.innerHTML = '<div class="bubble out"><span>Olá! Sou a assistente virtual da clínica. Como posso te ajudar hoje? 😊</span><div class="time">Agora</div></div>';
        lastLoadedCount = 0;
        return;
      }

      messages.forEach(m => {
        const div = document.createElement('div');
        div.className = 'bubble ' + (m.direction === 'in' ? 'in' : 'out');

        const textSpan = document.createElement('span');
        textSpan.innerText = m.body;
        div.appendChild(textSpan);

        const time = document.createElement('div');
        time.className = 'time';
        let raw = (m.created_at || '').trim();
        if (raw && raw.includes(' ') && !raw.includes('T')) raw = raw.replace(' ', 'T');
        if (raw && !raw.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(raw)) raw += 'Z';
        const d = raw ? new Date(raw) : null;
        time.innerText = d && !isNaN(d.getTime()) 
          ? d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }) 
          : 'Agora';
        div.appendChild(time);

        chat.appendChild(div);
      });
      chat.scrollTop = chat.scrollHeight;
      lastLoadedCount = messages.length;
    }

    async function loadHistory() {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/messages?phone=5521973401655');
        const data = await res.json();
        renderMessages(data.messages || []);
      } catch (err) {
        console.error(err);
      }
    }

    async function sendMessage(e) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      const userBubble = document.createElement('div');
      userBubble.className = 'bubble in';
      userBubble.innerText = text;
      chat.appendChild(userBubble);

      const typing = document.createElement('div');
      typing.className = 'bubble out typing';
      typing.id = 'typingBubble';
      typing.innerText = 'Digitando...';
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;

      const targetCount = lastLoadedCount + 2;

      await fetch('/simulate?q=' + encodeURIComponent(text));

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch('/api/messages?phone=5521973401655');
          const data = await res.json();
          const msgs = data.messages || [];

          if (msgs.length >= targetCount || attempts >= 8) {
            clearInterval(pollInterval);
            renderMessages(msgs);
          }
        } catch (err) {
          console.error(err);
        }
      }, 1000);
    }

    async function clearHistory() {
      if (confirm('Deseja apagar o histórico de conversa de teste?')) {
        await fetch('/clear');
        lastLoadedCount = 0;
        loadHistory();
      }
    }

    let simPollTimer = null;
    function startSimPolling() {
      if (!simPollTimer) {
        simPollTimer = setInterval(loadHistory, 6000);
      }
    }
    function stopSimPolling() {
      if (simPollTimer) {
        clearInterval(simPollTimer);
        simPollTimer = null;
      }
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopSimPolling();
      else { loadHistory(); startSimPolling(); }
    });

    loadHistory();
    startSimPolling();
  </script>
</body>
</html>`;
