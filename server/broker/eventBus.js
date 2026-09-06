"use strict";

/**
 * EventBus — hub SSE broker→clientes.
 *
 * Encapsula un EventEmitter (eventos internos del broker) y un hub de
 * conexiones SSE (GET /api/stream):
 *   - snapshot completo en CADA (re)connect (decisión de diseño: sin replay
 *     por Last-Event-ID; simple y correcto para 2-3 clientes).
 *   - heartbeat 25s (mantiene la conexión viva y da señal al cliente de que
 *     el canal sigue operativo; el cliente usa la ausencia de heartbeat para
 *     degradar a polling de respaldo).
 *   - máximo 10 conexiones simultáneas.
 *   - eventos: `state` {domain, payload, version, lastUpdated} y `sync`
 *     {status, lastSync} — el snapshot inicial viaja como `snapshot`.
 *
 * El bus no conoce el store: recibe `getSnapshot` (función) en la creación.
 */

const { EventEmitter } = require("events");

const HEARTBEAT_MS = 25 * 1000;
const MAX_CONNECTIONS = 10;
const DEFAULT_RETRY_MS = 3000;

function createEventBus({ getSnapshot, log = console, heartbeatMs = HEARTBEAT_MS, maxConnections = MAX_CONNECTIONS } = {}) {
  if (typeof getSnapshot !== "function") {
    throw new Error("[eventBus] getSnapshot (función) es requerido");
  }

  const emitter = new EventEmitter();
  const clients = new Set();

  function sendEvent(res, event, payload) {
    if (res.writableEnded || res.destroyed) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  /**
   * Express handler para GET /api/stream. Configura headers SSE, envía el
   * snapshot inicial y arranca el heartbeat. Devuelve 503 si hay demasiadas
   * conexiones (el cliente degrada a polling de respaldo).
   */
  function handleConnection(req, res) {
    if (clients.size >= maxConnections) {
      log.warn(`[eventBus] Máximo ${maxConnections} conexiones SSE alcanzado, rechazando.`);
      return res.status(503).json({ error: "Too many SSE connections" });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`retry: ${DEFAULT_RETRY_MS}\n\n`);

    // Snapshot completo en cada connect (decision de diseño)
    sendEvent(res, "snapshot", getSnapshot());

    const heartbeat = setInterval(() => {
      if (res.writableEnded || res.destroyed) {
        clearInterval(heartbeat);
        return;
      }
      res.write(`: heartbeat ${Date.now()}\n\n`);
    }, heartbeatMs);

    clients.add(res);
    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
    });
    req.on("error", () => {
      clearInterval(heartbeat);
      clients.delete(res);
    });

    log.info(`[eventBus] SSE conectado (${clients.size}/${maxConnections})`);
  }

  /** Evento incremental por dominio. */
  function publish(domain, payload, version, lastUpdated, writeId) {
    emitter.emit("state", { domain, payload, version, lastUpdated });
    const data = { domain, payload, version, lastUpdated };
    for (const res of clients) sendEvent(res, "state", data);
    if (writeId && typeof console !== "undefined") {
      const payloadKeys = payload && typeof payload === "object" ? Object.keys(payload).length : 0;
      const payloadPreview = payloadKeys > 15 ? `(${payloadKeys} keys)` : JSON.stringify(payload);
      console.log(`[BROADCAST ${writeId}] ${domain} v${version} → ${clients.size} clientes ${payloadPreview}`);
    }
  }

  /** Evento de estado de sincronización global. */
  function publishSync(status, lastSync) {
    emitter.emit("sync", { status, lastSync });
    const data = { status, lastSync };
    for (const res of clients) sendEvent(res, "sync", data);
  }

  return {
    emitter,
    handleConnection,
    publish,
    publishSync,
    get clientCount() { return clients.size; },
    get maxConnections() { return maxConnections; },
    HEARTBEAT_MS: heartbeatMs,
  };
}

module.exports = { createEventBus, HEARTBEAT_MS, MAX_CONNECTIONS };
