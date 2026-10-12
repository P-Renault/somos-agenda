# Agenda YA Admin — Negocios v1.4

Correcciones incrementales:
- El botón X ahora mantiene el detalle cerrado hasta que el usuario seleccione otro negocio; no reaparece automáticamente el primer registro.
- La imagen superior usa la primera URL disponible entre cover_url, cover_image_url, banner_url, banner_image_url, image_url, logo_url o logo. Si no existe URL válida, conserva el placeholder.
- La vista escritorio mantiene listado y ficha en columnas hasta 980 px; móvil usa una columna.
- Las imágenes con error no rompen la tarjeta.

Instalación: reemplazar admin/platform-modules.js y admin/admin.css conservando rutas. Subir también esta guía si se desea. Probar escritorio y móvil con datos reales.
