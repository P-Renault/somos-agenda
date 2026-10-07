# Agenda Ya — Identity + Profile v0.4.0

## Flujo validado de onboarding

1. Login por correo / Google / Facebook.
2. Después de autenticar: **Bienvenido a Agenda Ya — Elige tu perfil**.
3. Selección entre **Perfil de negocio** y **Perfil cliente**.
4. Botón **Siguiente**.
5. Negocio: formulario **Configura tu negocio**. Se mantiene el formulario solicitado y se elimina la URL alternativa del logo.
6. Negocio: segundo paso **Configura tus horarios** y botón **Guardar datos y continuar**.
7. Negocio: creación de `business`, `business_member`, `profiles` y `business_hours`, luego acceso al dashboard/motor Agenda Ya.
8. Cliente: formulario **Configura tu perfil cliente**, sin URL alternativa de foto, botón **Siguiente**.
9. Cliente: guarda `profiles` y continúa al `explorer.html` (Marketplace).

## Alcance

Paquete de integración sobre el framework Backup-1.0. No reemplaza el proyecto completo ni modifica Supabase por sí mismo.
