# Agenda YA — Motores de módulos administrativos v1.0

## Archivos
- `admin/platform-modules.js`: interfaz conectada a la Edge Function; carga real, búsqueda con debounce, paginación, CSV, alta/edición según módulo.
- `supabase/functions/admin-platform/index.ts`: API administrativa protegida; valida JWT y asignación activa en `platform_admins`, usa lista blanca de tablas/campos y escribe eventos de auditoría.
- `supabase/migrations/010_admin_platform_modules_v1_0.sql`: tablas aditivas para marketplace, categorías, soporte, CMS y configuración.
- `admin/index.html`, `supabase/config.toml`: carga del motor y verificación JWT.

## Despliegue
1. Aplicar `supabase/migrations/010_admin_platform_modules_v1_0.sql` en SQL Editor.
2. Desplegar `supabase/functions/admin-platform/index.ts` como función `admin-platform`.
3. Mantener `verify_jwt = true` y los secretos `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` configurados en Supabase. No publicar la service role key en el sitio.
4. Subir `admin/index.html` y `admin/platform-modules.js` al hosting junto con los archivos de framework ya existentes.
5. Probar en sesión de super_admin cada módulo. Los módulos de pagos y suscripciones son solo lectura; Flow sigue siendo el responsable de confirmar pagos.

## Alcance y seguridad
- Los datos de `businesses`, `subscriptions`, `payments` y `audit_logs` se leen desde tablas existentes.
- Tablas nuevas para marketplace, categorías, soporte y CMS quedan sin permisos directos para `anon`/`authenticated`; el acceso administrativo pasa por Edge Function.
- Configuración usa claves `platform_settings`; no se expone la gestión de secretos del entorno.
- Las cifras de Analytics se calculan con conteos exactos. Si una tabla no existe, se muestra `null` en vez de inventar datos.
- `businesses` no tiene campo `city` en el esquema base conocido; la columna queda vacía hasta que se confirme el campo real de ubicación.
- No se crean, cancelan ni reembolsan pagos desde el panel; eso requeriría un flujo financiero explícito y reconciliado con Flow.

## Validación
Se verificó sintaxis JavaScript/TypeScript de forma estática en el paquete de construcción. No se ejecutaron pruebas contra el proyecto Supabase remoto. El esquema real de `subscriptions` y `payments` debe coincidir con las columnas declaradas en la función; si difiere, ajustar `specs` antes de habilitar el módulo.
