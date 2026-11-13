# Deploy de Luna

| Pieza | Dónde | Dominio |
| --- | --- | --- |
| MongoDB | Railway (template oficial, red privada) | — |
| luna-api | Railway (Dockerfile del monorepo) | `api.lunakuyen.art` |
| luna-portafolio | Vercel (el proyecto que ya existe) | `www.lunakuyen.art` |
| luna-panel | Vercel (proyecto nuevo) | `admin.lunakuyen.art` |

Todo bajo `lunakuyen.art`: así la cookie de sesión del panel funciona entre `admin.` y `api.`.

## 0. Repo y secretos

1. Subí `luna/` a un repo nuevo de GitHub. Revisá que no se suba ningún `.env` (`git status` no tiene que mostrarlos).
2. Generá dos secretos y guardalos en tu gestor de contraseñas:
   ```bash
   pnpm --filter luna-api secret --print   # → PREVIEW_SECRET
   pnpm --filter luna-api secret --print   # → REVALIDATE_TOKEN
   ```

## 1. Resend

1. En Resend, **Domains → Add domain → `lunakuyen.art`** y cargá en tu DNS los registros que te muestra (SPF, DKIM). Esperá a que diga *Verified*.
2. Creá una API key (`RESEND_API_KEY`). Sin dominio verificado, Resend solo manda al mail dueño de la cuenta.

## 2. Railway: Mongo + API

1. **New project → Deploy MongoDB** (template oficial). Expone `MONGO_URL` para la red privada del proyecto.
2. En el mismo proyecto: **New → GitHub repo → luna**. En el servicio nuevo (renombralo `luna-api`):
   - **Settings → Source → Root directory**: vacío (la raíz del repo; el Dockerfile necesita ver `luna-shared`).
   - **Settings → Deploy → Healthcheck path**: `/health`.
   - **Settings → Source → Watch paths**: `/luna-api/**`, `/luna-shared/**`, `/pnpm-lock.yaml` (para que cambios del panel o el portafolio no redeployen la API).
3. **Variables** del servicio `luna-api`:

   | Variable | Valor |
   | --- | --- |
   | `RAILWAY_DOCKERFILE_PATH` | `luna-api/Dockerfile` |
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | `${{MongoDB.MONGO_URL}}/luna?authSource=admin` |
   | `PANEL_ORIGIN` | `https://admin.lunakuyen.art` |
   | `PUBLIC_SITE_URL` | `https://www.lunakuyen.art` (la URL final, sin redirect) |
   | `COOKIE_DOMAIN` | `.lunakuyen.art` |
   | `PREVIEW_SECRET` | el generado en el paso 0 |
   | `REVALIDATE_TOKEN` | el generado en el paso 0 |
   | `RESEND_API_KEY` | la de Resend |
   | `MAIL_FROM` | `Panel de Luna <panel@lunakuyen.art>` |

   `PORT` lo pone Railway solo. Si el servicio de Mongo tiene otro nombre, cambiá `MongoDB` en la referencia.
4. **Settings → Networking → Custom domain → `api.lunakuyen.art`**. Cargá en tu DNS el CNAME (y el TXT si lo pide) que muestra Railway.
5. Cuando el deploy esté verde, cargá usuarios y el contenido inicial desde adentro del contenedor:
   ```bash
   npm i -g @railway/cli && railway login && railway link   # elegí el proyecto
   railway ssh --service luna-api -- node dist/scripts/add-user.js lunakuyenjofre@gmail.com "Luna Kuyen" owner
   railway ssh --service luna-api -- node dist/scripts/add-user.js <tu-mail> "Emir" admin
   railway ssh --service luna-api -- node dist/scripts/seed.js
   ```
6. Probá: `https://api.lunakuyen.art/health` tiene que responder `"status":"ok"`, y `https://api.lunakuyen.art/public/site` el contenido.

## 3. Vercel: portafolio (proyecto existente)

1. **Settings → Git**: conectalo al repo nuevo.
2. **Settings → Build & Deployment → Root Directory**: `luna-portafolio`, con **Include files outside the root directory** activado. El build command queda el de siempre.
3. **Environment Variables** (Production): sumá `LUNA_API_URL=https://api.lunakuyen.art` y `REVALIDATE_TOKEN=<el mismo de Railway>`. Las de Google y Resend que ya tenías quedan como están.
4. Redeploy. Desde ahora la home se cachea y la API la regenera al publicar.

## 4. Vercel: panel (proyecto nuevo)

1. **Add New → Project →** el mismo repo, **Root Directory**: `luna-panel` (detecta Vite).
2. **Environment Variables**: `VITE_API_URL=https://api.lunakuyen.art`, `VITE_SITE_URL=https://www.lunakuyen.art`.
3. **Domains → `admin.lunakuyen.art`** y cargá el registro que te pide Vercel.
4. `vercel.json` ya resuelve las rutas de la SPA y marca el panel como no indexable.

## 5. Prueba final

- [ ] `admin.lunakuyen.art` → pedir link con el mail de Luna → llega el mail → entra.
- [ ] Editar un texto: la vista previa lo muestra.
- [ ] Publicar: en unos segundos `www.lunakuyen.art` muestra el cambio.
- [ ] Restaurar una versión vieja y descartar: el sitio no cambia hasta publicar.

## Problemas comunes

| Síntoma | Causa probable |
| --- | --- |
| Login entra pero rebota al pedir datos (401) | `COOKIE_DOMAIN` no es `.lunakuyen.art`, o el panel no está en un subdominio de `lunakuyen.art` |
| "Origen no permitido" | `PANEL_ORIGIN` distinto de la URL exacta del panel (https, sin barra final) |
| Publica pero el sitio tarda hasta 1 h | `REVALIDATE_TOKEN` distinto entre Railway y Vercel, o `PUBLIC_SITE_URL` apunta a una URL que redirige |
| La API no arranca: "Variables de entorno inválidas" | Falta alguna de la tabla; el log dice cuál |
| La API no conecta a Mongo | Revisá que `MONGO_URI` termine en `/luna?authSource=admin` |
