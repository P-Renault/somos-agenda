AGENDA YA B6 · INTEGRACIÓN COMPATIBLE CON MOTORES ACTUALES

Base contrastada contra archivos de la rama Backup-5.0-producción:
- business-notification-engine.js B13.2.2
- dashboard.html: ya carga business-notification-engine.js, membership-engine.js, entitlements-engine.js, limits-engine.js, billing-engine.js, subscription-lifecycle-engine.js y flow-return-popup.js.
- customer-profile.html: ya contiene cpNotificationPanel, cpNotifications, cpNotificationBadge y carga customer-profile.js.
- customer-profile.js: usa el panel cliente existente.
- supabase/functions/flow-webhook/index.ts: ya procesa Flow y crea notificación de plan aprobado mediante create_business_plan_notification.

Archivos:
1. business-notification-engine.js — motor existente extendido para consultar también get_business_plan_notifications, get_welcome_notifications y get_business_payment_notifications. Conserva get_business_notifications, mark_business_notifications_read y window.AgendaYaAuth.getClient().
2. migration_B6_notificaciones_pagos.sql — añade únicamente almacenamiento/RPC para pagos rechazados, pendientes y cancelados. El pago aprobado sigue utilizando la notificación existente de plan activo para no duplicar el aviso.
3. supabase/functions/flow-webhook/index.ts — conserva el procesamiento actual, validaciones, RPC de pago y aviso de plan aprobado; añade la notificación para estados 1/3/4.
4. customer-profile-notifications.patch.js — parche acotado para la función openNotifications() y su carga, usando el panel ya existente.
5. README.

No desplegado: la integración GitHub devolvió 403 al intentar crear una rama. Este ZIP es un paquete de integración local, no una confirmación de cambios en el repositorio o Supabase.

ANTES DE DESPLEGAR:
- Verificar en el proyecto que get_business_plan_notifications, get_welcome_notifications y sus funciones mark_* existen con los argumentos indicados.
- Confirmar códigos Flow 1=pending, 2=approved, 3=rejected, 4=cancelled en el entorno configurado.
- El parche cliente usa get_app_notifications opcionalmente; si esa RPC no existe, el motor seguirá mostrando bienvenida, pero para eventos generales se requiere un RPC real y sus eventos emisores.
- Comentarios/reputación y recordatorio de perfil incompleto requieren integración explícita en sus motores/handlers reales; no se inventan triggers sobre esquemas no auditados.
- La función de renovación automática no está incluida en este parche porque requiere scheduler de producción (pg_cron o Edge Function programada) y validación del estado/ciclo de suscripción.

PRUEBAS: reserva actual; bienvenida cliente; bienvenida negocio; pago aprobado sin duplicado; rechazo, pendiente y cancelación; reintento webhook; seguridad RLS; móvil/escritorio; regresión de login, dashboard y perfil cliente.
