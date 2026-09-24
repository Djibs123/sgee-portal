# syntax=docker/dockerfile:1.7
# Image du front : build Vite puis nginx non privilégié (port 8080).
#   docker build -f apps/web/Dockerfile -t sgee-web .

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY apps/web apps/web
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter web...
# Même origine que l'API derrière nginx : cookies SameSite=strict, pas de CORS.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter web run build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY apps/web/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY apps/web/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
