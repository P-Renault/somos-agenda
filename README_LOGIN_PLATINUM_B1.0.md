# Agenda Ya — Login Platinum B1.0

## Alcance de esta intervención

Esta intervención se realizó **exclusivamente sobre la pantalla de Login/Acceso** del repositorio `somos-agenda-Backup-2.0`.

No se modificaron la arquitectura de Supabase, las migraciones SQL, los módulos de agenda, el Marketplace, el perfil, el CRM, billing ni las vistas posteriores al login.

## Auditoría previa

La implementación existente tenía una estructura funcional correcta para Supabase Auth, pero visualmente no correspondía a la referencia Platinum:

- El logo estaba contenido dentro de una tarjeta blanca independiente.
- El botón de regreso no existía.
- El encabezado, formulario y tarjeta no respetaban la composición vertical de la referencia.
- Los campos no tenían los contenedores de icono de la referencia.
- Los iconos de correo, contraseña y visibilidad no estaban replicados.
- El CTA no tenía el degradado, altura, radio ni flecha de la referencia.
- Los botones Google/Facebook no tenían la composición visual ni jerarquía de la referencia.
- La recuperación y creación de cuenta no utilizaban la misma composición tipográfica.
- Faltaban las formas decorativas suaves del fondo.

## Adaptación B1.0

Se reconstruyó la vista de Login manteniendo los IDs y eventos necesarios para no romper `auth.js`:

- Email/password con Supabase Auth.
- Recuperación de contraseña.
- Google OAuth.
- Facebook OAuth.
- Crear cuenta / iniciar sesión.
- Persistencia de sesión existente.
- Pantalla posterior al login existente.
- Botón de mostrar/ocultar contraseña.

### Archivos intervenidos

- `index.html` — estructura visual del Login.
- `auth.css` — nueva capa visual Platinum, con alcance exclusivo `.ay-auth`.
- `auth.js` — únicamente soporte del toggle de contraseña y preservación del tratamiento visual del título al cambiar entre login/registro.

## Referencia de diseño

La composición está calibrada para la referencia móvil proporcionada: **864 × 1536 px**, con adaptación responsive para pantallas menores.

Se replican como criterios de diseño:

- Fondo blanco/azul muy claro con ondas suaves.
- Botón de regreso superior izquierdo.
- Logo centrado.
- Eyebrow azul en mayúsculas.
- Título grande azul marino + Agenda Ya en azul.
- Subtítulo gris azulado.
- Tarjeta blanca de gran radio.
- Campos grandes con iconos dentro de cápsulas azul claro.
- CTA azul/cian con flecha.
- Recuperación centrada.
- Separador horizontal.
- Botones sociales blancos con borde fino.
- Jerarquía tipográfica, radios, espaciados y proporciones orientados a la referencia.

## Regla de integración

Copiar únicamente los tres archivos modificados al branch `Backup-2.0`:

1. `index.html`
2. `auth.css`
3. `auth.js`

El resto del repositorio debe permanecer sin cambios.
