# Agenda YA · Soporte y Reportes v1.0

## Archivos incluidos
- `admin/index.html`: invalidación de caché para los recursos actualizados.
- `admin/admin.css`: estilos de escritorio y adaptación móvil del módulo.
- `admin/platform-modules.js`: indicadores actuales, filtros, listado, detalle, asignación, cambios de estado y respuestas.
- `supabase/functions/admin-platform/index.ts`: acciones protegidas para resumen, detalle y respuestas de tickets; filtros de categoría y prioridad.
- `supabase/migrations/202610120001_platform_support_messages.sql`: tabla de mensajes de conversación.

## Despliegue
1. Copia los archivos de `admin/` preservando la ruta en el hosting.
2. En Supabase SQL Editor ejecuta el contenido de `supabase/migrations/202610120001_platform_support_messages.sql`.
3. En Supabase Edge Functions, abre `admin-platform`, reemplaza `index.ts` por el archivo incluido y despliega la función. Mantén activada la validación JWT.
4. Abre `/admin/` y recarga sin caché. Verifica listado, filtros, cambio de estado y respuesta.

## Alcance y supuestos explícitos
- Se usan la tabla existente `platform_support_tickets` y sus campos declarados en la Edge Function. El paquete no contiene una migración original que defina esa tabla; si tu tabla real tiene nombres de columnas distintos, la consulta lo informará y habrá que ajustar el `select`.
- La conversación usa la nueva tabla `platform_support_messages`, accesible desde el panel únicamente a través de la Edge Function que verifica sesión y rol. No se crean políticas RLS públicas.
- Las métricas muestran conteos actuales. No se fabrican series históricas ni tiempos medios de respuesta.
- La asignación almacena el identificador de usuario administrador en `assigned_to`; no se inventan nombres de responsables si no hay una relación disponible.
