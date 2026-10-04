# Billing / Flow — contrato preliminar

Flow será un adaptador de pago.

Agenda Ya -> Billing Engine -> Flow Adapter -> Flow
-> retorno/webhook -> Billing Engine -> Membership Engine -> estado actualizado

API prevista:
BillingEngine.createCheckout(...)
BillingEngine.getPaymentStatus(...)
BillingEngine.handleWebhook(...)
BillingEngine.cancelSubscription(...)

No se activan todavía credenciales, precios, planes, periodicidad ni webhooks productivos.

Los cambios críticos de suscripción deben validarse en backend. El retorno del navegador no es por sí solo prueba definitiva de pago.
