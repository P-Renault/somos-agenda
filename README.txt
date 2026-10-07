AGENDA YA — LOGIN RECONSTRUIDO
================================

Esta versión elimina la segunda hoja CSS específica del login (auth.css) para
evitar reglas visuales duplicadas y deja style.css como única fuente de estilo
del login.

Se conserva agenda-ya-shell.css porque login.html contiene también la vista de
perfil y la aplicación posterior al inicio de sesión.

El diseño se reconstruye sobre la referencia 691 x 1536 px:
- Todas las coordenadas y tamaños visuales se escalan desde el ancho.
- No se usa 100dvh para posicionar el diseño, evitando que la barra del navegador
  cambie la escala vertical.
- No se usa overflow:hidden en el lienzo del login, evitando recortes.
- Se mantienen los IDs funcionales de Agenda YA para auth.js:
  ayAuthForm, ayAuthEmail, ayAuthPassword, ayAuthGoogle, ayAuthFacebook,
  ayRecoveryBtn, ayAuthSwitch, etc.

PERSISTENCIA / AUTH
-------------------
login.html mantiene Supabase JS + SOMOS_CONFIG + los scripts funcionales de
Backup-2.0:
agenda-ya-shell.js
agenda-ya-profile.js
auth.js

La persistencia real depende de ese motor de Supabase/Auth; esta reconstrucción
no sustituye ni falsifica la autenticación.

ARCHIVOS
--------
login.html
style.css
script.js
README.txt
