AGENDA YA — INTEGRACIÓN DE MÓDULOS v1.3 FINAL
Backup-1.0 · paquete acumulativo para prueba funcional

OBJETIVO
Corregir la navegación entre módulos después de que Servicios ya podía guardar correctamente.
La versión anterior podía cambiar el estado visual de la pestaña sin ejecutar de forma fiable el
renderizado del módulo seleccionado.

CORRECCIONES
1. Navegación centralizada en agenda-ya-shell.js.
2. El shell llama directamente a AgendaYaModules.activate() cuando el motor está disponible.
3. Si el motor todavía está cargando, se conserva la pestaña solicitada y se reproduce al terminar.
4. Se mantiene un fallback para shells/versiones cacheadas que solamente disparen agendaYa:view-change.
5. Se evita la doble activación cuando el shell ya gestionó la navegación.
6. Todos los controles [data-view] pueden abrir el módulo correspondiente.
7. Al seleccionar un módulo se muestra inmediatamente su encabezado/cargando y luego sus datos.
8. Se mantiene el contexto estable del negocio y el business_id corregido de v1.2.
9. Se mantienen los CRUD de Servicios, Profesionales, Horarios, Disponibilidad, Clientes y Reservas.
10. Se mantiene Calendario y Perfil público propio.
11. No se modifica index.html, auth.js, config.js, Supabase ni el framework visual Backup-1.0.

ARCHIVOS A REEMPLAZAR EN LA RAÍZ DE Backup-1.0
- agenda-ya-shell.js
- agenda-ya-modules.js
- agenda-ya-modules.css

IMPORTANTE
No reemplazar index.html.
No reemplazar auth.js.
No reemplazar config.js.
No ejecutar otra query SQL para esta corrección de navegación.

PRUEBA FUNCIONAL OBLIGATORIA
1. Iniciar sesión.
2. Abrir Servicios.
3. Crear un servicio y guardar.
4. Editarlo y guardar.
5. Eliminarlo.
6. Abrir Profesionales y crear/editar/eliminar.
7. Abrir Horarios y crear/editar/eliminar.
8. Abrir Disponibilidad y crear/editar/eliminar.
9. Abrir Clientes y crear/editar/eliminar.
10. Abrir Reservas y crear/editar/eliminar.
11. Abrir Calendario y cambiar mes/seleccionar día.
12. Abrir Perfil público y verificar que muestra únicamente el propio negocio.

CACHE / GITHUB PAGES
Después de reemplazar los archivos, publicar la rama Backup-1.0 y hacer una recarga forzada del navegador.
El shell utiliza versionado de consulta para cargar agenda-ya-modules.css y agenda-ya-modules.js,
por lo que el navegador no debería conservar la versión anterior del motor.
