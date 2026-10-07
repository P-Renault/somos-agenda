/* Agenda Ya — UI Shell / Interaction Layer v1.4
   Backup-1.0 cumulative shell.
   Loads the complete operational module layer without replacing authentication or the shell.
*/
(() => {
  const labels = {
    dashboard: ["DASHBOARD", "Dashboard", "Centro de gestión del negocio."],
    services: ["GESTIÓN", "Servicios", "Administra el catálogo de servicios, duración y precios."],
    professionals: ["GESTIÓN", "Profesionales", "Gestiona personas, roles operativos y atención."],
    schedules: ["CONFIGURACIÓN", "Horarios", "Define la jornada y los horarios de atención."],
    availability: ["OPERACIÓN", "Disponibilidad", "Controla cuándo existen espacios disponibles para reservar."],
    clients: ["RELACIÓN", "Clientes", "Consulta y administra la cartera de clientes."],
    bookings: ["OPERACIÓN", "Reservas", "Gestiona reservas, estados y atención."],
    calendar: ["OPERACIÓN", "Calendario", "Visualiza la agenda y la carga diaria del negocio."],
    "public-profile": ["PUBLICACIÓN", "Perfil público", "Visualiza cómo se presenta públicamente tu propio negocio."],
    settings: ["SISTEMA", "Configuración", "Preferencias, cuenta, plan y suscripción."]
  };

  const all = (sel) => [...document.querySelectorAll(sel)];
  const sidebar = document.getElementById("aySidebar");
  const dashboard = document.getElementById("view-dashboard");
  const generic = document.getElementById("view-generic");

  function loadAsset(type, url) {
    return new Promise((resolve) => {
      const selector = type === "css" ? `link[data-agenda-asset="${url}"]` : `script[data-agenda-asset="${url}"]`;
      if (document.querySelector(selector)) return resolve();
      if (type === "css") {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.dataset.agendaAsset = url;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.appendChild(link);
      } else {
        const script = document.createElement("script");
        script.src = url;
        script.dataset.agendaAsset = url;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.body.appendChild(script);
      }
    });
  }

  let currentView = "dashboard";
  let pendingView = null;

  function navigate(view) {
    const target = labels[view] ? view : "dashboard";
    currentView = target;
    const meta = labels[target];
    const isDash = target === "dashboard";

    dashboard.hidden = !isDash;
    generic.hidden = isDash;

    if (!isDash) {
      document.getElementById("ayViewEyebrow").textContent = meta[0];
      document.getElementById("ayViewTitle").textContent = meta[1];
      document.getElementById("ayViewDescription").textContent = meta[2];
      document.getElementById("ayPlaceholderTitle").textContent =
        `Cargando ${meta[1].toLowerCase()}…`;
    }

    all("[data-view]").forEach(el => el.classList.toggle("is-active", el.dataset.view === target));
    sidebar.classList.remove("is-open");

    // The shell is the single navigation authority. If the operational layer
    // is already loaded, call it directly; otherwise remember the requested
    // view and replay it as soon as the module script finishes loading.
    if (target !== "dashboard" && window.AgendaYaModules?.activate) {
      void window.AgendaYaModules.activate(target);
    } else if (target !== "dashboard") {
      pendingView = target;
    }

    window.dispatchEvent(new CustomEvent("agendaYa:view-change", { detail: { view: target, handledByShell: true } }));
  }

  all("[data-view]").forEach(el => {
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      navigate(el.dataset.view);
    });
  });

  document.getElementById("ayMenuBtn")?.addEventListener("click", () => {
    sidebar.classList.toggle("is-open");
  });

  document.getElementById("ayAccountBtn")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("agendaYa:account-click"));
  });

  window.AgendaYaUI = {
    version: "1.4.0",
    activate: navigate,
    getCurrentView: () => currentView,
    getPendingView: () => pendingView,
    on: (event, handler) => window.addEventListener(`agendaYa:${event}`, handler)
  };

  // The shell remains independent. Operational modules are loaded as a cumulative layer.
  void loadAsset("css", "agenda-ya-modules.css?v=1.3.0")
    .then(() => loadAsset("js", "agenda-ya-modules.js?v=1.3.0"))
    .then(() => {
      if (pendingView && window.AgendaYaModules?.activate) {
        const target = pendingView;
        pendingView = null;
        void window.AgendaYaModules.activate(target);
      }
    });
  navigate("dashboard");
})();
