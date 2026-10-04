# SOMOS AGENDA — CORE FOUNDATION v0.1

Primera iteración técnica del repositorio `somos-agenda`.

## Incluye
- Supabase Auth / perfiles
- Negocios multiempresa
- Miembros y roles
- RLS multi-tenant
- Auditoría
- Función transaccional de creación de negocio + owner
- Base preparada para OAuth Google/Facebook

## Carga en Supabase
1. Abrir Supabase → SQL Editor.
2. Crear una nueva query.
3. Pegar `supabase/migrations/001_core_foundation_v0_1.sql`.
4. Ejecutar.
5. Verificar tablas y políticas en `public`.

No incluye todavía Agenda, Billing ni Flow.
