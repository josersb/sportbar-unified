```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:6e391a4c6d4f1b8c5f146ea7caa523041d52ff144c5a93eb2f83fe6f59c0217d
verdict: pass
blockers: 0
critical_findings: 0
requirements: 2/2
scenarios: 5/5
test_command: pnpm test && node server/broker/verify/verify-dedupe.cjs && node server/broker/verify/run-all.cjs && node src/hooks/verify/verify-broker-core.mjs
test_exit_code: 0
test_output_hash: sha256:0fefe799e1ea51f7148b8dedb081ca5455b7fc956d6d96cc9ec595701039b435
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:e2b7ce9211dcc329c4e7d6837da9f212c18237574d7c68b82a2cbb65521cfb8e
```

# Verify Report — WS5 (dedupe pre-join + lastBatch + force + pre-filtro cliente)

Change: `mejoras-broker` · Slice: WS5 · Branch: `feat/mejoras-broker-ws5` (base `feat/mejoras-broker-ws4e`) · Fecha: 2026-09-15

## Alcance

SOLO WS5. WS1 (auditoría read-only) NO evaluado — sigue pendiente (T-1.x sin marcar).

## Requisitos verificados (2/2)

| Req | Fuente | Resultado | Evidencia |
|---|---|---|---|
| WS5-DEDUPE — Dedupe de escrituras no-op | `specs/state-broker/spec.md` | PASS | Guard pre-join en `executeWrite` (server/server.js:398-460): `skipJoin = !force && confirmedSame && !writeQueue.hasPending(dest)`; no-op responde `{ok, noop:true, confirmed:true, reported}` sin emitir join; `lastBatch` in-memory Map no persistido (server.js:307); `force` plomeado por `/api/tvs/:id/source` (body), `/api/matrix-groups` (body) y `writeInBackground(..., opts)`; `verify-dedupe.cjs` 30/30 checks OK |
| UXF-2 — Toast de no-op y escape forzar | `specs/ux-feedback/spec.md` | PASS | Pre-filtro cliente en `submitIntent` (src/componentes/MatrizVideo.jsx:193-247): intent vacío → `toast.info("sin cambios")` SIN POST ni optimistic; botón "Forzar reenvío" (render-prop Formik, `variant="secondary"`) envía intent completo con `{force:true}`; `setTvSource(id, source, {force})` y `setMatrixGroups(values, {force})` en src/api/arrangerApi.js |

## Escenarios verificados (5/5)

| Scenario | Verificación | Evidencia |
|---|---|---|
| No-op descartado contra reported | verify-dedupe [A] | 2º POST idéntico → 200 `{ok, noop:true, confirmed:true, reported:"DTV3"}`; 1 solo join; desired.TV01=DTV3 registrado por el guard |
| Intención repetida descartada (isBusy) | verify-dedupe [E] | 2 POSTs casi simultáneos en bg → 1 join total; reported.TV03 converge a DTV5. Nota: descarte por FIFO + guard (reported confirmado al correr la 2ª tarea), no por chequeo explícito de `isBusy` — desviación declarada (ver abajo) |
| Escape forzar reenvío | verify-dedupe [B] + verify-broker-core ws5 | POST idéntico con `force:true` → sin `noop`, join re-emitido (2 joins totales); cliente envía `force:true` en body |
| No-op confirmado → toast "sin cambios" | MatrizVideo.test.jsx + verify-broker-core ws5 | Submit sin cambios → toast info "sin cambios", SIN POST ni optimistic (UXF-2) |
| Acción forzar reenvío | MatrizVideo.test.jsx (2 tests) + verify-broker-core ws5 | Botón "Forzar reenvío" envía intent COMPLETO con `{force:true}`; nunca "sin cambios" |

## Escenarios adicionales del prompt (verificados)

- **Doble submit idéntico → 1 llamada**: cliente pre-filtra → 2º submit = intent vacío → toast sin POST (MatrizVideo.test.jsx); server deduplica igual (verify-dedupe [C]: resubmit idéntico → 0 joins).
- **Submit con un solo cambio → solo ese destino**: verify-dedupe [C]: 4 joins de TV11..TV14, luego +7 de los subgrupos cambiados; ningún otro destino.
- **One-join-lag NO produce no-op falso**: verify-dedupe [D]: reported stale (settling 5s > ventana) → re-POST SÍ emite join (2 joins); re-read postergado converge. El guard solo deduplica contra `reported` CONFIRMADO.
- **TVRACK por sub-stream**: verify-dedupe [F]: doble POST tvrack/video → 1 join; 2º es no-op con `noop:true` en respuesta sync.

## Desviación declarada `isBusy` → `hasPending`: VALIDADA

- Dentro de `executeWrite` (que corre DENTRO de la cadena del writeQueue), `isBusy(dest)` es siempre true — la tarea vive en `chains` hasta el `finally`. El "no busy" real del spec ("no hay escrituras pendientes detrás") se materializa como `writeQueue.hasPending(dest)` (writeQueue.js:90-100, contador `queuedCounts` de tareas encoladas sin arrancar).
- **Semántica de `isBusy`/`pendingCount`/`pendingKeys` SIN CAMBIOS**: el diff solo AÑADE `hasPending` + bookkeeping de `queuedCounts`; `isBusy` sigue siendo `chains.has(key)`, `pendingCount` sigue siendo `chains.size`. `verify-writequeue` verde en `run-all` (17 steps ✓).

## PR #13 (`confirmEncoder` + settling): INTACTO

- El diff de `server.js` NO toca `confirmEncoder` ni `CONFIRM_POLICY`: el guard termina antes del join (return en el bloque `skipJoin`, server.js:440-459).
- `verify-confirm-settling.cjs` VERDE dentro de `run-all.cjs` (17 steps, exit 0), incluyendo escenario C (`ok:true, confirmed:true, reported==="DTV3"`).

## Tests ejecutados (todos exit 0)

| Comando | Resultado |
|---|---|
| `pnpm test` | 209/209 tests, 15 archivos pasando |
| `node server/broker/verify/verify-dedupe.cjs` | ✓ DEDUPE OK (30 checks, 6 escenarios A–F) |
| `node server/broker/verify/run-all.cjs` | ✓ TODAS LAS VERIFICACIONES PASARON (17 steps, incl. `verify-dedupe` nuevo y `verify-confirm-settling`) |
| `node src/hooks/verify/verify-broker-core.mjs` | 140/140 verificaciones OK (sección 16: 10 checks WS5) |
| `pnpm run build` | exit 0 |

## Otros puntos del prompt

- **`lastBatch` in-memory, no persistido**: Map en closure de `createServer` (server.js:307); check explícito en verify-broker-core (`ws5: lastBatch in-memory Map<dest,{source,sub,at}>, NO persistido`). NO participa de la decisión de salteo — solo informa el `reason` ("resubmit idéntica (lastBatch)" vs "reported confirmado"). Correcto: un match de lastBatch con `reported` divergente habría generado no-op falso.
- **Escape `force` expuesto por API y usado por cliente**: `executeWrite(dest, source, sub, writeId, timings, opts)` ← `writeInBackground(..., opts)` ← `/api/tvs/:id/source` + `/api/matrix-groups`; respuestas sync de tvrack/zonas-fuera ganan `ok`/`noop` aditivos. Cliente: `setTvSource(id, source, {force})`, `setMatrixGroups(values, {force})`, botón "Forzar reenvío".
- **Pre-filtro cliente contra `estado.tvs` (reported-wins)**, no contra `matrixGroups.desired`: correcto — deduplicar contra `desired` (intención no confirmada) generaría no-ops falsos por one-join-lag. `collapseGroup` undefined (pantallas faltantes) → viaja (ante duda, no saltear).
- **Pseudo-canales 0000/0000A/0000B**: deshabilitados — el diff de WS5 no toca `Canales.jsx` ni `canalesFavoritos.js`.

## Findings

### CRITICAL

Ninguno.

### WARNING

Ninguno.

### SUGGESTION

1. **Broadcast duplicado en bg no-op** (server.js:455 + server.js:751-756): en modo background, `writeInBackground` broadcastea el desired inmediatamente al encolar, y el guard dentro de `executeWrite` broadcastea de nuevo al saltear el join. Payload idéntico e idempotente para los clientes (mismo desired, misma versión) — ruido de SSE menor, sin impacto funcional.
2. **`lastBatch` con key `dest` (sin sub)** (server.js:455-457, :478): un write video seguido de uno audio al mismo destino pisa la entrada; el match de `reason` compara `sub` igualmente, así que el efecto es solo una etiqueta de reason menos precisa ("reported confirmado" en vez de "resubmit idéntica"). La decisión de salteo no usa lastBatch — sin riesgo.
3. **`confirmedReported` en el caso linked reporta `{video: source, audio: source}`** (server.js:406): truthful solo porque `confirmedSame` exige que ambos streams confirmados sean `source`; documentar el invariante si se reutiliza la variable.

## Veredicto

**PASS** — WS5 cumple WS5-DEDUPE (3/3 escenarios) y UXF-2 (2/2 escenarios), la desviación `isBusy`→`hasPending` es semánticamente equivalente y está validada, PR #13 queda intacto (settling verde), y no hay hallazgos críticos ni warnings. Next: listo para archive del slice (WS1 pendiente como PR 9 separado).

## Restricciones respetadas

READ-ONLY sobre source (cero edits), sin hardware, sin push, sin commits. `server/pnpm-lock.yaml` drift ignorado (no commiteado).
