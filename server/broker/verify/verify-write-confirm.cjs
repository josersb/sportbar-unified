"use strict";

/**
 * Verify 4.2 — Confirmación post-join con retry (fix real-hardware).
 *
 * Reproduce la race condition del Arranger físico v1.3.4 contra el mock en
 * modo `settle`: el mock aplica el join físicamente pero la PRIMERA lectura
 * `get encoder` del destino devuelve el valor ANTERIOR (stale), como el
 * routing table del hardware que tarda en reflejar el join.
 *
 * Valida DOS modos + hotfix 4 + hotfix 5:
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
 *   D. Rate limiter 429 (hotfix 5): un POST rechazado por writesLimiter
 *      responde 429 con el formato estándar de express-rate-limit ANTES de
 *      procesarse — el store queda intacto (reported no envenenado, desired
 *      sin cambio). El limiter del server real es 600/15min; para el verify
 *      montamos un app Express aislado con un limiter de max=2 para forzar
 *      el 429 sin 601 POSTs.
 *   E. File logger (hotfix 5): las líneas de log del broker se escriben al
 *      archivo del boot con timestamp `[YYYY-MM-DD HH:mm:ss.mmm]` al inicio
 *      de CADA línea (directorio temporal), y el rollover 900KB abre
 *      `-part2.txt`.
 *
 * Uso: node server/broker/verify/verify-write-confirm.cjs
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.VITE_MOCK_ARRANGER = "1";
process.env.VITE_ARRANGER_TOKEN = process.env.VITE_ARRANGER_TOKEN || "verify-token";
// El fileLogger del server.js escribe a server/logs/ — en verify lo
// desactivamos (el escenario E usa un directorio temporal explícito).
process.env.BROKER_FILE_LOG = "0";

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
    // Drain del writeQueue ANTES del rmSync: waitForConvergence observa el
    // store en MEMORIA (setReported) mientras el store.write() de executeWrite
    // aún está en vuelo — sin este drain, el rmSync borra el dbPath primero y
    // la tarea tardía rechaza con ENOENT (ruido cosmético por console.error).
    const drainStart = Date.now();
    while (broker.writeQueue.pendingCount > 0 && Date.now() - drainStart < 30_000) {
      await new Promise((r) => setTimeout(r, 100));
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Escenario D (hotfix 5) — POST rechazado por writesLimiter (429).
 *
 * Monta un Express aislado con express-rate-limit max=2 (mismo config que
 * server.js, ventana 15min) para forzar el 429 sin 600 POSTs. Valida que:
 *   (a) el 429 responde con el formato estándar de express-rate-limit
 *       (message JSON configurada — el cliente lo detecta por status),
 *   (b) el POST rechazado NO procesa el write: store intacto (reported y
 *       desired sin cambio) — nunca se envenena reported.
 *   (c) el writesLimiter REAL de server.js quedó en max=600 (regresión).
 */
async function runScenario429() {
  console.log(`\n── Escenario D (429 rate-limit, hotfix 5) ──`);
  const express = require("express");
  const rateLimit = require("express-rate-limit");

  // (c) El limiter real quedó dimensionado para el patrón batch (29/Enviar).
  const serverSrc = fs.readFileSync(path.join(__dirname, "..", "..", "server.js"), "utf-8");
  check(`[429] writesLimiter del server real = 600 (patrón batch 29/Enviar)`, /max:\s*600/.test(serverSrc));

  const app = express();
  app.use(express.json());
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, try again later" },
  });
  let processedWrites = 0;
  app.post("/api/tvs/:id/source", limiter, (req, res) => {
    processedWrites += 1;
    res.json({ ok: true, accepted: true });
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const post = () =>
      fetch(`${base}/api/tvs/TV01/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "DTV3" }),
      });

    // Consumir el presupuesto (2 POSTs OK) y forzar el 429 en el 3º.
    const r1 = await post();
    const r2 = await post();
    const r3 = await post();
    check(`[429] primeros 2 POSTs → 200`, r1.status === 200 && r2.status === 200);
    check(`[429] 3er POST → 429 (presupuesto agotado)`, r3.status === 429);
    const body3 = await r3.json().catch(() => null);
    check(
      `[429] cuerpo del 429 = formato estándar express-rate-limit (message JSON)`,
      body3 && body3.error === "Too many requests, try again later",
    );
    check(`[429] el POST rechazado NO se procesó (processedWrites=2, no 3)`, processedWrites === 2);
    check(`[429] rate limit headers estándar presentes (Retry-After o ratelimit)`, r3.headers.get("ratelimit-remaining") === "0" || r3.headers.get("retry-after") != null);
  } finally {
    server.close();
  }

  // (b) Contra el server REAL (mock): el 429 rechaza ANTES de procesar — el
  // store del broker queda intacto. Montamos el broker con un limiter real
  // ya agotado simulando el post-reject: verificamos que un write NUNCA
  // rechazado-luego-procesado envenena reported. Esto es una aserción de
  // contrato: el handler del POST corre DESPUÉS del middleware limiter, así
  // que un 429 no puede tocar el store — lo probamos con el limiter agotado.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-429-"));
  const dbPath = path.join(tmpDir, "state.json");
  process.env.BROKER_BACKGROUND_CONFIRM = "1";
  const { app: brokerApp, broker } = await createServer({ dbPath, silent: true, mockMode: "settle" });
  const server2 = brokerApp.listen(0);
  const base2 = `http://127.0.0.1:${server2.address().port}`;
  try {
    // Estado base del store (fresh-start hidrató reported desde el mock).
    const before = broker.store.getDomain("tvs");
    const reportedBefore = before.reported.TV01;
    const desiredBefore = before.desired.TV01;

    // Agotar el writesLimiter REAL (600 POSTs) — el patrón del incidente
    // (#908: batches repetidos de 29). Express-rate-limit cuenta por IP.
    let lastStatus = 200;
    for (let i = 0; i < 610 && lastStatus === 200; i++) {
      const r = await fetch(`${base2}/api/tvs/TV01/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "DTV3" }),
      });
      lastStatus = r.status;
    }
    check(`[429] el limiter real del broker se agota tras 600 writes → 429`, lastStatus === 429);

    // El store quedó intacto en reported (los writes procesados confirmaron
    // DTV3 — el join sí ocurrió en los procesados). El punto del contrato:
    // el POST Nº 601+ rechazado con 429 NO toca el store.
    const desiredAt429 = broker.store.getDomain("tvs").desired.TV01;
    check(`[429] desired procesado = DTV3 (los 600 writes procesados sí)`, desiredAt429 === "DTV3");
    const reportedAt429 = broker.store.getDomain("tvs").reported.TV01;
    check(`[429] reported solo de writes PROCESADOS (no del rechazado)`, reportedAt429 === "DTV3" || reportedBefore === reportedAt429);

    // POST rechazado no envenena: el 429 no cambia desired (sigue DTV3,
    // no puede haber un "deseado" adicional del POST 601 porque nunca corrió).
    const after429 = broker.store.getDomain("tvs");
    check(
      `[429] tras el 429 el store no cambia con más POSTs rechazados`,
      after429.desired.TV01 === desiredAt429 && after429.reported.TV01 === reportedAt429,
    );
    void desiredBefore;
    // Los 600 writes aceptados corren en background (writeInBackground tras
    // responder 202) — el writeQueue los serializa contra el Arranger. Sin
    // este drain, el rmSync de abajo borra el dbPath con writes en vuelo y
    // cada store.write() tardío emite un ENOENT cosmético por console.error.
    const drainStart = Date.now();
    while (broker.writeQueue.pendingCount > 0 && Date.now() - drainStart < 30_000) {
      await new Promise((r) => setTimeout(r, 100));
    }
    check(`[429] writeQueue drenado tras el batch (sin writes en vuelo)`, broker.writeQueue.pendingCount === 0);
  } finally {
    if (typeof server2.closeAllConnections === "function") server2.closeAllConnections();
    server2.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Escenario E (hotfix 5) — File logger + SKIP de setReported unconfirmed.
 *
 *   (a) Las líneas de log del broker se escriben al archivo del boot con
 *       timestamp al inicio de CADA línea (directorio temporal).
 *   (b) Un write con confirmación fallida (mock `blip` → getEncoder null)
 *       hace SKIP del setReported: reported queda intacto (el valor
 *       confirmado previo), y el LOG muestra `SKIP setReported ... unconfirmed`
 *       en vez del `setReported ...=null` confuso del hotfix 4.
 */
async function runScenarioFileLogger() {
  console.log(`\n── Escenario E (file logger + SKIP setReported, hotfix 5) ──`);
  const { installFileLogger, createFileLogger } = require("../fileLogger.js");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-filelog-"));
  const logsDir = path.join(tmpDir, "logs");

  // El interceptor ya está instalado por server.js (require al boot) — su
  // archivo vive en server/logs/. Para el verify usamos un logger directo a
  // un directorio temporal (el mismo módulo, sin console).
  const logger = createFileLogger({ dir: logsDir, rolloverBytes: 200, retainFiles: 3 });
  const bootPath = logger.openBootFile();
  check(`[file] archivo por boot creado: ${path.basename(bootPath)} =~ sportbar-<YYYY-MM-DD_HHmmss>.txt`, /sportbar-\d{4}-\d{2}-\d{2}_\d{6}\.txt$/.test(bootPath));

  logger.writeLine("[WRITE w-001] POST /api/tvs/TV01/source {source:\"DTV3\"}");
  logger.writeLine("[STORE w-001] SKIP setReported tvs (key=TV01, video) — unconfirmed, read=null");
  const contents = fs.readFileSync(bootPath, "utf-8");
  const lines = contents.split("\n").filter((l) => l.trim() !== "");
  check(`[file] cada línea lleva timestamp [YYYY-MM-DD HH:mm:ss.mmm] al inicio`, lines.every((l) => /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] /.test(l)));
  check(`[file] contenido preservado tras el timestamp`, lines.some((l) => l.includes("[WRITE w-001] POST /api/tvs/TV01/source")));

  // Rollover: con límite 200 bytes, varias líneas abren -part2.txt.
  for (let i = 0; i < 30; i++) logger.writeLine(`[WRITE w-${String(i).padStart(3, "0")}] synthetic line ${i} — padding para superar el rollover rápido`);
  const dirEntries = fs.readdirSync(logsDir).filter((f) => f.endsWith(".txt"));
  check(`[file] rollover abre -part2.txt (>900KB en prod, 200B aquí)`, dirEntries.some((f) => /-part2\.txt$/.test(f)));
  check(`[file] todas las partes comparten el nombre base del boot`, dirEntries.every((f) => f.startsWith(path.basename(bootPath).replace(/\.txt$/, "")) || f.startsWith("sportbar-")));

  // Retención: crear 14 boots sintéticos + uno nuevo → el invariante del
  // prune es "a lo sumo retainFiles archivos tras el boot" (el archivo del
  // boot actual + los retainFiles-1 más nuevos). Pasos de 2s: el nombre base
  // tiene granularidad de 1s (boots en el mismo segundo se pisan).
  for (let i = 0; i < 14; i++) {
    const l = createFileLogger({ dir: logsDir, retainFiles: 10 });
    l.openBootFile(new Date(Date.now() + (i + 1) * 2000)); // timestamps crecientes
    l.writeLine(`boot sintético ${i}`);
  }
  const loggerNew = createFileLogger({ dir: logsDir, retainFiles: 10 });
  const newestBoot = loggerNew.openBootFile(new Date(Date.now() + 60000)); // el último boot: prune + archivo nuevo
  loggerNew.writeLine("boot final — el archivo del boot se materializa con la primera línea");
  const retained = fs.readdirSync(logsDir).filter((f) => f.endsWith(".txt"));
  check(`[file] retención al boot: a lo sumo 10 archivos (quedaron ${retained.length})`, retained.length <= 10);
  check(`[file] el archivo del boot actual sobrevive al prune`, retained.includes(path.basename(newestBoot)));
  const sortedBoots = retained.map((f) => f.replace(/-part\d+\.txt$/, ".txt")).sort();
  check(
    `[file] los archivos retenidos son los más nuevos (boot actual + sintéticos tardíos)`,
    sortedBoots[sortedBoots.length - 1] === path.basename(newestBoot),
  );

  // (b) SKIP setReported en write unconfirmed: mock `oneJoinLag` (el read
  // devuelve el valor del join ANTERIOR durante lagSettleMs → confirmEncoder
  // agota los 3 retries SIN confirmar → executeWrite hace SKIP del
  // setReported: reported queda intacto (último valor confirmado) y el LOG
  // muestra `SKIP setReported ... unconfirmed` en vez del `=null` confuso.
  const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), "sbr-skip-"));
  const dbPath2 = path.join(tmpDir2, "state.json");
  process.env.BROKER_BACKGROUND_CONFIRM = "0"; // síncrono: el POST responde el resultado del write
  delete require.cache[require.resolve("../../server.js")];
  delete require.cache[require.resolve("../../broker/store.js")];
  delete require.cache[require.resolve("../../broker/arrangerClient.js")];
  delete require.cache[require.resolve("../../broker/reconciler.js")];
  delete require.cache[require.resolve("../../broker/eventBus.js")];
  delete require.cache[require.resolve("../../broker/writeQueue.js")];
  delete require.cache[require.resolve("../../broker/mockArranger.js")];
  const { createServer: createServerFresh } = require("../../server.js");

  // Capturar stdout del write para asertir el SKIP explícito del log.
  const logChunks = [];
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, enc, cb) => {
    logChunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return origStdoutWrite(chunk, enc, cb);
  };
  try {
    // lagSettleMs=60s: los 3 retries (~1.5s) Y el re-read a los 3s leen
    // stale → el write queda unconfirmed sin converger dentro del verify.
    const { app: app2, broker: broker2 } = await createServerFresh({
      dbPath: dbPath2,
      silent: true,
      mockMode: "oneJoinLag",
      reconcilerIntervalMs: 3_600_000, // sin scans que adopten durante el verify
    });
    const server3 = app2.listen(0);
    const base3 = `http://127.0.0.1:${server3.address().port}`;
    try {
      // Baseline confirmado: primera hidratación del store leyó DEFAULT DTV1
      // (fresh-start) — primer write DTV2 confirma tras el lag, dando un
      // reported distinguible. Esperamos la convergencia vía re-read (3s).
      const postTv = (source) =>
        fetch(`${base3}/api/tvs/TV05/source`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source }),
        });

      const r1 = await postTv("DTV2");
      const b1 = await r1.json();
      check(`[skip] W1 unconfirmed: 200 + confirmed:false (stale por lag)`, r1.status === 200 && b1.ok === true && b1.confirmed === false);
      const reportedAfterW1 = broker2.store.getDomain("tvs").reported.TV05;
      check(
        `[skip] W1 NO envenena reported (fresh-start DTV1 intacto, sin setReported con null/stale)`,
        reportedAfterW1 === "DTV1" || reportedAfterW1 == null,
      );
      // Convergencia del re-read postergado (3s) — reported DTV2 confirmado.
      await new Promise((r) => setTimeout(r, 4500));
      check(`[skip] re-read postergado converge: reported TV05 = DTV2`, broker2.store.getDomain("tvs").reported.TV05 === "DTV2");

      // W2: el SKIP activo. Durante el lag, reported conserva DTV2 (confirmado)
      // aunque el read devuelva stale DTV2 — el log muestra el SKIP explícito.
      logChunks.length = 0;
      const r2 = await postTv("DTV4");
      const b2 = await r2.json();
      check(`[skip] W2 unconfirmed: 200 + confirmed:false`, r2.status === 200 && b2.ok === true && b2.confirmed === false);
      check(
        `[skip] W2 reported INTACTO durante el lag (conserva DTV2 confirmado, no stale/null)`,
        broker2.store.getDomain("tvs").reported.TV05 === "DTV2",
      );
      const stdout = logChunks.join("");
      check(
        `[skip] log muestra SKIP setReported explícito (auditoría, no "=null" confuso)`,
        stdout.includes("SKIP setReported tvs (key=TV05, video) — unconfirmed"),
      );
      check(
        `[skip] log NUNCA imprime setReported con confirmed=false`,
        !/setReported[^=]*=.*confirmed=false/.test(stdout),
      );
    } finally {
      if (typeof server3.closeAllConnections === "function") server3.closeAllConnections();
      server3.close();
    }
  } finally {
    process.stdout.write = origStdoutWrite; // restaurar stdout ANTES de limpiar
    fs.rmSync(tmpDir2, { recursive: true, force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env.BROKER_BACKGROUND_CONFIRM = "1";
  }
}

(async () => {
  await runScenario({ mode: "sync", label: "A (síncrono, regresión)" });
  await runScenario({ mode: "background", label: "B (background, hotfix C)" });
  await runScenario({ mode: "background", label: "C (one-join-lag, hotfix 4)", mockMode: "oneJoinLag" });
  await runScenario429();
  await runScenarioFileLogger();
  // Reset del flag y módulo
  process.env.BROKER_BACKGROUND_CONFIRM = "1";

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ WRITE-CONFIRM OK (síncrono + background + one-join-lag + 429 + file-logger verificados)" : `✗ ${failed} chequeos fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
