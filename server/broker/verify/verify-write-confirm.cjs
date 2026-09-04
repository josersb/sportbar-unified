"use strict";

/**
 * Verify 4.2 — Confirmación post-join con retry (fix real-hardware).
 *
 * Reproduce la race condition del Arranger físico v1.3.4 contra el mock en
 * modo `settle`: el mock aplica el join físicamente pero la PRIMERA lectura
 * `get encoder` del destino devuelve el valor ANTERIOR (stale), como el
 * routing table del hardware que tarda en reflejar el join.
 *
 * Valida DOS modos + hotfix 4:
 *   A. Síncrono (`BROKER_BACKGROUND_CONFIRM=0`): el retry de confirmEncoder
 *      (250/500/750ms) corre DENTRO del response. POST responde con
 *      `reported = source` (no stale) tras el retry.
 *   B. Background (`BROKER_BACKGROUND_CONFIRM=1`, default): el POST responde
 *      INMEDIATO con `accepted: true, reported: null`. La convergencia
 *      asienta vía SSE/poll unos ms después: el cliente con optimistic
 *      overlay ya tenía el cambio visualmente, el reported llega por SSE
 *      (verificamos con poll versionado al broker state).
 *   C. One-join-lag (hotfix 4, mock `oneJoinLag`): el get encoder devuelve el
 *      valor del join ANTERIOR en TODAS las lecturas durante 3s (evidence
 *      w-001..w-008). Valida que (a) reported NO se envenena con el stale,
 *      (b) el re-read postergado (3s/9s) converge cuando el mock asienta, y
 *      (c) la respuesta marca `confirmed: false`.
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

/**
 * Espera a que el broker converja: poll versionado del state hasta que el
 * domain contenga el valor esperado o expire el timeout.
 */
async function waitForConvergence(base, domain, predicate, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${base}/api/broker/state`);
    const body = await res.json();
    const d = body.domains && body.domains[domain];
    if (d && predicate(d)) return { ok: true, body, elapsed: Date.now() - start };
    await sleep(50);
  }
  return { ok: false, elapsed: Date.now() - start };
}

async function runScenario({ mode, label, mockMode = "settle" }) {
  console.log(`\n── Escenario ${label} (BROKER_BACKGROUND_CONFIRM=${mode === "background" ? "1" : "0"}, mock=${mockMode}) ──`);
  process.env.BROKER_BACKGROUND_CONFIRM = mode === "background" ? "1" : "0";
  // Forzar re-require para que el flag se relea (jest-style isolation).
  delete require.cache[require.resolve("../../server.js")];
  delete require.cache[require.resolve("../../broker/store.js")];
  delete require.cache[require.resolve("../../broker/arrangerClient.js")];
  delete require.cache[require.resolve("../../broker/reconciler.js")];
  delete require.cache[require.resolve("../../broker/eventBus.js")];
  delete require.cache[require.resolve("../../broker/writeQueue.js")];
  delete require.cache[require.resolve("../../broker/mockArranger.js")];
  const { createServer: createServerFresh } = require("../../server.js");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `sbr-write-confirm-${mode}-`));
  const dbPath = path.join(tmpDir, "state.json");

  const { app, broker } = await createServerFresh({
    dbPath,
    silent: true,
    mockMode, // settle: primera lectura stale | oneJoinLag: stale hasta +3s del join
  });
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    if (mockMode === "oneJoinLag") {
      // ── Escenario C (hotfix 4): one-join-lag del firmware v1.3.4 ──
      // El mock devuelve el valor del join ANTERIOR en TODAS las lecturas
      // durante 3s (los 3 retries de confirmEncoder leen stale SIEMPRE,
      // como contra el hardware físico, evidence w-001..w-008). El
      // fresh-start del store hidrata reported desde el mock (todo DTV1),
      // así que primero se CONFIRMA un write baseline para tener un
      // reported distinguible del stale.
      const postTv = async (source) =>
        fetch(`${base}/api/tvs/TV05/source`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source }),
        });

      // Espera contra el store directo (sin HTTP → sin rate-limiter).
      const waitReported = async (expected, timeoutMs) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          if (broker.store.getDomain("tvs").reported.TV05 === expected) return true;
          await sleep(100);
        }
        return false;
      };

      // W1 (baseline): POST TV05 → DTV2. Los retries leen stale DTV1 ×3
      // (unconfirmed, response confirmed:false) y el RE-READ POSTERGADO
      // converge cuando el mock asienta a los 3s del join.
      const res1 = await postTv("DTV2");
      const body1 = await res1.json();
      check(`[lag] W1 POST TV05 → 200 ok`, res1.status === 200 && body1.ok === true);
      check(`[lag] (c) respuesta marca confirmed: false, reported: null`, body1.accepted === true && body1.confirmed === false && body1.reported === null);
      check(`[lag] (b-W1) re-read postergado converge: reported.TV05 = DTV2`, await waitReported("DTV2", 8000));

      // W2 + W3: dos writes rápidos al MISMO destino — el patrón de veneno
      // del hardware. El read stale del W3 devuelve DTV3, el desired del W2
      // NUNCA confirmado: si se guardara, reported quedaría un join atrás.
      const res2 = await postTv("DTV3");
      const body2 = await res2.json();
      check(`[lag] W2 POST TV05 → 200 ok (confirmed: false)`, res2.status === 200 && body2.ok === true && body2.confirmed === false);
      const res3 = await postTv("DTV4");
      const body3 = await res3.json();
      check(`[lag] W3 POST TV05 → 200 ok (confirmed: false)`, res3.status === 200 && body3.ok === true && body3.confirmed === false);

      // (a) reported NO envenenado: tras agotar los retries del W2 y del W3
      // (~3s), TV05 conserva el último valor CONFIRMADO (DTV2 del W1) — ni
      // el stale DTV2 del W2 ni el stale DTV3 del W3 (el desired del W2 sin
      // confirmar) pisaron reported.
      await sleep(3500);
      const reportedMid = broker.store.getDomain("tvs").reported.TV05;
      check(
        `[lag] (a) reported NO envenenado tras retries (TV05=${reportedMid}, conserva confirmado DTV2 ≠ stale DTV3)`,
        reportedMid === "DTV2",
      );

      // (b) el re-read del W3 (que reemplazó al pendiente del W2,
      // single-flight) converge cuando el mock asienta.
      check(`[lag] (b) re-read postergado converge: reported.TV05 = DTV4`, await waitReported("DTV4", 8000));
      check(
        `[lag] desired TV05 = DTV4 (intacto durante todo el flujo)`,
        broker.store.getDomain("tvs").desired.TV05 === "DTV4",
      );
      return;
    }
    if (mode === "sync") {
      // ── Escenario A: TV común, settle → retry confirma DTV3 ──
      const t0 = Date.now();
      let res = await fetch(`${base}/api/tvs/TV01/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "DTV3" }),
      });
      const elapsed = Date.now() - t0;
      const body = await res.json();
      check(`[sync] POST /api/tvs/TV01/source settle → 200 ok`, res.status === 200 && body.ok === true);
      check(`[sync] reported confirmado DTV3 tras retry (no stale DTV1)`, body.reported === "DTV3");
      check(`[sync] store reported.TV01 = DTV3 (no DTV1)`, broker.store.getDomain("tvs").reported.TV01 === "DTV3");
      check(`[sync] store desired.TV01 = DTV3`, broker.store.getDomain("tvs").desired.TV01 === "DTV3");
      check(`[sync] retry hizo al menos 1 backoff (≥250ms)`, elapsed >= 250);

      // ── Escenario B: TVRACK link=true → ambos streams tras retry ──
      res = await fetch(`${base}/api/tvrack/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linked: true }),
      });
      check(`[sync] activar link TVRACK → 200`, res.status === 200);
      res = await fetch(`${base}/api/tvrack/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "DTV7" }),
      });
      const tvrackBody = await res.json();
      check(`[sync] TVRACK link=true: video confirmado DTV7`, tvrackBody.video === "DTV7");
      check(`[sync] TVRACK link=true: audio confirmado DTV7`, tvrackBody.audio === "DTV7");
      const tvrackStore = broker.store.getDomain("tvrack");
      check(
        `[sync] store tvrack reported video/audio = DTV7`,
        tvrackStore.reported.video === "DTV7" && tvrackStore.reported.audio === "DTV7"
      );
    } else {
      // ── Escenario A: TV común, background → POST inmediato, luego settle ──
      const t0 = Date.now();
      let res = await fetch(`${base}/api/tvs/TV01/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "DTV3" }),
      });
      const elapsed = Date.now() - t0;
      const body = await res.json();
      check(`[bg] POST /api/tvs/TV01/source settle → 200 ok`, res.status === 200 && body.ok === true);
      check(`[bg] POST retorna inmediato (accepted: true, confirmed: false)`, body.accepted === true && body.confirmed === false);
      check(`[bg] POST response reported=null (asentará en background)`, body.reported === null);
      check(`[bg] POST retorna < 100ms (no espera settling)`, elapsed < 100);
      check(`[bg] store desired.TV01 = DTV3 inmediato`, broker.store.getDomain("tvs").desired.TV01 === "DTV3");

      // Esperar convergencia: el reported se asienta vía retry de confirmEncoder
      // en background; el broadcast lo publica; verificamos por polling.
      const conv = await waitForConvergence(
        base,
        "tvs",
        (d) => d.reported && d.reported.TV01 === "DTV3",
        5000,
      );
      check(`[bg] convergence: store reported.TV01 = DTV3 (no stale DTV1)`, conv.ok);
      check(`[bg] convergence < 5s (retry 250/500/750ms suficiente)`, conv.ok && conv.elapsed < 5000);

      // ── Escenario B: TVRACK link=true → ambos streams convergen en background ──
      res = await fetch(`${base}/api/tvrack/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linked: true }),
      });
      check(`[bg] activar link TVRACK → 200`, res.status === 200);
      const t0tvr = Date.now();
      res = await fetch(`${base}/api/tvrack/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "DTV7" }),
      });
      const elapsedTvr = Date.now() - t0tvr;
      const tvrackBody = await res.json();
      check(`[bg] TVRACK POST retorna inmediato (accepted: true)`, tvrackBody.accepted === true && tvrackBody.confirmed === false);
      check(`[bg] TVRACK POST retorna < 100ms (no espera settling)`, elapsedTvr < 100);
      const convTvr = await waitForConvergence(
        base,
        "tvrack",
        (d) => d.reported && d.reported.video === "DTV7" && d.reported.audio === "DTV7",
        5000,
      );
      check(`[bg] TVRACK convergence: reported video+audio = DTV7`, convTvr.ok);
    }
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

(async () => {
  await runScenario({ mode: "sync", label: "A (síncrono, regresión)" });
  await runScenario({ mode: "background", label: "B (background, hotfix C)" });
  await runScenario({ mode: "background", label: "C (one-join-lag, hotfix 4)", mockMode: "oneJoinLag" });
  // Reset del flag y módulo
  process.env.BROKER_BACKGROUND_CONFIRM = "1";

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ WRITE-CONFIRM OK (síncrono + background + one-join-lag verificados)" : `✗ ${failed} chequeos fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
