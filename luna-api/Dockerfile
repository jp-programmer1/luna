# Se construye desde la raíz del workspace (luna/), para incluir @luna/shared:
#   docker build -f luna-api/Dockerfile -t luna-api .
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY luna-shared/package.json luna-shared/
COPY luna-api/package.json luna-api/
RUN pnpm install --frozen-lockfile --filter luna-api...
COPY luna-shared luna-shared
COPY luna-api luna-api
RUN pnpm --filter @luna/shared build \
 && pnpm --filter luna-api build \
 && pnpm --filter luna-api deploy --prod --legacy /out

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/health > /dev/null || exit 1
CMD ["node", "dist/main.js"]
