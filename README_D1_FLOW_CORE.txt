AGENDA YA — D1 / B18+B19 — FLOW CORE
=======================================

Objetivo
--------
Integrar Flow como proveedor de pago para Checkout + Webhook, manteniendo
la autoridad de pago en backend y la activación de membresía en Supabase.

Archivos
--------
1. 010_d1_flow_core_v1_0.sql
2. billing-engine.js
3. supabase/functions/flow-create-checkout/index.ts
4. supabase/functions/flow-webhook/index.ts

IMPORTANTE
----------
Este paquete trabaja inicialmente con Flow SANDBOX.
No contiene API Key ni Secret Key.

Antes de probar:
- Ejecutar 010_d1_flow_core_v1_0.sql en Supabase.
- Crear/deployar ambas Edge Functions.
- Configurar los secretos de Supabase:
  FLOW_API_KEY
  FLOW_SECRET_KEY
  FLOW_API_URL=https://sandbox.flow.cl/api
  FLOW_CONFIRMATION_URL=https://edlsxmuhbsvtjdtmyhks.supabase.co/functions/v1/flow-webhook
  FLOW_RETURN_URL=https://p-renault.github.io/somos-agenda/dashboard.html?flow_return=1

Las variables SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY
deben existir en el entorno de las Edge Functions. Supabase normalmente
inyecta SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY.

Webhook
-------
flow-webhook debe quedar con verificación JWT DESACTIVADA, porque Flow llama
directamente al endpoint sin un JWT de Supabase.

flow-create-checkout sí requiere autenticación del usuario.

Prueba D1
---------
1. Iniciar sesión como negocio.
2. Configuración -> Membresía/Billing.
3. Elegir PRO o BUSINESS.
4. Debe abrirse el checkout de Flow Sandbox.
5. Completar la simulación de pago.
6. Flow llama al webhook.
7. El webhook consulta payment/getStatus server-to-server.
8. Solo status=2 (pagado) actualiza payment y activa la suscripción.
9. Volver a Agenda YA y comprobar que el backend refleja el cambio.

No se debe considerar exitoso un pago solo porque el navegador volvió a
Agenda YA.

Flow documenta que payment/create devuelve url + token + flowOrder, y que
la confirmación se recibe por POST con token en urlConfirmation; el comercio
debe consultar payment/getStatus. D1 sigue exactamente ese patrón.
