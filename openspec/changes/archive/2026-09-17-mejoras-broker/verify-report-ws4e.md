```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:659e74eed9b8214bb53d434c95cb12d5f9f87a77f283ca3e10fe92c01bb0ec99
verdict: pass
blockers: 0
critical_findings: 0
requirements: 7/7
scenarios: 8/8
test_command: pnpm test && node src/hooks/verify/verify-broker-core.mjs && node server/broker/verify/run-all.cjs
test_exit_code: 0
test_output_hash: sha256:e4c506d66a8c02d7fc6c765a1ab79667783fedffb5c8ddaa16d1856b455f4244
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:5e3f742fd0f4b6f55dbffa91107153f3b170a0b81e163adeef0e8f5d2d2edb9d
```
## Verification Report — WS4e (change `mejoras-broker`)

**Change**: mejoras-broker — Slice WS4e (submit server-side en `MatrizVideo`: un único POST `/api/matrix-groups` + optimistic real de `matrixGroups` + `enableReinitialize` (W-1) + eliminación del switch de expansión y del batch de 29 POSTs por-TV)
**Branch**: `feat/mejoras-broker-ws4e` (base `feat/mejoras-broker-ws4d`; commit de código `b489225`, docs `f1d5942`)
**Mode**: Standard
**Alcance**: SOLO WS4e. NO evaluado: WS5 (dedupe pre-join), WS1.

### Build & Tests Execution

**Build**: ✅ Passed — `pnpm run build` (vite build) exit 0, `✓ built in 3.95s` (chunks vendor/router/forms/ui sin cambios de forma).

**Tests**: ✅ exit 0 en los 3 comandos (ejecutados por el verificador, salidas capturadas en temp y hasheadas):
- `pnpm test` → **207/207 tests, 15 archivos, exit 0** (204 de WS4d + 3 netos: 5 submit tests legacy reemplazados por 9 WS4e + 1 test W-1 async). `MatrizVideo.test.jsx` = 39. Sin regresiones.
- `node src/hooks/verify/verify-broker-core.mjs` → **130/130 verificaciones OK, exit 0** (120 previas + 10 de la sección 15 WS4e: merge del overlay, sin overlay expone `desired`, un POST, sin `setTvSource`, optimistic antes del POST, revert en error, omisión Mixto/Sin datos, switch eliminado, `enableReinitialize`, sin batch `sortTvsByGroup`/`DESTINOS_TV`).
- `node server/broker/verify/run-all.cjs` → **✓ TODAS LAS VERIFICACIONES PASARON, exit 0** — incluye `verify-confirm-settling` de PR #13 (verde: `executeWrite`/`confirmEncoder` intactos), `verify-groups` (WS4a) y `verify-matrix-groups` (WS4b).
- Hashes individuales: vitest `sha256:83c80cf325467db20408562e7e0b976ea702f0773a3de136d2b2796e97c1c639`; broker-core `sha256:1f9bb5b5278f3017c6092219365e60234e50caf7d9df5a226f60e4ca317a3cbe`; run-all `sha256:3d408691ceb8e7929baa378c40570a6ebd0e65f5c97d913c24e9e17d37b734b7` (el `test_output_hash` del envelope es la concatenación de los 3).

### Spec Compliance — WS4e (7/7 requirements · 8/8 scenarios de `matrix-groups-state`)

> Conteo autoritativo del spec: MG-1..MG-7 = 7 requirements, 8 scenarios. La implementación de MG-3/MG-6/MG-7 se verificó en WS4c/WS4d (no cambian en WS4e); su evidencia aquí es la re-ejecución verde del suite completo (anti-regresión). MG-1 y el aspecto cliente de MG-2 se verifican por primera vez COMPLETOS en esta slice.

| Requirement | Escenario / Aspecto WS4e | Evidencia | Result |
|---|---|---|---|
| MG-1 | Grupos server-authoritative — submit = UN solo POST; cliente read-only | `MatrizVideo.jsx:209-241` — el submit construye `intent` desde `groupZones`×`values` (solo `isSourceValue`) y llama `setMatrixGroups(intent)` UNA vez (`arrangerApi.js:278-289` → `POST /api/matrix-groups`); **cero** `setTvSource`, `sortTvsByGroup`, `DESTINOS_TV` en el componente (diff −~350 líneas; checks estáticos `ws4e` del harness); sin persistencia cliente de `matrixGroups` (grep: sin localStorage/setItem en hooks); escenario "Cliente read-only" | ✅ COMPLIANT |
| MG-2 | Resolución server-side — el cliente NO calcula/expande | El submit envía los valores de subgrupo TAL CUAL (combo o fuente única); NO hay expansión cliente (check `ws4e: switch de expansión por grupo eliminado (~288 líneas, MG-4)`); el server valida contra `optionsFor(size)` (MG-5) y expande (`expandGroups`, MG-4) — `verify-matrix-groups` verde en `run-all` (round-trip incl.); escenario "Preset resuelve grupos en el servidor" (ruta WS4b, no tocada) | ✅ COMPLIANT |
| MG-3 | Cobertura 3 zonas/10 subgrupos (sin cambios en WS4e) | Suite completo verde: test "renderiza las 3 zonas y los 10 subgrupos desde el modelo" + `verify-groups` (`run-all`) | ✅ COMPLIANT (re-confirmado) |
| MG-4 | Modelo declarativo único — sin switch hardcodeado | El switch de expansión por subgrupo (~288 líneas) y el batch de 29 POSTs (`setTvSource` + `BATCH_SIZE` + rollbacks parciales + toasts de conteo) ELIMINADOS del submit (`MatrizVideo.jsx:209-241`, diff −487 líneas totales); checks `ws4e: submit sin setTvSource por TV` y `ws4e: sin batch sortTvsByGroup ni DESTINOS_TV` | ✅ COMPLIANT |
| MG-5 | Opciones por tamaño / rechazo de combos inválidos | Validación permanece en el server (`verify-matrix-groups` verde: `optionsFor` rechaza `DTV1234` en subgrupo de 3); cliente sin cambios de opciones (`optionsForSize`, WS4d) | ✅ COMPLIANT (re-confirmado) |
| MG-6 | Representación honesta — Mixto/Sin datos | Los subgrupos Mixto (`__mixto__`) y Sin datos (`""`) se OMITEN del intent (`isSourceValue` excluye sentinels, `MatrizVideo.jsx:219-224`); tests "omite los subgrupos en estado Mixto (null) o Sin datos (undefined) del intent" (:347-370), "envía intent vacío cuando todos los grupos están Sin datos" (:372-382) y "el submit NO envía el grupo en estado Mixto" (:441-453); el merge shallow del server conserva las entradas previas (escenarios "Mixto no-predeterminado" y "Fuente única" del render intactos, tests WS4d pasan) | ✅ COMPLIANT |
| MG-7 | Etiqueta "Libertador" | Key `TvsBarraLibertador` viaja en el intent con el combo elegido (test :420-439, `queryByText(/Livertador/)).toBeNull()`); render sin cambios (WS4d) | ✅ COMPLIANT (re-confirmado) |

### Verificaciones independientes solicitadas

- **Un único POST + sin switch/batch legacy**: ✅ `git diff feat/mejoras-broker-ws4d...HEAD` elimina el switch (~288 líneas) y el batch (`setTvSource`×29 + `BATCH_SIZE` + rollbacks parciales + toasts de conteo); el submit queda en ~15 líneas (`MatrizVideo.jsx:219-240`); test "envía la selección por subgrupo con UN solo POST a setMatrixGroups" (:310-320, payload exacto de 10 subgrupos) y "no llama setTvSource por TV" (:322-332).
- **Omisión de Mixto (`null`)/Sin datos del envío**: ✅ guard `isSourceValue` (`/^DTV\d+$/`) sobre `values[g.key]` — los sentinels `__mixto__`/`""` no viajan; tests con payload negativo (`not.toHaveProperty`) :347-370 y :441-453.
- **W-1 cerrado (cierre de la debt de WS4d)**: ✅ `enableReinitialize` en el Formik (`MatrizVideo.jsx:208`) — Formik 2.2.9 deep-compara `initialValues` (`formik.cjs.development.js:556-567`), así que el reset no se dispara por churn de identidad de los polls SSE, solo por cambio de contenido; **test de llegada async del modelo** con `rerender` (:530-558): monta sin modelo → `queryByLabelText("Libertador")).toBeNull()` → rerender con snapshot → `getByLabelText("Libertador").value` = `"DTV542"` (el valor real del server, no la primera opción). Cierra también S-2 del verify WS4d (el test async existía como deuda).
- **Optimistic real en la UI y revert en error**: ✅ dos mitades — (1) `brokerClientCore.js:633-636` `deriveUiState` mergea `optimistic.matrixGroups` sobre `desired` (mismo patrón que tvs/tvrack/zonasFuera): el overlay es visible para la UI; check `ws4e: deriveUiState sin overlay expone desired tal cual` (MG-1) confirma que sin overlay el estado expuesto no cambia; (2) submit: `getOptimisticDomain("matrixGroups")` → `applyOptimistic` ANTES del POST (:232-233) → error → `revertOptimistic("matrixGroups", intent, prevOverlay)` + `writeErrorMessage` (:237-240); tests "aplica optimistic ANTES del POST" (:384-395) y "revierte el optimistic y reporta el error cuando el POST falla (429)" (:397-418).
- **TVRACK y Zonas Fuera operativos**: ✅ sus secciones (:286-393) y handlers (:88-134) están fuera del branch `hasModel` y no fueron tocados por el submit; tests TVRACK (:153-199) y Zonas Fuera (:201-292) pasan; test "sin matrixModel: degradación segura… TVRACK intacto" (:560-573) verde.
- **Ejecución propia de los 3 comandos + build**: ✅ exit 0 en los 4 (vitest 207/207, broker-core 130/130, run-all TODO PASÓ, build exit 0); salidas hasheadas (ver envelope).
- **`server/` sin cambios en este slice**: ✅ `git diff feat/mejoras-broker-ws4d...HEAD --name-only -- server/` = vacío; por construcción `confirmEncoder`/`executeWrite` (PR #13) intactos — `verify-confirm-settling` verde en `run-all` lo confirma en runtime.
- **Pseudo-canales deshabilitados**: ✅ ningún archivo de canales en el diff (solo `MatrizVideo.jsx`, `MatrizVideo.test.jsx`, `brokerClientCore.js`, `verify-broker-core.mjs` + 2 docs openspec).
- **Dedupe pre-join NO implementado (es WS5)**: ✅ `server/` sin cambios; T-5.1..T-5.6 siguen `[ ]` en `tasks.md`.

### Issues Found

**CRITICAL**: None.

**WARNING**: None.

**SUGGESTION**:
- **S-1 — `sortTvsByGroup` queda como código muerto para el cliente** (`src/data/tvGroups.js:38`): `MatrizVideo` ya no lo importa, pero el módulo sigue exportándolo y `verify-broker-core.mjs` (sección 11) sigue testeándolo. No rompe nada (el harness lo ejercita como unidad pura); considerar eliminarlo (junto con `TV_GROUPS`/`GROUP_ORDER` si no hay otros consumidores) en WS5 o una slice de limpieza posterior.
- **S-2 — El test "aplica optimistic ANTES del POST" no aserta el ORDEN de llamadas** (`MatrizVideo.test.jsx:384-395`): verifica que `applyOptimistic` recibió `("matrixGroups", intent)` pero no que ocurrió antes que `mockSetMatrixGroups` (faltaría `mock.invocationCallOrder`). El orden sí está cubierto por el check estático `ws4e` del harness y por la estructura del código (applyOptimistic fuera del try), así que es solo robustez futura del test.
- **S-3 — `ZONE_TITLES` persiste como literals display-only** (`MatrizVideo.jsx:35-39`): es la S-1 de WS4d sin cambios — fuera del alcance de WS4e, se mantiene abierta para una slice futura (campo `title` por zona en `matrixModel`).

### Regresiones

- `pnpm test` 207/207 (204 + 3 netos WS4e) — sin regresiones; tests WS4d (render/Mixto/Libertador/degradación) y WS4c intactos.
- `server/` sin cambios en la slice (diff name-only vacío); PR #13 (`confirmEncoder`/`executeWrite`) intacto; `run-all.cjs` verde incl. `verify-confirm-settling`.
- Pseudo-canales sin cambios.
- `npx eslint` sobre archivos tocados: solo errores preexistentes (`brokerClientCore.js:41,47` no-undef `__DEV__`/`process`, código no tocado).
- `server/pnpm-lock.yaml` modificado sin commitear: drift de install, fuera del alcance (indicado por el orquestador; ignorado).
- `act()` warnings en tests: preexistentes del suite (documentados desde WS2), no introducidos por WS4e.

### Verdict

**PASS** — WS4e cumple su DoD completo: el submit de `MatrizVideo` envía la intención por subgrupo en UN único POST a `/api/matrix-groups` (MG-1/MG-2, cliente read-only sin expansión ni decisión), el switch de expansión (~288 líneas) y el batch de 29 POSTs por-TV están eliminados (MG-4), los subgrupos Mixto/Sin datos se omiten del intent (MG-6), el optimistic de `matrixGroups` es real en la UI (merge en `deriveUiState`) con revert funcional en error, y `enableReinitialize` cierra W-1 de WS4d con test de llegada async. TVRACK y Zonas Fuera operativos, `server/` sin cambios con PR #13 verde, sin pseudo-canales ni dedupe (WS5). 3 suggestions menores, ninguna bloqueante. Ready para WS5 (dedupe pre-join, PR 8).
