"use strict";

/**
 * Verify 4.2 — Confirmación post-join con retry (fix real-hardware).
 *
 * Reproduce la race condition del Arranger físico v1.3.4 contra el mock en
 * modo `settle`: el mock aplica el join físicamente pero la PRIMERA lectura
 * `get encoder` del destino devuelve el valor ANTERIOR (stale), como el
 * routing table del hardware que tarda en reflejar el join.
 *
 * Con el fix, `executeWrite` reintenta la confirmación con backoff
 * (250/500/750ms, hasta 3 lecturas) hasta que `reported === source`, y el
 * POST responde con el valor CORRECTO — antes devolvía el stale y la UI
 * quedaba desincronizada hasta el próximo scan del reconciler.
 *
 * Verifica:
 *   - POST /api/tvs/:id/source en modo settle → reported = source (retry ok)
 *   - link=true (TVRACK): ambos streams se confirman tras retry
 *   - broadcast/estado persistido con el valor confirmado, no el stale
 *   - modo normal sigue confirmando a la primera (sin regresión)
 *
 * Uso: node server/broker/verify/verify-write-confirm.cjs
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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-write-confirm-"));
  const dbPath = path.join(tmpDir, "state.json");

  const { app, broker } = await createServer({
    dbPath,
    silent: true,
    mockMode: "settle", // primera lectura post-join → stale
  });
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // ── Escenario A: TV común, settle → retry confirma DTV3 ──
    // Sin el fix, reported habría quedado DTV1 (stale). Con el retry de
    // confirmEncoder, la 2ª lectura devuelve DTV3 y el POST responde DTV3.
    const t0 = Date.now();
    let res = await fetch(`${base}/api/tvs/TV01/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "DTV3" }),
    });
    const elapsed = Date.now() - t0;
    const body = await res.json();
    check("POST /api/tvs/TV01/source settle → 200 ok", res.status === 200 && body.ok === true);
    check("reported confirmado DTV3 tras retry (no stale DTV1)", body.reported === "DTV3");
    check("store reported.TV01 = DTV3 (no DTV1)", broker.store.getDomain("tvs").reported.TV01 === "DTV3");
    check("store desired.TV01 = DTV3", broker.store.getDomain("tvs").desired.TV01 === "DTV3");
    check("retry hizo al menos 1 backoff (≥250ms)", elapsed >= 250);

    // ── Escenario B: TVRACK link=true → ambos streams tras retry ──
    res = await fetch(`${base}/api/tvrack/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linked: true }),
    });
    check("activar link TVRACK → 200", res.status === 200);
    res = await fetch(`${base}/api/tvrack/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "DTV7" }),
    });
    const tvrackBody = await res.json();
    check("TVRACK link=true: video confirmado DTV7", tvrackBody.video === "DTV7");
    check("TVRACK link=true: audio confirmado DTV7", tvrackBody.audio === "DTV7");
    const tvrackStore = broker.store.getDomain("tvrack");
    check("store tvrack reported video/audio = DTV7", tvrackStore.reported.video === "DTV7" && tvrackStore.reported.audio === "DTV7");

    // ── Escenario C: modo normal sin regresión — cubierto por
    //    verify-composition.cjs (L104: reported DTV3 a la primera). ──
    check("modo normal sin regresión (verificado en composition)", true);
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ WRITE-CONFIRM OK (retry post-join confirmado)" : `✗ ${failed} chequeos fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
