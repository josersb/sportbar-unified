```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:9ac2742ebde787d9d16b7d040237e39fe7f64b0bfb133dcda3167512e61e60b4
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 5/5
scenarios: 12/12
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:f18bafc7b730ad43b1be3d77d32d03caac1b83f3083892943a5f859cad89828b
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:ab25b38dd283eaf65f53337c32ab8b8b3b46e4ec5378127b6e573c2fcc1f30e0
```

# Verify Report: `vwall-libertador`

Change: `vwall-libertador` · Rama `feat/LedWallmas15` (v2 @ 927a616) · Worktree `mejoras-broker` · Fecha: 2026-09-18
Commits del change: `33940f3` (T1–T5 cliente), `1e0b121` (T6–T10 broker), `a26090c` (T11–T13 docs/evidencia), `5dee545` (fix del CRITICAL + test de regresión).

## Veredicto: PASS_WITH_WARNINGS (0 CRITICAL) — re-verificación post-fix `5dee545`

El CRITICAL de la verificación previa quedó resuelto y no se introdujo nada nuevo. Los 5 requirements y los 12 scenarios del spec están verificados. Persisten los 2 WARNING conocidos (drift D5 `link:true/false` y GIVEN desactualizado del spec `registro-dispositivos`), ambos fuera de scope del change y ya registrados.

## Evidencia ejecutada (propia, post-fix `5dee545`)

| Comando | Resultado |
|---|---|
| `pnpm test` | ✓ 224/224 tests, **17 archivos** · exit 0 · incluye `ZonasFueraStatus.test.jsx` (4 tests) y `zonasFuera.test.js` (11 tests) |
| `node server/broker/verify/run-all.cjs` | ✓ TODAS LAS VERIFICACIONES PASARON · exit 0 · 17 steps · broadcasts confirman las 11 zonas con `aMas15-Vwall-Libertador` |
| `node server/broker/verify/verify-store.cjs` | ✓ STORE OK · exit 0 · 68 checks (T7 backfill #11 idempotente, en memoria y en disco, sin bump) |
| `node server/broker/verify/verify-destinations.cjs` | ✓ exit 0 · 41 destinos, 11 zonas, orden canónico literal (check "orden canónico de zonas fuera (lista cliente/zonasFuera.js)"), sin duplicados |
| `pnpm run build` | ✓ built in 4.91s · exit 0 · reproducible: los hashes de assets del build de re-verificación coinciden con el del build de la sesión de fix (`index-BhXfhMFy.js`, `router-Bdk2t8SK.js`) |
| `git diff 927a616...HEAD -- wiki/` | 0 líneas — **wiki/** intacto ✓ (requisito PROHIBIDO wiki sigue cumplido) |
| `git show 5dee545 --stat` | El fix solo tocó `src/componentes/ZonasFueraStatus.jsx` (+20/−17) y `src/componentes/ZonasFueraStatus.test.jsx` (+66, nuevo) — sin cambios colaterales |

`evidence_revision` = sha256 del bundle (salida íntegra de `pnpm test` + run-all/verify-store/verify-destinations + build). Salidas íntegras en `%TEMP%\opencode\vwall-verify\` (`tests-postfix.log`, `verify-broker-postfix.log`, `build-postfix.log`, `bundle-postfix.log`).

## Resolución del CRITICAL (hallazgo #1 del reporte previo)

**Fix verificado (`5dee545`)**: `ZonasFueraStatus.jsx:46-47` ahora bindea `const data = zonasFueraState[id] || {};` dentro de `ids.map((id) => { ... })`. Las referencias a `data.video`/`data.audio` (líneas 53, 55, 59, 61) tienen binding por iteración. Es exactamente el fix trivial prescripto en el reporte previo; no se alteró ninguna otra lógica del componente (loading/empty states y orden canónico intactos).

**El test nuevo falla sin el fix (razonado por inspección)**: los tests 2–4 de `ZonasFueraStatus.test.jsx` montan el componente con `estadoLoaded: true` y `zonasFueraState` no vacío → el early-return de loading (línea 11) no aplica → se ejecuta `ids.map(...)`. Sin el binding de `data`, el primer acceso `data.video` lanza `ReferenceError: data is not defined` durante el render (el identificador no existe en ningún scope: ni módulo, ni componente, ni callback del map), el componente crashea y los 3 tests fallan. El test 1 (loading) haría early-return antes del map y pasaría en ambos mundos. Con el fix: los 4 tests pasan (verificado en la corrida: `✓ src/componentes/ZonasFueraStatus.test.jsx (4 tests)`).

**Orden/labels de las 11 zonas**: confirmados por triple vía — (1) `src/data/zonasFuera.js:25-37` mantiene el array canónico con los 11 ids literales case-sensitive y labels ("VIP Bar Lobby", "VIP Bar Bóveda", "VIP Barra Centro", "Rack VIP Bataca", "Barra Irineo +15", "Led Wall +15", "QMR75 -1 TV1", "QMR75 -1 TV2", "QMC65 -1 TV2", "Escenario -1", "Escenario -1 (2)"); (2) `verify-destinations.cjs` pasa el check "orden canónico de zonas fuera" contra la lista cliente; (3) el test de regresión "respeta el ORDEN CANÓNICO de las 11 zonas" (cursor monótono sobre `indexOf`) y `zonasFuera.test.js` (11 tests) pasan.

## Impacto en Requirements (5) y Scenarios (12)

### zonas-fuera-state (3 req, 8 scenarios) — 3/3 req completos (antes 2/3)

**R2 Canonical Zone Order and Labels (ADDED) — PASS (antes FAIL por el CRITICAL).**
- S3 *Order parity across views* — **PASS (resuelto)**: la vista Aside (`ZonasFueraStatus`) renderiza con estado cargado; orden canónico y labels asertados por test propio.
- S4 *Renamed labels resolved* — PASS (se mantiene).
- S5 *New zone parity* — PASS (se mantiene).

R1 (S1, S2) y R3 (S6–S8) — PASS sin cambios (verificados nuevamente vía verify-store/run-all: 68 checks verdes, backfill T7 idempotente en memoria y disco).

### destinos-adicionales (1 req, 2 scenarios) — PASS sin cambios

- S9 *Build succeeds* — PASS: build exit 0, reproducible.
- S10 *Preset load excludes zones* — PASS: broadcast `tvs` mantiene "29 keys"; las 11 zonas viajan por endpoints dedicados (w-010..w-021 en run-all).

### registro-dispositivos (1 req, 2 scenarios) — PASS sin cambios

- S11 *Destinations exposed to components* — PASS.
- S12 *Source and destination separation* — PASS.

## Findings (estado post-fix)

### CRITICAL — ninguno pendiente

1. ~~ZonasFueraStatus crashea con estado cargado~~ — **RESUELTO en `5dee545`** (fix + test de regresión). Ver arriba.

### WARNING (persisten, ambos fuera de scope y sin regresión)

2. **Drift link spec/código** — sin cambios: spec declara Default Link `true`; código usa `false` (`store.js:75` y backfill `:139`). Drift D5, registrado, fuera de scope.
3. **Spec registro-dispositivos desactualizado en su GIVEN** — sin cambios: dice "destinations in estado.tvs"; la arquitectura los aloja en dominio `zonasFuera` + módulo cliente. El THEN se cumple.

### SUGGESTION (estado)

4. ~~Gap de cobertura que ocultó el CRITICAL~~ — **CERRADO**: `ZonasFueraStatus.test.jsx` (4 tests) cubre loading, loaded-no-crash, orden canónico y fallback de desconocidas.
5. **`lastUpdated` por zona** — persiste el matiz de modelado (spec describe `{..., lastUpdated}` por entrada; código lo mantiene a nivel de dominio). No bloquea.

## Conteos del validador

- Requirements autoritativos: **5** (zonas-fuera-state 3 + destinos-adicionales 1 + registro-dispositivos 1).
- Scenarios autoritativos: **12** (S1–S8 + S9–S10 + S11–S12).
- Completados: **5/5 requirements, 12/12 scenarios**.

## Next

- `ready-for-archive`: el change puede pasar a `sdd-archive`. Post-merge pendientes ya registrados en tasks DoD: `join av DTVx aMas15-Vwall-Libertador` contra hardware real y confirmación visual del Aside.

## Risks

- Riesgo de regresión del CRITICAL acotado y cubierto: el test de regresión fallaría si alguien reintroduce la pérdida de binding (3 de sus 4 tests montan con estado cargado).
- Los 2 WARNING conocidos siguen documentados; ninguno afecta comportamiento observable del change.

---

## Reporte previo (pre-fix, preservado íntegro)

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:b31a5de023d61a2e8450d596d671259e4ebbda655926998d9e783c0e8a3e28cf
verdict: fail
blockers: 1
critical_findings: 1
requirements: 4/5
scenarios: 11/12
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:0c5e3f2588505b802d6a49ec46c4f5916d8b49214ff02d0103069302b71629e2
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:72930d641b47c19f71cb168c0f6735ec14793a88dc61dd3e0b460cb6cf54b3d3
```

# Verify Report: `vwall-libertador`

Change: `vwall-libertador` · Rama `feat/LedWallmas15` (v2 @ 927a616) · Worktree `mejoras-broker` · Fecha: 2026-09-18
Commits del change: `33940f3` (T1–T5 cliente), `1e0b121` (T6–T10 broker), `a26090c` (T11–T13 docs/evidencia).

## Veredicto: FAIL (1 CRITICAL) — todo lo demás pasa

El change es correcto en su lógica (orden canónico, labels, backfill idempotente, 41 destinos, no-regresión), pero introdujo un **crash de runtime en el Aside** que ningún chequeo automático cubre. No se corrigió nada (verify es read-only).

## Evidencia ejecutada (propia, no heredada del apply)

| Comando | Resultado |
|---|---|
| `node server/broker/verify/run-all.cjs` | ✓ TODAS LAS VERIFICACIONES PASARON · exit 0 · 17 steps · broadcasts confirman las 11 zonas con `aMas15-Vwall-Libertador` |
| `node server/broker/verify/verify-store.cjs` | ✓ STORE OK · exit 0 · 68 checks (incluye T7 completo: backfill, idempotencia, sin bump, sin backup) |
| `node server/broker/verify/verify-destinations.cjs` | ✓ exit 0 · 41 destinos, 11 zonas, orden canónico literal, sin duplicados |
| `pnpm test` | ✓ 220/220 tests, 16 archivos · exit 0 (incluye 11 de `zonasFuera.test.js`, 41 de `MatrizVideo.test.jsx`) |
| `pnpm run build` | ✓ built in 9.52s · exit 0 (scenario Build succeeds del spec destinos-adicionales) |
| `git diff 927a616...HEAD -- wiki/` | 0 líneas — **wiki/** intacto ✓ (requisito PROHIBIDO wiki cumplido) |

`evidence_revision` = sha256 del bundle (diff completo + verify-store + verify-destinations + build + salida completa de `pnpm test` + salida completa de `run-all`). Salidas íntegras en `%TEMP%\opencode\vwall-verify\`.

## Requirements (5) y Scenarios (12) del spec

### zonas-fuera-state (3 req, 8 scenarios) — 2/3 req completos

**R1 Zone State Structure (MODIFIED) — PASS.** 11 zonas con video/audio DTV + link boolean en `src/data/zonasFuera.js`, `server/broker/destinations.js` y defaults del store (`store.js:68-76`). Order parity consigo misma ✓.
- S1 *State loaded from lowdb* — PASS: composition (run-all) carga 11 claves con video/audio/link; `lastUpdated` a nivel de dominio (matiz de modelado, no de comportamiento).
- S2 *Default on missing key* — PASS con WARNING: defaults DTV1/DTV1 ✓, pero `link: false` en código vs `link: true` en spec (drift D5 registrado, fuera de scope por instrucción del orquestador; `store.js:75` y backfill `:139`).

**R2 Canonical Zone Order and Labels (ADDED) — FAIL por el CRITICAL.** El módulo único es correcto y los labels coinciden 1:1 con el spec ("VIP Bar Lobby", "VIP Bar Bóveda", "VIP Barra Centro", "Rack VIP Bataca", "Barra Irineo +15", "Led Wall +15", "QMR75 -1 TV1", "QMR75 -1 TV2", "QMC65 -1 TV2", "Escenario -1", "Escenario -1 (2)"; tests los asertan todos). MatrizVideo consume el módulo sin hardcode (`MatrizVideo.jsx:379-412`). Pero ZonasFueraStatus, la segunda vista, crashea en runtime → no hay "order parity across views" funcional.
- S3 *Order parity across views* — **FAIL (CRITICAL)**: la vista Aside no renderiza con estado cargado.
- S4 *Renamed labels resolved* — PASS: tests (`zonasFuera.test.js`) afirman "VIP Bar Lobby" y "Barra Irineo +15" (nunca "VIP Lobby Batacazo"/"+15 Barra").
- S5 *New zone parity* — PASS: `MatrizVideo.test.jsx` "renders 11 zona cards with labels from zonasFuera.js"; la #11 tiene exactamente los mismos controles que las otras 10 (video + link; audio vía `/api/zonas-fuera/<id>/audio`, probado en composition con write-through y link).

**R3 Zone Key Backfill in normalizeV3 (ADDED) — PASS.** `store.js:133-147`: `desired[zoneId] ??= {video:DTV1,audio:DTV1}` y `appOnly.zonasFuera[zoneId] ??= {link:false}`; sin backup/rescan/bump.
- S6 *Backfill missing zone* — PASS: verify-store T7 (en memoria y en disco: #11 con desired DTV1/DTV1 y appOnly link).
- S7 *Backfill idempotente* — PASS: T7 re-run con JSON idéntico (`outT7` → `normalizeV3(outT7)`), schemaVersion intacto, sin bump.
- S8 *Existing zones preserved* — PASS: 10 zonas previas conservan DTV3/DTV2 y link:true del seed.

### destinos-adicionales (1 req, 2 scenarios) — PASS

**R4 Build and Tests (MODIFIED) — PASS.**
- S9 *Build succeeds* — PASS: `pnpm run build` exit 0.
- S10 *Preset load excludes zones* — PASS: broadcasts `tvs` = "29 keys" (26 TV + 3 VW) — las 11 zonas NO viajan en el batch de TVs; el preset load del composition escribe zonasFuera por endpoints dedicados (w-010..w-021).

### registro-dispositivos (1 req, 2 scenarios) — PASS

**R5 Destination Registration (MODIFIED) — PASS.**
- S11 *Destinations exposed to components* — PASS: `ZONAS_FUERA` expone id (nombre Arranger) + label; `zonaFueraLabel` y `orderedZonaFueraIds` son la API de consulta. Matiz: el GIVEN del spec dice "in estado.tvs" pero la arquitectura final los tiene en el dominio `zonasFuera` del broker + módulo cliente (evolución ya aprobada en design); el contrato observable se cumple.
- S12 *Source and destination separation* — PASS: `src/contexto/dispositivos.js` registra solo los 8 IPEX5001 (DTV1–DTV8); `getByCapability('videoSource')` devuelve solo fuentes. Los destinos no están en ese registry.

## Requisitos adicionales del orquestador

- **Orden canónico en 3 archivos** — idéntico byte a byte en `src/data/zonasFuera.js`, `server/broker/destinations.js` (`ZONA_FUERA_IDS`, check "orden canónico" de verify-destinations) y `scripts/dump-arranger-state.cjs` ✓.
- **Zona #11 con paridad** — presente en cliente, server (MATRIX_DESTINATIONS=41, ZONA_FUERA_IDS=11) y evidencia hardware `API commands/devices_all.txt` (`aMas15-Vwall-Libertador-6C9308710CD2`) ✓.
- **IDs literales case-sensitive** — los 11 ids coinciden exactamente entre los 3 archivos y devices_all.txt ✓.
- **No-regresión** — `reconciler.js` solo cambió un comentario (40→41, 13 líneas de diff); dedupe WS5 y guard del reconciler verificados verdes en run-all (escenarios dedupe A–F, settling `[CONFIRM ... stale, espera settling]` de PR #13 intacto); `confirmEncoder` sin tocar ✓.
- **Drift `link:true`(spec)/`false`(código)** — se mantiene como estaba (instrucción explícita); registrado como WARNING, no corregido ✓.
- **`server/pnpm-lock.yaml`** — queda modificado (drift pre-existente de install); NO se propuso commit alguno (verify read-only) ✓.

## Findings

### CRITICAL
1. **ZonasFueraStatus crashea con estado cargado** — `src/componentes/ZonasFueraStatus.jsx:46-60`. El cambio de `zonas.map(([id, data]) => ...)` a `ids.map((id) => ...)` (33940f3) dejó `data.video`/`data.audio` (líneas 51, 53, 57, 59) sin binding → `ReferenceError: data is not defined` en el primer render con `estadoLoaded=true` y ≥1 zona. Rompe el escenario S3 (order parity) y la vista "Estado de otras zonas" del Aside. Por qué no lo atrapó nada: no existe `ZonasFueraStatus.test.jsx`; `BodyResponsive.test.jsx:10` monta el Aside con estado mínimo (`estadoLoaded` falsy → early-return de loading); build/ESLint no detectan referencias runtime. Fix trivial para la fase de corrección: `const data = zonasFueraState[id] || {};` dentro del map (o desestructurar). NO corregido aquí (verify read-only).

### WARNING
2. **Drift link spec/código** — spec `zonas-fuera-state` declara Default Link `true`; el código usa `false` (defaults `store.js:75` y backfill `:139`). Conocido, registrado como D5, explícitamente fuera de scope de este change. Se deja como está.
3. **Spec registro-dispositivos desactualizado en su GIVEN** — dice "destinations in estado.tvs"; la arquitectura final los aloja en el dominio `zonasFuera` + módulo cliente. El THEN se cumple; sugerir aclarar el GIVEN en un próximo delta (no bloquea).

### SUGGESTION
4. **Gap de cobertura que ocultó el CRITICAL** — agregar `ZonasFueraStatus.test.jsx` que monte con `estadoLoaded=true` y 11 zonas, afirmando orden canónico y labels; hoy ese componente no tiene ningún test propio.
5. **`lastUpdated` por zona** — el spec describe `{..., lastUpdated}` por entrada; el código lo mantiene a nivel de dominio. Matiz de modelado ya vigente antes del change; documentar en el spec o dejar constancia en design.

## Conteos del validador

- Requirements autoritativos: **5** (zonas-fuera-state 3 + destinos-adicionales 1 + registro-dispositivos 1).
- Scenarios autoritativos: **12** (S1–S8 + S9–S10 + S11–S12).
- Completados: 4/5 requirements, 11/12 scenarios (S3 falla por el CRITICAL).

## Next

- `fixes-required`: corregir el binding `data` en ZonasFueraStatus (1 línea) + test de componente que lo cubra con estado cargado; re-verificar S3/S5; luego re-run de verify antes de archive.
- `next_recommended`: aplicar fix → `sdd-verify` nuevamente → recién entonces archive. Post-merge pendientes ya registrados en tasks DoD: `join av DTVx aMas15-Vwall-Libertador` contra hardware real y confirmación visual del Aside.

## Risks

- Hasta corregir el CRITICAL, cualquier deploy de esta rama rompe la vista "Estado de otras zonas" del Aside en producción (crash de render, no hay error boundary confirmado en esa ruta).
- El resto del change es aditivo y de bajo riesgo: backfill idempotente verificado en memoria y en disco, sin migraciones ni bumps.
