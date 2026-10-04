# Contrato de motores

UI Controller:
- interacción
- loading/error/empty/success
- llama al engine
- renderiza

Engine:
- datos
- reglas de negocio
- validaciones
- transformación de errores
- persistencia

Supabase:
- Auth
- RLS
- PostgreSQL
- RPC/functions

API conceptual:
load()
get(id)
create(data)
update(id,data)
remove(id)
validate(data)

Las reglas críticas no deben depender exclusivamente del frontend.
