/* Agenda Ya — UI Shell / Interaction Layer v1.3
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

  function activate(view) {
    const meta = labels[view] || labels.dashboard;
    const isDash = view === "dashboard";

    dashboard.hidden = !isDash;
    generic.hidden = isDash;

    if (!isDash) {
      document.getElementById("ayViewEyebrow").textContent = meta[0];
      document.getElementById("ayViewTitle").textContent = meta[1];
      document.getElementById("ayViewDescription").textContent = meta[2];
      document.getElementById("ayPlaceholderTitle").textContent =
        `Motor lógico de ${meta[1].toLowerCase()} pendiente de integración`;
    }

    all("[data-view]").forEach(el => el.classList.toggle("is-active", el.dataset.view === view));
    sidebar.classList.remove("is-open");
    window.dispatchEvent(new CustomEvent("agendaYa:view-change", { detail: { view } }));
  }

  all("[data-view]").forEach(el => {
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      activate(el.dataset.view);
    });
  });

  document.getElementById("ayMenuBtn")?.addEventListener("click", () => {
    sidebar.classList.toggle("is-open");
  });

  document.getElementById("ayAccountBtn")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("agendaYa:account-click"));
  });

  window.AgendaYaUI = {
    version: "1.3.0",
    activate,
    getCurrentView: () => document.querySelector(".ay-nav-item.is-active")?.dataset.view || "dashboard",
    on: (event, handler) => window.addEventListener(`agendaYa:${event}`, handler)
  };

  // The shell remains independent. Operational modules are loaded as a cumulative layer.
  void loadAsset("css", "agenda-ya-modules.css?v=1.2.0").then(() => loadAsset("js", "agenda-ya-modules.js?v=1.2.0"));
  activate("dashboard");
})();
