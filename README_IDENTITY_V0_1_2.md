# Agenda Ya · Identity v0.1.2 — Backup-1.0

Paquete de integración para la rama `Backup-1.0`.

## Archivos a reemplazar en la raíz
- `index.html`
- `auth.js`
- `auth.css`
- `agenda-ya-logo-header.jpg`

`config.js` NO se incluye: debe conservarse la configuración Supabase existente de Backup-1.0.

## Callback de producción
`https://p-renault.github.io/somos-agenda/`

## Flujo corregido
Registro → correo Supabase → confirmación → callback GitHub Pages `/somos-agenda/` → detección de sesión → Identity validado → Perfil como siguiente motor.

El paquete conserva el shell visual Backup-1.0 y no sustituye los módulos funcionales existentes.


## v0.1.2 — ajuste de vista móvil
La interfaz de Identity fue compactada para que el login, acciones sociales, selector de modo y mensaje de respuesta permanezcan visibles en una sola vista en móviles de altura corta, evitando depender del desplazamiento vertical para acceder al feedback de autenticación.
