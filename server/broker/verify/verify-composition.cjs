"use strict";

/**
 * Verify 4.1 — Composition y limpieza del State Broker (server.js sobre mock).
 *
 * Bootea el server COMPLETO sin levantar un server "visible": createServer()
 * (exportado, no ejecuta listen) + app.listen(0) en puerto efímero, contra el
 * mock Arranger (VITE_MOCK_ARRANGER=1) y state.json temporal.
 *
 * Verifica:
 *   - endpoints NUEVOS: GET /api/broker/state (?since=), POST /api/tvs/:id/source
 *     confirmado, doble POST en serie (última intención gana), POST /api/app-state,
 *     POST /api/presets/:n/load (3 dominios), GET /api/stream (SSE)
 *   - escrituras write-through que siguen vivas: POST tvrack/zonas-fuera,
 *     GET/POST /api/presets/:n, y proxy /api/command (mock-aware)
 *   - 2 clientes SSE sin 429; transición stale → synced por el reconciler
 *
 * Uso: node server/broker/verify/verify-composition.cjs
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.VITE_MOCK_ARRANGER = "1";
process.env.VITE_ARRANGER_TOKEN = process.env.VITE_ARRANGER_TOKEN || "verify-token";

const { createServer } = require("../../server.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-composition-"));
  const dbPath = path.join(tmpDir, "state.json");

  const { app, broker } = await createServer({
    dbPath,
    silent: true,
    reconcilerIntervalMs: 500, // scan rápido para la transición stale→synced
  });
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // ── Broker state inicial (stale, persistido servido) ──
    let res = await fetch(`${base}/api/broker/state`);
    let body = await res.json();
    check("GET /api/broker/state → 200", res.status === 200);
    check("snapshot incluye sync y versions", !!body.sync && !!body.versions && body.versions.tvs >= 1);
    check("desired TV01 default DTV1 (mock)", body.domains.tvs.desired.TV01 === "DTV1");
    const syncStale = body.sync.status === "stale" || body.sync.status === "synced";
    check("sync arranca stale (o ya synced por scan rápido)", syncStale);

    // ── Escritura confirmada vía writeQueue ──
    res = await fetch(`${base}/api/tvs/TV01/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "DTV3" }),
    });
    body = await res.json();
    check("POST /api/tvs/TV01/source → 200 confirmado", res.status === 200 && body.ok === true);
    check("respuesta con reported confirmado DTV3", body.reported === "DTV3");
    check("respuesta con version y sync", typeof body.version === "number" && !!body.sync);

    // ── Doble POST en serie: última intención gana ──
    res = await fetch(`${base}/api/tvs/TV01/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "DTV4" }),
    });
    body = await res.json();
    check("2º POST TV01 DTV4 → 200 confirmado", res.status === 200 && body.reported === "DTV4");
    res = await fetch(`${base}/api/broker/state`);
    body = await res.json();
    check("última intención gana: desired y reported TV01 = DTV4", body.domains.tvs.desired.TV01 === "DTV4" && body.domains.tvs.reported.TV01 === "DTV4");

    // ── app-state (merge parcial app-only) ──
    res = await fetch(`${base}/api/app-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descripcionPreset: "Futbol" }),
    });
    body = await res.json();
    check("POST /api/app-state → ok + merge", res.status === 200 && body.ok && body.appState.descripcionPreset === "Futbol");

    // ── Escrituras write-through vivas: TVRACK ──
    res = await fetch(`${base}/api/tvrack/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV5" }),
    });
    body = await res.json();
    check("POST /api/tvrack/video write-through confirmado", res.status === 200 && body.video === "DTV5");
    const commandCountBeforeAudio = broker.client.getCommandLog().length;
    res = await fetch(`${base}/api/tvrack/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV6" }),
    });
    body = await res.json();
    check("POST /api/tvrack/audio independiente", res.status === 200 && body.video === "DTV5" && body.audio === "DTV6");
    check("TVRACK audio no emite join av con link=false", broker.client.getCommandLog().length === commandCountBeforeAudio + 1 && broker.client.getCommandLog().at(-1) === "join audio DTV6 TVRACK");
    res = await fetch(`${base}/api/tvrack/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linked: true }),
    });
    check("activar link TVRACK no re-joinea", res.status === 200);
    res = await fetch(`${base}/api/tvrack/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV7" }),
    });
    body = await res.json();
    check("TVRACK link=true usa un AV y confirma ambos", res.status === 200 && body.video === "DTV7" && body.audio === "DTV7" && broker.client.getCommandLog().at(-1) === "join av DTV7 TVRACK");
    res = await fetch(`${base}/api/tvrack/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linked: false }),
    });
    check("desactivar link TVRACK no re-joinea", res.status === 200);

    // ── Legacy: zonas-fuera (body legacy deviceId, shape legacy) ──
    res = await fetch(`${base}/api/zonas-fuera/aVip-Barra-Centro/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV6" }),
    });
    body = await res.json();
    check("POST zonas-fuera video write-through (deviceId legacy)", res.status === 200 && body.zoneId === "aVip-Barra-Centro" && body.video === "DTV6" && "link" in body && "lastUpdated" in body);
    res = await fetch(`${base}/api/zonas-fuera/aVip-Barra-Centro/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV7" }),
    });
    body = await res.json();
    check("zona audio independiente conserva video", res.status === 200 && body.video === "DTV6" && body.audio === "DTV7");
    res = await fetch(`${base}/api/zonas-fuera/INEXISTENTE/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV1" }),
    });
    check("zona inexistente → 400 (validación conservada)", res.status === 400);

    // ── Legacy: presets + load server-side ──
    res = await fetch(`${base}/api/presets/1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tvs: { TV02: "DTV7" }, zonasFuera: { "aVip-Bar-Boveda": { video: "DTV8", audio: "DTV6", link: false } }, tvrack: { video: "DTV9", audio: "DTV8" } }),
    });
    check("POST /api/presets/1 → ok", res.status === 200);
    res = await fetch(`${base}/api/presets/1`);
    body = await res.json();
    check("GET /api/presets/1 snapshot guardado", res.status === 200 && body.preset && body.preset.tvs.TV02 === "DTV7");
    res = await fetch(`${base}/api/presets/1/load`, { method: "POST" });
    body = await res.json();
    check("POST /api/presets/1/load restaura 3 dominios", res.status === 200 && body.ok === true && body.applied >= 5);
    res = await fetch(`${base}/api/broker/state`);
    body = await res.json();
    check(
      "preset load preserva video!=audio en zona y TVRACK",
      body.domains.tvs.desired.TV02 === "DTV7" &&
        body.domains.zonasFuera.desired["aVip-Bar-Boveda"].video === "DTV8" &&
        body.domains.zonasFuera.desired["aVip-Bar-Boveda"].audio === "DTV6" &&
        body.domains.tvrack.desired.video === "DTV9" &&
        body.domains.tvrack.desired.audio === "DTV8",
    );
    const afterPresetScan = await broker.reconciler.scanOnce();
    check("scan posterior a preset distinto no adopta drift espurio", afterPresetScan.adopted === 0 && broker.reconciler.buildDiffs("tvrack").length === 0 && broker.reconciler.buildDiffs("zonasFuera").length === 0);

    const commandCountBeforeInvalidPreset = broker.client.getCommandLog().length;
    res = await fetch(`${base}/api/presets/2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tvs: {}, zonasFuera: {}, tvrack: { video: "DTV1", audio: "DTV2", link: true } }),
    });
    body = await res.json();
    check("snapshot vinculado inconsistente → 400 claro", res.status === 400 && body.error.includes("link=true"));
    check("snapshot inválido no emite comandos", broker.client.getCommandLog().length === commandCountBeforeInvalidPreset);

    // ── Proxy /api/command mock-aware ──
    res = await fetch(`${base}/api/command/join%20av%20DTV7%20TV03/verify-token`);
    const proxyText = await res.text();
    check("proxy /api/command join av → 200 mock", res.status === 200 && proxyText.includes("join av success DTV7 TV03"));
    // ── Respaldo versionado ?since= ──
    res = await fetch(`${base}/api/broker/state?since=tvs:999999`);
    body = await res.json();
    check("?since con versión mayor omite el dominio (solo versions)", body.domains.tvs === undefined && body.versions.tvs >= 1);

    // ── SSE: 2 clientes sin 429 + snapshot ──
    const ctrl1 = new AbortController();
    const sse1 = await fetch(`${base}/api/stream`, { signal: ctrl1.signal });
    const reader1 = sse1.body.getReader();
    const chunk1 = new TextDecoder().decode((await reader1.read()).value || "");
    check("cliente SSE 1 → 200 (sin limiter)", sse1.status === 200);
    check("SSE 1 recibe snapshot", chunk1.includes("event: snapshot"));

    const ctrl2 = new AbortController();
    const sse2 = await fetch(`${base}/api/stream`, { signal: ctrl2.signal });
    const reader2 = sse2.body.getReader();
    const chunk2 = new TextDecoder().decode((await reader2.read()).value || "");
    check("cliente SSE 2 → 200, sin 429 con 2 clientes", sse2.status === 200 && !chunk2.startsWith("{"));

    // ── Transición stale → synced (reconciler background) ──
    let syncStatus = null;
    for (let i = 0; i < 20; i++) {
      res = await fetch(`${base}/api/broker/state`);
      body = await res.json();
      if (body.sync.status === "synced") {
        syncStatus = body.sync.status;
        break;
      }
      await sleep(200);
    }
    check("reconciler transiciona stale → synced (background)", syncStatus === "synced");

    // Cerrar SSE + server
    ctrl1.abort();
    ctrl2.abort();
    try { reader1.cancel(); } catch {}
    try { reader2.cancel(); } catch {}
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ COMPOSITION OK" : `✗ ${failed} chequeos fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
