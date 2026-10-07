# Agenda Ya — Identity + Profile v0.2.5

Hotfix de navegación Auth → Perfil para Backup-1.0.

- Navegación a Perfil explícita mediante `hidden` + `style.display`.
- El acceso autenticado no depende de consultas de `profiles`, `business_members` o `businesses`.
- La hidratación de datos ocurre después de mostrar Perfil.
- Mantiene Google, Facebook y correo.
- Mantiene el framework visual Backup-1.0.

Integrar estos archivos sobre Backup-1.0:
- `index.html`
- `auth.css`
- `auth.js`
- `agenda-ya-logo-header.jpg`

No reemplazar el proyecto completo por este ZIP: es un paquete de integración.
