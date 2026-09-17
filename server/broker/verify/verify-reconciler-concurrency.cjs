"use strict";

/**
 * Verify — reconciler concurrency guard (fix clobber scan/write).
 *
 * Reproduce el incidente 2026-09-17 (TV26): un scan largo (~20s) lee un destino
 * ANTES de un write que termina durante el scan; al adoptar pisaba el `reported`
 * recién confirmado (y el `desired` del operador) → auto-revert silencioso.
 *
 * Escenario A (control): SIN guard, la lectura stale SÍ pisa (documenta el bug).
 * Escenario B (fix): CON `recentlyWritten(dest, scanStartedAt)` el destino
 * escrito durante el scan se saltea; el resto converge normal.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const { createStore } = require("../store.js");
const { createReconciler } = require("../reconciler.js");

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}
const silent = { info: () => {}, warn: () => {}, error: () => {} };

function tmpDbPath(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sbr-recon-c-${label}-`));
  return path.join(dir, "state.json");
}

/** Lectura STALE: TV26 devuelve el valor viejo (DTV2); el resto DTV1. */
const staleClient = {
  getEncoder: async (dest) => (dest === "TV26" ? "DTV2" : "DTV1"),
  joinAv: async () => ({ ok: true, text: "" }),
};

(async () => {
  // ── A: control SIN guard → el scan pisa el write reciente (bug original) ──
  const storeA = await createStore({ dbPath: tmpDbPath("noguard"), readEncoder: async () => "DTV1", log: silent });
  storeA.setDesired("tvs", "TV26", "DTV4");
  storeA.setReported("tvs", "TV26", "DTV4"); // write confirmado durante el scan
  await storeA.write();
  const reconNoGuard = createReconciler({ client: staleClient, store: storeA, log: silent });
  await reconNoGuard.scanOnce();
  check(
    "[control] sin guard: la lectura stale PISA reported.TV26 (DTV4 → DTV2)",
    storeA.getDomain("tvs").reported.TV26 === "DTV2"
  );
  check(
    "[control] sin guard: desired.TV26 también se revierte (DTV2)",
    storeA.getDomain("tvs").desired.TV26 === "DTV2"
  );

  // ── B: CON guard → el destino tocado durante el scan NO se adopta ──
  const storeB = await createStore({ dbPath: tmpDbPath("guard"), readEncoder: async () => "DTV1", log: silent });
  storeB.setDesired("tvs", "TV26", "DTV4");
  storeB.setReported("tvs", "TV26", "DTV4");
  await storeB.write();
  // TV26 "tocado" DESPUÉS de arrancado el scan (timestamp futuro = dentro del scan).
  const touched = new Map([["TV26", Date.now() + 1000]]);
  const reconGuard = createReconciler({
    client: staleClient,
    store: storeB,
    log: silent,
    recentlyWritten: (dest, sinceMs) => {
      const t = touched.get(dest);
      return t != null && t >= sinceMs;
    },
  });
  const res = await reconGuard.scanOnce();
  check("[guard] reported.TV26 CONSERVADO (DTV4)", storeB.getDomain("tvs").reported.TV26 === "DTV4");
  check("[guard] desired.TV26 CONSERVADO (DTV4, sin auto-revert)", storeB.getDomain("tvs").desired.TV26 === "DTV4");
  check("[guard] el resto de destinos sí converge (reported.TV01=DTV1)", storeB.getDomain("tvs").reported.TV01 === "DTV1");
  check("[guard] 0 adopciones (nada que adoptar: lo tocado se saltea)", res.adopted === 0);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    `\n${failed === 0 ? "✓ RECONCILER-CONCURRENCY OK (guard scan/write: una lectura vieja no pisa un write nuevo)" : `✗ ${failed} chequeo(s) fallaron`}`
  );
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO:", e);
  process.exit(1);
});
