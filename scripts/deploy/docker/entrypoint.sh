#!/bin/sh
# ── SportBar v2 (State Broker) — Entrypoint Docker ──
# Delta vs v1.1.0:
#   - Banner actualizado (v2 broker)
#   - --max-old-space-size=384 (broker mantiene snapshots + SSE en RAM;
#     container limit 512M)
#   - Verifica /healthz-able state: dist/ + symlink de state.json

set -e

echo "=================================================="
echo "  🏆 SPORTBAR v2 — State Broker (Docker)"
echo "=================================================="
echo "  📡 Puerto:      ${PORT:-3051}"
echo "  🌐 Arranger:    ${ARRANGER_HOST:-192.168.2.254}:${ARRANGER_PORT:-80}"
echo "  🎭 Mock:        ${VITE_MOCK_ARRANGER:+ACTIVADO (sin hardware)}"
echo "  📂 State:       /app/data/state.json (+ state.backup.json)"
echo "  📋 Logs:        /app/server/logs/ (fileLogger, rollover 900KB)"
echo "  👤 Usuario:     $(whoami)"
echo "=================================================="

# Verificar que dist/ existe
if [ ! -f /app/dist/index.html ]; then
    echo "❌ ERROR: dist/index.html no encontrado."
    echo "   Ejecutar 'pnpm run build' en la máquina de desarrollo antes del deploy."
    exit 1
fi

# Verificar symlinks de persistencia (si falta, el container es read_only y fallará)
if [ ! -L /app/server/state.json ]; then
    echo "❌ ERROR: /app/server/state.json no es symlink a /app/data — build del image incompleto."
    exit 1
fi

# Verificar que el Arranger es accesible (opcional, no bloquea el arranque)
if [ -z "$VITE_MOCK_ARRANGER" ]; then
    if command -v curl >/dev/null 2>&1; then
        if curl -s --connect-timeout 2 "http://${ARRANGER_HOST:-192.168.2.254}:${ARRANGER_PORT:-80}" >/dev/null 2>&1; then
            echo "  ✅ Arranger:    accesible"
        else
            echo "  ⚠️  Arranger:    NO accesible (el servidor arranca igual)"
        fi
    fi
fi

echo "=================================================="
echo ""

# ── Node.js runtime flags (Capa 5: hardening) ──
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
FLAGS="--no-warnings --max-http-header-size=16384 --max-old-space-size=384"

# Node 18-20: fetch y websocket son experimentales
if [ "$NODE_MAJOR" -ge 18 ] && [ "$NODE_MAJOR" -le 20 ]; then
    FLAGS="$FLAGS --no-experimental-fetch"
    if [ "$NODE_MAJOR" -ge 19 ]; then
        FLAGS="$FLAGS --no-experimental-websocket"
    fi
fi

echo "Node.js v$NODE_MAJOR → flags: $FLAGS"

# ── Lanzar Express (broker fileLogger persiste a /app/server/logs/) ──
exec node $FLAGS ./server/server.js 2>&1 | tee -a /app/data/logs/sportbar-$(date +%Y-%m-%d).log
