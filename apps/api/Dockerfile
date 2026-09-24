# syntax=docker/dockerfile:1.7
# Image de l'API. Contexte de build : racine du dépôt (lockfile pnpm unique).
#   docker build -f apps/api/Dockerfile -t sgee-api .

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
# OpenSSL : détection de plateforme et moteur de migration Prisma.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    # `prisma.config.ts` lit DATABASE_URL dès le chargement ; valeur factice pour `prisma generate`.
    DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY apps/api apps/api
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter api...
RUN pnpm --filter api run build
# Dépendances de production seules (le CLI `prisma` en fait partie pour `migrate deploy`).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter api deploy --prod --legacy /out \
  && cp -r apps/api/dist /out/dist

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads/student-documents
WORKDIR /app
COPY --from=build --chown=node:node /out ./
RUN mkdir -p /app/uploads && chown node:node /app/uploads
# Utilisateur non privilégié fourni par l'image officielle.
USER node
VOLUME ["/app/uploads"]
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]
