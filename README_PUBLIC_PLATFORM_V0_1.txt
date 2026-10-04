AGENDA YA · PUBLIC PLATFORM V0.1

OBJETIVO
Implementar el siguiente bloque funcional del proyecto:
1. Perfil público del negocio.
2. Categorías.
3. Explorador inicial.
4. CTA hacia el motor de reserva pública existente.

ARCHIVOS
- 004_agenda_ya_public_platform_v0_1.sql
- public-profile-admin.html / public-profile-admin.js
- public-profile.html / public-profile.js
- explorer.html / explorer.js
- public-platform.css

ORDEN DE INSTALACIÓN
1. Ejecutar 004_agenda_ya_public_platform_v0_1.sql en Supabase.
2. Copiar los archivos del módulo al mismo directorio donde existen index.html y config.js.
3. Mantener el public-booking.html/public-booking.js/public-booking.css existente.
4. Probar:
   - public-profile-admin.html
   - activar "Publicar perfil"
   - public-profile.html?slug=TU-SLUG
   - explorer.html
   - desde el perfil, botón Agendar ahora.

REGLAS
- Migración aditiva.
- No elimina tablas existentes.
- No modifica el motor de reservas existente.
- No duplica disponibilidad ni reservas.
- El perfil público sólo expone negocios publicados mediante RPC SECURITY DEFINER.
- La administración exige owner/admin.
- Este paquete es un módulo funcional acumulativo; no reemplaza el proyecto completo.
