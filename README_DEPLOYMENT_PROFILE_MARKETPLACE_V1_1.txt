AGENDA YA — PERFIL PÚBLICO MARKETPLACE V1.1
============================================

CORRECCIÓN
----------
La versión anterior mostraba PUBLIC_PROFILE_NOT_FOUND dentro de la vista interna
antes de permitir abrir el perfil público. V1.1 elimina esa dependencia para
abrir la vista pública.

Al pulsar "Abrir perfil público":
1. Se crea/actualiza automáticamente una publicación pública mínima mediante
   upsert_public_profile(..., p_public_enabled=true).
2. Se conserva el nombre, descripción, ubicación y teléfono disponibles en el
   negocio.
3. Se abre public-profile.html?slug=... en una nueva pestaña.
4. El perfil público carga servicios, profesionales y horarios desde el RPC
   get_public_business_profile.

ARCHIVOS
--------
- agenda-ya-modules.js          -> reemplazar versión anterior V1.3/V1.0 del paquete.
- agenda-ya-shell.js            -> mantener el shell del paquete anterior.
- agenda-ya-modules.css         -> mantener el CSS del paquete anterior.
- public-profile.html           -> perfil público Marketplace.
- public-profile.js             -> carga datos públicos.
- public-profile-premium.css    -> diseño premium responsive.
- public-platform.css           -> dependencia visual incluida para evitar faltantes.

NO MODIFICAR
------------
- index.html
- auth.js
- auth.css
- config.js
- Supabase core
- servicios/profesionales/horarios/reservas existentes

SUPABASE
--------
No requiere una nueva query si la migración 004_agenda_ya_public_platform_v0_1.sql
ya fue ejecutada, porque utiliza los RPC existentes:
- upsert_public_profile
- get_public_business_profile

PRUEBA
------
1. Ingresar a Agenda Ya.
2. Abrir "Perfil público".
3. Pulsar "Abrir perfil público".
4. Debe abrirse la vista Marketplace del negocio.
5. Verificar servicios, profesionales y horarios.
6. Pulsar "Agendar ahora" y comprobar que abre public-booking.html.

VERSIÓN: B1.1
