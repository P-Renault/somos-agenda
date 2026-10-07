AGENDA YA — IDENTITY + PROFILE v0.2.3
BACKUP-1.0 — AUTH ROUTING NON-BLOCKING

CORRECCIÓN:
- La sesión Supabase se considera autenticada inmediatamente después de signInWithPassword.
- La vista Perfil se muestra inmediatamente.
- Las consultas a profiles/business_members/businesses se ejecutan solo para hidratar datos.
- Ninguna consulta de base de datos puede impedir que el usuario llegue a Perfil.
- Si una consulta falla o demora, el usuario permanece en Perfil y puede completar sus datos.

FLUJO:
Login -> Supabase Auth -> Perfil inmediato -> hidratación de datos -> guardar perfil -> siguiente etapa.

NO modifica Supabase ni los módulos de servicios, reservas o calendario.
