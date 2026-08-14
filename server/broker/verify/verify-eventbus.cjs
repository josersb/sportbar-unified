"use strict";

/**
 * Verify 1.5 — eventBus hub SSE:
 *   - snapshot completo en cada connect
 *   - eventos incrementales {domain, payload, version, lastUpdated}
 *   - publishSync {status, lastSync}
 *   - heartbeat configurable
 *   - máx 10 conexiones (la 11 se rechaza 503)
 *   - close de conexión decrementa clientCount
 */

const { createEventBus, HEARTBEAT_MS, MAX_CONNECTIONS } = require("../eventBus.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

function makeRes() {
  const chunks = [];
  return {
    writeHead: (status, headers) => chunks.push({ type: "head", status, headers }),
    write: (s) => chunks.push({ type: "write", text: s }),
    status: (code) => ({ json: (body) => chunks.push({ type: "json", code, body }) }),
    get writableEnded() { return false; },
    get destroyed() { return false; },
    chunks,
  };
}

(async () => {
  const snapshot = { schemaVersion: 3, domains: {}, sync: { status: "stale", lastSync: null } };
  const bus = createEventBus({ getSnapshot: () => snapshot, log: { info: () => {}, warn: () => {} }, heartbeatMs: HEARTBEAT_MS });

  // Conexiones 1 y 2
  const res1 = makeRes();
  bus.handleConnection({ on: () => {} }, res1);
  const res2 = makeRes();
  bus.handleConnection({ on: () => {} }, res2);
  check("2 conexiones aceptadas", bus.clientCount === 2);
  check("snapshot en cada connect", res1.chunks.some((c) => c.text && c.text.includes("event: snapshot")) && res2.chunks.some((c) => c.text && c.text.includes("event: snapshot")));
  check("retry: 3000 presente", res1.chunks.some((c) => c.text && c.text.includes("retry: 3000")));

  // Incremental llega a ambos
  bus.publish("tvs", { TV01: "DTV3" }, 2, "2026-08-14T00:00:00Z");
  const state1 = res1.chunks.filter((c) => c.text && c.text.includes("event: state")).length;
  const state2 = res2.chunks.filter((c) => c.text && c.text.includes("event: state")).length;
  check("incremental llega a ambos", state1 === 1 && state2 === 1);
  const data1 = res1.chunks.find((c) => c.text && c.text.includes("TV01"));
  check("incremental incluye domain/payload/version", data1 && data1.text.includes('"domain":"tvs"') && data1.text.includes('"version":2'));

  // publishSync
  bus.publishSync("synced", "2026-08-14T00:00:00Z");
  check("sync emitido", res1.chunks.some((c) => c.text && c.text.includes("event: sync")));

  // Heartbeat: 25s default; verificado con 50ms para no esperar 25s
  check("HEARTBEAT_MS default 25000", HEARTBEAT_MS === 25000);
  const busFast = createEventBus({ getSnapshot: () => snapshot, log: { info: () => {}, warn: () => {} }, heartbeatMs: 50 });
  const resF = makeRes();
  busFast.handleConnection({ on: () => {} }, resF);
  await new Promise((r) => setTimeout(r, 120));
  check("heartbeat 50ms emite 2+ latidos", resF.chunks.filter((c) => c.text && c.text.includes(": heartbeat")).length >= 2);

  // Máx 10 conexiones
  check("MAX_CONNECTIONS default 10", MAX_CONNECTIONS === 10);
  const bus10 = createEventBus({ getSnapshot: () => snapshot, log: { info: () => {}, warn: () => {} } });
  for (let i = 0; i < 10; i++) bus10.handleConnection({ on: () => {} }, makeRes());
  const res11 = makeRes();
  bus10.handleConnection({ on: () => {} }, res11);
  const rej = res11.chunks.find((c) => c.type === "json");
  check("conexión 11 rechazada 503", rej && rej.code === 503);
  check("clientCount tope en 10", bus10.clientCount === 10);

  // Close decrementa
  let closeHandler;
  const resC = makeRes();
  bus.handleConnection({ on: (ev, h) => { if (ev === "close") closeHandler = h; } }, resC);
  const before = bus.clientCount;
  closeHandler();
  check("close decrementa clientes", before === 3 && bus.clientCount === 2);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ EVENTBUS OK" : `✗ ${failed} chequeos fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error("FALLO:", e); process.exit(1); });
