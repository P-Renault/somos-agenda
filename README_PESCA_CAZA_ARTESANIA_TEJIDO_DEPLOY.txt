AGENDA YA 6.0 — PATCH CATEGORÍAS + IMÁGENES

Categorías:
- Pesca y Caza: slug pesca-caza
- Artesanía y Tejido: slug artesania-tejido

Archivos del patch:
- index.html: accesos rápidos/tarjetas de las nuevas categorías y corrección del literal \\n visible en la cabecera.
- explorer.js: iconos, sets de 8 imágenes por categoría, filtro de URL ?category= y lectura de q/location.
- public-profile.js: fallback de portada por categoría y selección estable.
- assets/category-covers/: 16 SVG (8 Pesca y Caza, 8 Artesanía y Tejido).
- 009_pesca_caza_artesania_tejido_category_images.sql: categorías, trigger de portada y clasificación de negocios existentes.
- SQL_MILO_PESCA_ASIGNAR_PESCA_CAZA.sql: asigna Milo Pesca a Pesca y Caza.

APLICACIÓN
1. Copia los archivos del ZIP a la raíz del proyecto respetando rutas.
2. Ejecuta la migración 009 en Supabase después de 004 y 007.
3. Ejecuta el SQL de Milo Pesca.
4. Publica el frontend y limpia caché/CDN.

NOTAS DE COMPATIBILIDAD
- La migración usa campos existentes en esta versión: businesses.name, slug, description y services.name/description.
- No usa businesses.business_type (ese campo no existe en este esquema).
- Para las categorías nuevas, el trigger asigna automáticamente una portada SVG estable al crear/actualizar el perfil.
- Los negocios existentes se clasifican por coincidencia en nombre, descripción y servicios. Es una heurística; revisa manualmente coincidencias dudosas.
- Los perfiles nuevos reciben la portada de la categoría que seleccionen al completar su perfil.
- No se cambia public_enabled en perfiles existentes; los perfiles insertados por backfill permanecen privados por defecto.
- Las categorías existentes continúan utilizando la lógica de imágenes de fallback del frontend.

No se ejecutó SQL en la instancia remota ni se publicó el sitio.
