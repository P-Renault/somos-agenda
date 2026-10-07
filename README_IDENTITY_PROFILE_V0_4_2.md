# Agenda Ya — Identity/Profile v0.4.2

## Corrección de flujo
Se corrigió el paso de **Configura tus horarios → Guardar datos y continuar → Agenda Ya**.

### Causa corregida
`005_identity_profiles_v0_2.sql` creó políticas RLS para `business_hours` llamando a `is_business_member()` e `is_business_admin()` con dos argumentos, mientras que el Core de Backup-1.0 define esas funciones con un solo argumento (`p_business_id`). Eso impedía guardar los horarios y, por consecuencia, impedía abrir el panel principal.

## SQL requerido
Ejecutar una vez:

`006_business_hours_rls_v0_4_2.sql`

Después de ejecutar el SQL, reemplazar los archivos de integración del paquete en Backup-1.0 y probar:

1. Login correo.
2. Elige Perfil de negocio.
3. Completa negocio.
4. Siguiente.
5. Configura horarios.
6. Guardar datos y continuar.
7. Debe abrir Agenda Ya / Dashboard.

## Además
- Si se reintenta el onboarding, se reutiliza el negocio existente para evitar duplicados.
- Se fuerza la visibilidad del contenedor Agenda Ya al terminar el onboarding.
- El flujo cliente mantiene guardado de perfil y redirección al marketplace (`explorer.html`).
- Google/Facebook permanecen conectados al mismo motor Supabase Auth; la validación de proveedores se hará en la siguiente etapa.
