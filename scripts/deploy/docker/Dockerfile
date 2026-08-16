# ── Stage 1: Build (instalar dependencias) ──
FROM node:22-alpine AS builder

WORKDIR /build

# Copiar solo package.json para cache de capas
COPY server/package.json ./

# Instalar dependencias de producción SIN scripts
# ignore-scripts=true previene supply chain attacks
RUN npm install --omit=dev --ignore-scripts

# ── Stage 2: Runtime (imagen final mínima) ──
FROM node:22-alpine

# Usuario no-root (Capa 2: proceso aislado)
RUN addgroup -S sportbar && adduser -S sportbar -G sportbar

WORKDIR /app

# Copiar server.js a server/ (server.js espera ../dist y state.json en su dir)
COPY --from=builder --chown=sportbar:sportbar /build/node_modules ./node_modules
RUN mkdir -p /app/server

COPY --chown=sportbar:sportbar server/server.js ./server/server.js
COPY --chown=sportbar:sportbar dist/ ./dist/
COPY --chown=sportbar:sportbar scripts/deploy/docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# state.json y logs persisten en volume /app/data/
RUN mkdir -p /app/data/logs && chown -R sportbar:sportbar /app/data

# Simlink: server.js escribe state.json en su dir → apunta al volume
RUN ln -sf /app/data/state.json /app/server/state.json

# Variables de entorno (sobrescribibles en docker-compose)
ENV PORT=3051
ENV NODE_ENV=production
ENV ARRANGER_HOST=192.168.2.254
ENV ARRANGER_PORT=80

# Cambiar a usuario no-root
USER sportbar

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3051/api/state',r=>process.exit(r.statusCode===200?0:1))"

# Exponer puerto (informativo, docker-compose lo mapea)
EXPOSE 3051

# Entrypoint: aplica flags de runtime + lanza Express
ENTRYPOINT ["./entrypoint.sh"]
