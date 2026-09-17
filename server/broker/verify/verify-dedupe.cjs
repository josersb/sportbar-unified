"use strict";

/**
 * Verify — WS5-DEDUPE: guard pre-join en executeWrite + escape `force`.
 *
 * Sin hardware: inyecta un cliente fake que CUENTA los joins emitidos al
 * Arranger (joinAv/joinVideo/joinAudio) y simula el settling del firmware
 * (mismo patrón que verify-confirm-settling). El guard del server debe
 * evitar emitir joins redundantes contra el `reported` confirmado SIN
 * tocar `confirmEncoder` ni su ventana (PR #13 sigue verde en run-all).
 *
 * Escenarios:
 *   A. Doble submit idéntico (sync) → 1 sola llamada; 2º POST responde
 *      {ok, noop:true, confirmed:true, reported} SIN join.
 *   B. Escape `force` → re-POST idéntico con force:true SÍ emite el join.
 *   C. Submit con un solo cambio (/api/matrix-groups) → solo los destinos
 *      del subgrupo cambiado reciben join; resubmit idéntica → 0 joins.
 *   D. One-join-lag NO genera no-op falso: `reported` stale (settling >
 *      ventana) → el re-POST idéntico SÍ emite el join (ante duda, no
 *      saltear).
 *   E. Intención repetida en vuelo (bg, isBusy): 2º POST idéntico encolado
 *      detrás del 1º → se descarta sin duplicar el comando (1 join total).
 *   F. TVRACK por sub-stream (link=false, join video): doble POST idéntico
 *      → 1 join; el segundo es no-op.
 *
 * Uso: node server/broker/verify/verify-dedupe.cjs
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.VITE_MOCK_ARRANGER = "1";
process.env.VITE_ARRANGER_TOKEN = process.env.VITE_ARRANGER_TOKEN || "verify-token";
process.env.BROKER_FILE_LOG = "0";

const { createArrangerClient } = require("../arrangerClient.js");
const { createServer } = require("../../server.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Cliente fake con contador de joins + settling por comando. Envuelve al
 * mock real: un join que CAMBIA el valor arma settling (get encoder devuelve
 * el valor anterior hasta `until`); un join no-op NO arma settling.
 */
function createCountingClient({ avSettleMs = 0, streamSettleMs = 0, token }) {
  const base = createArrangerClient({ token, mock: true });
  const counts = { av: 0, video: 0, audio: 0 };
  const pending = new Map(); // `${dest}:${sub}` → { previous, until }

  async function armAndJoin(source, dest, streams, settleMs, kind, joinFn) {
    counts[kind] += 1;
    const previous = {};
    for (const sub of streams) previous[sub] = await base.getEncoder(dest, sub);
    const result = await joinFn(source, dest);
    if (settleMs > 0) {
      const until = Date.now() + settleMs;
      for (const sub of streams) {
        if (previous[sub] !== source) {
          pending.set(`${dest}:${sub}`, { previous: previous[sub], until });
        }
      }
    }
    return result;
  }

  return {
    isMock: true,
    counts,
    joinAv: (source, dest) => armAndJoin(source, dest, ["video", "audio"], avSettleMs, "av", (s, d) => base.joinAv(s, d)),
    joinVideo: (source, dest) => armAndJoin(source, dest, ["video"], streamSettleMs, "video", (s, d) => base.joinVideo(s, d)),
    joinAudio: (source, dest) => armAndJoin(source, dest, ["audio"], streamSettleMs, "audio", (s, d) => base.joinAudio(s, d)),
    async getEncoder(dest, sub = "video") {
      const p = pending.get(`${dest}:${sub}`);
      if (p) {
        if (Date.now() < p.until) return p.previous;
        pending.delete(`${dest}:${sub}`);
      }
      return base.getEncoder(dest, sub);
    },
    sendRaw: () => ({ ok: false, error: "sendRaw no aplica en verify" }),
    getSemaphoreStats: () => base.getSemaphoreStats(),
  };
}

/** Monta el broker con el cliente fake; drena la cola y limpia el tmp al salir. */
async function withServer({ background, avSettleMs = 0, streamSettleMs = 0 }, fn) {
  process.env.BROKER_BACKGROUND_CONFIRM = background ? "1" : "0";
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-dedupe-"));
  const dbPath = path.join(tmpDir, "state.json");
  const client = createCountingClient({ avSettleMs, streamSettleMs, token: "verify-token" });
  // reconcilerIntervalMs enorme: el scan de arranque no se repite durante el verify.
  const { app, broker } = await createServer({ dbPath, silent: true, client, reconcilerIntervalMs: 3_600_000 });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await fn({ base, broker, client });
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close();
    // Drain del writeQueue ANTES del rmSync (patrón existente).
    const drainStart = Date.now();
    while (broker.writeQueue.pendingCount > 0 && Date.now() - drainStart < 30_000) {
      await sleep(100);
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const postJson = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** Espera a que `reported[key]` confirme el valor esperado. */
async function waitReported(broker, key, expected, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (broker.store.getDomain("tvs").reported[key] === expected) return true;
    await sleep(50);
  }
  return false;
}

/** Escenarios A y B: no-op contra reported confirmado + escape force (sync). */
async function scenarioForceAndNoop() {
  console.log("\n── Escenario A/B: doble submit idéntico → 1 join; force reenvía (sync) ──");
  await withServer({ background: false, avSettleMs: 100 }, async ({ base, broker, client }) => {
    // Esperar hidratación del scan de arranque (baseline del mock: DTV1).
    const start = Date.now();
    while (broker.store.getDomain("tvs").reported.TV01 == null && Date.now() - start < 3000) await sleep(50);
    const joinsBefore = client.counts.av;

    // 1er POST: reported (DTV1) ≠ DTV3 → el join SÍ se emite.
    let res = await postJson(`${base}/api/tvs/TV01/source`, { source: "DTV3" });
    let body = await res.json();
    check(`[A] 1er POST → 200 ok, join emitido`, res.status === 200 && body.ok === true && body.noop !== true);
    check(`[A] 1 join emitido (av=${client.counts.av - joinsBefore})`, client.counts.av - joinsBefore === 1);
    check(`[A] reported.TV01 converge a DTV3`, await waitReported(broker, "TV01", "DTV3"));

    // 2º POST idéntico: reported confirmado + nada pendiente → no-op SIN join.
    res = await postJson(`${base}/api/tvs/TV01/source`, { source: "DTV3" });
    body = await res.json();
    check(`[A] 2º POST → 200 {ok, noop:true}`, res.status === 200 && body.ok === true && body.noop === true);
    check(`[A] 2º POST confirmed:true y reported=DTV3 (respuesta idempotente)`, body.confirmed === true && body.reported === "DTV3");
    check(`[A] NO se emitió un 2º join (av=${client.counts.av - joinsBefore})`, client.counts.av - joinsBefore === 1);
    check(`[A] desired.TV01=DTV3 (intención registrada por el guard)`, broker.store.getDomain("tvs").desired.TV01 === "DTV3");

    console.log("── Escenario B: escape force:true reenvía el join ──");
    res = await postJson(`${base}/api/tvs/TV01/source`, { source: "DTV3", force: true });
    body = await res.json();
    check(`[B] force → 200 ok, SIN noop`, res.status === 200 && body.ok === true && body.noop !== true);
    check(`[B] el join SÍ se emitió (av=${client.counts.av - joinsBefore})`, client.counts.av - joinsBefore === 2);
  });
}

/** Escenario C: submit con un solo cambio → solo ese destino (/api/matrix-groups). */
async function scenarioSingleChange() {
  console.log("\n── Escenario C: matrix-groups — un solo cambio → solo ese destino ──");
  await withServer({ background: true }, async ({ base, broker, client }) => {
    const start = Date.now();
    while (broker.store.getDomain("tvs").reported.TV11 == null && Date.now() - start < 3000) await sleep(50);
    const joinsBefore = client.counts.av;

    // Submit 1: TvsBarraNorte (TV11..TV14) → DTV2 (mock default DTV1 → cambia).
    let res = await postJson(`${base}/api/matrix-groups`, { values: { TvsBarraNorte: "DTV2" } });
    let body = await res.json();
    check(`[C] submit TvsBarraNorte=DTV2 → 200 ok`, res.status === 200 && body.ok === true);
    const drain = async () => {
      const t0 = Date.now();
      while (broker.writeQueue.pendingCount > 0 && Date.now() - t0 < 10_000) await sleep(50);
    };
    await drain();
    check(`[C] solo 4 joins (TV11..TV14); ningún otro destino`, client.counts.av - joinsBefore === 4);
    check(`[C] reported.TV11..TV14 = DTV2`, (await waitReported(broker, "TV11", "DTV2")) && (await waitReported(broker, "TV14", "DTV2")));

    // Submit 2 idéntico: todo confirmado → 0 joins (server deduplica el submit completo).
    res = await postJson(`${base}/api/matrix-groups`, { values: { TvsBarraNorte: "DTV2" } });
    body = await res.json();
    check(`[C] resubmit idéntico → 200 ok`, res.status === 200 && body.ok === true);
    await drain();
    check(`[C] resubmit idéntico → 0 joins nuevos (av=${client.counts.av - joinsBefore})`, client.counts.av - joinsBefore === 4);

    // Submit 3: un solo cambio DENTRO del submit → solo los 4 destinos del subgrupo.
    res = await postJson(`${base}/api/matrix-groups`, { values: { TvsBarraNorte: "DTV3", TvsBarraPista: "DTV2" } });
    body = await res.json();
    check(`[C] submit con 2 subgrupos → 200 ok`, res.status === 200 && body.ok === true);
    await drain();
    check(`[C] 4 joins de BarraNorte + 3 de BarraPista = 7 nuevos`, client.counts.av - joinsBefore === 11);
    check(`[C] reported.TV08 (BarraPista) = DTV2`, await waitReported(broker, "TV08", "DTV2"));
  });
}

/** Escenario D: one-join-lag (reported stale) NO genera no-op falso. */
async function scenarioOneJoinLag() {
  console.log("\n── Escenario D: one-join-lag — reported stale → el re-POST SÍ emite join ──");
  await withServer({ background: false, avSettleMs: 5000 }, async ({ base, broker, client }) => {
    const start = Date.now();
    while (broker.store.getDomain("tvs").reported.TV02 == null && Date.now() - start < 3000) await sleep(50);
    const joinsBefore = client.counts.av;

    // 1er POST: settling 5000ms > ventana → confirmed:false, reported queda stale.
    let res = await postJson(`${base}/api/tvs/TV02/source`, { source: "DTV4" });
    let body = await res.json();
    check(`[D] 1er POST → unconfirmed (settling > ventana)`, res.status === 200 && body.ok === true && body.confirmed === false);
    const stale = broker.store.getDomain("tvs").reported.TV02;
    check(`[D] reported.TV02 NO envenenado (sigue "${stale}", no DTV4)`, stale != null && stale !== "DTV4");

    // Re-POST idéntico CON reported stale: el guard NO debe saltear (ante
    // duda, no saltear) → el join se emite de nuevo.
    res = await postJson(`${base}/api/tvs/TV02/source`, { source: "DTV4" });
    body = await res.json();
    check(`[D] re-POST con reported stale → SIN noop (join emitido)`, res.status === 200 && body.ok === true && body.noop !== true);
    check(`[D] 2 joins emitidos para TV02 (av=${client.counts.av - joinsBefore})`, client.counts.av - joinsBefore === 2);

    // El re-read postergado (3s) del 2º write converge: reported.TV02=DTV4.
    const start2 = Date.now();
    while (broker.store.getDomain("tvs").reported.TV02 !== "DTV4" && Date.now() - start2 < 9000) await sleep(100);
    check(`[D] re-read postergado converge: reported.TV02=DTV4`, broker.store.getDomain("tvs").reported.TV02 === "DTV4");
  });
}

/** Escenario E: intención repetida en vuelo (isBusy) se descarta sin duplicar. */
async function scenarioInFlight() {
  console.log("\n── Escenario E: intención repetida en vuelo → sin duplicar el comando ──");
  await withServer({ background: true, avSettleMs: 100 }, async ({ base, broker, client }) => {
    const start = Date.now();
    while (broker.store.getDomain("tvs").reported.TV03 == null && Date.now() - start < 3000) await sleep(50);
    const joinsBefore = client.counts.av;

    // Dos POSTs idénticos casi simultáneos: el 2º queda ENCOLADO detrás del
    // 1º (isBusy). Al correr, el 1º ya confirmó → el guard del 2º lo saltea.
    const p1 = postJson(`${base}/api/tvs/TV03/source`, { source: "DTV5" });
    const p2 = postJson(`${base}/api/tvs/TV03/source`, { source: "DTV5" });
    const [r1, r2] = await Promise.all([p1, p2]);
    const b1 = await r1.json();
    const b2 = await r2.json();
    check(`[E] ambos POSTs → 200 ok (bg acepta)`, r1.status === 200 && r2.status === 200 && b1.ok === true && b2.ok === true);
    const t0 = Date.now();
    while (broker.writeQueue.pendingCount > 0 && Date.now() - t0 < 10_000) await sleep(50);
    check(`[E] SOLO 1 join pese al doble submit (av=${client.counts.av - joinsBefore})`, client.counts.av - joinsBefore === 1);
    check(`[E] reported.TV03 converge a DTV5`, await waitReported(broker, "TV03", "DTV5"));
    check(`[E] desired.TV03=DTV5`, broker.store.getDomain("tvs").desired.TV03 === "DTV5");
  });
}

/** Escenario F: TVRACK por sub-stream (join video) también deduplica. */
async function scenarioTvrack() {
  console.log("\n── Escenario F: TVRACK video — doble POST idéntico → 1 join ──");
  await withServer({ background: false, streamSettleMs: 100 }, async ({ base, broker, client }) => {
    const start = Date.now();
    while (broker.store.getDomain("tvrack").reported.video == null && Date.now() - start < 3000) await sleep(50);
    const joinsBefore = client.counts.video;

    let res = await postJson(`${base}/api/tvrack/video`, { deviceId: "DTV7" });
    let body = await res.json();
    check(`[F] 1er POST tvrack/video → 200 ok, join emitido`, res.status === 200 && body.ok === true && body.noop !== true);
    check(`[F] 1 join video`, client.counts.video - joinsBefore === 1);

    res = await postJson(`${base}/api/tvrack/video`, { deviceId: "DTV7" });
    body = await res.json();
    check(`[F] 2º POST idéntico → 200 {ok, noop:true}`, res.status === 200 && body.ok === true && body.noop === true);
    check(`[F] NO se emitió otro join (video=${client.counts.video - joinsBefore})`, client.counts.video - joinsBefore === 1);
    check(`[F] reported.tvrack.video=DTV7`, broker.store.getDomain("tvrack").reported.video === "DTV7");
  });
}

(async () => {
  await scenarioForceAndNoop();
  await scenarioSingleChange();
  await scenarioOneJoinLag();
  await scenarioInFlight();
  await scenarioTvrack();

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    `\n${failed === 0 ? "✓ DEDUPE OK (guard pre-join + force + un-solo-cambio + one-join-lag + in-flight + tvrack)" : `✗ ${failed} chequeos fallaron`}`,
  );
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
