AGENDA YA — MÓDULO NEGOCIOS v1.2 · CORRECCIÓN VISUAL

OBJETIVO
Corrige la hoja de estilos faltante/incompleta que provocaba indicadores concatenados, controles sin formato y tarjetas sin jerarquía visual. Se conserva el motor de consultas a la Edge Function protegida admin-platform.

ARCHIVOS MODIFICADOS
- admin/admin.css: añade estilos completos y aislados para el motor administrativo y el módulo Negocios, incluidos escritorio y móvil.
- admin/platform-modules.js: actualización de versión; conserva consulta, filtros, paginación, detalle y operaciones existentes.
- admin/index.html: añade versión de caché a admin.css y platform-modules.js para reducir el riesgo de que el navegador siga usando recursos anteriores.

INSTALACIÓN
1. Haz una copia de seguridad de los tres archivos actuales.
2. Extrae el ZIP preservando las rutas y sobrescribe los archivos indicados.
3. Sube los tres archivos al hosting en la carpeta admin/.
4. En el navegador móvil, recarga la página. Si persiste la vista anterior, limpia caché o abre una pestaña privada.
5. Prueba https://agenda-ya.cl/admin/index.html#businesses en escritorio y móvil.

IMPORTANTE
- No requiere SQL nuevo.
- Los datos siguen dependiendo de la sesión administrativa, config.js y la Edge Function admin-platform.
- Las métricas de activos/inactivos y logos se calculan sobre la página consultada, excepto el total que procede de la respuesta de la función.
- Este paquete corrige el renderizado CSS/JS, pero no se puede afirmar que una operación real en Supabase esté validada sin probarla en el entorno publicado.
- Si aparecen errores de carga, revisa DevTools/Network y la respuesta de POST /functions/v1/admin-platform.
