/* AGENDA YA · CABECERA PRINCIPAL v0.1
   Uso: insertar el header dentro del contenedor principal.
*/
window.renderAgendaYaHeader = function(target, options = {}) {
  const host = typeof target === "string" ? document.querySelector(target) : target;
  if (!host) return;

  const logo = options.logo || "agenda-ya-logo.jpg";
  const logoutId = options.logoutId || "logoutBtn";

  host.innerHTML = `
    <header class="agenda-ya-header">
      <img class="agenda-ya-header-logo" src="${logo}" alt="Agenda Ya — Encuentra. Elige. Agenda.">
      <div class="agenda-ya-header-actions">
        <button type="button" class="secondary small" id="${logoutId}">Salir</button>
      </div>
    </header>
  `;
};
