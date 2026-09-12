```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:90020dc2a1a06ed4b9e45e011cee1967eef6e57fa84088aadc82851d5da18efc
verdict: pass
blockers: 0
critical_findings: 0
requirements: 2/2
scenarios: 7/7
test_command: node server/broker/verify/run-all.cjs
test_exit_code: 0
test_output_hash: sha256:9abd34b010aed846fef45c213304140f8bbf39b17855617a71d8853a9dc13fd9
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:b7b62ab2caa77a2bbd99b3baed0248dde5b5cfcdda56ea80015499eac85ce428
```

## Verification Report

**Change**: confirm-settling-window
**Version**: rama `feat/confirm-settling`, worktree `confirm-settling` (cambios en working tree; HEAD `3c449f7` == `v2`). Re-verificación tras cerrar los 2 gaps de cobertura (Escenarios F y G).
**Mode**: Standard (`strict_tdd: false`; sin runner formal del server, suite ad-hoc `verify-*.cjs`)

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 14 |
| Tasks complete | 14 |
| Tasks incomplete | 0 |

`gentle-ai sdd-status confirm-settling-window` reporta `taskProgress { total: 14, completed: 14, pending: 0, allComplete: true }`, `dependencies.verify: ready`. Verificación completa habilitada.

### Build & Tests Execution

**Build**: ✅ Passed
```text
$ pnpm run build
$ vite build
vite v5.4.21 building for production...
✓ 245 modules transformed.
✓ built in 4.41s
```
exit 0 · output_hash `sha256:b7b62ab2caa77a2bbd99b3baed0248dde5b5cfcdda56ea80015499eac85ce428`

**Type-check (server, syntax)**: ✅ Passed — no hay build de server; `node --check server/broker/verify/verify-confirm-settling.cjs` → exit 0 (sin salida). Los archivos de producción ya validados en la corrida previa no cambiaron.

**Tests (verify dedicado del cambio)**: ✅ Passed — `node server/broker/verify/verify-confirm-settling.cjs`
```text
✓ [A] confirmed:true · reported=DTV3 · elapsed ≥ 3340ms (3894ms)
✓ [B] TVRACK link=false → join video · reported.video=DTV7 · elapsed ≥ 2302ms (2734ms)
✓ [C] no-op: confirmed:true · elapsed 40ms < ventana
✓ [D] avSettleMs=5000>3700 → confirmed:false · reported no envenenado · re-read 3s converge
✓ [F1] congestión (read#1 +1006ms) → confirmed:true dentro de la ventana · reported=DTV5 · no envenenado
✓ [F2] congestión + settling>ventana → confirmed:false · reported:null · store intacto
✓ [G] join falla → HTTP 502 · ok:false/error "boom" · reported intacto · sin broadcast tvs
✓ [E] guard de margen ≥300ms (av 360, stream 398) + CONFIRM_POLICY frozen
✓ CONFIRM-SETTLING OK (ventana por comando + no-op + unconfirmed + congestión + join-fail + guard)
```
exit 0 · output_hash `sha256:bba92a37b010e5cdda9a4854f5ea56df94f0be4f4a3869489e7c50f96552d6d1`

**Tests (suite broker completa)**: ✅ Passed — `node server/broker/verify/run-all.cjs`
```text
✓ verify-confirm-settling — confirm-settling: ventana por comando (av/stream) + no-op + unconfirmed
✓ verify-write-confirm — write-confirm: retry getEncoder post-join (settle) → reported correcto
✓ TODAS LAS VERIFICACIONES PR 1 + PR 2 PASARON
```
exit 0 · output_hash `sha256:9abd34b010aed846fef45c213304140f8bbf39b17855617a71d8853a9dc13fd9` (12/12 steps verdes)

**Tests (frontend)**: ✅ Passed — `pnpm test` (vitest 3.2.6)
```text
Test Files  15 passed (15)
     Tests  181 passed (181)
```
exit 0 · output_hash `sha256:8dcc085655f3fdd02092b1328d433c7bec5c4e1c99cf22e026edc3f62c398b9b`
(Warnings `act(...)` pre-existentes en MatrizVideo/Canales/Audio/Formik: no afectan el resultado.)

**Coverage**: ➖ Not available (sin umbral de coverage configurado; el proyecto no instrumenta coverage)

### Spec Compliance Matrix

Delta spec: `openspec/changes/confirm-settling-window/specs/state-broker/spec.md` → 2 requirements, 7 scenarios.

| Requirement | Scenario | Test (evidencia runtime) | Result |
|-------------|----------|--------------------------|--------|
| Flujo de comando con await | Escritura confirmada | `verify-confirm-settling.cjs:164-186` (Esc. A: `confirmed:true`, `reported=DTV3`) + `verify-composition.cjs:110` | ✅ COMPLIANT |
| Flujo de comando con await | Comando falla | `verify-confirm-settling.cjs:292-316` (Esc. G: `[G] POST con join fallido → HTTP 502`, `reported.TV08 intacto`, `no se emitió broadcast de convergencia para tvs`) | ✅ COMPLIANT |
| Flujo de comando con await | Ventana agotada sin confirmar | `verify-confirm-settling.cjs:205-236` (Esc. D: `confirmed:false`, `reported NO envenenado`, re-read converge a DTV4) | ✅ COMPLIANT |
| Ventana de confirmación por tipo de comando | `join av` a destino aislado confirma en ventana | `verify-confirm-settling.cjs:165-175` (Esc. A: `get#2 TV01/video → DTV3 ✓ (settled)` a t+3711ms, `elapsed 3894ms ≥ 3340`, `setReported ... confirmed=true`, sin `SKIP`) | ✅ COMPLIANT |
| Ventana de confirmación por tipo de comando | `join video`/`join audio` confirma en ventana | `verify-confirm-settling.cjs:190-201` (Esc. B: `elapsed 2734ms ≥ 2302`, `reported.video=DTV7`); el path `join audio` se ejercita en `verify-composition` (TVRACK audio) con la misma política `stream` | ✅ COMPLIANT |
| Ventana de confirmación por tipo de comando | No-op confirma con el primer read | `verify-confirm-settling.cjs:177-185` (Esc. C: `get#1 ... ✓ (settled)` a t+0ms, `elapsed 40ms < 3340`) | ✅ COMPLIANT |
| Ventana de confirmación por tipo de comando | Primer read retrasado por congestión | `verify-confirm-settling.cjs:248-281` (Esc. F1: `read#1 ... t+1006ms`, `confirmed:true`, `reported=DTV5`, no envenenado; F2: `confirmed:false`, `reported:null`, store intacto) | ✅ COMPLIANT |

**Compliance summary**: 7/7 scenarios compliant (todos con covering test que pasó en runtime).

### Cierre de los gaps de la corrida previa

| Gap previo | Estado | Evidencia |
|------------|--------|-----------|
| `Primer read retrasado por congestión` UNTESTED | ✅ Cerrado | Escenario F (`verify-confirm-settling.cjs:248-281`): el fake retrasa el read#1 (`firstReadDelayMs`, líneas 83-86 y 97-100) y cubre ambas ramas del spec — F1 resuelve dentro de la ventana (`confirmed:true`), F2 cae en no-confirmado (`confirmed:false`); en ambos `reported` no se envenena. |
| `Comando falla` UNTESTED (endpoint) | ✅ Cerrado | Escenario G (`verify-confirm-settling.cjs:292-316`): `joinFails:true` (línea 73-74) → el endpoint `/api/tvs/:id/source` responde `502` (`server.js:779-780`), `reported.TV08` intacto y sin broadcast del dominio `tvs` (espía `bus.publish` tras esperar el scan del reconciler). |

### Correctness (Static Evidence)

| Requirement / pieza | Status | Notes |
|---------------------|--------|-------|
| Constantes de settling nombradas + `CONFIRM_POLICY` frozen | ✅ Implemented | `server/server.js:212-221` |
| `confirmEncoder` con `policy` (read#1 + read#2 anclado) | ✅ Implemented | `server/server.js:207-268` |
| `executeWrite` deriva `joinKind` (single-source) y pasa `CONFIRM_POLICY[joinKind]` | ✅ Implemented | `server/server.js:384-416` |
| Seam de test `options.client` | ✅ Implemented | `server/server.js:104-107` |
| Plumbing `mockLagSettleMs` → mock (behavior-preserving) | ✅ Implemented | `arrangerClient.js:61` + `server.js:107`; default mock `|| 3000` |
| No-drift: `scheduleDelayedReRead` / `REREAD_DELAYS_MS` / reconciler / semáforo | ✅ Implemented | Sin cambios; el diff de `server.js` no toca esas líneas |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Constantes nombradas (`3700`/`2700`/`200`) | ✅ Yes | Valores exactos del design |
| 5º param `policy`; retorno `{value,confirmed}` intacto | ✅ Yes | `server.js:224` |
| `joinKind` reutilizado por dispatch y política (single-source) | ✅ Yes | `server.js:386-416` |
| 2 reads anclados (no N backoffs) | ✅ Yes | `server.js:242-268` |
| Cliente fake inyectado vía `options.client` | ✅ Yes | `verify-confirm-settling.cjs:67-111` |
| "`verify-write-confirm` intacto" | ⚠️ No (desviación documentada, aceptada) | Requirió `mockLagSettleMs` + fix de carrera 429 |

### Scope / No-Drift (re-verificación)

El diff de los archivos de **producción** no cambió respecto de la corrida previa: `server.js` (+74/−37), `arrangerClient.js` (2 líneas), `run-all.cjs` (+1), `verify-write-confirm.cjs` (+13/−5). Los escenarios F y G viven **solo** en el archivo de test no trackeado `server/broker/verify/verify-confirm-settling.cjs`. No hay drift nuevo de producción. No hay cambios en `scheduleDelayedReRead`, `REREAD_DELAYS_MS`, el reconciler ni el semáforo.

### Issues Found

**CRITICAL**: None

**WARNING**: None

**SUGGESTION**:
- `server/pnpm-lock.yaml` modificado sin declarar: bump transitivo `ip-address@10.5.0 → 10.7.0` (4 líneas). Sin impacto funcional conocido; conviene revertirlo o declararlo. (Pre-existente, no introducido por los tests nuevos.)
- Escenario F simula la congestión del semáforo retrasando el primer read en el cliente fake (`firstReadDelayMs`) en lugar de competir por el semáforo real. Es un proxy fiel del efecto observable (read#1 tardío) y el semáforo en sí está cubierto por `verify-semaphore.cjs`; se deja como nota, no como gap.
- Verificación contra el Arranger físico (192.168.2.254) fuera del alcance de este agente y pendiente.

### Verdict

**PASS**

Los 4 comandos de evidencia ejecutable pasan (exit 0): `verify-confirm-settling.cjs` (todos los checks, incluidos F1/F2/G), `run-all.cjs` (12/12), `pnpm test` (181/181) y `pnpm run build` (245 módulos). Los 7 escenarios del delta tienen covering test que pasó en runtime: los 2 gaps de la corrida anterior (`Primer read retrasado por congestión`, `Comando falla`) quedaron cerrados por los Escenarios F y G. La implementación del comportamiento modificado está correcta, no hay drift nuevo de producción y las desviaciones (a)/(b) siguen aceptadas. Sin blockers ni findings CRITICAL/WARNING.
