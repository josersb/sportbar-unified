"use strict";

/**
 * Verificación PR 1 + PR 2 — State Broker foundation + composition.
 *
 * Sin test runner y sin hardware: cada script usa require directo contra los
 * módulos de server/broker/ (o createServer contra mock en puerto efímero).
 * Exit code 0 = verificación OK.
 *
 *   node server/broker/verify/run-all.cjs
 */

const { spawnSync } = require("child_process");
const path = require("path");

const steps = [
  ["verify-destinations", "destinos canónicos (40, sin duplicados, mapa VW)"],
  ["verify-mock", "mockArranger modos normal/blip/offline deterministas"],
  ["verify-arranger-client", "arrangerClient getEncoder/joinAv + retry + FW-LOCKED"],
  ["verify-store", "store v3: migración v2→v3 + backup + fresh-start"],
  ["verify-eventbus", "eventBus hub SSE: snapshot, incremental, heartbeat, máx 10"],
  ["verify-writequeue", "writeQueue FIFO por destino: serie, última intención gana"],
  ["verify-reconciler", "reconciler: auto-adopt, null no pisa, single-flight, intervalo"],
  ["verify-composition", "composition server.js: endpoints nuevos + legacy + SSE + stale→synced"],
];

let failed = 0;
for (const [name, label] of steps) {
  const script = path.join(__dirname, `${name}.cjs`);
  const result = spawnSync(process.execPath, [script], { encoding: "utf-8" });
  const ok = result.status === 0;
  console.log(`\n${ok ? "✓" : "✗"} ${name} — ${label}${ok ? "" : " (FALLÓ)"}`);
  process.stdout.write(result.stdout || "");
  if (result.stderr) process.stderr.write(result.stderr || "");
  if (!ok) failed += 1;
}

console.log(`\n${failed === 0 ? "✓ TODAS LAS VERIFICACIONES PR 1 + PR 2 PASARON" : `✗ ${failed} verificación(es) fallaron`}`);
process.exit(failed === 0 ? 0 : 1);
