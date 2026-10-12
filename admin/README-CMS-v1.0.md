# Agenda YA · Contenido y CMS v1.0

## Archivos del paquete incremental
- `admin/index.html` — invalida caché del módulo.
- `admin/admin.css` — estilos CMS y adaptación móvil.
- `admin/platform-modules.js` — pestañas por tipo, filtros, tabla, previsualización y formularios.
- `supabase/functions/admin-platform/index.ts` — consultas, filtros y escritura protegida del CMS.
- `supabase/migrations/202610120002_platform_content_cms.sql` — tabla, restricciones e índices de contenido.

## Despliegue
1. Extrae el ZIP incremental conservando las rutas.
2. En Supabase → SQL Editor, ejecuta la migración `202610120002_platform_content_cms.sql`.
3. Reemplaza el contenido de `admin-platform/index.ts` en Supabase Edge Functions y despliega la función.
4. Sube los archivos de `admin/` al hosting y abre `/admin/index.html#cms`.
5. Prueba crear un borrador, editarlo, publicarlo y cambiar entre tipos de contenido.

## Contenido y datos
La tabla `platform_content` empieza vacía; el módulo no inventa páginas. Los registros se crean desde el panel. Los tipos disponibles son páginas, banners/carrusel, noticias, preguntas frecuentes, legales, notificaciones y plantillas de correo. La previsualización administrativa representa los campos guardados; no publica automáticamente esos contenidos en el sitio público sin integración adicional de cada tipo.

## Soporte
El formulario Nuevo ticket cambia tipo de solicitud, prioridad y estado a listas desplegables. Los valores se guardan con códigos estables (`technical`, `billing`, `normal`, `open`, etc.) para facilitar filtros y reportes. No requiere una nueva migración de soporte.
