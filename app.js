(() => {
"use strict";

function initSomosAgenda() {
  const cfg = window.SOMOS_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const authView = $("authView");
  const onboardingView = $("onboardingView");
  const dashboardView = $("dashboardView");
  const statusEl = $("status");
  const onboardingStatus = $("onboardingStatus");

  let client = null;
  let currentUser = null;
  let currentBusiness = null;

  const status = (message, target = statusEl) => {
    if (target) target.textContent = message || "";
  };

  const show = (view) => {
    [authView, onboardingView, dashboardView].forEach(v => v?.classList.add("hidden"));
    view?.classList.remove("hidden");
  };

  const errorText = (error, prefix) => {
    if (!error) return prefix;
    return [
      prefix,
      error.message && `Mensaje: ${error.message}`,
      error.code && `Código: ${error.code}`,
      error.details && `Detalle: ${error.details}`,
      error.hint && `Ayuda: ${error.hint}`
    ].filter(Boolean).join("\n");
  };

  const validConfig =
    cfg.SUPABASE_URL &&
    !cfg.SUPABASE_URL.startsWith("REEMPLAZAR") &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_ANON_KEY.startsWith("REEMPLAZAR");

  if (!validConfig) {
    status("ERROR: Supabase no está configurado.");
    return;
  }

  if (!window.supabase?.createClient) {
    status("ERROR: no se cargó la librería de Supabase.");
    return;
  }

  client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  async function routeUser() {
    if (!currentUser) return;

    const r = await client
      .from("business_members")
      .select("business_id,role,active,businesses(id,name,slug,active)")
      .eq("user_id", currentUser.id)
      .eq("active", true);

    if (r.error) {
      status(errorText(r.error, "No se pudo consultar business_members."));
      return;
    }

    if (!r.data?.length) {
      show(onboardingView);
      return;
    }

    const m = r.data[0];
    currentBusiness = m.businesses;

    $("welcomeTitle").textContent =
      "Hola, " + (currentUser.user_metadata?.full_name || currentUser.email || "usuario");
    $("businessSummary").textContent =
      `${currentBusiness.name} · ${currentBusiness.slug}`;
    $("roleValue").textContent = m.role;

    show(dashboardView);
  }

  async function loadSession() {
    const r = await client.auth.getSession();

    if (r.error) {
      status(errorText(r.error, "No se pudo recuperar la sesión."));
      return;
    }

    currentUser = r.data.session?.user || null;

    if (currentUser) await routeUser();
    else show(authView);
  }

  async function login() {
    const email = $("email").value.trim();
    const password = $("password").value;

    status("Iniciando sesión…");

    const r = await client.auth.signInWithPassword({ email, password });

    if (r.error) {
      status(errorText(r.error, "No se pudo iniciar sesión."));
      return;
    }

    currentUser = r.data.user;
    status("Sesión iniciada.");
    await routeUser();
  }

  async function signup() {
    const email = $("email").value.trim();
    const password = $("password").value;

    status("Creando cuenta…");

    const r = await client.auth.signUp({ email, password });

    if (r.error) {
      status(errorText(r.error, "No se pudo crear la cuenta."));
      return;
    }

    status(r.data.session
      ? "Cuenta creada."
      : "Cuenta creada. Revisa tu correo para confirmar.");
  }

  async function recovery() {
    const email = $("email").value.trim();

    if (!email) {
      status("Escribe primero tu correo.");
      return;
    }

    status("Enviando recuperación…");

    const r = await client.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname
    });

    status(r.error
      ? errorText(r.error, "No se pudo enviar la recuperación.")
      : "Revisa tu correo para recuperar la contraseña.");
  }

  async function oauth(provider) {
    status(`Conectando con ${provider}…`);

    const r = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: location.origin + location.pathname }
    });

    if (r.error) status(errorText(r.error, `No se pudo iniciar sesión con ${provider}.`));
  }

  async function createBusiness(event) {
    if (event) event.preventDefault();

    const btn = $("createBusinessBtn");
    const name = $("businessName").value.trim();
    const slug = $("businessSlug").value.trim().toLowerCase();
    const email = $("businessEmail").value.trim() || null;
    const phone = $("businessPhone").value.trim() || null;

    if (!currentUser) {
      status("No existe una sesión autenticada.", onboardingStatus);
      return;
    }

    if (!name || !slug) {
      status("Completa el nombre y el identificador público.", onboardingStatus);
      return;
    }

    btn.disabled = true;
    btn.textContent = "Creando…";
    status("El botón funciona. Enviando create_business a Supabase…", onboardingStatus);

    try {
      const r = await client.rpc("create_business", {
        p_name: name,
        p_slug: slug,
        p_legal_name: null,
        p_email: email,
        p_phone: phone
      });

      if (r.error) {
        status(errorText(r.error, "Supabase rechazó create_business."), onboardingStatus);
        return;
      }

      status("Negocio creado. Cargando dashboard…", onboardingStatus);
      await routeUser();

    } catch (e) {
      status(`Error JavaScript al crear negocio:\n${e?.message || e}`, onboardingStatus);
    } finally {
      btn.disabled = false;
      btn.textContent = "Crear negocio";
    }
  }

  async function logout() {
    await client.auth.signOut();
    currentUser = null;
    currentBusiness = null;
    show(authView);
  }

  // Eventos directos: no dependen de onclick escritos en el HTML.
  $("emailForm")?.addEventListener("submit", e => {
    e.preventDefault();
    login();
  });

  $("signupBtn")?.addEventListener("click", signup);
  $("recoveryBtn")?.addEventListener("click", recovery);
  $("googleBtn")?.addEventListener("click", () => oauth("google"));
  $("facebookBtn")?.addEventListener("click", () => oauth("facebook"));

  $("businessForm")?.addEventListener("submit", createBusiness);

  // Redundancia: el click también ejecuta la función y evita depender exclusivamente
  // del comportamiento submit del navegador móvil.
  $("createBusinessBtn")?.addEventListener("click", () => {
    if (!$("businessForm").checkValidity()) {
      $("businessForm").reportValidity();
      return;
    }
    createBusiness();
  });

  $("logoutBtn")?.addEventListener("click", logout);
  $("logoutOnboarding")?.addEventListener("click", logout);

  client.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) setTimeout(routeUser, 0);
    else show(authView);
  });

  loadSession();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSomosAgenda);
} else {
  initSomosAgenda();
}
})();