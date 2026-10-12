AGENDA YA — MÓDULO ADMINISTRATIVO USUARIOS v1.3
================================================

Contenido
- admin/users-module.js: interfaz de usuarios con datos reales, búsqueda, filtros, ficha, edición limitada, suspensión/reactivación y exportación CSV.
- supabase/functions/admin-users/index.ts: Edge Function protegida que usa Supabase Auth Admin API y la service role solo en servidor.
- supabase/config.toml: verify_jwt = true para admin-users.
- admin/admin.css: estilos responsive del módulo.
- admin/index.html: carga el módulo de usuarios.

IMPORTANTE: el panel conserva login/logout y NO incorpora registro público administrativo.
No desplegar el archivo SUPABASE_SERVICE_ROLE_KEY en el hosting ni incluirlo en config.js.

REQUISITOS PREVIOS
1. La tabla public.platform_admins debe existir y tu usuario debe estar activo con role=super_admin.
2. Las tablas public.profiles, public.businesses, public.business_members y public.audit_logs deben existir.
3. El panel ya debe iniciar sesión correctamente (Admin Auth v1.2).

DESPLIEGUE DE LA EDGE FUNCTION
Desde la raíz del repositorio/proyecto Supabase:
  supabase functions deploy admin-users

Configurar secrets del proyecto (Supabase Dashboard > Edge Functions > Secrets o CLI):
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY

SUPABASE_SERVICE_ROLE_KEY es secreta: solo se configura en Supabase Edge Functions. Nunca copiarla a HTML/JS del navegador.
Si la CLI solicita login/link, usar el proyecto Supabase correcto de Agenda YA antes de desplegar.

DESPLIEGUE WEB
Subir/reemplazar en el hosting:
  admin/index.html
  admin/admin.css
  admin/users-module.js
No sobrescribir el login ni el resto de archivos si no se necesita; se recomienda subir el contenido completo del directorio admin para mantener coherencia.

PRUEBAS DE ACEPTACIÓN
1. Login como super_admin.
2. Abrir /admin/#users o seleccionar Usuarios en el menú.
3. Verificar lista, búsqueda, filtros, ficha, exportación CSV.
4. Editar nombre/teléfono/ciudad/comuna y comprobar persistencia en public.profiles.
5. Suspender una cuenta de prueba y verificar que no pueda iniciar sesión; luego reactivarla.
6. Probar un usuario normal: la Edge Function debe responder 403 ADMIN_REQUIRED.
7. Revisar audit_logs si existen permisos/esquema para guardar eventos.

ALCANCE Y LÍMITES
- La consulta de lista aplica búsqueda y filtros sobre la página devuelta por Supabase Auth Admin API; para conjuntos grandes se deberá añadir búsqueda server-side/indexada.
- El estado de cuenta se basa en confirmación de correo y ban de Supabase Auth.
- El módulo no elimina usuarios, no cambia correos, no gestiona roles de negocio y no modifica suscripciones.
- El perfil público del negocio se muestra como asociación de membresía, pero el link público exacto debe validarse con el router de producción antes de habilitarlo para usuarios finales.
- Los módulos restantes del panel siguen siendo framework visual/demostrativo.
