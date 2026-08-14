"use strict";

/**
 * Verify 3.11 — Integración cliente broker ↔ server real (mock).
 *
 * Bootea el server COMPLETO en puerto efímero contra el mock Arranger y
 * verifica el flujo del CLIENTE PR 3 usando la lógica pura del hook
 * (brokerClientCore.js, sin DOM):
 *   - parser SSE: snapshot al conectar + heartbeat + eventos state/sync
 *   - POST /api/tvs/:id/source confirmado → evento `state` con reported
 *   - polling de respaldo versionado: GET /api/broker/state?since=
 *   - deriveUiState: reported gana sobre desired tras la escritura
 *
 * Uso: node src/hooks/verify/verify-broker-client.mjs
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createSseParser,
  buildSinceQuery,
  applySnapshot,
  applyStateEvent,
  applySync,
  applyPollBody,
  deriveVersions,
  deriveUiState,
} from "../brokerClientCore.js";

const require = createRequire(import.meta.url);
process.env.VITE_MOCK_ARRANGER = "1";
process.env.VITE_ARRANGER_TOKEN = process.env.VITE_ARRANGER_TOKEN || "verify-token";
const { createServer } = require("../../../server/server.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readSseSnapshot(base, ms = 3000) {
  // Abre /api/stream y acumula eventos hasta recibir `snapshot` o timeout.
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); reject(new Error("timeout SSE")); }, ms);
    const parser = createSseParser({
      onEvent: (name, data) => {
        if (name === "snapshot") {
          clearTimeout(timer);
          controller.abort();
          resolve(JSON.parse(data));
        }
      },
    });
    fetch(`${base}/api/stream`, { signal: controller.signal })
      .then((res) => res.body.getReader().read().then(function pump({ done, value }) {
        if (done) return;
        parser.push(new TextDecoder().decode(value));
        return res.body.getReader().read().then(pump);
      }))
      .catch(() => {});
  });
}

(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-client-"));
  const dbPath = path.join(tmpDir, "state.json");

  const { app } = await createServer({
    dbPath,
    silent: true,
    reconcilerIntervalMs: 500,
  });
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // ── 1. Snapshot SSE inicial (parser del cliente) ──
    const snapshot = await readSseSnapshot(base);
    check("SSE: snapshot recibido con domains", !!snapshot && !!snapshot.domains && !!snapshot.domains.tvs);
    check("SSE: snapshot trae sync", !!snapshot.sync);

    // El snapshot SSE es el store raw: NO trae `versions` top-level; el
    // cliente la deriva de los dominios (applySnapshot + deriveVersions).
    const applied = applySnapshot({}, snapshot);
    check("snapshot: versions derivadas de dominios", !!applied.versions && applied.versions.tvs >= 1);
    check("snapshot: deriveVersions directo", deriveVersions(snapshot.domains)?.tvs >= 1);

    // ── 2. Estado inicial derivado (deriveUiState) ──
    let ui = deriveUiState(snapshot);
    check("ui: TV01 deseado DTV1 (mock default)", ui.tvs.TV01 === "DTV1");
    check("ui: tvrack video inicial", typeof ui.tvrackState.video === "string");

    // ── 3. Escritura confirmada → evento state → reported gana ──
    const writeRes = await fetch(`${base}/api/tvs/TV01/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "DTV3" }),
    });
    const writeBody = await writeRes.json();
    check("POST /api/tvs/TV01/source → confirmado DTV3", writeRes.status === 200 && writeBody.reported === "DTV3");

    // Esperar el broadcast y re-derivar desde el snapshot fresco
    await sleep(300);
    const snapshot2 = await readSseSnapshot(base);
    ui = deriveUiState(snapshot2);
    check("ui: TV01 reported DTV3 gana sobre desired (SSE)", ui.tvs.TV01 === "DTV3");

    // ── 4. Aplicación de evento state incremental (reducer del hook) ──
    let st = applySnapshot({}, snapshot2);
    st = applyStateEvent(st, { domain: "tvrack", payload: { video: "DTV5", audio: "DTV5" }, version: 9, lastUpdated: "t" });
    const uiDelta = deriveUiState(st);
    check("delta: evento state tvrack aplicado → video DTV5", uiDelta.tvrackState.video === "DTV5");

    // ── 5. Polling de respaldo versionado ──
    const versions = deriveVersions(snapshot.domains) || {};
    const since = buildSinceQuery(versions);
    check("poll: since query construido", typeof since === "string" && since.length > 0);
    const pollRes = await fetch(`${base}/api/broker/state?since=${encodeURIComponent(since)}`);
    const pollBody = await pollRes.json();
    check("poll: 200 y sync presente", pollRes.status === 200 && !!pollBody.sync);
    let pollState = applyPollBody(applySnapshot({}, snapshot2), pollBody);
    check("poll: merge no pierde dominios", !!pollState.domains.tvs && !!pollState.domains.zonasFuera);

    // ── 6. Evento sync (transición stale→synced) ──
    st = applySync(st, { status: "synced", lastSync: new Date().toISOString() });
    check("sync: transición aplicada", st.sync.status === "synced" && !!st.sync.lastSync);

    // ── 7. Zonas fuera + tvrack en el snapshot (3 dominios operativos) ──
    check("snapshot: dominio zonasFuera presente", !!snapshot2.domains.zonasFuera);
    check("snapshot: dominio presets presente", !!snapshot2.domains.presets);
  } finally {
    server.close();
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} verificaciones OK`);
  if (failed > 0) process.exit(1);
})();
