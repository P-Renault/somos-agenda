# Agenda Ya — B11.2 Ficha pública de negocio

Implementa la ficha pública de un negocio accesible desde `explorer.html?slug=...`.

## Archivos
- `public-profile.html`
- `public-profile.css`
- `public-profile.js`

## Integración
B11.1 ya dejó las tarjetas del explorador apuntando a:
`public-profile.html?slug=<slug>`

La ficha consume la RPC pública `get_public_business_profile(text)` creada en `007_marketplace_public_v1_0.sql`.

No modifica `index.html`, `login.html`, `profile.html` ni Dashboard.

## Alcance B11.2
- Identidad comercial pública.
- Logo/imagen de portada pública.
- Categoría.
- Ubicación pública.
- Descripción.
- Contacto publicado.
- Servicios publicados como información.
- Profesionales publicables.
- CTA preparado para el siguiente bloque.

La selección de disponibilidad y la confirmación de reserva quedan deliberadamente para B11.3/B12.
