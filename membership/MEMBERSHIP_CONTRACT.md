# Membership Engine — contrato preliminar

Se deja preparada la arquitectura sin fijar aún el modelo comercial.

Pendiente de definir por el plan de negocio:
- planes
- precios
- límites
- features
- periodicidad
- prueba gratuita
- promociones
- upgrade/downgrade
- cancelación
- impago

Concepto:
business -> subscription state -> plan -> entitlements -> limits -> feature access

API prevista:
MembershipEngine.getCurrent(businessId)
MembershipEngine.getEntitlements(businessId)
MembershipEngine.can(businessId, feature)
MembershipEngine.getUsage(businessId, metric)
MembershipEngine.getLimits(businessId)

UI futura:
Mi membresía / Plan actual / Estado / Uso / Límites / Renovación / Cambiar plan / Historial.
