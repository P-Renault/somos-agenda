# Agenda YA · B12.1
## Ficha pública: Contacto WhatsApp + CTA compacto + negocios similares

Paquete incremental sobre B12. Modifica únicamente la ficha pública.

### Archivos incluidos
- `public-profile.html`
- `public-profile.css`
- `public-profile.js`

### Cambios
1. Contacto rediseñado con lenguaje visual de WhatsApp:
   - encabezado Contacto;
   - comuna/ciudad;
   - CTA verde «Agenda ahora por WhatsApp»;
   - número conservado como enlace telefónico.
2. Tarjeta «¿Quieres reservar?» trasladada debajo de Profesionales, con altura compacta y mismo ancho que la columna principal.
3. Nueva sección «Similares» al final de la ficha.
4. «Similares» consulta `search_public_businesses` filtrando por la misma categoría y excluyendo el negocio actual.
5. Se muestran hasta cuatro negocios.
6. Cada negocio similar enlaza a su propia `public-profile.html?slug=...`.
7. En desktop se muestran cuatro tarjetas en una fila; en móvil se adapta a dos columnas y, en pantallas estrechas, a desplazamiento horizontal.
8. No se agrega una migración SQL: utiliza el RPC público ya existente `search_public_businesses`.

### Prueba prevista
Con 4+ negocios públicos de la misma categoría, abrir una ficha y comprobar que:
- aparecen hasta cuatro negocios similares;
- ninguno es el negocio actualmente abierto;
- las imágenes respetan `cover_url` o la imagen automática de categoría;
- el logo, nombre, ubicación, cantidad de servicios y precio mínimo se muestran;
- al tocar una tarjeta se abre su ficha pública.

No se modifica Explorer, Login, Dashboard ni el flujo transaccional de reservas.
