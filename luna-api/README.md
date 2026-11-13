# luna-api

API del sitio de Luna Kuyen: NestJS 11 + Mongoose + MongoDB. Los esquemas del contenido viven en `@luna/shared` (Zod) y se usan acá, en el panel y en el portafolio.

## Desarrollo

Desde la raíz `luna/`:

```bash
pnpm install
cp luna-api/.env.example luna-api/.env   # MONGO_URI = el de tu Mongo (Compass) y un PREVIEW_SECRET
pnpm build:shared
pnpm --filter luna-api user:add tu@mail.com "Emir" admin
pnpm --filter luna-api user:add lunakuyenjofre@gmail.com "Luna Kuyen" owner
pnpm --filter luna-api seed              # carga y publica el contenido actual del portafolio
pnpm dev:api                             # http://localhost:3000
```

- `GET /health`: estado de la API y ping a Mongo.
- `GET /docs`: Swagger (fuera de producción).
- `pnpm test:api`: tests unitarios + e2e (levanta un Mongo en memoria, no toca el tuyo).

Sin `RESEND_API_KEY`, el link mágico aparece en la consola de la API.

## Endpoints

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/public/site` | Versión publicada: ajustes, secciones visibles y `media` resueltas |
| GET | `/public/preview/:token` | Borrador para el iframe de vista previa (token de 30 min) |
| POST | `/auth/magic-link` | `{ email }` → 204 siempre; manda el link si el email está cargado |
| POST | `/auth/verify` | `{ token }` → deja la cookie `luna_session` |
| POST | `/auth/logout` | Cierra la sesión |
| GET | `/auth/me` | Quién está logueado |
| GET | `/admin/site` | Borrador, `version` y `changes` (lo que cambia si se publica) |
| PATCH | `/admin/settings` | Ajustes parciales |
| POST | `/admin/sections` | `{ type, after? }` crea una sección con contenido de ejemplo |
| PATCH | `/admin/sections/:id` | navLabel, anchor, showInNav, visible, variant o props |
| POST | `/admin/sections/:id/duplicate` | Duplica |
| DELETE | `/admin/sections/:id` | Borra del borrador |
| PUT | `/admin/sections/order` | `{ ids }` con todas las secciones |
| POST | `/admin/publish` | `{ note? }` publica y revalida el portafolio |
| POST | `/admin/discard` | Borrador = lo publicado |
| GET | `/admin/revisions` | Historial (la que está en línea viene con `live: true`) |
| POST | `/admin/revisions/:id/restore` | Carga esa versión en el borrador, sin publicarla |
| POST | `/admin/preview-token` | Token para la vista previa |

Reglas para el panel:

- Todo lo que no sea GET en `/auth` y `/admin` tiene que mandar `Origin` = `PANEL_ORIGIN` (fetch lo hace solo) y `credentials: 'include'`.
- Las escrituras del borrador mandan `If-Match: <version>`. Sin él: 428. Si otra pestaña guardó antes: 409 con `currentVersion`.
- Cada escritura responde el estado nuevo completo (`draft`, `version`, `changes`): no hace falta volver a pedir `/admin/site`.
- Contenido inválido: 400 con `errors: [{ path, message }]`.

## Producción (VPS, opcional con Docker)

```bash
docker compose -f luna-api/docker-compose.yml --profile prod up -d --build
```

Mongo y la API escuchan solo en `127.0.0.1`; publicá `api.lunakuyen.art` con el reverse proxy que ya uses en el VPS. Backup diario sugerido:

```bash
docker compose -f luna-api/docker-compose.yml exec -T mongo \
  mongodump --archive --gzip -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  > backups/luna-$(date +%F).gz
```

## Estructura

```
src/
  config/env.ts           variables validadas con Zod (corta el arranque si falta algo)
  database/               conexión + 8 modelos con sus índices
  auth/                   link mágico, sesiones, SessionGuard, PanelOriginGuard, mail (Resend)
  site/                   borrador, secciones, publicar, historial, preview, /public
  scripts/                seed (contenido actual del portafolio) y user:add
  health/                 GET /health (terminus)
test/site.e2e-spec.ts     login → editar → publicar → historial → restaurar, contra Mongo real
```

Colecciones e índices:

| Colección | Índices |
| --- | --- |
| users | email único |
| site | documento único `_id: "main"`; `version` para guardar sin pisarse |
| revisions | createdAt desc |
| media | { collectionId, sort }; driveFileId único (si existe) |
| collections | { parentId, sort } |
| messages | createdAt desc |
| loginTokens, sessions | tokenHash único; TTL en expiresAt |

## Próximo

- Portafolio: leer `/public/site`, registro de secciones, ISR con `bypassToken` y ruta `/preview/[token]`.
- Panel: login, Mi página, editores y Publicar.
- Fase 2: medios (R2 + Drive) y bandeja de mensajes.
