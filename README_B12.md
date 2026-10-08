# Agenda YA · B12 · Rediseño ficha pública + datos públicos del negocio

## Objetivo
Ajuste integral de la ficha pública del negocio antes de continuar con el flujo de reserva.

## Archivos incluidos
- `public-profile.html`
- `public-profile.css`
- `public-profile.js`
- `profile.html`
- `profile.js`
- `profile.css`
- `assets/agenda-ya-logo-header.png`
- imágenes de categoría `assets/card_*.jpg`

## Cambios
1. Descripción pública incorporada al onboarding del negocio y guardada en `business_public_profiles.description` mediante `upsert_public_profile`.
2. Categoría de negocio seleccionable desde `business_categories`; se guarda como `category_id` del perfil público.
3. Cabecera de la ficha pública utiliza la misma lógica de imágenes por categoría del Marketplace.
4. Si existe `cover_url`, tiene prioridad; si no, se usa la imagen automática de categoría.
5. Servicios ocupan el ancho completo de su contenedor; los servicios internos se apilan a ancho completo.
6. Profesionales ocupan el ancho completo de su contenedor.
7. Contacto compacto en una sola fila, con enlace real a WhatsApp.
8. Ubicación incorpora dirección y vista embebida de Google Maps, más enlace externo.
9. CTA Agenda YA se conserva y se presenta como bloque de conversión complementario.
10. Logo del header de la ficha y onboarding pasa a PNG con transparencia real.

## Supabase
No se incluye una migración SQL nueva. B12 utiliza las estructuras/RPC existentes:
- `business_categories`
- `business_public_profiles`
- `upsert_public_profile`
- `get_public_business_profile`

## Integración
Copiar los archivos manteniendo sus nombres y rutas. No sobrescribir `index.html`, `login.html`, `dashboard.html` ni `explorer.html` con este paquete.
