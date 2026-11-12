(async function () {
  const target = document.getElementById('googleSignIn');
  if (!target) return;
  try {
    const response = await fetch('/api/auth/google/options'); const options = await response.json();
    if (!response.ok || !options.enabled) return;
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = () => {
      google.accounts.id.initialize({ client_id: options.clientId, nonce: options.nonce, auto_select: false,
        callback: async result => {
          const notice = document.getElementById('googleSignInNotice');
          try {
            const response = await fetch('/api/auth/google',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({credential:result.credential})});
            const data = await response.json(); if (!response.ok) throw new Error(data.error);
            if (data.success) { window.location.href = '/inbox'; return; }
            const business = document.getElementById('businessKind');
            if (!business) { notice.textContent = 'Sua conta ainda não existe. Abra Cadastre-se grátis e use Continuar com Google para preencher seu perfil.'; return; }
            window.auraGoogleCredential = result.credential;
            const email = document.getElementById('email'); email.value = data.email; email.readOnly = true;
            document.getElementById('adminName').value = data.name || '';
            const password = document.getElementById('password'); password.required = false; password.disabled = true; password.closest('label').classList.add('hidden');
            notice.textContent = 'Google validado. Conclua o perfil abaixo para criar a conta gratuita.';
          } catch (error) { notice.textContent = error.message || 'Não foi possível entrar com Google.'; }
        }
      });
      google.accounts.id.renderButton(target,{theme:'outline',size:'large',text:'continue_with'});
    };
    document.head.append(script);
  } catch { /* Password access stays available when Google is unavailable. */ }
})();
