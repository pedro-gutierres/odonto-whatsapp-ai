export const REGISTER_HTML = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cadastre-se grátis | Aura</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans">
<header class="max-w-5xl mx-auto p-6 flex justify-between"><a href="/" class="text-2xl font-bold text-emerald-400">Aura</a><a href="/login" class="text-sm">Já tenho conta →</a></header>
<main class="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-12">
<section><span class="text-emerald-400 text-sm">PARA AUTÔNOMOS E CLÍNICAS</span><h1 class="text-4xl font-bold mt-5 leading-tight">Conheça sua assistente antes de ligar o atendimento.</h1>
<p class="text-slate-300 mt-6">Crie sua conta gratuita, personalize a IA e experimente o Test Drive. Você escolhe quando preparar e ativar o teste no WhatsApp.</p>
<ul class="mt-8 space-y-5 text-slate-300"><li>✓ Cadastro gratuito, sem iniciar os sete dias.</li><li>✓ Test Drive com 30 respostas, sem alterar agenda ou enviar WhatsApp.</li><li>✓ Teste real de sete dias ou 100 respostas da IA, após preparação e ativação.</li><li>✓ Sem cartão e sem cobrança automática no teste. Custos da Meta são separados.</li></ul></section>
<section class="bg-slate-900 border border-slate-800 p-6 rounded-2xl"><h2 class="text-xl font-bold mb-5">Crie sua conta gratuita</h2>
<div id="errorAlert" role="alert" class="hidden text-sm text-rose-300 mb-4"><span id="errorMessage"></span></div>
<div id="googleSignIn"></div><p id="googleSignInNotice" class="text-sm text-emerald-300 my-3" role="status"></p>
<form onsubmit="handleRegister(event)" class="space-y-4">
<div class="grid grid-cols-2 gap-3">
<label class="text-sm">Seu negócio<select id="businessKind" required class="block w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mt-1"><option value="">Selecione</option><option value="solo">Autônomo</option><option value="clinic">Clínica</option></select></label>
<label class="text-sm">Área<select id="businessSector" required class="block w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mt-1"><option value="">Selecione</option><option value="dentistry">Odontologia</option><option value="aesthetics">Estética</option></select></label></div>
<label class="block text-sm">Nome do negócio ou profissional<input id="clinicName" required maxlength="120" autocomplete="organization" class="block w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mt-1"></label>
<label class="block text-sm">Nome do responsável<input id="adminName" required maxlength="120" autocomplete="name" class="block w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mt-1"></label>
<label class="block text-sm">Telefone de contato<input id="phone" required type="tel" autocomplete="tel" class="block w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mt-1"><small class="text-slate-400">A conexão do WhatsApp será feita depois.</small></label>
<label class="block text-sm">Já utiliza uma agenda ou sistema?<select id="usesExternalSchedule" required onchange="document.getElementById('existingSystem').required=this.value==='yes'" class="block w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mt-1"><option value="">Selecione</option><option value="no">Não</option><option value="yes">Sim</option></select></label>
<label class="block text-sm">Qual agenda ou sistema? <span class="text-slate-400">(se utilizar)</span><input id="existingSystem" maxlength="120" placeholder="Sistema, planilha ou agenda em papel" class="block w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mt-1"></label>
<label class="block text-sm">E-mail<input id="email" required type="email" maxlength="254" autocomplete="email" class="block w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mt-1"></label>
<label class="block text-sm">Senha de acesso<input id="password" required type="password" minlength="8" maxlength="256" autocomplete="new-password" class="block w-full bg-slate-950 border border-slate-700 p-3 rounded-lg mt-1"><small class="text-slate-400">Pelo menos 8 caracteres.</small></label>
<button id="submitBtn" class="w-full bg-emerald-400 text-slate-950 rounded-lg p-3 font-bold disabled:opacity-50">Criar conta gratuita</button>
<p class="text-xs text-slate-400">O teste operacional só começa após sua ativação explícita.</p></form></section></main>
<script>
async function handleRegister(event) {
  event.preventDefault();
  const btn=document.getElementById('submitBtn'), alert=document.getElementById('errorAlert');
  const value=id=>document.getElementById(id).value.trim();
  alert.classList.add('hidden');btn.disabled=true;btn.textContent='Criando conta...';
  try {
    const res=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      credential:window.auraGoogleCredential||undefined,clinicName:value('clinicName'),adminName:value('adminName'),phone:value('phone'),email:value('email'),password:document.getElementById('password').value,
      businessKind:value('businessKind'),businessSector:value('businessSector'),usesExternalSchedule:value('usesExternalSchedule')==='yes',existingSystem:value('existingSystem')
    })});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Não foi possível cadastrar.');
    window.location.href=data.redirect||'/inbox';
  }catch(error){document.getElementById('errorMessage').textContent=error.message;alert.classList.remove('hidden');}
  finally{btn.disabled=false;btn.textContent='Criar conta gratuita';}
}
</script><script src="/js/google-auth.js?v=3"></script></body></html>`;
