AGENDA YA — UI FRAMEWORK / DESIGN SYSTEM v1.0
=================================================

OBJETIVO
--------
Esta entrega construye una plantilla general del sistema en una sola iteración.
Es la "capa visual base" sobre la que se integrarán posteriormente Supabase,
autenticación, CRUD, disponibilidad, reservas, calendario y marketplace.

PRINCIPIO
---------
UI primero -> motores después.

La plantilla NO contiene:
- Supabase
- autenticación real
- consultas a base de datos
- reglas de disponibilidad
- cálculo de reservas
- persistencia
- lógica comercial

La plantilla SÍ contiene:
- header global con logo Agenda Ya
- navegación desktop
- sidebar de gestión
- navegación móvil inferior
- responsive desktop/tablet/mobile
- dashboard base
- KPIs
- tarjetas
- listas de reservas
- timeline/calendario visual
- acciones rápidas
- encabezado reutilizable de módulos
- estados placeholder para integración
- contrato de eventos para conectar motores lógicos

ARCHIVOS
--------
agenda-ya-shell.css
  Design system, layout y responsive.

agenda-ya-shell.js
  Navegación visual y contrato de integración.

index.html
  Plantilla de referencia completa.

assets/agenda-ya-logo-header.jpg
  Logo utilizado por el header.

CONTRATO DE INTEGRACIÓN
-----------------------
El shell emite:

window.addEventListener("agendaYa:view-change", (event) => {
  console.log(event.detail.view);
});

Ejemplo:
- dashboard
- services
- professionals
- schedules
- availability
- clients
- bookings
- calendar
- public-profile
- settings

API disponible:
window.AgendaYaUI.activate("services")
window.AgendaYaUI.getCurrentView()

ESTRATEGIA PARA EL PROYECTO REAL
---------------------------------
1. Mantener esta capa como sistema visual.
2. No reemplazar index.html/app.js del proyecto acumulativo a ciegas.
3. Integrar el shell sobre la base funcional c716a0e...
4. Cada módulo conserva su motor actual.
5. La vista sólo presenta estado y captura acciones.
6. Supabase sigue siendo la fuente de datos.
7. Las reglas de negocio permanecen fuera de CSS/UI.
8. El siguiente paso es conectar cada vista real al motor existente,
   empezando por Dashboard y luego Servicios/Profesionales/Horarios.

ESTADO
------
v1.0 — plantilla visual general.
Diseñada para servir como "sistema operativo visual" de Agenda Ya.
