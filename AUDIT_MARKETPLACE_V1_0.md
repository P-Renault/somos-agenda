# Agenda Ya · Auditoría + Marketplace Público V1.0

## Base auditada
Paquete: `somos-agenda-Backup-2.0.zip`.

### Componentes revisados
- `explorer.html` / `explorer.js` / `public-platform.css`
- `public-profile.html` / `public-profile.js` / `public-profile-premium.css`
- `004_agenda_ya_public_platform_v0_1.sql`
- `005_public_business_brand_v0_1.sql`
- `003_public_booking_v0_1.sql`
- `config.js` y estructura general de Supabase

## Hallazgos principales
1. El Explorer anterior era funcional, pero no reproducía la composición visual de la referencia: faltaban hero fotográfico, buscador segmentado, rail de categorías y tarjetas de negocio con fotografía, avatar, metadatos y CTA visual.
2. El perfil público ya tenía una base funcional y conectaba con `get_public_business_profile`, pero su jerarquía y proporciones no correspondían al diseño de referencia móvil.
3. El RPC de búsqueda no devolvía `logo_url`, `cover_url`, duración mínima ni precio mínimo, por lo que la nueva tarjeta no podía representar correctamente información real del negocio.
4. No existe en la arquitectura actual una tabla de reseñas/calificaciones. Por seguridad funcional, el diseño muestra `Nuevo` hasta que exista una fuente real de ratings; no se inventan puntuaciones.

## Implementación V1.0
- Marketplace público reconstruido sobre la misma identidad visual de la referencia.
- Hero con imagen de Temuco/volcán y buscador integrado.
- Categorías horizontales con selección activa.
- Tarjetas de negocio 4 columnas desktop, 2 tablet, 1 móvil.
- Tarjeta completa clicable: al pulsarla abre `public-profile.html?slug=...`.
- Logo real del negocio cuando `businesses.logo_url` está disponible.
- Imagen de portada real cuando `business_public_profiles.cover_url` está disponible; mientras tanto se usa una imagen de respaldo por categoría.
- Precio mínimo y duración mínima calculados desde servicios activos.
- Favorito visual preparado sin persistencia de datos (no se inventa backend de favoritos).
- Perfil público reconstruido con la jerarquía de las referencias: identidad, ubicación, descripción, reserva, servicios, profesionales, horarios y CTA final.
- Misma estructura visual y componentes responsive para desktop y móvil.

## Migración nueva
`007_marketplace_public_v1_0.sql` es aditiva y:
- agrega `cover_url` a `business_public_profiles`;
- amplía los RPC públicos existentes para entregar marca, portada, duración mínima y precio mínimo;
- conserva los permisos `anon, authenticated` únicamente sobre los RPC públicos.

## Archivos de entrega
- `explorer.html`
- `explorer.js`
- `public-platform.css`
- `public-profile.html`
- `public-profile.js`
- `public-profile-premium.css`
- `007_marketplace_public_v1_0.sql`
- `AUDIT_MARKETPLACE_V1_0.md`
- assets de referencia visual recortados desde las imágenes suministradas.

## No tocado
- `index.html`
- `auth.js` / `auth.css`
- `config.js`
- módulo de reservas públicas
- CRM
- membresías/billing
- lógica interna del centro de gestión

## Despliegue
1. Copiar los archivos frontend incluidos en la raíz de `Backup-2.0`.
2. Ejecutar `007_marketplace_public_v1_0.sql` en Supabase.
3. Abrir `explorer.html`.
4. Buscar un negocio publicado.
5. Pulsar la tarjeta completa y verificar el perfil.
6. Pulsar `Agendar ahora` y comprobar continuidad con `public-booking.html`.
