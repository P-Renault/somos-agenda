AGENDA YA — MODULES INTEGRATION v1.2 FIXED
Backup-1.0 cumulative frontend patch

OBJETIVO
Corregir el error que impedía guardar un nuevo Servicio y podía afectar el guardado de los demás formularios.

CAUSA CORREGIDA
Los formularios asignaban state.editing antes de llamar a showForm(). showForm() llamaba a closeForm(), y closeForm() limpiaba state.editing. Al enviar el formulario, el tipo de registro quedaba vacío y el código terminaba en "Datos incompletos" / "No se pudo determinar el negocio actual" aunque el negocio estuviera correctamente autenticado.

CORRECCIONES
1. showForm() ya no limpia state.editing.
2. closeForm() permite eliminar el DOM sin borrar el contexto de edición.
3. submitDynamic() resuelve nuevamente la sesión y el business_id antes de cada escritura.
4. Se guarda un businessId estable en contextState y se usa explícitamente en CRUD.
5. La resolución de negocio ya no depende de un JOIN anidado business_members -> businesses.
6. update/delete quedan acotados por business_id.
7. Se elimina el listener de navegación duplicado del módulo; el shell es el dueño de la navegación.
8. Se agrega protección contra activaciones asíncronas fuera de orden.
9. El shell usa cache-busting v1.2.0 para asegurar que GitHub Pages cargue los JS corregidos.
10. Se preservan Backup-1.0, autenticación, Supabase, diseño y los módulos existentes.

ARCHIVOS A REEMPLAZAR EN LA RAÍZ DEL PROYECTO
- agenda-ya-modules.js
- agenda-ya-shell.js
- agenda-ya-modules.css

NO REQUIERE NUEVA QUERY SQL PARA ESTE BUG.
La corrección es de frontend/estado. Mantén aplicada la query de integración de módulos B1.1 que ya corresponde a la base de datos.

VALIDACIÓN TÉCNICA
- agenda-ya-modules.js: node --check OK
- agenda-ya-shell.js: node --check OK
- No se modifica index.html.
- No se modifica auth.js.
- No se modifica config.js.

FLUJO ESPERADO
Servicios -> + Nuevo servicio -> completar datos -> Guardar -> INSERT en services con business_id del negocio autenticado.
Lo mismo aplica a Profesionales, Horarios, Disponibilidad, Clientes y Reservas.

DESPLIEGUE
Reemplazar únicamente los tres archivos indicados en la rama/fuente de GitHub Pages Backup-1.0 y volver a publicar. No cambiar la fuente de Pages.
