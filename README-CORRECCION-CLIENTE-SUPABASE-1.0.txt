AGENDA YA 6.0 - CORRECCION DE CLIENTE SUPABASE COMPARTIDO

OBJETIVO
Eliminar la creación de varias instancias GoTrueClient en la página Dashboard.

CAMBIOS
- Nuevo agenda-ya-supabase-client.js: registro singleton por página y configuración.
- dashboard.html: carga el registro después de config.js y antes de dashboard.js.
- dashboard.js: obtiene el cliente desde AgendaYaSupabase.
- membership-engine.js
- entitlements-engine.js
- limits-engine.js
- billing-engine.js
- subscription-lifecycle-engine.js
- business-reputation-engine.js
  Los módulos anteriores reutilizan el mismo cliente centralizado.

COMPORTAMIENTO PRESERVADO
- persistSession: true
- autoRefreshToken: true
- detectSessionInUrl: true
- URL y anon key se siguen leyendo desde SOMOS_CONFIG.
- No se modifican tablas, funciones SQL, políticas RLS, datos ni flujos de pago.
- El motor de notificaciones sigue obteniendo el cliente autenticado mediante
  AgendaYaAuth.getClient(), que ahora devuelve el cliente central.

VALIDACION LOCAL
- node --check ejecutado correctamente sobre todos los archivos JavaScript modificados.
- Revisión estática: no quedan llamadas directas a createClient() en los motores
  cargados por dashboard.html; la única referencia restante en dashboard.js es
  el wrapper createClient(), que delega al registro central.

DESPLIEGUE
1. Respaldar la versión publicada.
2. Publicar juntos todos los archivos de este paquete, conservando sus rutas.
3. Verificar que dashboard.html cargue agenda-ya-supabase-client.js antes de dashboard.js.
4. Abrir https://agenda-ya.cl/dashboard.html con recarga forzada (Ctrl+F5).
5. En DevTools > Console, comprobar que desaparezca:
   Multiple GoTrueClient instances detected in the same browser context.
6. En DevTools > Network, comprobar que las llamadas RPC del Dashboard respondan
   sin errores de autenticación y que las funciones de reservas, planes, pagos y
   notificaciones sigan funcionando.

IMPORTANTE
La validación realizada es estática/local. No se dispone de credenciales ni acceso
al proyecto Supabase de producción para ejecutar pruebas autenticadas en vivo.
