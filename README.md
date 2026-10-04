# SOMOS AGENDA

## SOMOS CORE — Identity + Onboarding v0.1

Primera aplicación funcional: login/registro por email, recuperación, OAuth Google/Facebook, perfil automático, onboarding de negocio, owner y dashboard responsive.

### Configuración
Editar `config.js` y completar `SUPABASE_URL` y `SUPABASE_ANON_KEY` con los valores públicos del proyecto Supabase. Nunca colocar `service_role` ni secretos privados.

### Flujo
Login -> Auth -> Profile -> Business -> Owner -> Dashboard

La migración `001_core_foundation_v0_1.sql` debe estar ejecutada.
