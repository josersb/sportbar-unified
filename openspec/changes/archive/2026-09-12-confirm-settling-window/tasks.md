# Tasks: Ventana de confirmación por comando (settling Arranger v1.3.4)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~210–280 (server.js ~55; verify nuevo ~150–220; run-all 1) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | PR único (o PR 1 seam → PR 2 ventana+verify si se fuerza cadena) |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Low

Justificación honesta: cambio quirúrgico de 3 archivos, muy por debajo del budget de 400. El `verify` nuevo es el grueso, pero es el test de la unidad — va junto al código, no se separa. No necesita cadena; si el orquestador la fuerza (`force-chained`), el único corte coherente es seam (refactor puro) → ventana+verify, y no requiere decisión del usuario.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Seam `options.client` (refactor behavior-preserving) | PR 1 | `node server/broker/verify/run-all.cjs` | N/A — refactor sin cambio de comportamiento | revertir la línea de `server/server.js` en `createServer` |
| 2 | Ventana por comando + verify | PR 2 / PR único | `node server/broker/verify/verify-confirm-settling.cjs` | `node server/broker/verify/run-all.cjs` (suite completa) | revertir constantes + `confirmEncoder` + `executeWrite`, borrar el verify, quitar la línea de `run-all.cjs` |

## Phase 1: Fundación (seam + constantes)

- [x] 1.1 `server/server.js` — seam `const client = options.client || createArrangerClient(...)` en `createServer` (L104). Done: boot idéntico con cliente real; inyectable por verify. Verify: `node server/broker/verify/run-all.cjs` verde.
- [x] 1.2 `server/server.js` — constantes nombradas `CONFIRM_SETTLE_AV_MS=3700`, `CONFIRM_SETTLE_STREAM_MS=2700`, `CONFIRM_FIRST_READ_MS=200` y `CONFIRM_POLICY` frozen. Done: valores = design; comentario con settling medido (3340/2302 ms) + margen.

## Phase 2: Implementación (confirmEncoder + executeWrite)

- [x] 2.1 `server/server.js` — `confirmEncoder(dest,sub,source,writeId, policy=CONFIRM_POLICY.video)`: read#1 inmediato; si no confirma, `remaining=Math.max(CONFIRM_FIRST_READ_MS, policy.settleMs-(Date.now()-startMs))`, sleep, read#2. Done: sin backoff 3×; retorno `{value,confirmed}` intacto.
- [x] 2.2 `server/server.js` — `executeWrite` deriva `joinKind` y pasa `CONFIRM_POLICY[joinKind]` a los dos call sites (linked paralelo + single). Done: `av` para tvs/linked, `video`/`audio` si no; única fuente con el dispatch.
- [x] 2.3 `server/server.js` — actualizar comentarios obsoletos ("~1.5s", L220 y L367-372) a la ventana por comando. Done: ningún comentario describe la ventana fija vieja.

## Phase 3: Verificación (verify determinístico)

- [x] 3.1 `server/broker/verify/verify-confirm-settling.cjs` (NUEVO) — `createSettleClient({avSettleMs,streamSettleMs})` que envuelve `createArrangerClient({mock:true})`; inyectar vía `createServer({client})`; `reconcilerIntervalMs:3_600_000` + drain de `writeQueue` antes del cleanup. Done: corre standalone (`node server/broker/verify/verify-confirm-settling.cjs`) → exit 0.
- [x] 3.2 Escenario A: TV → `join av`, `avSettleMs=3340` → `confirmed:true`, elapsed≥3340.
- [x] 3.3 Escenario B: TVRACK `link=false` → `join video`, `streamSettleMs=2302` → `confirmed:true`.
- [x] 3.4 Escenario C: re-POST del mismo source → no-op, elapsed<ventana.
- [x] 3.5 Escenario D: `avSettleMs=5000>3700` → `confirmed:false`, `reported` no envenenado, re-read 3s converge.
- [x] 3.6 Escenario E: guard de margen ≥300 ms (regex `CONFIRM_SETTLE_*` sobre `server.js`).
- [x] 3.7 `server/broker/verify/run-all.cjs` — registrar el verify (1 línea). Done: `node server/broker/verify/run-all.cjs` verde, `verify-write-confirm` intacto.
      Resuelto (opción a): se plombea `mockLagSettleMs` → `createArrangerClient` → `createMockArranger({ lagSettleMs })`; el Escenario E-b usa `mockLagSettleMs: 5000` (lag > ventana av 3700 y < re-read ~6,9 s). Además se estabilizó una carrera latente del Escenario 429 (baseline `reportedBefore` capturado antes de la hidratación del reconciler). `run-all.cjs` → exit 0.

## Phase 4: Cierre

- [x] 4.1 Correr suite completa y registrar la salida exacta: `node server/broker/verify/run-all.cjs`
      Salida: `✓ TODAS LAS VERIFICACIONES PR 1 + PR 2 PASARON` → exit 0. `verify-confirm-settling` y `verify-write-confirm` verdes. `pnpm test` → 181 passed.
- [x] 4.2 Dejar nota en el comentario de constantes para re-medir el settling si cambia el firmware (v1.3.4 → ≥1.4.0.0).

## Phase 5: Cobertura de los 2 escenarios faltantes del delta (sdd-verify fail → cerrado con tests)

- [x] 5.1 Escenario F (verify) — "Primer read retrasado por congestión" (spec delta `state-broker`): cliente fake con `firstReadDelayMs=1000` (read#1 espera turno del semáforo, NO settling). F1: retraso absorbido por la ventana → `confirmed:true`, `reported=DTV5` (no stale). F2: retraso + settling 5000 > ventana → `confirmed:false`, `reported` conserva DTV1 (no envenenado). Done: 10 checks verdes.
- [x] 5.2 Escenario G (verify) — "Comando falla" (endpoint-level): cliente fake con `joinFails:true` (`joinAv`/`joinVideo`/`joinAudio` → `{ok:false, error:"boom"}`). POST real a `/api/tvs/TV08/source` → **HTTP 502** (mapeo `!result.ok → 502` verificado en `server.js`), `reported.TV08` intacto, sin broadcast de convergencia (`broker.bus.publish` espiado). Done: 4 checks verdes.
- [x] 5.3 Fix R3-1 (audit confiabilidad, WARNING) — `verify-write-confirm.cjs` Escenario C recuperó su semántica: `runScenario` acepta `lagSettleMs` y lo reenvía como `mockLagSettleMs`; C usa `lagSettleMs: 5000` (> ventana av 3700 → el write queda realmente `unconfirmed`, sin depender de la carrera de ~200 ms del `sleep(3500)`) y comentarios obsoletos actualizados. NO se tocó producción, ni E-b, ni el Escenario 429.
