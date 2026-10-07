AGENDA YA · PERFIL PÚBLICO MARKETPLACE V1.0

OBJETIVO
Convertir el enlace “Abrir perfil público” del módulo Perfil público en una vista pública premium, coherente con el Marketplace y preparada para clientes/visitantes.

ARCHIVOS
- agenda-ya-shell.js
- agenda-ya-modules.js
- agenda-ya-modules.css
- public-profile.html
- public-profile.js
- public-profile-premium.css

DESPLIEGUE
Reemplazar los tres archivos del paquete B1.3 en la raíz de Backup-1.0:
- agenda-ya-shell.js
- agenda-ya-modules.js
- agenda-ya-modules.css

Agregar/reemplazar en la raíz:
- public-profile.html
- public-profile.js
- public-profile-premium.css

NO MODIFICAR
- index.html
- auth.js
- auth.css
- config.js
- Supabase

PRUEBA
1. Entrar como negocio.
2. Abrir Perfil público.
3. Pulsar “Abrir perfil público”.
4. Verificar que aparezca el perfil público tipo Marketplace.
5. Verificar nombre, categoría, descripción, ubicación, servicios, profesionales y horarios.
6. Pulsar “Agendar ahora” y comprobar que abre public-booking.html del negocio.
7. Probar desde Explorer que el mismo perfil es accesible como cliente.

SQL
No requiere una nueva query SQL. Usa el RPC existente get_public_business_profile.
