AGENDA YA — ADMIN AUTH v1.1
===========================

OBJETIVO
Conecta el login/registro de /admin/ a Supabase Auth y aplica autorización administrativa fail-closed.

CAMBIOS
- admin/login.html: solo inicio de sesión y recuperación de contraseña con Supabase Auth; no hay registro público en el panel.
- admin/admin-supabase.js: cliente Supabase compartido con la clave pública existente de ../config.js.
- admin/auth-ui.js: signInWithPassword, resetPasswordForEmail y comprobación de asignación administrativa. No incluye signUp.
- admin/admin-auth.js: protege la vista /admin/ y realiza signOut si la cuenta no tiene autorización.
- admin/index.html: oculta el panel mientras verifica la sesión; agrega los scripts necesarios.
- supabase/migrations/009_platform_admins_v1_1.sql: tabla de asignaciones administrativas con RLS y sin autoasignación desde navegador.

PASOS OBLIGATORIOS ANTES DE USAR
1. Revisar que ../config.js apunte al proyecto Supabase correcto (en este paquete usa la configuración pública que ya tenía Agenda YA).
2. Aplicar la migración 009_platform_admins_v1_1.sql en el SQL Editor del MISMO proyecto Supabase.
3. En Authentication > Users, crear manualmente el usuario teayudo@somossoftware.net mediante Add user. Confirmar su correo si corresponde.
4. Copiar el UUID real de teayudo@somossoftware.net y ejecutar desde SQL Editor, reemplazando el marcador:
   insert into public.platform_admins (user_id, role, is_active, notes)
   values ('UUID_REAL_DE_AUTH_USERS', 'super_admin', true, 'Propietario inicial de Agenda YA');
5. Abrir /admin/login.html, iniciar sesión con esa cuenta y comprobar que llega a /admin/.
6. Probar otra cuenta: puede registrarse/autenticarse, pero no debe entrar al panel hasta que tenga asignación activa en platform_admins.
7. Confirmar en Supabase Auth > URL Configuration que Site URL y Redirect URLs permiten el origen y la URL de /admin/login.html.

SEGURIDAD
- El panel no ofrece registro público. Las cuentas administrativas deben crearse manualmente desde Supabase Auth. El registro público de la aplicación principal no se modifica.
- La clave del navegador es la publishable/anon pública existente; nunca usar service_role en HTML/JS.
- RLS permite leer solo la propia asignación; no se crean políticas de escritura para clientes.
- La protección del frontend no reemplaza RLS/controles de autorización de cada tabla o Edge Function. Los módulos aún muestran datos de demostración y no deben ejecutar operaciones productivas hasta integrar sus permisos.
- Si la migración no está aplicada, el sistema deniega el acceso (fail-closed).

PRUEBAS HECHAS EN EL PAQUETE
- Revisión de sintaxis JS local y estructura ZIP.
- No se realizaron llamadas reales a Supabase ni pruebas contra el proyecto desplegado; la integración debe validarse con las cuentas del proyecto.
