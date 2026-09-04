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
// Hotfix 5: el fileLogger de server.js escribe a server/logs/ — desactivado
// en verify (CI sin escritura a disco del repo).
process.env.BROKER_FILE_LOG = "0";

const { createServer } = require("../../server.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readUntil(reader, marker) {
  let text = "";
  const decoder = new TextDecoder();
  while (!text.includes(marker)) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

async function readUntilStateLink(reader, domain, linked, zoneId = null) {
  let buffer = "";
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) return null;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";
    for (const block of blocks) {
      if (!block.includes("event: state")) continue;
      const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      try {
        const event = JSON.parse(dataLine.slice(6));
        const payload = zoneId ? event.payload?.[zoneId] : event.payload;
        if (event.domain === domain && payload?.link === linked) return event;
      } catch {}
    }
  }
}

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
  let linkSseController;
  let linkSseReader;

  try {
    // ── Broker state inicial (stale, persistido servido) ──
    let res = await fetch(`${base}/api/broker/state`);
    let body = await res.json();
    check("GET /api/broker/state → 200", res.status === 200);
    check("snapshot incluye sync y versions", !!body.sync && !!body.versions && body.versions.tvs >= 1);
    check("desired TV01 default DTV1 (mock)", body.domains.tvs.desired.TV01 === "DTV1");
    const syncStale = body.sync.status === "stale" || body.sync.status === "synced";
    check("sync arranca stale (o ya synced por scan rápido)", syncStale);

    // ── Escritura confirmada vía writeQueue (background confirmation) ──
    // POST retorna INMEDIATO con reported=null; el join + confirmEncoder
    // corren en background. El desired se broadcastea inmediato; el reported
    // converge unos ms después vía SSE/poll.
    res = await fetch(`${base}/api/tvs/TV01/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "DTV3" }),
    });
    body = await res.json();
    check("POST /api/tvs/TV01/source → 200 confirmado (background)", res.status === 200 && body.ok === true && body.accepted === true);
    check("respuesta con reported=null (asentará en background)", body.reported === null);
    check("respuesta con version y sync", typeof body.version === "number" && !!body.sync);
    // Esperar convergencia del reported
    let conv = false;
    for (let i = 0; i < 30 && !conv; i++) {
      const pollRes = await fetch(`${base}/api/broker/state`);
      const pollBody = await pollRes.json();
      if (pollBody.domains.tvs.reported.TV01 === "DTV3") conv = true;
      else await sleep(50);
    }
    check("convergence: reported TV01 = DTV3 (background)", conv);

    // ── Doble POST en serie: última intención gana ──
    res = await fetch(`${base}/api/tvs/TV01/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "DTV4" }),
    });
    body = await res.json();
    check("2º POST TV01 DTV4 → 200 confirmado (background)", res.status === 200 && body.accepted === true && body.reported === null);
    conv = false;
    for (let i = 0; i < 30 && !conv; i++) {
      const pollRes = await fetch(`${base}/api/broker/state`);
      const pollBody = await pollRes.json();
      if (pollBody.domains.tvs.reported.TV01 === "DTV4" && pollBody.domains.tvs.desired.TV01 === "DTV4") conv = true;
      else await sleep(50);
    }
    check("última intención gana: desired y reported TV01 = DTV4", conv);

    // ── app-state (merge parcial app-only) ──
    res = await fetch(`${base}/api/app-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descripcionPreset: "Futbol" }),
    });
    body = await res.json();
    check("POST /api/app-state → ok + merge", res.status === 200 && body.ok && body.appState.descripcionPreset === "Futbol");

    // ── Escrituras write-through vivas: TVRACK (background) ──
    res = await fetch(`${base}/api/tvrack/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV5" }),
    });
    body = await res.json();
    check("POST /api/tvrack/video write-through (background accepted)", res.status === 200 && body.accepted === true);
    conv = false;
    for (let i = 0; i < 30 && !conv; i++) {
      const pollRes = await fetch(`${base}/api/broker/state`);
      const pollBody = await pollRes.json();
      if (pollBody.domains.tvrack.desired.video === "DTV5") conv = true;
      else await sleep(50);
    }
    check("TVRACK desired video = DTV5 (post convergence)", conv);
    const commandCountBeforeAudio = broker.client.getCommandLog().length;
    res = await fetch(`${base}/api/tvrack/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV6" }),
    });
    body = await res.json();
    check("POST /api/tvrack/audio independiente (background accepted)", res.status === 200 && body.accepted === true);
    // Esperar que el join audio se emita (writeQueue FIFO)
    let audioCmdEmitted = false;
    for (let i = 0; i < 30 && !audioCmdEmitted; i++) {
      const log = broker.client.getCommandLog();
      if (log.length === commandCountBeforeAudio + 1 && log.at(-1) === "join audio DTV6 TVRACK") audioCmdEmitted = true;
      else await sleep(50);
    }
    check("TVRACK audio no emite join av con link=false", audioCmdEmitted);

    linkSseController = new AbortController();
    const linkSse = await fetch(`${base}/api/stream`, { signal: linkSseController.signal });
    linkSseReader = linkSse.body.getReader();
    const initialLinkSse = await readUntil(linkSseReader, "event: snapshot");
    check("SSE para toggles → snapshot inicial", linkSse.status === 200 && initialLinkSse.includes("event: snapshot"));

    res = await fetch(`${base}/api/tvrack/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linked: true }),
    });
    const tvrackLinkEvent = await readUntilStateLink(linkSseReader, "tvrack", true);
    check("activar link TVRACK no re-joinea y publica link=true por SSE", res.status === 200 && !!tvrackLinkEvent);
    res = await fetch(`${base}/api/tvrack/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV7" }),
    });
    body = await res.json();
    check("TVRACK link=true POST background accepted", res.status === 200 && body.accepted === true);
    // Esperar que se emita el join av (link=true) y reported converja
    let linkJoinCmd = false;
    for (let i = 0; i < 30 && !linkJoinCmd; i++) {
      if (broker.client.getCommandLog().at(-1) === "join av DTV7 TVRACK") linkJoinCmd = true;
      else await sleep(50);
    }
    let tvrackLinkConv = false;
    for (let i = 0; i < 30 && !tvrackLinkConv; i++) {
      const pollRes = await fetch(`${base}/api/broker/state`);
      const pollBody = await pollRes.json();
      if (pollBody.domains.tvrack.desired.video === "DTV7" && pollBody.domains.tvrack.desired.audio === "DTV7") tvrackLinkConv = true;
      else await sleep(50);
    }
    check("TVRACK link=true: desired video+audio = DTV7 tras convergence", linkJoinCmd && tvrackLinkConv);
    res = await fetch(`${base}/api/tvrack/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linked: false }),
    });
    const tvrackUnlinkEvent = await readUntilStateLink(linkSseReader, "tvrack", false);
    check("desactivar link TVRACK publica link=false por SSE", res.status === 200 && !!tvrackUnlinkEvent);
    const commandCountAfterUnlink = broker.client.getCommandLog().length;
    res = await fetch(`${base}/api/tvrack/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV8" }),
    });
    body = await res.json();
    check("TVRACK link=false POST background accepted", res.status === 200 && body.accepted === true);
    // Esperar que el join video se emita (NO join av)
    let unlinkJoinCmd = false;
    for (let i = 0; i < 30 && !unlinkJoinCmd; i++) {
      const log = broker.client.getCommandLog();
      if (log.length === commandCountAfterUnlink + 1 && log.at(-1) === "join video DTV8 TVRACK") unlinkJoinCmd = true;
      else await sleep(50);
    }
    check("TVRACK link=false vuelve a dispatch solo-video", unlinkJoinCmd);

    // ── Legacy: zonas-fuera (background) ──
    res = await fetch(`${base}/api/zonas-fuera/aVip-Barra-Centro/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV6" }),
    });
    body = await res.json();
    check("POST zonas-fuera video write-through (background accepted)", res.status === 200 && body.accepted === true && body.zoneId === "aVip-Barra-Centro");
    conv = false;
    for (let i = 0; i < 30 && !conv; i++) {
      const pollRes = await fetch(`${base}/api/broker/state`);
      const pollBody = await pollRes.json();
      if (pollBody.domains.zonasFuera.desired["aVip-Barra-Centro"]?.video === "DTV6") conv = true;
      else await sleep(50);
    }
    check("zona desired video = DTV6 (post convergence)", conv);
    res = await fetch(`${base}/api/zonas-fuera/aVip-Barra-Centro/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV7" }),
    });
    body = await res.json();
    check("zona audio independiente POST background accepted", res.status === 200 && body.accepted === true);
    // Esperar convergencia: video=DTV6, audio=DTV7
    conv = false;
    for (let i = 0; i < 30 && !conv; i++) {
      const pollRes = await fetch(`${base}/api/broker/state`);
      const pollBody = await pollRes.json();
      if (pollBody.domains.zonasFuera.desired["aVip-Barra-Centro"]?.video === "DTV6" && pollBody.domains.zonasFuera.desired["aVip-Barra-Centro"]?.audio === "DTV7") conv = true;
      else await sleep(50);
    }
    check("zona audio independiente conserva video", conv);
    res = await fetch(`${base}/api/zonas-fuera/aVip-Barra-Centro/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linked: true }),
    });
    const zonaLinkEvent = await readUntilStateLink(linkSseReader, "zonasFuera", true, "aVip-Barra-Centro");
    check("activar link zona publica link=true por SSE", res.status === 200 && !!zonaLinkEvent?.payload?.["aVip-Barra-Centro"] && zonaLinkEvent.payload["aVip-Barra-Centro"].link === true);
    res = await fetch(`${base}/api/zonas-fuera/aVip-Barra-Centro/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linked: false }),
    });
    const zonaUnlinkEvent = await readUntilStateLink(linkSseReader, "zonasFuera", false, "aVip-Barra-Centro");
    check("desactivar link zona publica link=false por SSE", res.status === 200 && !!zonaUnlinkEvent?.payload?.["aVip-Barra-Centro"] && zonaUnlinkEvent.payload["aVip-Barra-Centro"].link === false);
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
    linkSseController?.abort();
    try { reader1.cancel(); } catch {}
    try { reader2.cancel(); } catch {}
    try { linkSseReader?.cancel(); } catch {}
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
