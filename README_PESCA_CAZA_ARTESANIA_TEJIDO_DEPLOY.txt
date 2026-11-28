AGENDA YA 6.0 — NUEVAS CATEGORÍAS + PORTADAS AUTOMÁTICAS

Categorías agregadas:
- Pesca y Caza (slug: pesca-caza)
- Artesanía y Tejido (slug: artesania-tejido)

Archivos modificados:
- index.html: accesos rápidos y tarjetas destacadas de las dos categorías; corrige además el literal \\n visible antes del encabezado.
- explorer.js: iconos, sets de portada por categoría y lectura de category/q/location desde la URL para que los accesos de inicio filtren correctamente.
- public-profile.js: selección estable de portada por slug para los perfiles y negocios relacionados.

Archivos nuevos:
- 16 SVG (8 por categoría) en assets/category-covers/.
- 009_pesca_caza_artesania_tejido_category_images.sql
- SQL_MILO_PESCA_ASIGNAR_PESCA_CAZA.sql

DESPLIEGUE
1. Descomprime el ZIP en la raíz del repositorio web, conservando las rutas.
2. En Supabase SQL Editor ejecuta una sola vez:
   009_pesca_caza_artesania_tejido_category_images.sql
   Debe ejecutarse después de las migraciones que crean business_categories,
   business_public_profiles y la columna cover_url (en esta versión, 004 y 007).
3. Ejecuta SQL_MILO_PESCA_ASIGNAR_PESCA_CAZA.sql para asignar la categoría a Milo Pesca.
4. Publica los archivos estáticos y limpia la caché del navegador/CDN.

ASIGNACIÓN AUTOMÁTICA
- Los perfiles nuevos reciben una portada estable según la categoría seleccionada.
- Si un negocio existente cambia de categoría, se reasigna una portada de esa categoría.
- Los perfiles existentes sin portada reciben una.
- El backfill clasifica negocios existentes por coincidencia de nombre/tipo con pesca, caza, artesanía o tejido. No cambia public_enabled: los perfiles privados siguen privados.
- Para los negocios con categoría ya asignada, las portadas se asignan según el slug de categoría.

NOTAS
- Las imágenes son ilustraciones vectoriales SVG, optimizadas para portada y categoría.
- La galería/portada del negocio sigue separada del logo.
- El SQL de Milo busca el negocio por nombre o slug y conserva public_enabled si el perfil ya existe.
- No se ejecutó ningún SQL en la base de datos remota ni se publicó el sitio desde aquí.
