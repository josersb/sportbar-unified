```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:c2fc053d432df693111112e0654ce297aa968d7f
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 4/4
scenarios: 5/5
test_command: pnpm test && node src/hooks/verify/verify-broker-core.mjs && node server/broker/verify/run-all.cjs
test_exit_code: 0
test_output_hash: sha256:6cda8463721275a5855d434f55fd0e682e1110b4bda7e7470a4c693b5de035ec
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:2d765e776149fe188cb1d85aaeac66d14b39a4b9e420954ac7345ece76eeed99
```
## Verification Report — WS4d (change `mejoras-broker`)

**Change**: mejoras-broker — Slice WS4d (MatrizVideo renderiza desde `matrixModel` servido + "Mixto / Personalizado" + rename `TvsBarraLibertador` + degradación sin modelo)
**Branch**: `feat/mejoras-broker-ws4d` (base `feat/mejoras-broker-ws4c`; commits 564ee06, c2fc053)
**Mode**: Standard
**Alcance**: SOLO WS4d. NO evaluado: submit server-side (WS4e), WS5, WS1.

### Build & Tests Execution

**Build**: ✅ Passed — `pnpm run build` (vite build) exit 0: el render data-driven y el guard `isSourceValue` compilan limpio.

**Tests**: ✅ (exit 0 en los 3 comandos; outputs capturados e hasheados)
- `pnpm test` → **204/204 tests, 15 archivos, exit 0** (196 previos + 8 nuevos WS4d; `MatrizVideo.test.jsx` = 36). Sin regresiones.
- `node src/hooks/verify/verify-broker-core.mjs` → **120/120 verificaciones OK, exit 0** (checks anti-duplicación "ws4c: MatrizVideo sin GROUP_DEFS" siguen verdes).
- `node server/broker/verify/run-all.cjs` → **✓ TODAS LAS VERIFICACIONES PASARON, exit 0** — incluye `verify-confirm-settling` de PR #13 (verde; `executeWrite`/`confirmEncoder` intactos) y `verify-matrix-groups` de WS4b.
- Hashes individuales: pnpm test `sha256:15d60f5e0723691a0f082ed4522d264a57b32f8537049ca732cf9bba11c348e7`; broker-core `sha256:931e6e8e9cebd693bd72dc190155bcac8187dd9410098b92107227dfb3809fc6`; run-all `sha256:2a8d0d937750e015d9a5ff714a4138c0a898362d14fd824dee2488fdffd33ee3` (el `test_output_hash` del envelope es la concatenación de los 3).

### Spec Compliance — WS4d (4/4 requirements · 5/5 scenarios del alcance de la slice)

> Alcance: render UI de MG-4/MG-5/MG-6/MG-7 (la parte server de MG-2/MG-4/MG-5 ya verificada en WS4a/WS4b; MG-1/MG-3 en WS4c). MG-6 y MG-7 quedaron "Parcial → WS4d" en el reporte WS4c — aquí se cierran.

| Requirement | Escenario | Evidencia | Result |
|---|---|---|---|
| MG-4 | Render desde el modelo declarativo único | `MatrizVideo.jsx:168-201` — `groupZones` generado por loop `matrixModel.zones→subgroups` del modelo SERVIDO (label = `dir`, opciones = `optionsForSize`); los 3 bloques hardcodeados de selects (~120 líneas) ELIMINADOS (diff −156 líneas); `hasModel = Boolean(matrixModel && Array.isArray(matrixModel.zones))` gatea el render; sin literales de subgrupos/combos (único mapa cliente: `ZONE_TITLES`, títulos de zona display-only — ver S-1); test "renderiza las 3 zonas y los 10 subgrupos desde el modelo" | ✅ COMPLIANT |
| MG-5 | Opciones por tamaño correctas | `optionsForSize(size)` = `getByCapability('videoSource')` (DTV1..8, fuente de dispositivos ya existente) + `combosBySize[size]` del modelo servido; test: VWN=8 opciones sin combos, Libertador(3)=13 con `DTV542` sí y `DTV1234` NO, Barra Norte(4)=14 con `DTV1234` sí y `DTV123` NO | ✅ COMPLIANT |
| MG-6 | Mixto no-predeterminado / Fuente única | `MatrizVideo.jsx:181-193` — derivado `null` → opción `__mixto__` "Mixto / Personalizado" (renderizada solo cuando `showMixed`), NUNCA `values[0]` ni default coaccionado; derivado `undefined` (sin datos) → opción "" "Sin datos" sin selección; **W-1 de WS4c CERRADO**: cero ocurrencias de `\|\| "DTV1"` en el archivo (grep); tests "muestra 'Mixto / Personalizado' cuando el server reporta null (precedencia server sobre collapse)" y "muestra 'Sin datos'… (undefined)" | ✅ COMPLIANT |
| MG-7 | Etiqueta "Libertador" | Label del select = `dir` del modelo servido (`TvsBarraLibertador` → `dir: "Libertador"`, `MatrizVideo.jsx:189`); título de zona `ZONE_TITLES.barra` = "Tvs de la Barra Norte - **Libertador** - Sur - Pista" (antes "Livertador"); **W-2 de WS4c CERRADO**: key del form renombrada en render Y submit (`values.TvsBarraLibertador`, switches :237-516); grep "Livertador" en `src/`: solo comentarios/test que AFIRMAN la ausencia; test `queryByText(/Livertador/)).toBeNull()` en render y en submit | ✅ COMPLIANT |
| Precedencia server (`initialValues`) | serverValue gana sobre collapse | `MatrizVideo.jsx:184-186` — `matrixGroups?.[sg.key] !== undefined ? serverValue : collapseGroup(...)`; test "usa matrixGroups.desired con precedencia server" (desired DTV542 gana sobre collapse DTV123) y "Mixto con null (precedencia server)" | ✅ COMPLIANT |
| Degradación sin modelo | No rompe el render; TVRACK/Zonas Fuera operativos | Sin `matrixModel` → `groupZones=[]`, aviso "Modelo de matriz no disponible — los grupos no se pueden editar", **sin selects de grupos** (nunca literales — variante permitida por T-4d.1: "selects deshabilitados / sin opciones"), botón Enviar `disabled={!hasModel}`; TVRACK (:638-703) y Zonas Fuera (:704-741) están FUERA del branch condicional y siguen operativos; test "sin matrixModel: degradación segura" | ✅ COMPLIANT |
| Submit legacy (comportamiento de escritura sin cambios) | per-TV; Mixto/Sin datos no expanden | Guard `isSourceValue()` (regex `DTV\d+`) por grupo — grupo Mixto/Sin datos NO toca `newTvs` de sus pantallas (conservan fuente real; re-escritura no-op en el batch de 29); tests "el submit conserva la fuente real de las TVs de un grupo en estado Mixto (sin coacción W-1)" (TV04=DTV1/TV05=DTV2/TV06=DTV3/TV07=DTV4 + 29 llamadas) y "el submit legacy expande con la key renombrada" (DTV542 → TV01=DTV5/TV02=DTV4/TV03=DTV2) | ✅ COMPLIANT |

**Compliance summary**: 4/4 requirements del alcance, 5/5 scenarios + 3 verificaciones independientes (precedencia server, degradación, submit legacy). MG-6 y MG-7 quedan COMPLETOS (abiertos como "Parcial → WS4d" desde WS4c).

### Verificaciones independientes solicitadas

- **Selects y opciones 100% desde `matrixModel` servido (sin `GROUP_DEFS`)**: ✅ diff elimina los 3 bloques hardcodeados; los combos vienen de `matrixModel.combosBySize` y las fuentes de `getByCapability('videoSource')` (lista de dispositivos que el componente ya usaba para TVRACK; el modelo no sirve `SOURCES` client-side). Check `ws4c: MatrizVideo sin GROUP_DEFS` verde en broker-core.
- **`null` → "Mixto / Personalizado" sin coerción a DTV1**: ✅ cero `\|\| "DTV1"` (grep); `MIXED_OPTION`/`MIXED_LABEL` renderizados solo cuando `derived === null`.
- **W-1 cerrado**: ✅ (ver arriba). **W-2 cerrado**: ✅ key `TvsBarraLibertador` en render + submit; sin `TvsBarraLivertador` funcional en `src/` (las ocurrencias restantes son comentarios que documentan el rename y el verify server que AFIRMA el rechazo de la key vieja).
- **Degradación sin modelo**: ✅ aviso + sin selects + Enviar disabled; TVRACK/Zonas Fuera fuera del branch, operativos (líneas del archivo).
- **Opciones por tamaño**: ✅ 8/13/14 según size 1/3/4 (test con totales exactos y presencia/ausencia de combos).
- **Submit legacy per-TV + Mixto/Sin datos no expanden**: ✅ tests con mocks de `setTvSource` (29 llamadas, expansión por posición, conservación de fuente real del grupo mixto).
- **`server/` sin cambios**: ✅ `git diff feat/mejoras-broker-ws4c...HEAD --name-only` = `MatrizVideo.jsx`, `MatrizVideo.test.jsx` + 2 docs openspec. `executeWrite`/`confirmEncoder` (PR #13) intactos por construcción; `run-all.cjs` verde lo confirma en runtime. `server/pnpm-lock.yaml` modificado sin commitear: drift de install, fuera de alcance (indicado por el orquestador; ignorado).
- **Pseudo-canales deshabilitados**: ✅ ningún archivo de canales en el diff.

### Issues Found

**CRITICAL**: None.

**WARNING**:
- **W-1 — Llegada async del modelo sin `enableReinitialize`: selects muestran la primera opción mientras el value Formik es `undefined`** (`MatrizVideo.jsx:207` + `Select.jsx:5`): `registerField` de Formik 2.2.9 (`formik.cjs.development.js:658-663`) NO inicializa valores de campos que se montan después del mount de Formik — solo registra el validador. Escenario alcanzable: hard reload directo en `/matrizvideo` (sin gate de snapshot en `App.jsx:272-280`) → el componente monta con `matrixModel: null` (Formik captura `initialValues={}`) → el snapshot llega por SSE → `hasModel` pasa a true y los selects se montan → el `<select>` muestra visualmente "DTV 1" (primera opción) pero `values[key]` queda `undefined` → el guard `isSourceValue` hace que Enviar NO escriba esos grupos (submit seguro, no-op). **Evaluación**: NO es regresión vs WS4c — antes el display mentía igual (coacción `|| "DTV1"`) y el submit SÍ escribía DTV1 (peor); ahora el riesgo es solo de UX (display vs valor real) hasta que el usuario toque un select (el `handleChange` setea el valor). No bloquea: WS4e reemplaza el submit y puede cerrar esto con `enableReinitialize` (o key de remount) en el mismo archivo. Mitigación sugerida incluida en next steps.

**SUGGESTION**:
- **S-1 — `ZONE_TITLES` duplica labels del modelo en literals del cliente** (`MatrizVideo.jsx:44-48`): display-only (no duplica opciones/subgrupos — MG-4 respeta el espíritu), pero el título "Tvs de la Barra Norte - Libertador - Sur - Pista" contiene "Libertador" como literal del cliente; si el server renombra una zona o un `dir`, el título quedaría stale. Considerar un campo `title` por zona en `matrixModel` para eliminar la última literal de display.
- **S-2 — Sin test vitest del escenario de llegada async**: los 8 tests WS4d cubren render con mocks síncronos; el caso "modelo llega después del mount" (W-1) no está cubierto. Un test con `rerender` (primero sin modelo, luego con) documentaría el comportamiento esperado cuando se cierre con `enableReinitialize`.
- **S-3 — Indentación de los switches legacy dentro de `if (isSourceValue(...))` sin re-indentar** (`MatrizVideo.jsx:236-517`): correcto para el diff (documentado en apply-progress nota 5 — son transitorios hasta WS4e), pero cualquier lector del submit en WS4e debe re-indentar al eliminar el switch.

### Regresiones

- `pnpm test` 204/204 (196 + 8 WS4d) — sin regresiones.
- `server/` sin cambios en la slice (diff name-only); PR #13 (`confirmEncoder`/`executeWrite`) intacto; `run-all.cjs` verde incl. `verify-confirm-settling`.
- Pseudo-canales sin cambios.
- `server/pnpm-lock.yaml` modificado sin commitear: drift de install, fuera del alcance (indicado por el orquestador; ignorado).
- `act()` warnings en tests: preexistentes (documentados desde WS2), no introducidos por WS4d.

### Verdict

**PASS WITH WARNINGS** — WS4d cumple MG-4/MG-5/MG-6/MG-7 en el render: selects 100% derivados del `matrixModel` servido, "Mixto / Personalizado" para `null` y "Sin datos" para `undefined` sin coerción (W-1 de WS4c cerrado), key `TvsBarraLibertador` consistente (W-2 cerrado), degradación segura sin modelo con TVRACK/Zonas Fuera operativos, y el submit legacy per-TV sin cambios de comportamiento (grupos Mixto/Sin datos no expanden). La única warning nueva (W-1: Formik sin `enableReinitialize` ante llegada async del modelo) es un edge case de UX con submit seguro (no-op, sin escrituras falsas), estrictamente mejor que el estado pre-WS4d, y tiene mitigación trivial para WS4e. Ready para WS4e.
