AGENDA YA — IDENTITY + PROFILE v0.2.4
BACKUP-1.0 — AUTH ROUTING HARD FIX

OBJETIVO
Corregir el último punto observado: Supabase autentica, pero la interfaz permanecía en Login con el mensaje "Acceso confirmado. Cargando tu perfil…".

CORRECCIÓN
- La vista Perfil se revela de forma síncrona inmediatamente después de recibir una sesión válida.
- El evento onAuthStateChange también revela Perfil inmediatamente.
- Una sesión persistida al cargar la página también revela Perfil inmediatamente.
- Las consultas a profiles/business_members/businesses son únicamente hidratación posterior.
- Una consulta lenta, error RLS o error de datos no puede bloquear Login -> Perfil.
- Se evita que routingInProgress bloquee una segunda señal de autenticación.
- Mantiene el framework visual Backup-1.0.

PRUEBA OBJETIVO
Login con una cuenta ya confirmada -> botón Iniciar sesión -> debe aparecer inmediatamente "Configuremos tu perfil".

NO CAMBIA
- Servicios
- Profesionales
- Horarios
- Disponibilidad
- Clientes
- Reservas
- Calendario
- Supabase Auth
