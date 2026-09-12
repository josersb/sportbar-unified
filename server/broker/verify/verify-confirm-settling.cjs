"use strict";

/**
 * Verify — ventana de confirmación por tipo de comando (settling Arranger v1.3.4).
 *
 * Sin hardware: inyecta un cliente fake vía `createServer({ client })` que
 * envuelve al mock real y simula el settling del firmware POR COMANDO: tras un
 * join que CAMBIA el valor, `get encoder` devuelve el valor ANTERIOR hasta
 * `until = join + settleMs` (como el routing table físico que tarda en reflejar
 * el join). Un join no-op (source === actual) NO arma settling: el read#1
 * inmediato confirma.
 *
 * Escenarios:
 *   A. TV → `join av`, avSettleMs=3340 → confirmed:true, elapsed ≥ 3340.
 *   B. TVRACK link=false → `join video`, streamSettleMs=2302 → confirmed.
 *   C. re-POST del mismo source → no-op, read#1 confirma, elapsed < ventana.
 *   D. avSettleMs=5000 > ventana 3700 → confirmed:false, `reported` no
 *      envenenado, el re-read postergado (3s) converge.
 *   E. Guard de margen: las constantes de `server.js` mantienen ≥300 ms sobre
 *      el settling medido (3340 av / 2302 stream).
 *   F. Primer read retrasado por congestión del semáforo (no settling):
 *      confirmed:true si la ventana lo absorbe, o confirmed:false; en ambos
 *      casos `reported` no se envenena.
 *   G. Comando `join` falla → HTTP 502 sin convergencia (`reported` intacto,
 *      sin broadcast del dominio).
 *
 * Uso: node server/broker/verify/verify-confirm-settling.cjs
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.VITE_MOCK_ARRANGER = "1";
process.env.VITE_ARRANGER_TOKEN = process.env.VITE_ARRANGER_TOKEN || "verify-token";
// El fileLogger de server.js escribe a server/logs/ — en verify lo desactivamos.
process.env.BROKER_FILE_LOG = "0";
// Síncrono: el POST responde el resultado REAL de la confirmación (confirmed).
process.env.BROKER_BACKGROUND_CONFIRM = "0";

const { createArrangerClient } = require("../arrangerClient.js");
const { createServer } = require("../../server.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Cliente fake con settling por comando. Envuelve el mock real:
 *   - join av    → arma video+audio con avSettleMs.
 *   - join video → arma video con streamSettleMs.
 *   - join audio → arma audio con streamSettleMs.
 * Solo arma los streams cuyo valor CAMBIA (no-op → read#1 confirma).
 *
 * Opciones extra:
 *   - joinFails        → join av/video/audio devuelven `{ ok:false, error:"boom" }`
 *                        (Escenario G: comando que falla).
 *   - firstReadDelayMs → el PRIMER read de la confirmación tras un join espera
 *                        ese tiempo antes de responder, emulando el semáforo
 *                        global ocupado por otro destino (Escenario F:
 *                        congestión, NO settling).
 */
function createSettleClient({ avSettleMs, streamSettleMs, token, joinFails = false, firstReadDelayMs = 0 }) {
  const base = createArrangerClient({ token, mock: true });
  const pending = new Map(); // `${dest}:${sub}` → { previous, until }
  const congestionPending = new Set(); // `${dest}:${sub}` con el read#1 retrasado

  async function armAndJoin(source, dest, streams, settleMs, joinFn) {
    // Escenario G: comando que falla — el broker debe responder 502 sin converger.
    if (joinFails) return { ok: false, error: "boom" };
    const previous = {};
    for (const sub of streams) previous[sub] = await base.getEncoder(dest, sub);
    const result = await joinFn(source, dest);
    const until = Date.now() + settleMs;
    for (const sub of streams) {
      if (previous[sub] !== source) {
        pending.set(`${dest}:${sub}`, { previous: previous[sub], until });
      }
      // Escenario F: el read#1 de la confirmación espera turno del semáforo
      // (congestión), independiente del settling del join.
      if (firstReadDelayMs > 0) congestionPending.add(`${dest}:${sub}`);
    }
    return result;
  }

  return {
    isMock: true,
    joinAv: (source, dest) => armAndJoin(source, dest, ["video", "audio"], avSettleMs, (s, d) => base.joinAv(s, d)),
    joinVideo: (source, dest) => armAndJoin(source, dest, ["video"], streamSettleMs, (s, d) => base.joinVideo(s, d)),
    joinAudio: (source, dest) => armAndJoin(source, dest, ["audio"], streamSettleMs, (s, d) => base.joinAudio(s, d)),
    async getEncoder(dest, sub = "video") {
      const key = `${dest}:${sub}`;
      if (congestionPending.has(key)) {
        congestionPending.delete(key);
        await sleep(firstReadDelayMs); // read#1 espera su turno (semáforo ocupado)
      }
      const p = pending.get(key);
      if (p) {
        if (Date.now() < p.until) return p.previous; // todavía settleando → valor previo
        pending.delete(key); // el routing table ya refleja el join
      }
      return base.getEncoder(dest, sub);
    },
    sendRaw: () => ({ ok: false, error: "sendRaw no aplica en verify" }),
    getSemaphoreStats: () => base.getSemaphoreStats(),
  };
}

/** Monta el broker con el cliente fake; drena la cola y limpia el tmp al salir. */
async function withServer({ avSettleMs, streamSettleMs, joinFails, firstReadDelayMs }, fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-confirm-settle-"));
  const dbPath = path.join(tmpDir, "state.json");
  const client = createSettleClient({ avSettleMs, streamSettleMs, token: "verify-token", joinFails, firstReadDelayMs });
  // reconcilerIntervalMs enorme: el scan de arranque no se repite durante el verify.
  const { app, broker } = await createServer({ dbPath, silent: true, client, reconcilerIntervalMs: 3_600_000 });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await fn({ base, broker });
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close();
    // Drain del writeQueue ANTES del rmSync (patrón existente): sin esto un
    // store.write() en vuelo rechaza con ENOENT al borrar el dbPath.
    const drainStart = Date.now();
    while (broker.writeQueue.pendingCount > 0 && Date.now() - drainStart < 30_000) {
      await sleep(100);
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function waitReported(broker, domain, key, expected, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const d = broker.store.getDomain(domain);
    if (d.reported && d.reported[key] === expected) return true;
    await sleep(100);
  }
  return false;
}

/** Espera a que el scan de arranque del reconciler hidrate `reported[key]`. */
async function waitHydrated(broker, domain, key, timeoutMs = 3000) {
  const start = Date.now();
  while (broker.store.getDomain(domain).reported[key] == null && Date.now() - start < timeoutMs) {
    await sleep(50);
  }
  return broker.store.getDomain(domain).reported[key];
}

const postJson = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** Escenarios A y C: ventana av confirma; no-op confirma con el read#1. */
async function scenarioAandC() {
  console.log("\n── Escenario A: TV → join av (avSettleMs=3340) ──");
  await withServer({ avSettleMs: 3340, streamSettleMs: 2302 }, async ({ base, broker }) => {
    const t0 = Date.now();
    const res = await postJson(`${base}/api/tvs/TV01/source`, { source: "DTV3" });
    const elapsed = Date.now() - t0;
    const body = await res.json();
    check(`[A] POST TV01 → 200 ok`, res.status === 200 && body.ok === true);
    check(`[A] confirmed:true (settling av dentro de la ventana)`, body.confirmed === true);
    check(`[A] reported=DTV3 (no stale DTV1)`, body.reported === "DTV3");
    check(`[A] store reported.TV01=DTV3`, broker.store.getDomain("tvs").reported.TV01 === "DTV3");
    check(`[A] elapsed ≥ 3340ms (esperó el settling av; ${elapsed}ms)`, elapsed >= 3340);

    console.log("\n── Escenario C: re-POST del mismo source (no-op) ──");
    const t1 = Date.now();
    const res2 = await postJson(`${base}/api/tvs/TV01/source`, { source: "DTV3" });
    const elapsed2 = Date.now() - t1;
    const body2 = await res2.json();
    check(`[C] re-POST → 200 ok`, res2.status === 200 && body2.ok === true);
    check(`[C] confirmed:true (no-op resuelto por el read#1)`, body2.confirmed === true);
    check(`[C] reported sigue DTV3`, body2.reported === "DTV3");
    check(`[C] elapsed < ventana av 3340ms (${elapsed2}ms, no esperó settling)`, elapsed2 < 3340);
  });
}

/** Escenario B: TVRACK link=false → join video, settling stream. */
async function scenarioB() {
  console.log("\n── Escenario B: TVRACK link=false → join video (streamSettleMs=2302) ──");
  await withServer({ avSettleMs: 3340, streamSettleMs: 2302 }, async ({ base, broker }) => {
    const t0 = Date.now();
    const res = await postJson(`${base}/api/tvrack/video`, { deviceId: "DTV7" });
    const elapsed = Date.now() - t0;
    await res.json();
    check(`[B] POST tvrack/video → 200`, res.status === 200);
    check(`[B] link=false (usa join video, no av)`, broker.store.getAppOnly().tvrack?.link !== true);
    check(`[B] store tvrack reported.video=DTV7 (settling stream dentro de la ventana)`, broker.store.getDomain("tvrack").reported.video === "DTV7");
    check(`[B] elapsed ≥ 2302ms (esperó el settling stream; ${elapsed}ms)`, elapsed >= 2302);
  });
}

/** Escenario D: settling > ventana → unconfirmed, reported intacto, re-read converge. */
async function scenarioD() {
  console.log("\n── Escenario D: avSettleMs=5000 > ventana 3700 → unconfirmed + re-read ──");
  await withServer({ avSettleMs: 5000, streamSettleMs: 2302 }, async ({ base, broker }) => {
    // El scan de arranque del reconciler hidrata `reported` en background:
    // esperar a que asiente evita capturar un baseline vacío (race).
    const waitStart = Date.now();
    while (broker.store.getDomain("tvs").reported.TV02 == null && Date.now() - waitStart < 3000) {
      await sleep(50);
    }
    const reportedBefore = broker.store.getDomain("tvs").reported.TV02;
    const t0 = Date.now();
    const res = await postJson(`${base}/api/tvs/TV02/source`, { source: "DTV4" });
    const elapsed = Date.now() - t0;
    const body = await res.json();
    check(`[D] POST TV02 → 200 ok`, res.status === 200 && body.ok === true);
    check(`[D] confirmed:false (ventana agotada antes del settling)`, body.confirmed === false);
    check(`[D] reported:null en la respuesta`, body.reported === null);
    check(`[D] elapsed ≥ 3700ms (esperó la ventana av; ${elapsed}ms)`, elapsed >= 3700);

    const reportedAfter = broker.store.getDomain("tvs").reported.TV02;
    check(
      `[D] reported NO envenenado (sigue "${reportedBefore}", no DTV4)`,
      reportedAfter === reportedBefore && reportedAfter !== "DTV4",
    );
    check(`[D] desired.TV02=DTV4 (intención intacta)`, broker.store.getDomain("tvs").desired.TV02 === "DTV4");

    // El re-read postergado (3s tras el write) corre a t≈6,7s > settling 5s →
    // el fake asienta y la lectura converge a DTV4.
    const converged = await waitReported(broker, "tvs", "TV02", "DTV4", 9000);
    check(`[D] re-read postergado converge: reported.TV02=DTV4`, converged);
  });
}

/**
 * Escenario F: primer read retrasado por congestión del semáforo (NO settling).
 *
 * Simula el semáforo global ocupado por OTRO destino: el read#1 de la
 * confirmación espera ~1s su turno. El settling del join ya lo cubre el
 * Escenario D; acá el foco es el retraso de congestión. La spec acepta que la
 * confirmación se resuelva dentro de la ventana (confirmed:true) O caiga en el
 * desenlace no confirmado — el invariante en ambos casos es que `reported` no
 * se envenene (ni stale ni null).
 */
async function scenarioF() {
  console.log("\n── Escenario F: primer read retrasado por congestión del semáforo ──");

  // F1: el retraso del read#1 es absorbido por la ventana → confirmed:true.
  await withServer({ avSettleMs: 3340, streamSettleMs: 2302, firstReadDelayMs: 1000 }, async ({ base, broker }) => {
    const before = await waitHydrated(broker, "tvs", "TV06");
    const t0 = Date.now();
    const res = await postJson(`${base}/api/tvs/TV06/source`, { source: "DTV5" });
    const elapsed = Date.now() - t0;
    const body = await res.json();
    check(`[F1] POST TV06 → 200 ok`, res.status === 200 && body.ok === true);
    check(`[F1] read#1 retrasado por congestión (elapsed ${elapsed}ms ≥ 1000)`, elapsed >= 1000);
    check(`[F1] confirmación resuelta dentro de la ventana (confirmed:true)`, body.confirmed === true);
    check(`[F1] reported = DTV5 (valor nuevo; el retraso no se interpreta como fallo)`, body.reported === "DTV5");
    check(`[F1] store reported.TV06 = DTV5`, broker.store.getDomain("tvs").reported.TV06 === "DTV5");
    check(
      `[F1] reported NO envenenado con stale/null ("${before}" → "${body.reported}")`,
      body.reported != null && body.reported !== before,
    );
  });

  // F2: retraso + settling > ventana → cae en el desenlace no confirmado;
  // igualmente reported conserva el valor previo (no se envenena).
  await withServer({ avSettleMs: 5000, streamSettleMs: 2302, firstReadDelayMs: 1000 }, async ({ base, broker }) => {
    const before = await waitHydrated(broker, "tvs", "TV07");
    const res = await postJson(`${base}/api/tvs/TV07/source`, { source: "DTV6" });
    const body = await res.json();
    check(`[F2] POST TV07 → 200 ok`, res.status === 200 && body.ok === true);
    check(`[F2] confirmación cae en no confirmado (confirmed:false)`, body.confirmed === false);
    check(`[F2] reported:null en la respuesta (no se expone stale)`, body.reported === null);
    const after = broker.store.getDomain("tvs").reported.TV07;
    check(`[F2] reported NO envenenado (sigue "${before}", no DTV6)`, after === before && after !== "DTV6");
  });
}

/**
 * Escenario G: el comando join falla → HTTP 502, sin convergencia.
 *
 * Cliente fake con `joinAv`/`joinVideo`/`joinAudio` que devuelven
 * `{ ok:false, error:"boom" }`. En modo síncrono, `server.js` mapea
 * `!result.ok` → 502 (línea del endpoint `/api/tvs/:id/source`), ANTES de
 * `broadcastDomain`. Se asserta el status real y que el `reported` del destino
 * queda intacto y no se emite broadcast de convergencia del dominio.
 */
async function scenarioG() {
  console.log("\n── Escenario G: comando join falla → HTTP 502, sin convergencia ──");
  await withServer({ avSettleMs: 3340, streamSettleMs: 2302, joinFails: true }, async ({ base, broker }) => {
    const before = await waitHydrated(broker, "tvs", "TV08");
    // El scan de arranque del reconciler publica lo suyo: esperarlo y recién
    // después espiar el bus, para aislar el broadcast del write bajo prueba.
    const scanStart = Date.now();
    while (broker.reconciler.isScanning() && Date.now() - scanStart < 5000) await sleep(50);
    const publishes = [];
    const origPublish = broker.bus.publish.bind(broker.bus);
    broker.bus.publish = (domain, ...rest) => {
      publishes.push(domain);
      return origPublish(domain, ...rest);
    };

    // server.js (sync): `!result.ok` → res.status(502).json({ ok:false, error }).
    const res = await postJson(`${base}/api/tvs/TV08/source`, { source: "DTV2" });
    const body = await res.json();
    check(`[G] POST con join fallido → HTTP 502`, res.status === 502);
    check(`[G] body ok:false con el error del join ("boom")`, body.ok === false && body.error === "boom");
    const reportedAfter = broker.store.getDomain("tvs").reported.TV08;
    check(`[G] reported.TV08 intacto (sigue "${before}", no DTV2)`, reportedAfter === before && reportedAfter !== "DTV2");
    check(`[G] no se emitió broadcast de convergencia para tvs`, !publishes.includes("tvs"));
  });
}

/** Escenario E: guard de margen ≥300 ms sobre el settling medido. */
function scenarioGuard() {
  console.log("\n── Escenario E: guard de margen ≥300ms sobre el settling medido ──");
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "server.js"), "utf-8");
  const avMatch = src.match(/CONFIRM_SETTLE_AV_MS\s*=\s*(\d+)/);
  const streamMatch = src.match(/CONFIRM_SETTLE_STREAM_MS\s*=\s*(\d+)/);
  check(`[E] CONFIRM_SETTLE_AV_MS declarada en server.js`, !!avMatch);
  check(`[E] CONFIRM_SETTLE_STREAM_MS declarada en server.js`, !!streamMatch);
  if (avMatch && streamMatch) {
    const av = parseInt(avMatch[1], 10);
    const stream = parseInt(streamMatch[1], 10);
    check(`[E] av margen ≥300ms (${av} - 3340 = ${av - 3340})`, av - 3340 >= 300);
    check(`[E] stream margen ≥300ms (${stream} - 2302 = ${stream - 2302})`, stream - 2302 >= 300);
  }
  check(`[E] CONFIRM_POLICY frozen presente`, /CONFIRM_POLICY\s*=\s*Object\.freeze/.test(src));
}

(async () => {
  await scenarioAandC();
  await scenarioB();
  await scenarioD();
  await scenarioF();
  await scenarioG();
  scenarioGuard();

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    `\n${failed === 0 ? "✓ CONFIRM-SETTLING OK (ventana por comando + no-op + unconfirmed + congestión + join-fail + guard)" : `✗ ${failed} chequeos fallaron`}`,
  );
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
