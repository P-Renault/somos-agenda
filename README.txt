AGENDA YA — CORRECCIÓN FLUJO LOGIN → PROFILE
Fecha: 07-10-2026

OBJETIVO
Corregir el flujo posterior al login sin modificar index.html ni Supabase.

CAMBIOS
1. login.js
   - Login deja de consultar profiles antes de navegar.
   - Después de una autenticación válida, la única siguiente capa es profile.html.
   - Esto elimina la competencia entre routers y evita el retorno inesperado a index/login.
   - OAuth y login por contraseña utilizan el mismo flujo.

2. profile.html
   - Es la segunda capa oficial del sistema.
   - Carga style.css, que ahora contiene también los estilos de onboarding.
   - El logo utiliza agenda-ya-logo-header.jpg desde la raíz del proyecto.
   - No depende de assets/ para esta vista.

3. profile.js
   - Espera la sesión persistida antes de decidir si debe volver a login.
   - Hace varios intentos breves de recuperación de sesión para evitar el rebote login → profile → login.
   - Si existe perfil cliente: explorer.html.
   - Si existe perfil negocio con business_members activo: dashboard.html.
   - Si no existe perfil o el onboarding de negocio está incompleto: permanece en profile.html.
   - Un error de consulta de perfil NO devuelve al usuario a login; muestra el error y conserva la sesión.

4. style.css
   - Mantiene el diseño del login.
   - Incorpora los estilos de profile.html.
   - El bloqueo de scroll móvil del login quedó limitado al documento que contiene .ay-auth, para no romper el onboarding de Profile.

NO MODIFICADO
- index.html
- Supabase / base de datos / migraciones
- explorer.html
- dashboard.html

INSTALACIÓN
Copiar estos archivos sobre la rama/branch que está desplegando GitHub Pages:
- login.js
- profile.html
- profile.js
- style.css

El archivo agenda-ya-logo-header.jpg debe existir en la raíz del repositorio, como en el paquete auditado.

PRUEBA DE ACEPTACIÓN
A) Usuario nuevo:
Landing/Marketplace → login → autenticación → profile.html → elección de perfil.
B) Cliente existente:
login → profile.html (router) → explorer.html.
C) Negocio existente:
login → profile.html (router) → dashboard.html.
D) OAuth:
proveedor → login.html → sesión recuperada → profile.html (router).
E) Error temporal/RLS:
no debe producir bucle de redirección hacia login; se muestra el error en Profile.
