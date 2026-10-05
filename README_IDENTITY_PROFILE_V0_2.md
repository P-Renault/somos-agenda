# Agenda Ya — Identity + Profile v0.2

## Objetivo
Cerrar la etapa Identity → Perfil antes de continuar con módulos operativos.

Flujo:
1. Registro / inicio de sesión por correo.
2. OAuth Google / Facebook.
3. Confirmación de correo cuando corresponda.
4. Sesión Supabase activa.
5. Vista Perfil obligatoria.
6. Elección de tipo: Perfil de negocio o Perfil cliente.
7. Registro de datos mínimos del perfil.
8. Si es negocio: creación de `business` + datos básicos + horario semanal.
9. Si es cliente: datos personales básicos.
10. Recién después se habilita el sistema Agenda Ya.

## Archivos
- `index.html`: agrega la vista de onboarding de Perfil sin reemplazar el shell.
- `auth.js`: controla Identity, OAuth, sesión y onboarding.
- `auth.css`: estilos responsive del onboarding.
- `005_identity_profiles_v0_2.sql`: migración de datos, horarios de negocio y almacenamiento de avatar/logo.
- `agenda-ya-logo-header.jpg`: logo oficial usado por el framework.

## Importante
- No se modifica Supabase Auth ni se crean credenciales nuevas.
- El callback de producción es `https://p-renault.github.io/somos-agenda/`.
- El dashboard no debe ser el destino inmediato de una cuenta nueva: primero se completa Perfil.
- El perfil de negocio usa la función existente `public.create_business(...)` para respetar la arquitectura SOMOS CORE.
- La foto se puede cargar al bucket `profile-media` o dejar una URL de imagen.
- Esta etapa no implementa todavía marketplace, reservas públicas ni facturación.

## Integración
Ejecutar primero `005_identity_profiles_v0_2.sql` en Supabase. Luego reemplazar solamente los archivos incluidos en este paquete dentro de `Backup-1.0`.


## v0.2.1 — Fix motor de acceso
- Se evita ejecutar consultas de base de datos dentro del lock de `onAuthStateChange`.
- `signInWithPassword()` tiene timeout y siempre libera el botón.
- La sesión autenticada se enruta directamente a Perfil o Agenda Ya.
- Se mantiene el framework visual de Backup-1.0.
