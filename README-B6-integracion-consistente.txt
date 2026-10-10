AGENDA YA · B6 · PAQUETE DE ARCHIVOS COMPLETOS

Objetivo: despliegue consistente sobre los motores existentes de Backup-5.0-producción; no usar parches manuales.

Archivos completos incluidos:
- business-notification-engine.js: motor de negocio completo extendido.
- customer-profile.js: archivo cliente completo con la integración dentro de su flujo normal; no es un parche separado.
- migration_B6_notificaciones_pagos.sql: migración aditiva para resultados de pago rechazado/pendiente/cancelado.
- supabase/functions/flow-webhook/index.ts: Edge Function completa basada en la versión actual y extendida para emitir notificación por estado Flow.
- README.

Archivos HTML existentes no se modifican porque ya cargan los motores existentes:
- dashboard.html carga business-notification-engine.js.
- customer-profile.html carga customer-profile.js y ya define el panel cpNotificationPanel/cpNotifications/cpNotificationBadge.

Importante: no se ha desplegado a GitHub ni Supabase; la escritura de rama fue rechazada por permisos. Antes de producción hay que confirmar que las RPCs get_business_plan_notifications, get_welcome_notifications, get_app_notifications y las funciones mark_* existen y coinciden con las firmas usadas. get_app_notifications es opcional en el archivo cliente: si no existe, el motor continúa con las notificaciones de bienvenida. El conjunto todavía no implementa automáticamente todos los eventos de comentarios/reputación, perfil incompleto o recordatorios programados de renovación; no declarar el alcance completo de notificaciones hasta integrar y probar esos eventos en sus motores emisores reales.

No ejecutar en producción hasta pasar pruebas de staging: bienvenida cliente/negocio, reserva, plan aprobado, pago rechazado, pendiente, cancelado, repetición webhook, RLS y regresión.
