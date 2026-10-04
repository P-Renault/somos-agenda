(() => {
  "use strict";

  const cfg = window.SOMOS_CONFIG || {};
  let client = null;
  let currentUser = null;
  let currentBusiness = null;

  const $ = (id) => document.getElementById(id);

  const authView = $("authView");
  const onboardingView = $("onboardingView");
  const dashboardView = $("dashboardView");
  const statusEl = $("status");
  const onboardingStatus = $("onboardingStatus");

  function status(message, target = statusEl) {
    if (target) {
      target.textContent = message || "";
      target.style.whiteSpace = "pre-wrap";
    }
  }

  function show(view) {
    [authView, onboardingView, dashboardView].forEach((v) => {
      if (v) v.classList.add("hidden");
    });
    if (view) view.classList.remove("hidden");
  }

  function validConfig() {
    return Boolean(
      cfg.SUPABASE_URL &&
      !cfg.SUPABASE_URL.startsWith("REEMPLAZAR") &&
      cfg.SUPABASE_ANON_KEY &&
      !cfg.SUPABASE_ANON_KEY.startsWith("REEMPLAZAR")
    );
  }

  function formatError(error, context = "Error") {
    if (!error) return context;
    const parts = [
      error.message ? `Mensaje: ${error.message}` : "",
      error.code ? `Código: ${error.code}` : "",
      error.details ? `Detalle: ${error.details}` : "",
      error.hint ? `Ayuda: ${error.hint}` : ""
    ].filter(Boolean);
    return `${context}\n${parts.join("\n")}`;
  }

  async function routeUser() {
    if (!client || !currentUser) return false;

    const r = await client
      .from("business_members")
      .select("business_id,role,active,businesses(id,name,slug,active)")
      .eq("user_id", currentUser.id)
      .eq("active", true);

    if (r.error) {
      status(formatError(r.error, "No se pudo consultar el negocio."), statusEl);
      return false;
    }

    if (!r.data || !r.data.length) {
      show(onboardingView);
      return true;
    }

    const m = r.data[0];
    currentBusiness = m.businesses;

    $("welcomeTitle").textContent =
      "Hola, " + (currentUser.user_metadata?.full_name || currentUser.email || "usuario");
    $("businessSummary").textContent =
      currentBusiness.name + " · " + currentBusiness.slug;
    $("roleValue").textContent = m.role;

    show(dashboardView);
    return true;
  }

  async function loadUser() {
    if (!client) {
      status("Supabase no está configurado en config.js.");
      return;
    }

    const r = await client.auth.getSession();

    if (r.error) {
      status(formatError(r.error, "No se pudo recuperar la sesión."));
      return;
    }

    if (r.data.session) {
      currentUser = r.data.session.user;
      await routeUser();
    } else {
      show(authView);
    }
  }

  async function emailAuth(mode) {
    if (!client) {
      status("Supabase no está configurado en config.js.");
      return;
    }

    const email = $("email").value.trim();
    const password = $("password").value;

    const r = mode === "signup"
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });

    if (r.error) {
      status(formatError(r.error, "No se pudo completar la autenticación."));
      return;
    }

    status(
      mode === "signup"
        ? (r.data.session ? "Cuenta creada." : "Cuenta creada. Revisa tu correo.")
        : "Sesión iniciada."
    );

    if (mode === "login") {
      await loadUser();
    }
  }

  async function createBusiness(event) {
    event.preventDefault();

    if (!client) {
      status("Supabase no está configurado en config.js.", onboardingStatus);
      return;
    }

    if (!currentUser) {
      status("No hay una sesión autenticada. Cierra sesión e inicia sesión nuevamente.", onboardingStatus);
      return;
    }

    const button = $("businessForm").querySelector('button[type="submit"]');
    const name = $("businessName").value.trim();
    const slug = $("businessSlug").value.trim().toLowerCase();
    const email = $("businessEmail").value.trim() || null;
    const phone = $("businessPhone").value.trim() || null;

    if (!name || !slug) {
      status("Completa el nombre del negocio y el identificador público.", onboardingStatus);
      return;
    }

    button.disabled = true;
    button.textContent = "Creando negocio…";
    status("Enviando solicitud a Supabase…", onboardingStatus);

    try {
      const r = await client.rpc("create_business", {
        p_name: name,
        p_slug: slug,
        p_legal_name: null,
        p_email: email,
        p_phone: phone
      });

      if (r.error) {
        status(
          formatError(
            r.error,
            "Supabase rechazó la creación del negocio."
          ),
          onboardingStatus
        );
        return;
      }

      status("Negocio creado. Verificando membresía y permisos…", onboardingStatus);

      // Volvemos a consultar la relación creada por el RPC.
      const routed = await routeUser();

      if (!routed) {
        status(
          "El negocio aparentemente fue creado, pero no se pudo cargar la membresía.\n" +
          "Revisa el mensaje anterior para identificar el problema de RLS.",
          onboardingStatus
        );
      }
    } catch (error) {
      status(
        `Error inesperado al crear el negocio.\n${error?.message || String(error)}`,
        onboardingStatus
      );
    } finally {
      button.disabled = false;
      button.textContent = "Crear negocio";
    }
  }

  async function recovery() {
    if (!client) {
      status("Supabase no está configurado en config.js.");
      return;
    }

    const email = $("email").value.trim();

    if (!email) {
      status("Escribe primero tu correo.");
      return;
    }

    const r = await client.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname
    });

    status(
      r.error
        ? formatError(r.error, "No se pudo enviar la recuperación.")
        : "Revisa tu correo para recuperar la contraseña."
    );
  }

  async function oauth(provider) {
    if (!client) {
      status("Supabase no está configurado en config.js.");
      return;
    }

    const r = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: location.origin + location.pathname }
    });

    if (r.error) {
      status(formatError(r.error, `No se pudo iniciar sesión con ${provider}.`));
    }
  }

  async function logout() {
    if (client) await client.auth.signOut();
    currentUser = null;
    currentBusiness = null;
    show(authView);
  }

  // Inicialización después de que el DOM existe.
  function init() {
    if (!validConfig()) {
      status("Configura SUPABASE_URL y SUPABASE_ANON_KEY en config.js.");
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      status("No se pudo cargar la librería de Supabase.");
      return;
    }

    client = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY
    );

    $("emailForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      emailAuth("login");
    });

    $("signupBtn")?.addEventListener("click", () => emailAuth("signup"));
    $("recoveryBtn")?.addEventListener("click", recovery);
    $("googleBtn")?.addEventListener("click", () => oauth("google"));
    $("facebookBtn")?.addEventListener("click", () => oauth("facebook"));
    $("businessForm")?.addEventListener("submit", createBusiness);
    $("logoutBtn")?.addEventListener("click", logout);
    $("logoutOnboarding")?.addEventListener("click", logout);

    client.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      if (currentUser) {
        setTimeout(() => routeUser(), 0);
      } else {
        show(authView);
      }
    });

    loadUser();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
