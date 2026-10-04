
AGENDA YA · UI FOUNDATION + DASHBOARD V0.3

Objetivo
--------
Primera implementación de la arquitectura visual aprobada:
- header principal blanco;
- logo Agenda Ya;
- iconos y textos del menú en azul;
- navegación desktop;
- sidebar desktop;
- navegación inferior móvil;
- dashboard adaptado a la nueva identidad;
- hero de bienvenida;
- KPIs;
- próximas reservas;
- mini calendario;
- responsive desktop/mobile.

Módulo funcional de esta iteración
----------------------------------
DASHBOARD.

La capa visual reutiliza la información que ya entrega el sistema:
- #servicesList
- #professionalsList
- #clientsList
- #bookingsList
- #calendarSection

No cambia:
- Supabase;
- autenticación;
- RLS;
- CRUD;
- modelo de datos;
- motor de reservas;
- reglas de disponibilidad.

Integración
-----------
1. Mantener el proyecto acumulativo actual como base.
2. Cargar agenda-ya-ui-v0.3.css después de styles.css.
3. Cargar agenda-ya-ui-v0.3.js después de app.js.
4. Mantener agenda-ya-logo-header.jpg en la raíz del proyecto.
5. No cargar simultáneamente versiones anteriores del shell UI.

Ejemplo al final de index.html
------------------------------
<link rel="stylesheet" href="agenda-ya-ui-v0.3.css">
<script src="agenda-ya-ui-v0.3.js"></script>

Nota importante
---------------
Este paquete es una integración visual/adaptativa de bajo riesgo, no un reemplazo del proyecto completo.
La siguiente consolidación debe incorporarlo al ZIP acumulativo completo antes de despliegue de producción.

Criterio visual aprobado
------------------------
Header: BLANCO.
Logo: Agenda Ya.
Menú: AZUL.
Iconos: AZUL.
Desktop: header + sidebar + workspace.
Móvil: header compacto + bottom navigation.
