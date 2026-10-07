AGENDA YA · PERFIL PÚBLICO MARKETPLACE · V1.2
===============================================

Objetivo
--------
Mejorar la identidad visual del perfil público del negocio para que el cliente vea
claramente el logo y el nombre del negocio como una unidad de marca.

Cambios
-------
1. Nuevo bloque de identidad: logo del negocio + categoría + nombre + ubicación.
2. Logo cargado desde businesses.logo_url cuando exista.
3. Fallback automático a iniciales del nombre si no existe logo o la imagen falla.
4. Diseño responsive para móvil y escritorio.
5. Se mantiene el resto del Marketplace, servicios, profesionales, horarios y reservas.
6. No se modifica index.html, auth.js, config.js ni la lógica de reservas.
7. Se agrega un RPC público mínimo para obtener únicamente la identidad pública:
   get_public_business_brand(text).

SQL NUEVO
---------
Ejecutar una sola vez en Supabase:
005_public_business_brand_v0_1.sql

Esta función solo devuelve:
- id
- name
- slug
- logo_url

No expone business_members ni información privada del propietario.

DESPLIEGUE
----------
Reemplazar/agregar en la rama de Pages:
- public-profile.html
- public-profile.js
- public-profile-premium.css
- 005_public_business_brand_v0_1.sql (solo ejecutar en Supabase; no es un archivo web)

Mantener:
- agenda-ya-shell.js
- agenda-ya-modules.js
- agenda-ya-modules.css
- public-platform.css
- config.js
- auth.js
- index.html

PRUEBA
------
1. Ejecutar la query 005 en Supabase.
2. Abrir Perfil público desde el negocio.
3. Debe aparecer el logo si businesses.logo_url tiene una URL válida.
4. Si no existe logo, aparecerán las iniciales del negocio.
5. Confirmar que nombre, ubicación, servicios, profesionales y horarios siguen cargando.
6. Confirmar que Agendar ahora continúa llevando a public-booking.html.

IMPORTANTE
----------
El sistema no inventa ni sustituye el logo del negocio. Para mostrar el logo real,
businesses.logo_url debe contener la URL pública/accessible del archivo de imagen.
