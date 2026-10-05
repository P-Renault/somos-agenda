/* Agenda Ya · Identity Authentication Controller v0.1.2
   Integrated target: GitHub Pages /somos-agenda/ from Backup-1.0.
   Scope: email login, email registration, confirmation callback, recovery and OAuth.
*/
(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const authView = $("ayAuthView"), appView = $("ayApp");
  const form = $("ayAuthForm"), email = $("ayAuthEmail"), password = $("ayAuthPassword");
  const confirm = $("ayAuthPasswordConfirm"), confirmWrap = $("ayPasswordConfirmWrap");
  const title = $("ayAuthTitle"), subtitle = $("ayAuthSubtitle"), submit = $("ayAuthSubmit");
  const switchBtn = $("ayAuthSwitch"), switchText = $("ayAuthSwitchText");
  const status = $("ayAuthStatus"), recovery = $("ayRecoveryBtn");
  const google = $("ayAuthGoogle"), facebook = $("ayAuthFacebook");
  const formPanel = $("ayAuthFormPanel"), postLogin = $("ayAuthPostLogin");
  const postStatus = $("ayAuthPostStatus"), continueSetup = $("ayAuthContinueSetup");
  const accountName = $("ayAuthAccountName"), accountEmail = $("ayAuthAccountEmail");
  let client = null, mode = "login";

  // Fixed production callback. This prevents the browser from falling back to the GitHub user root.
  const REDIRECT_URL = "https://p-renault.github.io/somos-agenda/";

  function setStatus(text, kind = "") {
    status.textContent = text || "";
    status.className = `ay-auth-status${kind ? ` is-${kind}` : ""}`;
  }
  function showAuth() { authView.hidden = false; appView.hidden = true; }
  function showApp(user) {
    authView.hidden = true; appView.hidden = false;
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "Mi negocio";
    const emailValue = user?.email || "";
    const nameEl = document.querySelector(".ay-account-text strong");
    const emailEl = document.querySelector(".ay-account-text small");
    const avatar = document.querySelector(".ay-avatar");
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = emailValue || "Cuenta";
    if (avatar) avatar.textContent = name.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase() || "PR";
    const greeting = document.querySelector("#view-dashboard .ay-hero h1");
    if (greeting) greeting.textContent = `Hola, ${name}`;
  }
  function showPostLogin(user, message = "Identity está listo. El siguiente motor será Perfil.") {
    showAuth();
    formPanel.classList.remove("is-visible");
    postLogin.classList.add("is-visible");
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "Cuenta Agenda Ya";
    accountName.textContent = name;
    accountEmail.textContent = user?.email || "";
    postStatus.textContent = message;
  }
  function setMode(next) {
    mode = next;
    const signup = mode === "signup";
    title.textContent = signup ? "Crear cuenta en Agenda Ya" : "Bienvenido a Agenda Ya";
    subtitle.textContent = signup ? "Crea tu acceso para comenzar a configurar tu negocio." : "Gestiona tu negocio y recibe más reservas desde un solo lugar.";
    confirmWrap.hidden = !signup;
    recovery.hidden = signup;
    password.autocomplete = signup ? "new-password" : "current-password";
    submit.textContent = signup ? "Crear cuenta" : "Iniciar sesión";
    switchText.textContent = signup ? "¿Ya tienes una cuenta?" : "¿No tienes una cuenta?";
    switchBtn.textContent = signup ? "Iniciar sesión" : "Crear cuenta";
    formPanel.classList.add("is-visible"); postLogin.classList.remove("is-visible");
    setStatus(""); form.reset();
  }
  function validConfig() {
    return !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !String(cfg.SUPABASE_URL).includes("REEMPLAZAR") && !String(cfg.SUPABASE_ANON_KEY).includes("REEMPLAZAR"));
  }
  function cleanAuthHash() {
    if (window.location.hash && window.history?.replaceState) {
      const clean = window.location.pathname + window.location.search;
      window.history.replaceState({}, document.title, clean);
    }
  }
  function handleUrlError() {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#")) return false;
    const p = new URLSearchParams(hash.slice(1));
    const code = p.get("error_code");
    const desc = p.get("error_description");
    if (code || desc || p.get("error")) {
      showAuth();
      setStatus(desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : (p.get("error") || "No fue posible completar la confirmación."), "error");
      cleanAuthHash();
      return true;
    }
    return false;
  }
  async function routeSession(user) {
    const membership = await client.from("business_members").select("business_id,role,active").eq("user_id", user.id).eq("active", true).limit(1);
    if (membership.error) {
      // Identity is valid. For this integration build, do not trap an authenticated
      // user on the confirmation screen when membership/profile is not created yet.
      showPostLogin(user, "Correo confirmado y sesión activa. Puedes continuar a Agenda Ya.");
      return;
    }
    if (membership.data?.length) { showApp(user); return; }
    showPostLogin(user, "Correo confirmado y sesión activa. Puedes continuar a Agenda Ya.");
  }
  async function submitAuth(event) {
    event.preventDefault();
    if (!client) return setStatus("Supabase no está disponible.", "error");
    const emailValue = email.value.trim(), passwordValue = password.value;
    if (!emailValue || !passwordValue) return setStatus("Completa email y contraseña.", "error");
    if (passwordValue.length < 6) return setStatus("La contraseña debe tener al menos 6 caracteres.", "error");
    if (mode === "signup" && passwordValue !== confirm.value) return setStatus("Las contraseñas no coinciden.", "error");
    submit.disabled = true; setStatus(mode === "signup" ? "Creando tu cuenta…" : "Iniciando sesión…");
    try {
      const result = mode === "signup"
        ? await client.auth.signUp({ email: emailValue, password: passwordValue, options: { emailRedirectTo: REDIRECT_URL } })
        : await client.auth.signInWithPassword({ email: emailValue, password: passwordValue });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setStatus("Cuenta creada. Revisa tu correo y pulsa el enlace de confirmación.", "success");
      } else if (result.data.session?.user) {
        await routeSession(result.data.session.user);
      }
    } catch (err) { setStatus(err?.message || "No fue posible completar el acceso.", "error"); }
    finally { submit.disabled = false; }
  }
  async function resendConfirmation() {
    if (!client || !email.value.trim()) return;
    const result = await client.auth.resend({ type: "signup", email: email.value.trim(), options: { emailRedirectTo: REDIRECT_URL } });
    setStatus(result.error ? result.error.message : "Nuevo correo de confirmación enviado.", result.error ? "error" : "success");
  }
  async function recoveryFlow() {
    if (!client) return setStatus("Supabase no está disponible.", "error");
    const value = email.value.trim();
    if (!value) return setStatus("Escribe primero tu correo.", "error");
    recovery.disabled = true;
    try {
      const result = await client.auth.resetPasswordForEmail(value, { redirectTo: REDIRECT_URL });
      if (result.error) throw result.error;
      setStatus("Revisa tu correo para recuperar la contraseña.", "success");
    } catch (err) { setStatus(err?.message || "No fue posible enviar el correo.", "error"); }
    finally { recovery.disabled = false; }
  }
  async function oauth(provider) {
    if (!client) return setStatus("Supabase no está disponible.", "error");
    const result = await client.auth.signInWithOAuth({ provider, options: { redirectTo: REDIRECT_URL } });
    if (result.error) setStatus(result.error.message, "error");
  }
  async function boot() {
    showAuth();
    if (!validConfig() || !window.supabase?.createClient) return setStatus("No se pudo inicializar la autenticación. Revisa Supabase y config.js.", "error");
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    form.addEventListener("submit", submitAuth);
    switchBtn.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));
    recovery.addEventListener("click", recoveryFlow);
    google.addEventListener("click", () => oauth("google"));
    facebook.addEventListener("click", () => oauth("facebook"));
    continueSetup.addEventListener("click", async () => {
      if (!client) return setStatus("Supabase no está disponible.", "error");
      continueSetup.disabled = true;
      try {
        const sessionResult = await client.auth.getSession();
        if (sessionResult.error) throw sessionResult.error;
        const user = sessionResult.data.session?.user;
        if (!user) {
          showAuth();
          setMode("login");
          setStatus("La sesión no está disponible. Inicia sesión nuevamente.", "error");
          return;
        }
        // Identity is complete: enter the existing Agenda Ya application shell.
        // Profile/Business onboarding is the next motor and must not block access here.
        showApp(user);
      } catch (err) {
        setStatus(err?.message || "No fue posible abrir Agenda Ya.", "error");
      } finally {
        continueSetup.disabled = false;
      }
    });
    // Handle callback errors without losing the useful error message.
    if (handleUrlError()) return;
    client.auth.onAuthStateChange((event, session) => {
      if (session?.user) setTimeout(() => routeSession(session.user), 0);
      else if (event === "SIGNED_OUT") { setMode("login"); showAuth(); }
    });
    const result = await client.auth.getSession();
    if (result.error) return setStatus(result.error.message, "error");
    if (result.data.session?.user) {
      cleanAuthHash();
      await routeSession(result.data.session.user);
    }
  }
  window.AgendaYaAuth = { version: "0.1.2", getClient: () => client, setMode, showAuth, showApp, resendConfirmation };
  boot();
})();
