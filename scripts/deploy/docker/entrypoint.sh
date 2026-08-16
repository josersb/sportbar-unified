#!/bin/sh
# ── SportBar v1.1.0 — Entrypoint Docker ──
# Aplica hardening Capa 5 (runtime flags) y lanza Express

set -e

echo "=================================================="
echo "  🏆 SPORTBAR v1.1.0 — Docker Container"
echo "=================================================="
echo "  📡 Puerto:      ${PORT:-3051}"
echo "  🌐 Arranger:    ${ARRANGER_HOST:-192.168.2.254}:${ARRANGER_PORT:-80}"
echo "  📂 State:       /app/data/state.json"
echo "  📋 Logs:        /app/data/logs/"
echo "  👤 Usuario:     $(whoami)"
echo "=================================================="

# Verificar que dist/ existe
if [ ! -f /app/dist/index.html ]; then
    echo "❌ ERROR: dist/index.html no encontrado."
    echo "   Ejecutar 'pnpm run build' en la máquina de desarrollo antes del deploy."
    exit 1
fi

# Verificar que el Arranger es accesible (opcional, no bloquea el arranque)
if command -v curl >/dev/null 2>&1; then
    if curl -s --connect-timeout 2 "http://${ARRANGER_HOST:-192.168.2.254}:${ARRANGER_PORT:-80}" >/dev/null 2>&1; then
        echo "  ✅ Arranger:    accesible"
    else
        echo "  ⚠️  Arranger:    NO accesible (el servidor arranca igual)"
    fi
fi

echo "=================================================="
echo ""

# ── Node.js runtime flags (Capa 5: hardening) ──
# Detecta versión de Node para flags compatibles
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
FLAGS="--no-warnings --max-http-header-size=16384 --max-old-space-size=256"

# Node 18-20: fetch y websocket son experimentales
if [ "$NODE_MAJOR" -ge 18 ] && [ "$NODE_MAJOR" -le 20 ]; then
    FLAGS="$FLAGS --no-experimental-fetch"
    # websocket solo desde Node 19
    if [ "$NODE_MAJOR" -ge 19 ]; then
        FLAGS="$FLAGS --no-experimental-websocket"
    fi
fi

echo "Node.js v$NODE_MAJOR → flags: $FLAGS"

# ── Lanzar Express ──
exec node $FLAGS ./server/server.js 2>&1 | tee -a /app/data/logs/sportbar-$(date +%Y-%m-%d).log
