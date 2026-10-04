AGENDA YA — INTEGRACIÓN UI V1.1

BASE
- Basado en el frontend acumulativo de Agenda Ya (Dashboard + Servicios + Profesionales + Horarios + Disponibilidad + Clientes + Reservas + Calendario).
- No reemplaza app.js ni modifica la autenticación o Supabase.

CAMBIOS
1. Header blanco responsive con logo Agenda Ya.
2. Sidebar de gestión en escritorio.
3. Menú + barra inferior de navegación en móvil.
4. Dashboard separado de las pantallas operativas.
5. Navegación entre módulos sin duplicar motores CRUD.
6. Servicios conserva y muestra el CRUD existente; no se crea un motor paralelo.
7. Diseño responsive real: el sidebar desaparece en móvil y el contenido ocupa el ancho disponible.

ARCHIVOS NUEVOS
- agenda-ya-ui.css
- agenda-ya-ui.js
- agenda-ya-logo-header.jpg

IMPORTANTE
Este ZIP es un proyecto acumulativo y no un overlay parcial. Mantiene index.html, app.js, config.js y styles.css del frontend acumulativo utilizado como base.
