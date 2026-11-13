# luna-api

API del sitio de Luna Kuyen: NestJS 11 + Mongoose + MongoDB. Los esquemas del contenido viven en `@luna/shared` (Zod) y se usan acá, en el panel y en el portafolio.

## Desarrollo

Desde la raíz `luna/`:

```bash
pnpm install
cp luna-api/.env.example luna-api/.env   # MONGO_URI = el de tu Mongo (Compass)
pnpm dev:api                             # http://localhost:3000
```

- `GET /health`: estado de la API y ping a Mongo.
- `GET /docs`: Swagger (fuera de producción).
- `pnpm test:api`: tests de esquemas y config.

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
    schemas/              users, site, revisions, media, collections, messages, loginTokens, sessions
  health/                 GET /health (terminus)
  app.module.ts           ZodValidationPipe global (nestjs-zod)
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

## Próximo: fase 1

AuthModule (link mágico), SiteModule (borrador, secciones, publicar, historial, preview), seed con el contenido actual del portafolio.
