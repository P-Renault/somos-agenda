AGENDA YA — PANEL ADMINISTRATIVO · FRAMEWORK UI v1.0
====================================================

CONTENIDO
- admin/index.html: shell administrativo y las 12 vistas.
- admin/login.html: vista de inicio de sesión y registro visual.
- admin/admin.css: sistema visual responsive basado en la identidad de Agenda YA.
- admin/admin.js: navegación, componentes, tablas y datos de muestra.
- admin/auth-ui.js: validación visual de los formularios de acceso/registro.
- admin/assets/: recursos de marca copiados del paquete base.

INSTALACIÓN
1. Extraer el ZIP.
2. Subir el contenido de la carpeta raíz al mismo hosting del proyecto, conservando la estructura.
3. El panel estará en /admin/ y el acceso en /admin/login.html.
4. No se modificó index.html, app.js, checkout, Flow, notificaciones, SQL ni las funciones Edge existentes.

IMPORTANTE — ESTADO DE ESTA ENTREGA
Es un framework visual navegable, no un panel conectado a producción. Los datos mostrados son demostrativos y se identifican en pantalla. Las acciones de crear, editar, suspender, exportar, cambiar configuración, pagos, soporte y auditoría no modifican la base de datos.
Los formularios de login y registro validan la interfaz solamente: NO llaman a Supabase Auth, no crean usuarios y no otorgan acceso administrativo. Esta separación es intencional hasta definir la autorización real del administrador en backend.

VISTAS INCLUIDAS
Dashboard; Usuarios; Negocios; Marketplace; Suscripciones; Pagos y Transacciones; Categorías e Imágenes; Reportes y Analytics; Soporte y Reportes; Contenido y CMS; Configuración; Auditoría y Acciones.

PRÓXIMA FASE DE INTEGRACIÓN
- Confirmar modelo de roles/permisos de administrador de plataforma en Supabase.
- Integrar login con Supabase Auth y autorización de administrador del lado servidor/RLS/Edge Functions.
- Conectar cada módulo a las tablas/funciones existentes después de auditar su esquema real.
- Reemplazar los datos de demostración por consultas paginadas y métricas calculadas en backend.
- Añadir registro inmutable de acciones administrativas y pruebas de aislamiento entre negocios.
- Probar despliegue en staging antes de publicar en producción.

SEGURIDAD
No se añadió ninguna clave privada ni service_role. No se debe considerar privada una ruta por ocultar su enlace: los permisos deben verificarse en backend. No desplegar acciones administrativas reales hasta completar la autorización del servidor.


ACTUALIZACIÓN v1.1 — AUTENTICACIÓN
El login y registro ahora usan Supabase Auth. Para habilitar el acceso del propietario, aplicar ../supabase/migrations/009_platform_admins_v1_1.sql y asignar manualmente el UUID en platform_admins según README-ADMIN-AUTH-v1.1.txt. El registro por sí solo nunca concede rol administrativo.
