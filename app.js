(() => {
  "use strict";

  const init = () => {
    const cfg = window.SOMOS_CONFIG || {};

    const $ = (id) => document.getElementById(id);
    const statusEl = $("status");
    const onboardingStatus = $("onboardingStatus");
    const authView = $("authView");
    const onboardingView = $("onboardingView");
    const dashboardView = $("dashboardView");

    let client = null;
    let currentUser = null;
    let currentBusiness = null;

    const status = (message, target = statusEl) => {
      if (target) target.textContent = message || "";
    };

    const show = (view) => {
      [authView, onboardingView, dashboardView].forEach((x) => {
        if (x) x.classList.add("hidden");
      });
      if (view) view.classList.remove("hidden");
    };

    const validConfig = () =>
      typeof cfg.SUPABASE_URL === "string" &&
      cfg.SUPABASE_URL.startsWith("https://") &&
      typeof cfg.SUPABASE_ANON_KEY === "string" &&
      cfg.SUPABASE_ANON_KEY.length > 20 &&
      !cfg.SUPABASE_ANON_KEY.startsWith("REEMPLAZAR");

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      status("No se pudo cargar el cliente de Supabase. Recarga la página.");
      return;
    }

    if (!validConfig()) {
      status("Supabase no está configurado. Revisa config.js.");
      return;
    }

    try {
      client = window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY
      );
    } catch (error) {
      console.error(error);
      status("No se pudo conectar con Supabase.");
      return;
    }

    async function loadUser() {
      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;

        if (data.session) {
          currentUser = data.session.user;
          await routeUser();
        } else {
          show(authView);
        }
      } catch (error) {
        console.error(error);
        status(error.message || "No se pudo recuperar la sesión.");
        show(authView);
      }
    }

    async function routeUser() {
      if (!currentUser) {
        show(authView);
        return;
      }

      try {
        const { data, error } = await client
          .from("business_members")
          .select("business_id,role,active,businesses(id,name,slug,active)")
          .eq("user_id", currentUser.id)
          .eq("active", true);

        if (error) throw error;

        if (!data || !data.length) {
          show(onboardingView);
          return;
        }

        const member = data[0];
        currentBusiness = member.businesses;

        $("welcomeTitle").textContent =
          "Hola, " +
          (currentUser.user_metadata?.full_name ||
            currentUser.email ||
            "usuario");

        $("businessSummary").textContent =
          currentBusiness.name + " · " + currentBusiness.slug;

        $("roleValue").textContent = member.role;
        show(dashboardView);
      } catch (error) {
        console.error(error);
        status(error.message || "No se pudo cargar el negocio.");
      }
    }

    async function emailAuth(mode) {
      const email = $("email").value.trim();
      const password = $("password").value;

      if (!email || !password) {
        status("Ingresa correo y contraseña.");
        return;
      }

      status(mode === "signup" ? "Creando cuenta..." : "Iniciando sesión...");

      try {
        const result =
          mode === "signup"
            ? await client.auth.signUp({ email, password })
            : await client.auth.signInWithPassword({ email, password });

        if (result.error) throw result.error;

        if (mode === "signup") {
          if (result.data.session) {
            status("Cuenta creada. Iniciando...");
            currentUser = result.data.user;
            await routeUser();
          } else {
            status("Cuenta creada. Revisa tu correo para confirmar la cuenta.");
          }
          return;
        }

        status("Sesión iniciada.");
        await loadUser();
      } catch (error) {
        console.error(error);
        status(error.message || "No se pudo completar la operación.");
      }
    }

    $("emailForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      emailAuth("login");
    });

    $("signupBtn")?.addEventListener("click", () => emailAuth("signup"));

    $("recoveryBtn")?.addEventListener("click", async () => {
      const email = $("email").value.trim();

      if (!email) {
        status("Escribe primero tu correo.");
        $("email")?.focus();
        return;
      }

      status("Enviando correo de recuperación...");

      try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + location.pathname
        });

        if (error) throw error;
        status("Revisa tu correo para recuperar la contraseña.");
      } catch (error) {
        console.error(error);
        status(error.message || "No se pudo enviar el correo.");
      }
    });

    const oauth = async (provider) => {
      status("Conectando con " + provider + "...");

      try {
        const { error } = await client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: location.origin + location.pathname
          }
        });

        if (error) throw error;
      } catch (error) {
        console.error(error);
        status(error.message || "No se pudo iniciar sesión con " + provider + ".");
      }
    };

    $("googleBtn")?.addEventListener("click", () => oauth("google"));
    $("facebookBtn")?.addEventListener("click", () => oauth("facebook"));

    $("businessForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!currentUser) {
        status("La sesión expiró. Inicia sesión nuevamente.", onboardingStatus);
        show(authView);
        return;
      }

      status("Creando negocio...", onboardingStatus);

      try {
        const { data, error } = await client.rpc("create_business", {
          p_name: $("businessName").value.trim(),
          p_slug: $("businessSlug").value.trim().toLowerCase(),
          p_legal_name: null,
          p_email: $("businessEmail").value.trim() || null,
          p_phone: $("businessPhone").value.trim() || null
        });

        if (error) throw error;

        console.log("create_business:", data);
        status("Negocio creado correctamente.", onboardingStatus);
        await routeUser();
      } catch (error) {
        console.error(error);
        status(error.message || "No se pudo crear el negocio.", onboardingStatus);
      }
    });

    const logout = async () => {
      try {
        if (client) {
          const { error } = await client.auth.signOut();
          if (error) throw error;
        }
      } catch (error) {
        console.error(error);
        status(error.message || "No se pudo cerrar sesión.");
      } finally {
        currentUser = null;
        currentBusiness = null;
        show(authView);
      }
    };

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
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
