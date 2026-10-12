AGENDA YA · CATEGORY COVER IMAGES V1.0

INCLUYE
- 96 imágenes estáticas (8 por cada una de las 12 categorías existentes) en assets/category-covers/.
- 008_category_cover_images_v1_0.sql: catálogo de imágenes, asignación aleatoria balanceada, trigger y backfill.
- Actualización del registro de negocio para exigir categoría y persistir el perfil público con cover_url automático.
- Fallback determinista en marketplace y perfil público para no cambiar imágenes al recargar.

DESPLIEGUE
1. Copiar todos los archivos y assets del ZIP a la raíz del repositorio, respetando las rutas.
2. Ejecutar una sola vez 008_category_cover_images_v1_0.sql en Supabase SQL Editor, después de las migraciones 004/007 que crean las tablas y funciones existentes.
3. Publicar el sitio estático.
4. Probar un negocio de prueba: seleccionar categoría, terminar onboarding, revisar el registro en business_public_profiles.cover_url y abrir explorer.html.

DISEÑO
- El logo subido por el negocio continúa guardándose en businesses.logo_url y no se sustituye por la portada.
- La portada se guarda en business_public_profiles.cover_url y queda estable después de la asignación.
- El trigger elige imágenes de la categoría menos usadas primero, con desempate aleatorio, para distribuir las portadas entre negocios.
- Si se cambia la categoría, se selecciona una portada nueva de la categoría correspondiente.
- El catálogo está preparado para ampliar cada categoría agregando imágenes y filas a business_category_cover_images.
