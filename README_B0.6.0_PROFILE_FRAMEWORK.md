# Agenda Ya — B0.6.0 Perfil + Framework Premium

## Objetivo
Mantener el framework Backup-1.0 y elevar su presentación sin cambiar su arquitectura base, incorporando el módulo de perfil y un flujo de acceso por tipo de cuenta.

## Reglas implementadas
- Primera entrada: después de autenticarse, la cuenta elige Perfil de negocio o Perfil cliente.
- Reingreso de negocio: entra directamente al Dashboard.
- Reingreso de cliente: entra directamente al marketplace (`explorer.html`).
- Cliente no recibe la opción “Mi negocio” en el marketplace.
- Header del negocio: avatar/perfil + botón Salir en el extremo derecho.
- Avatar abre el módulo de perfil con datos editables.
- Menú móvil “Más” abre una bandeja nativa con Perfil, Perfil público (solo negocio), Configuración y Cerrar sesión.
- Configuración queda establecida como el lugar de futura gestión de Plan y suscripción; esta versión no fija precios, límites, trials ni reglas comerciales.
- Marketplace conserva la misma jerarquía visual/DOM en escritorio y móvil; el responsive modifica proporciones y disposición, no el contenido ni la secuencia.
- Nueva página `profile.html` permite que un cliente gestione su perfil sin pasar por el Dashboard de negocio.

## Archivos nuevos/modificados principales
- `index.html` — módulo de perfil, menú Más y logout.
- `agenda-ya-shell.css` — capa premium nativa.
- `agenda-ya-profile.js` — lógica del módulo de perfil.
- `auth.js` — routing persistente por tipo de perfil.
- `explorer.html`, `explorer.js`, `public-platform.css` — marketplace premium y navegación por rol.
- `profile.html`, `profile.js`, `profile.css` — perfil standalone, especialmente para clientes.
- `agenda-ya-shell.js` — Configuración preparada para plan/suscripción.

## Seguridad
No se incorporan secretos al frontend. La autenticación sigue utilizando Supabase Auth y las operaciones de perfil utilizan la sesión del usuario.

## Despliegue
El destino de Pages continúa siendo `Backup-1.0`, raíz `/`. El conector GitHub de esta sesión actualmente devuelve 403 al intentar crear ramas/escribir archivos, por lo que este paquete es el despliegue acumulativo listo para subir a esa rama; no se declara un push automático realizado.
