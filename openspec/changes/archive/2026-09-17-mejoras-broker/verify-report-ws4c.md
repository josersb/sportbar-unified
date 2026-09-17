```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:3967fe705dd250292c5921cad4b48fb8f3e6785f4244cef5fe0e339df3868967
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 5/5
scenarios: 5/5
test_command: pnpm test && node src/hooks/verify/verify-broker-core.mjs && node server/broker/verify/run-all.cjs
test_exit_code: 0
test_output_hash: sha256:e6f8f82c50b2b24a434788354c54c7756ffe887830b9d5532ece05ade53a635c
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:690eb499ae79d0a4dd67618122a3f3f20e9570d698684a1db10f00d622862bba
```
## Verification Report — WS4c (change `mejoras-broker`)

**Change**: mejoras-broker — Slice WS4c (plumbing cliente: `brokerClientCore`, `arrangerApi`, `App.jsx`, `verify-broker-core.mjs` + plomería de `initialValues` en `MatrizVideo.jsx`)
**Branch**: `feat/mejoras-broker-ws4c` (base `feat/mejoras-broker-ws4b`; commits 54c7157, 4b3f6ea)
**Mode**: Standard
**Alcance**: SOLO WS4c. NO evaluado: render de selects / submit de `MatrizVideo.jsx` (WS4d/WS4e), WS5, WS1.

### Build & Tests Execution

**Build**: ✅ Passed — `pnpm run build` (vite build) exit 0: la eliminación de `GROUP_DEFS` de `brokerClientCore.js` y la nueva firma de `collapseGroup` compilan limpio en todo el árbol (incluido `MatrizVideo.jsx`).

**Tests**: ✅ (exit 0 en los 3 comandos, corrida única con output capturado y hasheado)
- `pnpm test` → **196/196 tests, 15 archivos, exit 0** — sin regresiones (WS4c no agrega tests vitest; su contrato vive en verify-broker-core).
- `node src/hooks/verify/verify-broker-core.mjs` → **120/120 checks OK, exit 0**. Secciones nuevas WS4c: sección 13 (T-4a.4 absorbida: helpers de `matrixModel` del server por interop CJS→ESM, MG-3/MG-4/MG-5/MG-7 a nivel de datos) y sección 14 (plumbing WS4c: preservación de `matrixModel` en snapshot/poll, dominio app-only `matrixGroups`, `deriveUiState`, `expandFromModel` con MG-5/MG-6, round-trip expand→collapse, checks anti-duplicación por parsing de source, contrato de `setMatrixGroups` e inyección en App).
- `node server/broker/verify/run-all.cjs` → **TODAS LAS VERIFICACIONES PASARON, exit 0** (esta corrida sin el flake de timing de `verify-eventbus` ya documentado como W-1 en el reporte WS4b; no es de esta slice).

### Spec Compliance — WS4c (5/5 requirements · 5/5 scenarios del alcance de la slice)

> Totales acotados al alcance de WS4c (mismo criterio que WS4b, que contó MG-1..MG-6 y excluyó MG-7→WS4d). Fuera del alcance de esta slice: MG-2 (server-side, completado y verificado en WS4b), MG-6/MG-7 (render UI → WS4d).

| Requirement | Escenario | Evidencia | Result |
|---|---|---|---|
| MG-1 | Cliente read-only | `brokerClientCore.js:21,24` — `matrixGroups` en `DOMAIN_KEYS` y `DESIRED_KEY_DOMAINS` (evento incremental trae `desired`); `deriveUiState` (línea 633) expone `domains.matrixGroups?.desired` tal cual, sin setter ni persistencia (no entra en `estado` de localStorage); el cliente solo REPORTA intención vía `setMatrixGroups` → `POST /api/matrix-groups` (`arrangerApi.js:276-289`); check "matrixGroups es app-only (reported queda vacío)" + checks anti-duplicación por parsing de source. La decisión del valor sigue siendo 100% server | ✅ COMPLIANT |
| MG-3 | Los 10 subgrupos presentes (datos) | Sección 13 del verify importa el módulo del server (`server/broker/matrixModel.js`): 3 zonas / 10 subgrupos / 29 pantallas sin solapamiento / `combosBySize{3,4}` — el modelo que el broker sirve como snapshot top-level | ✅ COMPLIANT (nivel datos; render UI en WS4d) |
| MG-4 | Modelo declarativo único | `GROUP_DEFS`/`GROUP_PATTERNS` ELIMINADOS del cliente (checks "sin GROUP_DEFS/GROUP_PATTERNS hardcodeados" sobre `brokerClientCore.js` y `MatrizVideo.jsx`); expansión/colapso 100% derivados del `matrixModel` SERVIDO (`expandFromModel`, `collapseGroup(tvs, screens, combosBySize)`); `applySnapshot` preserva `matrixModel` top-level (línea 179: `snapshot.matrixModel ?? prev.matrixModel ?? null`) y `applyPollBody` lo hereda vía `applySnapshot` — el modelo ya NO se descarta al reconstruir el snapshot; el cliente NO duplica el modelo (lo consume servido) | ✅ COMPLIANT |
| MG-5 | Opciones por tamaño (espejo cliente) | `expandFromModel` rechaza (omite) combo declarado con longitud incorrecta: check "MG-5 combo de tamaño incorrecto rechazado" (`DTV1234` en subgrupo de 3 → omitido de `tvs` y `matrixGroups`); la validación dura con 400 vive en el endpoint (WS4b, ya verificada) | ✅ COMPLIANT (nivel cliente; 400 server en WS4b) |
| sync-broadcast | Grupos se difunden (recepción cliente) | `applyStateEvent` con `domain: "matrixGroups"` mergea en `desired` (incluye `null` mixto), versiona el dominio, eventos parciales no pisan otras claves, dominio desconocido ignorado — checks de la sección 14. Emisión server ya verificada en WS4b | ✅ COMPLIANT (lado cliente) |
| MG-2 | Preset resuelve grupos en el server | Server-side: verificado en el reporte WS4b. El cliente WS4c no calcula grupos de preset (no hay lógica de preset-load en el diff de `src/`) | ⏭️ Fuera de slice (WS4b) |
| MG-6 | Mixto no-predeterminado / Fuente única | Helper nivel cliente: `collapseGroup` → `null` en mixto (nunca `values[0]`, check MG-6) y valor único OK. Pero el RENDER honesto "Mixto / Personalizado" es WS4d, y `initialValues` hoy coacciona el `null` (ver W-1) | 🔶 Parcial → WS4d |
| MG-7 | Etiqueta "Libertador" | Datos verificados (sección 13: `dir === "Libertador"`, ningún `Livertador` en el modelo). El render de la etiqueta es WS4d | 🔶 Parcial → WS4d |

**Compliance summary**: 5/8 requirements, 5/10 scenarios completados EN ESTA SLICE; MG-2 resuelto en WS4b, MG-6/MG-7 completan en WS4d por diseño.

### Verificaciones independientes solicitadas

- **`matrixModel` se preserva al aplicar snapshot/poll**: ✅ `applySnapshot` línea 179 + checks `ws4c: applySnapshot preserva matrixModel top-level`, `snapshot sin matrixModel conserva el previo`, `applyPollBody preserva matrixModel del body` (los 3 verdes).
- **Cliente NO duplica el modelo**: ✅ sin literales de grupos en el cliente (checks por parsing); el verify importa el módulo del server, no una copia.
- **Expansión/colapso basados en el modelo servido + degradación segura**: ✅ sin modelo → `expandFromModel` devuelve `null`, `collapseGroup(tvs, null, ...)` devuelve `undefined`, `MatrizVideo` cae al default "DTV1" (nunca adivina literales); checks específicos verdes.
- **`arrangerApi.setMatrixGroups` pega a `POST /api/matrix-groups`**: ✅ con body `{values}` y manejo de error vía `writeError` (checks por parsing del source; el fetch no es resoluble en node puro).
- **`App.jsx` rehidratación con precedencia server**: ✅ `matrixGroups`/`matrixModel` derivados del snapshot en el mismo `useMemo` que `tvs`/`channelIntent` e inyectados al contexto (patrón idéntico a `channelIntent` de WS3) — no hay merge con estado local ni fallback que pise al server.
- **`MatrizVideo.jsx` SOLO plomería de `initialValues`**: ✅ el diff del archivo tiene exactamente 2 hunks: import (drop `GROUP_DEFS`) y bloque `initialValues` (+ helper `modelScreens`/`combosBySize`). El render de selects y el submit legacy (switches por-TV) están intactos para WS4d/WS4e. Mapeo transitorio form-key `TvsBarraLivertador` → model-key `TvsBarraLibertador` documentado (ver W-2).
- **`server/` sin cambios**: ✅ `git diff feat/mejoras-broker-ws4b...HEAD --name-only` = solo `src/**` + docs openspec. `confirmEncoder`/`executeWrite` (PR #13) intactos por construcción; `run-all.cjs` verde lo confirma en runtime.
- **Pseudo-canales deshabilitados**: ✅ ningún archivo de canales/pseudo-canales en el diff (estado heredado de WS2/WS4b sin tocar).

### Issues Found

**CRITICAL**: None.

**WARNING**:
- **W-1 — `initialValues` coacciona el `null` de MG-6 a "DTV1"** (`MatrizVideo.jsx:130-138`): `collapseGroup(...) || "DTV1"` — el `null` (Mixto / Personalizado) es falsy y cae al default, así que un grupo mixto se muestra como "DTV1" (estado falso) hasta que WS4d (T-4d.2) tome `matrixGroups.desired` con precedencia server y renderice "Mixto". No bloquea: el scope de WS4c es plomería, el comportamiento previo ya era deshonesto (`values[0]`), y está documentado como transitorio en apply-progress. Riesgo solo si WS4c se despliega aislado con un grupo mixto real en pantalla.
- **W-2 — Key legacy del form vs key del modelo** (`MatrizVideo.jsx:120-125`): el form usa `TvsBarraLivertador` (typo histórico) mientras el modelo usa `TvsBarraLibertador`; `modelScreens()` hace el puente. Transitorio y documentado; si T-4d.2 no renombra la key del form junto con el switch del submit, `setMatrixGroups` recibiría la key que el endpoint rechaza con 400 (verificada en WS4b). Cubierto por la tarea T-4d.2 — monitorear en el verify de WS4d.

**SUGGESTION**:
- **S-1 — Espejo cliente de helpers del server**: `decodeComboValue`/`expandFromModel` duplican la lógica de `decodeCombo`/`expandGroups` de `server/broker/groups.js` (mismo contrato). El drift está mitigado por el round-trip expand→collapse del verify (que importa el módulo real del server), pero si la lógica crece, evaluar un módulo compartido dual ESM/CJS para eliminar la duplicación estructural.
- **S-2 — Checks de source por `String.includes`** (verify-broker-core.mjs sección 14, ej. `appSrc.includes("matrixGroups,")`): frágiles ante refactors de formato. Aceptables en harness; si dan falso negativo en el futuro, preferir checks semánticos sobre los artefactos construidos.

### Regresiones

- `pnpm test` 196/196 — sin regresiones.
- `server/` sin cambios en la slice (diff name-only); PR #13 (`confirmEncoder`/`executeWrite`) intacto; `run-all.cjs` verde.
- Pseudo-canales sin cambios.
- `server/pnpm-lock.yaml` modificado sin commitear: drift de install, fuera del alcance (indicado por el orquestador; ignorado).

### Verdict

**PASS WITH WARNINGS** — La plomería cliente WS4c cumple MG-1/MG-3/MG-4/MG-5 y la recepción del broadcast, con el modelo servido como única fuente, degradación segura sin modelo, cero duplicación de literales y `matrixModel` preservado en snapshot/poll. Las 2 warnings son deudas explícitas y documentadas de WS4d (T-4d.2). Ready para WS4d.
