AGENDA YA — LOGIN FINAL

Se tomó como fuente directa el login.html, script.js y style.css entregados por el usuario.

Implementado:
1. Réplica visual del diseño de la imagen 691×1536.
2. Íconos de correo y contraseña dentro de los inputs.
3. Ojo de contraseña.
4. Google y Facebook con SVG reales.
5. Recuperación de contraseña.
6. Crear cuenta.
7. Supabase Auth con persistencia de sesión, auto-refresh y detección de sesión OAuth.
8. Google/Facebook mediante Supabase OAuth.
9. Al existir una sesión persistente, el motor AgendaYaAuth recupera getSession() y enruta al perfil/sistema.
10. index.html incluido como espejo de login.html porque el callback OAuth del motor funcional apunta al root de /somos-agenda/.

El motor funcional utilizado es Agenda Ya Identity + Profile + Social Auth v0.5.0 de Backup-2.0.
