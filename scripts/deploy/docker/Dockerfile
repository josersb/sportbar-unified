# ── SportBar v2 (State Broker) — Dockerfile ──
# Delta vs v1.1.0:
#   - Sin stage de builder: node_modules viene pre-instalado (bundling offline,
#     el server no tiene internet; deps son JS puro, sin nativos)
#   - COPY server/broker/ (los 8 módulos + verifies)
#   - Symlink state.backup.json → /app/data (store escribe backup junto al db)
#   - /app/server/logs escribible (fileLogger del broker, rollover 900KB)
#   - HEALTHCHECK sobre /healthz con puerto desde process.env (sin shell)

FROM node:22-alpine

RUN addgroup -S sportbar && adduser -S sportbar -G sportbar

WORKDIR /app

# node_modules pre-instalado (materializado desde dev, sin junctions)
COPY --chown=sportbar:sportbar server/node_modules ./node_modules

RUN mkdir -p /app/server /app/data/logs /app/server/logs \
    && chown -R sportbar:sportbar /app/data /app/server/logs

COPY --chown=sportbar:sportbar server/server.js ./server/server.js
COPY --chown=sportbar:sportbar server/broker ./server/broker
COPY --chown=sportbar:sportbar dist/ ./dist/
COPY --chown=sportbar:sportbar scripts/deploy/docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# state.json Y state.backup.json persisten en el volume /app/data
RUN ln -sf /app/data/state.json /app/server/state.json \
    && ln -sf /app/data/state.backup.json /app/server/state.backup.json

ENV PORT=3051
ENV NODE_ENV=production
ENV ARRANGER_HOST=192.168.2.254
ENV ARRANGER_PORT=80

USER sportbar

# /healthz: liveness probe del broker (sin limiter, sin store)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3051)+'/healthz',r=>process.exit(r.statusCode===200?0:1))"

EXPOSE 3051

ENTRYPOINT ["./entrypoint.sh"]
