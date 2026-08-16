"use strict";

/**
 * Verify 2.2 — reconciler (auto-adopt server-side, single-flight, interval):
 *   - buildDiffs: desired≠reported confirmado → diff; sin lectura → no diff
 *   - auto-adopt: cambio físico externo en el mock → scan adopta desired←reported
 *   - null/blip NUNCA pisa: destino sin lectura conserva desired y reported
 *   - offline: ninguna lectura confirmada → sync offline, desired intacto
 *   - single-flight: ciclo en curso → segundo scan no-op (skipped)
 *   - eventos: `state` por dominio al adoptar y `sync` en transiciones
 *   - intervalo: DEFAULT 300000 ms y override por RECONCILER_INTERVAL_MS
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const { createStore } = require("../store.js");
const { createArrangerClient } = require("../arrangerClient.js");
const { createEventBus } = require("../eventBus.js");
const { createReconciler, DEFAULT_INTERVAL_MS } = require("../reconciler.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

const silent = { info: () => {}, warn: () => {}, error: () => {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tmpDbPath(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sbr-reconciler-${label}-`));
  return { dir, db: path.join(dir, "state.json") };
}

(async () => {
  // ── Escenario A: auto-adopt con mock normal ──
  const tA = tmpDbPath("a");
  const clientA = createArrangerClient({ mock: true, mockMode: "normal" });
  const storeA = await createStore({ dbPath: tA.db, readEncoder: (d, s) => clientA.getEncoder(d, s), log: silent });
  const busA = createEventBus({ getSnapshot: () => storeA.getSnapshot(), log: silent });
  const stateEvents = [];
  const syncEvents = [];
  busA.emitter.on("state", (e) => stateEvents.push(e));
  busA.emitter.on("sync", (e) => syncEvents.push(e));
  const reconA = createReconciler({ client: clientA, store: storeA, bus: busA, log: silent });

  check("buildDiffs vacío al inicio (desired==default)", reconA.buildDiffs("tvs").length === 0);

  // Cambio físico externo: alguien vincula TV01 a DTV3 directamente en la matriz
  await clientA.joinAv("DTV3", "TV01");
  const resA = await reconA.scanOnce();
  check("scan sin skip", resA.skipped === false);
  check("adoptó desired.TV01 → DTV3 (Arranger gana)", storeA.getDomain("tvs").desired.TV01 === "DTV3");
  check("reported.TV01 = DTV3", storeA.getDomain("tvs").reported.TV01 === "DTV3");
  check("sync → synced tras scan completo", storeA.getSync().status === "synced");
  check("evento state emitido para tvs", stateEvents.some((e) => e.domain === "tvs" && e.payload.TV01 === "DTV3"));
  check("evento sync emitido (stale→synced)", syncEvents.some((e) => e.status === "synced"));

  // ── Escenario B: null/blip NUNCA pisa (stub determinista) ──
  const tB = tmpDbPath("b");
  const stubNull = {
    getEncoder: async (dest, sub) => (dest === "TV02" ? null : "DTV1"),
    joinAv: async () => ({ ok: true, text: "" }),
  };
  const storeB = await createStore({ dbPath: tB.db, readEncoder: async () => "DTV1", log: silent });
  storeB.setDesired("tvs", "TV02", "DTV4"); // intención del operador
  await storeB.write();
  const reconB = createReconciler({ client: stubNull, store: storeB, log: silent });
  const resB = await reconB.scanOnce();
  check("TV02 sin lectura: desired NO pisado (queda DTV4)", storeB.getDomain("tvs").desired.TV02 === "DTV4");
  check("TV02 sin lectura: reported sin pisar", storeB.getDomain("tvs").reported.TV02 === undefined);
  check("resto confirmado: desired DTV1 intacto", storeB.getDomain("tvs").desired.TV01 === "DTV1");

  // ── Escenario C: offline — ninguna lectura confirmada ──
  const tC = tmpDbPath("c");
  const stubOffline = {
    getEncoder: async () => null,
    joinAv: async () => ({ ok: false, error: "offline" }),
  };
  const storeC = await createStore({ dbPath: tC.db, readEncoder: async () => "DTV1", log: silent });
  storeC.setDesired("tvs", "TV05", "DTV7");
  await storeC.write();
  const reconC = createReconciler({ client: stubOffline, store: storeC, log: silent });
  const resC = await reconC.scanOnce();
  check("offline: sync → offline", storeC.getSync().status === "offline");
  check("offline: desired intacto (TV05 sigue DTV7)", storeC.getDomain("tvs").desired.TV05 === "DTV7");

  // ── Escenario D: single-flight ──
  const tD = tmpDbPath("d");
  let releaseGate;
  const gate = new Promise((r) => { releaseGate = r; });
  const slowClient = {
    getEncoder: async () => { await gate; return "DTV1"; },
    joinAv: async () => ({ ok: true }),
  };
  const storeD = await createStore({ dbPath: tD.db, readEncoder: async () => "DTV1", log: silent });
  const reconD = createReconciler({ client: slowClient, store: storeD, log: silent });
  const firstScan = reconD.scanOnce(); // arranca y queda esperando el gate
  await sleep(20);
  check("isScanning true mientras corre", reconD.isScanning() === true);
  const secondScan = await reconD.scanOnce(); // debe ser no-op
  check("segundo scan ignorado (single-flight)", secondScan.skipped === true);
  releaseGate();
  const firstResult = await firstScan;
  check("primer scan completó sin skip", firstResult.skipped === false);

  // ── Escenario E: intervalo ──
  check("DEFAULT_INTERVAL_MS = 300000", DEFAULT_INTERVAL_MS === 300000);
  const reconDefault = createReconciler({ client: stubOffline, store: storeC, log: silent });
  check("intervalMs default 300000", reconDefault.intervalMs === 300000);
  const prevEnv = process.env.RECONCILER_INTERVAL_MS;
  process.env.RECONCILER_INTERVAL_MS = "1234";
  const reconEnv = createReconciler({ client: stubOffline, store: storeC, log: silent });
  check("RECONCILER_INTERVAL_MS env respeta override", reconEnv.intervalMs === 1234);
  if (prevEnv === undefined) delete process.env.RECONCILER_INTERVAL_MS;
  else process.env.RECONCILER_INTERVAL_MS = prevEnv;

  // ── Escenario F: preset confirmado con video != audio, sin adopciones ──
  const tF = tmpDbPath("preset-independent");
  const clientF = createArrangerClient({ mock: true, mockMode: "normal" });
  const storeF = await createStore({ dbPath: tF.db, readEncoder: (d, s) => clientF.getEncoder(d, s), log: silent });
  await clientF.joinVideo("DTV2", "TVRACK");
  await clientF.joinAudio("DTV3", "TVRACK");
  storeF.setDesired("tvrack", "video", "DTV2");
  storeF.setDesired("tvrack", "audio", "DTV3");
  storeF.setReported("tvrack", "video", "DTV2");
  storeF.setReported("tvrack", "audio", "DTV3");
  await storeF.write();
  const reconF = createReconciler({ client: clientF, store: storeF, log: silent });
  const resF = await reconF.scanOnce();
  check("preset video!=audio confirmado: scan sin adopciones", resF.adopted === 0);
  check("preset video!=audio confirmado: sin diffs", reconF.buildDiffs("tvrack").length === 0);
  check("preset video!=audio conserva ambos desired", storeF.getDomain("tvrack").desired.video === "DTV2" && storeF.getDomain("tvrack").desired.audio === "DTV3");

  // Limpieza temporal
  for (const t of [tA, tB, tC, tD, tF]) fs.rmSync(t.dir, { recursive: true, force: true });

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "✓ RECONCILER OK" : `✗ ${failed} chequeos fallaron`}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
