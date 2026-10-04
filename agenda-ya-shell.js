/* Agenda Ya — UI Shell / Interaction Layer v1.0
   No Supabase. No business logic. No data persistence.
   This file is intentionally a presentation shell for later engine integration. */
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
    "public-profile": ["PUBLICACIÓN", "Perfil público", "Configura cómo el negocio se presenta a sus clientes."],
    settings: ["SISTEMA", "Configuración", "Preferencias, cuenta y parámetros generales."]
  };

  const all = (sel) => [...document.querySelectorAll(sel)];
  const sidebar = document.getElementById("aySidebar");
  const dashboard = document.getElementById("view-dashboard");
  const generic = document.getElementById("view-generic");

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

    // Integration contract: a future application controller can listen here.
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
    version: "1.0.0",
    activate,
    getCurrentView: () => document.querySelector(".ay-nav-item.is-active")?.dataset.view || "dashboard",
    on: (event, handler) => window.addEventListener(`agendaYa:${event}`, handler)
  };

  activate("dashboard");
})();
