# Agenda YA · B12.2

## Reserva desde la ficha pública + regla de autenticación

### Cambios
- El botón **Ver servicios y disponibilidad →** abre la reserva directamente dentro de `public-profile.html`.
- Selector visual de servicios publicados.
- Selector visual de profesionales publicados.
- Calendario mensual con fechas disponibles calculadas desde `get_public_booking_context`.
- Horarios disponibles calculados respetando duración del servicio, horarios/excepciones y reservas existentes.
- Confirmación mediante `create_public_booking`.
- WhatsApp y las demás tarjetas de B12.1 se conservan.
- La ubicación, contacto y CTA quedan centrados visualmente.
- Visitante puede consultar servicios/disponibilidad sin autenticarse.
- Al intentar confirmar sin sesión se conserva el contexto en `sessionStorage` y se deriva a `login.html`.
- `auth.js` recupera el contexto después del login/registro y devuelve al usuario a la ficha pública.
- Usuario autenticado puede confirmar sin volver a iniciar sesión.
- La migración revoca la ejecución anónima de `create_public_booking` y la limita a `authenticated`.

## SQL
Ejecutar una vez en Supabase:

`008_public_booking_authenticated_v0_2.sql`

Esta migración es aditiva y no elimina tablas.

## Archivos a desplegar
- `public-profile.html`
- `public-profile.css`
- `public-profile.js`
- `auth.js`
- `008_public_booking_authenticated_v0_2.sql` (Supabase, no GitHub Pages)

## Prueba B12.2
1. Abrir una ficha pública.
2. Pulsar **Ver servicios y disponibilidad**.
3. Verificar que aparece el formulario dentro de la ficha.
4. Seleccionar servicio.
5. Seleccionar profesional.
6. Verificar calendario y fechas disponibles.
7. Seleccionar fecha y horario.
8. Como visitante, pulsar confirmar: debe solicitar autenticación y conservar la selección.
9. Iniciar sesión/registrarse.
10. Verificar retorno automático a la ficha y conservación del contexto.
11. Como usuario autenticado, confirmar la reserva.
12. Verificar que la reserva queda registrada como `pending` y que un horario ocupado deja de estar disponible.

## Importante
La creación de reservas queda protegida en backend: el RPC ya no acepta ejecución anónima. La disponibilidad pública sigue siendo consultable sin login, conforme al Modelo Arquitectónico Funcional v1.0.
