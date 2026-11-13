# luna-portafolio

Sitio público de Luna Kuyen (lunakuyen.art). Astro 5 + adapter de Vercel. El contenido sale de `luna-api` (`/public/site`) y se dibuja con un registro de secciones; lo que Luna publica desde el panel aparece acá sin tocar código.

## Desarrollo

Desde la raíz `luna/`, con la API corriendo (`pnpm dev:api`):

```bash
cp luna-portafolio/.env.example luna-portafolio/.env   # LUNA_API_URL=http://localhost:3000
pnpm --filter @luna/shared build
pnpm --filter luna-portafolio dev                     # http://localhost:4321
```

Si la API no responde, el sitio se arma con `src/data/site.fallback.json` (el contenido actual) y avisa en la consola.

## Cómo está armado

```
src/
  lib/site.ts               lee /public/site o /public/preview/:token, con respaldo
  lib/rich-text.ts          texto con formato (JSON) → HTML con lista blanca
  components/SitePage.astro layout, SEO, menú, secciones y footer
  components/SectionRenderer.astro   registro tipo → componente
  pages/index.astro         sitio publicado (cacheado con ISR)
  pages/preview/[token].astro        borrador para el iframe del panel (sin caché, noindex)
  data/site.fallback.json   respaldo si la API está caída
```

Sumar un tipo de sección: esquema en `luna-shared`, componente en `src/components` y una línea en `SectionRenderer.astro`.

## Publicar sin redeploy (ISR)

Con `REVALIDATE_TOKEN` definido, Vercel cachea la home y la regenera cuando la API le pega con el header `x-prerender-revalidate` (al tocar "Publicar" en el panel). Como red de seguridad, la caché vence sola a la hora.

En Vercel:

1. Root Directory: `luna-portafolio` (con "Include files outside the root directory" activado, para que instale el workspace). El build command queda el de siempre: el portafolio solo usa los tipos de `@luna/shared`, no hace falta compilarlo antes.
2. Variables: `LUNA_API_URL`, `REVALIDATE_TOKEN` (el mismo de `luna-api/.env`) y las de Google y Resend que ya tenías.

## Todavía en fase 1

- La galería sigue leyendo Drive desde `src/pages/api/drive/*`; en la fase 2 pasa a la API con títulos y orden editables.
- El formulario sigue mandando mail desde `src/pages/api/send-email.ts`; en la fase 2 pasa a `/public/contact` y a la bandeja del panel.
- La foto de la bio usa `/bio.jpg` hasta que exista la biblioteca de fotos.
