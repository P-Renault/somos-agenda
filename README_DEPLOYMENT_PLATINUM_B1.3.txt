AGENDA YA · PLATINUM REFERENCE UI B1.3
======================================

OBJETIVO
--------
Reconstrucción visual basada directamente en las imágenes maestras entregadas:
- Acceso / Login
- Selección de perfil
- Configuración de negocio
- Configuración de cliente
- Dashboard / Centro de Gestión

La composición usa las proporciones maestras 864×1536 y escala manteniendo la misma relación visual en móvil.

IMPORTANTE
----------
Esta entrega es una CAPA VISUAL sobre el sistema funcional existente.
No elimina ni reemplaza la lógica de Supabase/Auth existente.

CONSERVAR EN EL REPOSITORIO
---------------------------
- auth.js
- agenda-ya-profile.js
- agenda-ya-shell.js
- agenda-ya-modules.js
- agenda-ya-modules.css
- config.js
- resto de módulos/SQL existentes

ARCHIVOS DE ESTA ENTREGA
------------------------
- index.html                    -> índice con la capa Platinum incorporada
- platinum-reference.css        -> skin visual de referencia
- platinum-reference.js         -> cambio automático de estado visual
- assets/ref-login.png
- assets/ref-profile-choice.png
- assets/ref-business-profile.png
- assets/ref-client-profile.png
- assets/ref-dashboard.png
- assets/ref-dashboard-hero.png
- assets/agenda-ya-logo-header.jpg
- assets/somos-software-avatar.png
- agenda-ya-logo-header.jpg
- auth.css / agenda-ya-shell.css -> base visual incluida para compatibilidad
- config.js                     -> configuración actual

DESPLIEGUE
----------
1. Descomprimir sobre la raíz del repositorio de Agenda Ya.
2. Sobrescribir index.html.
3. Mantener los JS funcionales existentes.
4. Mantener Supabase y las queries sin cambios.
5. Publicar en GitHub Pages.
6. Abrir en móvil y limpiar caché / recargar forzado.

CRITERIO VISUAL
---------------
Las imágenes ref-*.png son las maestras visuales entregadas por el usuario.
La capa CSS usa esas composiciones como referencia exacta y coloca encima los controles funcionales del sistema.
Los botones y campos continúan conectados a los IDs existentes para que Auth/Onboarding sigan funcionando.

NO MODIFICAR
------------
- Supabase
- RLS
- Auth providers
- lógica de reservas
- módulos operativos
- nombres de tablas
- nombres de IDs funcionales

VERSIÓN
-------
B1.3 · Platinum Reference Reconstruction
