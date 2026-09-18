"use strict";

/**
 * Verificación del state broker (slices WS2→WS3→WS4a→…, un step por PR).
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
  ["verify-vite-proxy", "proxy Vite dev: TODO /api/<seg> usado por el cliente está proxeado al Express del worktree"],
  ["verify-destinations", "destinos canónicos (41, sin duplicados, mapa VW)"],
  ["verify-mock", "mockArranger modos normal/blip/offline deterministas"],
  ["verify-arranger-client", "arrangerClient getEncoder/joinAv + retry + FW-LOCKED"],
  ["verify-arranger-errors", "QW-1: clasificación de errores del Arranger (transient/permanent/unknown) + join"],
  ["verify-arranger-presets", "QW-4: presets programáticos (ensure borrar-antes, delete idempotente, load delay min, naming sb_, errores tipificados)"],
  ["verify-semaphore", "hotfix 6: semáforo global serial, FIFO, watchdog, batch 29"],
  ["verify-store", "store v3: migración v2→v3 + backup + fresh-start"],
  ["verify-eventbus", "eventBus hub SSE: snapshot, incremental, heartbeat, máx 10"],
  ["verify-writequeue", "writeQueue FIFO por destino: serie, última intención gana"],
  ["verify-reconciler", "reconciler: auto-adopt, null no pisa, single-flight, intervalo, sync-status post-scan"],
  ["verify-reconciler-concurrency", "fix clobber scan/write: una lectura vieja NO pisa un write durante el scan"],
  ["verify-write-confirm", "write-confirm: retry getEncoder post-join (settle) → reported correcto"],
  ["verify-confirm-settling", "confirm-settling: ventana por comando (av/stream) + no-op + unconfirmed"],
  ["verify-channel-intent", "WS3 channel-intent: intención+ACK, noop sin IR, reported null, reload, snapshot"],
  ["verify-groups", "WS4a matrixModel+groups: modelo declarativo (3 zonas/10 subgrupos), opciones, expansión, mixed→null, round-trip"],
  ["verify-matrix-groups", "WS4b matrix-groups: dominio server-authoritative, validación optionsFor, snapshot matrixModel, preset server-side"],
  ["verify-dedupe", "WS5 dedupe: guard pre-join (no-op confirmado), escape force, un-solo-cambio, one-join-lag, in-flight"],
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

console.log(`\n${failed === 0 ? "✓ TODAS LAS VERIFICACIONES PASARON" : `✗ ${failed} verificación(es) fallaron`}`);
process.exit(failed === 0 ? 0 : 1);
