/* =========================================================
   AGENDA YA · AUTH ROUTER v1.0
   Arquitectura reconstruida sobre Backup-1.6

   index.html      = landing (NO TOCAR)
   explorer.html   = marketplace público
   login.html      = autenticación
   profile.html    = onboarding de usuario nuevo
   dashboard.html  = dashboard de negocio

   Regla:
   - cliente existente  -> explorer.html
   - negocio existente  -> dashboard.html
   - usuario sin perfil -> profile.html
   ========================================================= */
(() => {
  const cfg = window.SOMOS_CONFIG || {};
  const $ = id => document.getElementById(id);

  let client = null;
  let mode = "login";
  let busy = false;

  const REDIRECT_URL = new URL("profile.html", window.location.href).href;
  const EXPLORER_URL = "explorer.html";
  const PROFILE_URL = "profile.html";
  const BUSINESS_DASHBOARD_URL = "dashboard.html";

  const authView = $("ayAuthView");
  const form = $("ayAuthForm");
  const email = $("ayAuthEmail");
  const password = $("ayAuthPassword");
  const confirm = $("ayAuthPasswordConfirm");
  const confirmWrap = $("ayPasswordConfirmWrap");
  const title = $("ayAuthTitle");
  const subtitle = $("ayAuthSubtitle");
  const submit = $("ayAuthSubmit");
  const switchBtn = $("ayAuthSwitch");
  const switchText = $("ayAuthSwitchText");
  const recovery = $("ayRecoveryBtn");
  const status = $("ayAuthStatus");
  const google = $("ayAuthGoogle");
  const facebook = $("ayAuthFacebook");
  const toggle = $("ayAuthPasswordToggle");

  function setStatus(message, kind = "") {
    if (!status) return;
    status.textContent = message || "";
    status.className = `ay-auth-status${kind ? ` is-${kind}` : ""}`;
  }

  function validConfig() {
    return !!(
      cfg.SUPABASE_URL &&
      cfg.SUPABASE_ANON_KEY &&
      !String(cfg.SUPABASE_URL).includes("REEMPLAZAR") &&
      !String(cfg.SUPABASE_ANON_KEY).includes("REEMPLAZAR")
    );
  }

  function setMode(next) {
    mode = next;
    const signup = mode === "signup";

    if (title) {
      title.innerHTML = signup
        ? "Crear cuenta en <span>Agenda Ya</span>"
        : "Bienvenido a <span>Agenda Ya</span>";
    }

    if (subtitle) {
      subtitle.innerHTML = signup
        ? "Crea tu acceso para comenzar a configurar tu perfil."
        : 'Gestiona tu negocio y recibe más reservas<br class="ay-auth-title-break"> desde un solo lugar.';
    }

    if (confirmWrap) confirmWrap.hidden = !signup;
    if (recovery) recovery.hidden = signup;
    if (password) password.autocomplete = signup ? "new-password" : "current-password";
    if (submit) submit.innerHTML = signup ? "<span>Crear cuenta</span><b>→</b>" : "<span>Iniciar sesión</span><b>→</b>";
    if (switchText) switchText.textContent = signup ? "¿Ya tienes una cuenta?" : "¿No tienes una cuenta?";
    if (switchBtn) switchBtn.textContent = signup ? "Iniciar sesión" : "Crear cuenta";

    setStatus("");
    if (form) form.reset();
  }

  async function withTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
    ]);
  }

  async function getProfile(user) {
    const result = await withTimeout(
      client.from("profiles")
        .select("id,profile_type,full_name")
        .eq("id", user.id)
        .maybeSingle(),
      8000,
      "La consulta del perfil está tardando demasiado."
    );

    if (result.error) throw result.error;
    return result.data || null;
  }

  async function hasBusiness(user) {
    const result = await withTimeout(
      client.from("business_members")
        .select("business_id,active")
        .eq("user_id", user.id)
        .eq("active", true)
        .limit(1),
      8000,
      "La consulta del negocio está tardando demasiado."
    );

    if (result.error) throw result.error;
    return !!result.data?.[0]?.business_id;
  }

  async function routeAuthenticatedUser(user) {
    if (!user) return;

    // AUTHORITY OF NAVIGATION:
    // login.html only authenticates. Profile.html is the single post-auth
    // router/onboarding layer. This avoids a login -> profile -> login loop
    // caused by two different pages trying to resolve identity at once.
    setStatus("Acceso confirmado. Abriendo tu perfil…", "success");

    const target = new URL("profile.html", window.location.href).href;
    window.location.replace(target);
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (busy) return;

    const emailValue = email?.value.trim() || "";
    const passwordValue = password?.value || "";

    if (!emailValue || !passwordValue) {
      setStatus("Completa email y contraseña.", "error");
      return;
    }

    if (passwordValue.length < 6) {
      setStatus("La contraseña debe tener al menos 6 caracteres.", "error");
      return;
    }

    if (mode === "signup" && passwordValue !== (confirm?.value || "")) {
      setStatus("Las contraseñas no coinciden.", "error");
      return;
    }

    busy = true;
    submit.disabled = true;
    setStatus(mode === "signup" ? "Creando tu cuenta…" : "Iniciando sesión…");

    try {
      const result = await withTimeout(
        mode === "signup"
          ? client.auth.signUp({
              email: emailValue,
              password: passwordValue,
              options: { emailRedirectTo: REDIRECT_URL }
            })
          : client.auth.signInWithPassword({
              email: emailValue,
              password: passwordValue
            }),
        15000,
        "La autenticación está tardando demasiado. Revisa la conexión."
      );

      if (result.error) throw result.error;

      if (mode === "signup" && !result.data.session) {
        setStatus(
          "Cuenta creada. Revisa tu correo y pulsa el enlace de confirmación.",
          "success"
        );
        return;
      }

      const user = result.data?.session?.user;
      if (!user) throw new Error("Supabase no devolvió una sesión activa.");

      await routeAuthenticatedUser(user);

    } catch (err) {
      console.error("Agenda YA submitAuth:", err);
      setStatus(err?.message || "No fue posible completar el acceso.", "error");
    } finally {
      busy = false;
      submit.disabled = false;
    }
  }

  async function recoveryFlow() {
    const value = email?.value.trim() || "";
    if (!value) {
      setStatus("Escribe primero tu correo.", "error");
      return;
    }

    recovery.disabled = true;

    try {
      const result = await withTimeout(
        client.auth.resetPasswordForEmail(value, {
          redirectTo: REDIRECT_URL
        }),
        15000,
        "La solicitud está tardando demasiado."
      );

      if (result.error) throw result.error;
      setStatus("Revisa tu correo para recuperar la contraseña.", "success");
    } catch (err) {
      setStatus(err?.message || "No fue posible enviar el correo.", "error");
    } finally {
      recovery.disabled = false;
    }
  }

  async function oauth(provider) {
    if (busy) return;

    busy = true;
    google.disabled = true;
    facebook.disabled = true;

    setStatus(
      provider === "google" ? "Conectando con Google…" : "Conectando con Facebook…"
    );

    try {
      const result = await withTimeout(
        client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: REDIRECT_URL,
            skipBrowserRedirect: false
          }
        }),
        15000,
        "No fue posible iniciar el acceso social."
      );

      if (result.error) throw result.error;
    } catch (err) {
      console.error(`Agenda YA OAuth ${provider}:`, err);
      setStatus(err?.message || "No fue posible iniciar el acceso.", "error");
      busy = false;
      google.disabled = false;
      facebook.disabled = false;
    }
  }

  async function boot() {
    if (!validConfig()) {
      setStatus("Configuración de Supabase no disponible.", "error");
      return;
    }

    client = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    form?.addEventListener("submit", submitAuth);
    switchBtn?.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));
    recovery?.addEventListener("click", recoveryFlow);
    google?.addEventListener("click", () => oauth("google"));
    facebook?.addEventListener("click", () => oauth("facebook"));

    toggle?.addEventListener("click", () => {
      const visible = password.type === "text";
      password.type = visible ? "password" : "text";
      toggle.classList.toggle("is-visible", !visible);
      toggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
    });

    // OAuth callback / existing session.
    const { data, error } = await withTimeout(
      client.auth.getSession(),
      10000,
      "No se pudo recuperar la sesión."
    );

    if (error) throw error;

    if (data.session?.user) {
      await routeAuthenticatedUser(data.session.user);
    }
  }

  window.AgendaYaLogin = {
    version: "1.0.0",
    getClient: () => client,
    routeAuthenticatedUser
  };

  boot().catch(err => {
    console.error("Agenda YA login boot:", err);
    setStatus(err?.message || "No se pudo iniciar Agenda Ya.", "error");
  });
})();
