AGENDA YA · CABECERA CON LOGO OFICIAL v0.1

Base de integración:
- Proyecto: p-renault/somos-agenda
- Referencia funcional: commit c716a0ec018eaf80c4c89c9e62ab8482e5873429
- Objetivo: reemplazar la marca textual superior del Dashboard por una cabecera visual de Agenda Ya.

Archivos:
- agenda-ya-logo.jpg  -> logo proporcionado por el proyecto, optimizado para cabecera.
- agenda-ya-header.css -> estructura responsive.
- agenda-ya-header.js -> helper opcional de renderizado.

Criterio:
- No modifica lógica de Supabase.
- No modifica módulos de Servicios, Profesionales, Horarios, Disponibilidad, Clientes, Reservas ni Calendario.
- No realiza cambios estéticos sobre el resto del sistema.
- La cabecera es el primer bloque visual de la nueva identidad comercial Agenda Ya.

Nota:
Esta entrega es un módulo de cabecera. La integración acumulativa sobre el index.html completo debe conservar todo el estado funcional existente.
