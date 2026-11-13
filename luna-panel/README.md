# luna-panel

Panel para que Luna edite y publique su sitio sola. React 19 + Vite + Tailwind v4, TanStack Query, dnd-kit (ordenar), Tiptap (texto con formato) y los esquemas de `@luna/shared` para validar antes de guardar.

## Desarrollo

Con la API (`pnpm dev:api`) y el portafolio (`pnpm dev:site`) corriendo, desde `luna/`:

```bash
cp luna-panel/.env.example luna-panel/.env
pnpm dev:panel                     # http://localhost:5173
```

Entrás con un mail cargado con `user:add`. Sin `RESEND_API_KEY` en la API, el link aparece en la consola de la API.

## Pantallas

| Ruta | Qué hace |
| --- | --- |
| `/entrar` | Pedir el link mágico y canjearlo (`/entrar?token=…`) |
| `/` | Inicio: estado del sitio, cambios pendientes, atajos, la página de arriba a abajo |
| `/pagina` | Mi página: ordenar (arrastrar, o Subir/Bajar en el menú), ocultar, duplicar, borrar con "Deshacer", agregar |
| `/pagina/:id` | Editor de la sección con autoguardado y vista previa real al lado (en el celular, pestañas) |
| `/ajustes` | Contacto, redes, SEO con vista de Google, pie de página, historial con "Restaurar" y "Descartar" |
| Publicar | Diálogo desde la barra de arriba: lista de cambios, nota y publicación |

## Cómo guarda

- Cada cambio se manda solo 700 ms después de dejar de escribir; los guardados se encolan y cada uno sale con la versión que dejó el anterior (`If-Match`), así nunca se pisan.
- Si otra pestaña guardó antes (409), recarga el borrador y avisa.
- Antes de mandar, el formulario valida con el mismo esquema que la API: los errores se muestran en el campo y no se guarda algo inválido.
- Borrar una sección espera 6 segundos con "Deshacer" antes de borrarla de verdad.

## Producción

Proyecto de Vercel aparte con Root Directory `luna-panel`, dominio `admin.lunakuyen.art` y variables `VITE_API_URL=https://api.lunakuyen.art`, `VITE_SITE_URL=https://www.lunakuyen.art`. `vercel.json` ya resuelve las rutas de la SPA y marca el panel como no indexable.

En la API: `PANEL_ORIGIN=https://admin.lunakuyen.art` y `COOKIE_DOMAIN=.lunakuyen.art`.

## Fase 2

Galería (subir y ordenar fotos), cambiar la foto de la bio y bandeja de mensajes.
