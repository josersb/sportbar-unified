```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:8aeac4e9b8e16856e59c5dc06a2687aa550790be8592518783af8ac3782df72c
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 22/22
scenarios: 36/36
test_command: pnpm test && node server/broker/verify/run-all.cjs && node src/hooks/verify/verify-broker-core.mjs
test_exit_code: 0
test_output_hash: sha256:80cd4612f22c2c85bd091b25b9dc3305442a6fc2f96cce356892d7146b2d947c
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:4db6054e135ad6d7988f0ac930fc6f5fc4cf8462b388d2c51cc5e114b34722e1
```

# Verify Report consolidado — change `mejoras-broker` (CHANGE COMPLETO)

Fecha: 2026-09-17 · Rama: `feat/mejoras-broker-ws1` (árbol acumulado de toda la cadena: ws2→ws3a→ws3b→ws4a→ws4b→ws4c→ws4d→ws4e→ws5→ws1) · Base: `feat/mejoras-broker` @ 8cc031e · Diff acumulado: 36 archivos, 4251 insertions / 745 deletions (excluye drift no commiteado de `server/pnpm-lock.yaml`).

Verificación **consolidada e independiente**: re-ejecución propia de tests/build/verifies sobre el árbol completo (no se confió en los reportes por slice, que se usaron como insumo de findings), más inspección de los puntos de integración cross-slice en el código.

## Ejecución de evidencia (propia, este verify)

| Comando | Resultado |
|---|---|
| `pnpm test` | exit 0 — **209/209 tests, 15 archivos** (2 corridas: 138s y 43s, ambas verdes) |
| `node server/broker/verify/run-all.cjs` | exit 0 — **✓ TODAS LAS VERIFICACIONES PASARON** (17 steps; 2 corridas, ambas verdes) |
| `node src/hooks/verify/verify-broker-core.mjs` | exit 0 — **140/140 verificaciones OK** |
| `pnpm run build` | exit 0 — `✓ built in 10.55s` / `6.28s` (chunks vendor/router/forms/ui intactos) |

`evidence_revision` = sha256 del diff acumulado `git diff feat/mejoras-broker...HEAD` (excluyendo `server/pnpm-lock.yaml`, drift de install sin commitear). `test_output_hash` = sha256 de la concatenación (vitest + run-all + broker-core). `build_output_hash` = sha256 de la salida del build.

## Cobertura total — 22 requirements / 36 scenarios (conteo autoritativo de las 7 specs)

### 1. canales-favoritos — 3/3 req, 4/4 scenarios ✅

| Req | Escenario | Estado | Evidencia |
|---|---|---|---|
| CF-1 | Grilla y validación comparten allowlist | VERIFICADO | `CANAL_ALLOWLIST = new Set(CANALES_FAVORITOS.map(ch => ch.canal))` (`src/data/canalesFavoritos.js:48`); grilla renderiza `CANALES_FAVORITOS`, validación `CANAL_ALLOWLIST.has(canal)` (`src/componentes/Canales.jsx:33`); test drift 1624 (Canales.test.jsx) + canalesFavoritos.test.js |
| CF-1 | Canal de la grilla siempre ejecuta | VERIFICADO (con nota) | 18/21 canales numéricos ejecutan (1624 incluido). Los 3 pseudo-canales 0000/0000A/0000B no pueden ejecutarse (input `type="number"`, `Canales.jsx:91` los normaliza/bloquea) — **reclasificado por el usuario como elemento de referencia intencional** (addendum WS2; no es brecha de spec ni deuda) |
| CF-2 | Canal inválido muestra advertencia | VERIFICADO | `toast.warning("canal no válido")` (`Canales.jsx:67`), sin reset del input ni llamada a IR; test "9999 toastea sin reset" |
| CF-3 | Favorito obsoleto se reconcilia | VERIFICADO | `reconcileFavoritos()` (`canalesFavoritos.js:55-57`) al hidratar y en migración localStorage→broker (`App.jsx`); default `estado.favoritos` realineado en Contexto |

### 2. canales-dtv-intent — 5/5 req, 6/6 scenarios ✅

| Req | Escenario | Estado | Evidencia |
|---|---|---|---|
| CD-1 | Intención aceptada | VERIFICADO | `POST /api/decos/:id/channel` persiste `{canalActual, lastSentAt, ack:"pending"}` (`server/server.js:985`); `POST .../channel/ack` persiste `accepted`/`rejected` con merge por entrada (`server.js:1032-1046`); `reported` estructuralmente `null`; verify-channel-intent B/C |
| CD-1 | Intención rechazada | VERIFICADO | ACK `rejected` persistido conservando canal/lastSentAt (verify-channel-intent C) |
| CD-2 | Mismo canal vigente | VERIFICADO | noop `{noop:true, reason:"canal ya sintonizado"}` sin bump ni IR (verify-channel-intent D) |
| CD-3 | Cambio de canal | VERIFICADO | `message:"cambiando al canal X"` + bump + broadcast (verify-channel-intent A) |
| CD-4 | Fallo del controlador | VERIFICADO | server persiste `rejected`; cliente: `toast.error("error al cambiar canal, volvé a intentar")` + ACK rejected (`Canales.jsx:61-62`) |
| CD-5 | Intención sobrevive reload y 2º cliente | VERIFICADO | snapshot `/api/broker/state` con `versions.channelIntent`; reload/2º server (verify F1/F2); rehidratación cliente `rehydrateDecosFromIntent` con precedencia server (brokerClientCore + App.jsx) |

Nota transversal (no-scenario): el IR físico contra el deco no es verificable sin hardware; todo lo verificado corre contra mock (`VITE_MOCK_ARRANGER=1`). No se golpeó el Arranger real.

### 3. matrix-groups-state — 7/7 req, 8/8 scenarios ✅

| Req | Escenario | Estado | Evidencia |
|---|---|---|---|
| MG-1 | Cliente read-only | VERIFICADO | Dominio `{desired, reported:null}` server-only (`store.js` default + setters merge); cliente no persiste ni decide (`matrixGroups` fuera de localStorage; expone `desired` tal cual sin overlay); submit = UN POST `POST /api/matrix-groups` (`server.js:1058`, `MatrizVideo.jsx:209-241`); verify-matrix-groups C + verify-broker-core secciones 13-16 |
| MG-2 | Preset resuelve grupos en el servidor | VERIFICADO | `POST /api/presets/:n/load` deriva `matrixGroups` de `preset.tvs` con `collapseGroup` para los 10 subgrupos, persiste y difunde (`server.js:916-928`); verify-matrix-groups E + verify-composition |
| MG-3 | Los 10 subgrupos presentes | VERIFICADO | `server/broker/matrixModel.js:33-71` — 3 zonas / 10 subgrupos `{key,dir,screens}` / 29 pantallas; verify-groups A (60 checks) |
| MG-4 | Expansión derivada del modelo | VERIFICADO | `GROUP_DEFS`/`GROUP_PATTERNS` derivados de `matrixModel` (`groups.js:38-45`); cero literales duplicados cliente (checks anti-duplicación); verify-groups D1-D11 |
| MG-5 | Combo de tamaño incorrecto rechazado | VERIFICADO | Validación server contra `optionsFor(screens.length)` antes de expandir, 400 con details (`server.js:1067-1090`); DTV9 / 4-en-3 / 3-en-4 / key vieja → 400 sin mutar store |
| MG-6 | Mixto no-predeterminado | VERIFICADO | `collapseGroup` → `null` en mixto, NUNCA `values[0]`; render "Mixto / Personalizado" solo cuando `null`; "Sin datos" cuando `undefined` (MatrizVideo); verify-groups E6 + verify-matrix-groups E |
| MG-6 | Fuente única | VERIFICADO | uniforme DTV2×4 → "DTV2"; patrón → combo (verify-groups E5/E7, verify-matrix-groups E) |
| MG-7 | Etiqueta correcta | VERIFICADO | `key:"TvsBarraLibertador", dir:"Libertador"` (matrixModel.js:55); label = `dir` del modelo servido; grep "Livertador" en src: solo comentarios/tests que AFIRMAN la ausencia; test `queryByText(/Livertador/)).toBeNull()` |

### 4. state-broker (delta) — 3/3 req, 8/8 scenarios ✅

| Req | Escenario | Estado | Evidencia |
|---|---|---|---|
| Distinción matriz vs app-only | Estado de matriz arbitrado por Arranger | VERIFICADO | reconciler solo arbitra tvs/tvrack/zonasFuera; `verify-confirm-settling` + `verify-reconciler` verdes en run-all |
| Distinción matriz vs app-only | Estado app-only sin arbitraje | VERIFICADO | `link`/`descripcionPreset`/audio Tesira nunca consultados al Arranger (patrón app-only preexistente, intacto) |
| Distinción matriz vs app-only | Intención de canal y grupos son app-only | VERIFICADO | `channelIntent` y `matrixGroups` con `reported:null` estructural; nada del pipeline Arranger los pisa (verify-channel-intent E, verify-matrix-groups C) |
| WS5-DEDUPE | No-op descartado contra reported | VERIFICADO | guard pre-join `server.js:422` (`skipJoin = !force && confirmedSame && !writeQueue.hasPending(dest)`), respuesta `{ok, noop:true, confirmed:true, reported}` sin emitir join (server.js:445-458); verify-dedupe A |
| WS5-DEDUPE | Intención repetida descartada | VERIFICADO | 2 POSTs casi simultáneos en bg → 1 join total (verify-dedupe E). Desviación declarada y validada: el descarte es por FIFO + guard contra `reported` confirmado (dentro de `executeWrite`, `isBusy(dest)` es siempre true → "no busy" real = `!hasPending`); semántica de `isBusy`/`pendingCount` sin cambios (verify-writequeue verde) |
| WS5-DEDUPE | Escape forzar reenvío | VERIFICADO | `force:true` saltea el guard; join re-emitido (verify-dedupe B); plomería body→`writeInBackground(opts)`→`executeWrite(opts)` (`server.js:1060-1062`) |
| WS1-AUDIT | Auditoría read-only | VERIFICADO | `get devices all` contra Arranger real (49 dispositivos), sin writes; hallazgo documentado en `ws1-audit.md` con salida cruda y delta vs captura feb-2026 |
| WS1-AUDIT | Identidad no modelada | VERIFICADO | `aMas15-Vwall-Libertador` (MAC …0CD2) no coincide con ningún dispositivo modelado → registrado para change aparte; cero modelado ni writes en este change |

### 5. sync-broadcast (delta) — 1/1 req, 2/2 scenarios ✅

| Escenario | Estado | Evidencia |
|---|---|---|
| Intención de canal se difunde | VERIFICADO | `broadcastDomain("channelIntent")` (server.js:1046, payload = desired); snapshot + eventos SSE; recepción cliente `applyStateEvent` con `DESIRED_KEY_DOMAINS` |
| Grupos se difunden | VERIFICADO | `broadcastDomain("matrixGroups")` tras set/preset-load; `matrixModel` top-level en snapshot real `/api/broker/state` y en el evento SSE `snapshot` (bus `getSnapshot`); verify-matrix-groups D/G |

Nota: el consumo SSE incremental específico de `channelIntent` se valida genéricamente (verify-eventbus/composition con clientes SSE reales); no hay test que suscriba un cliente SSE y afirme ese dominio puntual — SUGGESTION heredada de WS3, sigue abierta (bajo riesgo: mismo camino de código que dominios probados).

### 6. zonas-fuera-state (delta) — 1/1 req, 2/2 scenarios ✅

| Escenario | Estado | Evidencia |
|---|---|---|
| Zona no-op descartada | VERIFICADO | El guard vive en `executeWrite`, camino único de TODAS las escrituras (tvs/tvrack/zonasFuera) → la dedupe hereda; respuestas sync de tvrack/zonas-fuera con `noop` aditivo; preset load hereda el guard (recarga del preset vigente → 0 joins); verify-dedupe F (TVRACK por sub-stream: doble POST → 1 join) |
| Escape forzar en zona | VERIFICADO | `force` plomeado a `executeWrite` vía `writeInBackground(..., opts)`; `noop` aditivo en respuestas sync de tvrack/zonas-fuera |

Nota: no existe un step dedicado de zonas-fuera en `verify-dedupe.cjs` (F cubre TVRACK); el guard compartido + `noop` aditivo + DoD de preset hacen la evidencia suficiente, pero es la cobertura menos directa del change.

### 7. ux-feedback (delta) — 2/2 req, 6/6 scenarios ✅

| Req | Escenario | Estado | Evidencia |
|---|---|---|---|
| UXF-1 | Canal ya sintonizado | VERIFICADO | `toast.info("canal ya sintonizado")` sin IR (`Canales.jsx:49`); test WS3 |
| UXF-1 | Cambio de canal | VERIFICADO | `toast.info("cambiando al canal X")` + IR (`Canales.jsx:54-56`) |
| UXF-1 | Fallo del controlador | VERIFICADO | `toast.error("error al cambiar canal, volvé a intentar")` (`Canales.jsx:62,71`) |
| UXF-1 | Canal inválido | VERIFICADO | `toast.warning("canal no válido")` (`Canales.jsx:67`) |
| UXF-2 | No-op confirmado | VERIFICADO | intent vacío → `toast.info("sin cambios")` SIN POST ni optimistic (`MatrizVideo.jsx:224-225`); test WS5 |
| UXF-2 | Acción forzar reenvío | VERIFICADO | botón "Forzar reenvío" (render-prop, `variant="secondary"`) envía el intent COMPLETO con `{force:true}` (`MatrizVideo.jsx:314-323`); 2 tests WS5 |

## Integración cross-slice (hallazgos)

Verificada por inspección de código + verifies de integración; las piezas conviven correctamente:

1. **Cadena `matrixGroups` server-authoritative completa** (WS4a→WS4b→WS4c→WS4d→WS4e→WS5): submit cliente (`buildIntent` → `setMatrixGroups` → UN POST) → validación server contra `optionsFor(size)` con 400 (`server.js:1067-1090`) → `expandGroups` (modelo único) → `setMatrixGroups` merge shallow + persist + broadcast inmediato (clientes ven la intención YA) → write-through por `writeQueue` → **guard dedupe pre-join en `executeWrite`** (`server.js:422`) → convergencia `reported`. `verify-dedupe [C]` recorre la cadena: 4 joins iniciales → resubmit idéntico → **0 joins** → 2 subgrupos cambiados → solo 7 joins de los destinos afectados.
2. **`channelIntent` ↔ IR client-side** (WS3): el POST de intención ANTES del IR; noop del server → cliente NO emite dígitos (CD-2); cambio → `sendChannelDigits` intacto → ACK. La dedupe del canal es por `canalActual` vigente (CD-2), independiente del guard WS5 — no se pisan: dominios distintos, caminos distintos.
3. **`tvs` per-screen ↔ `matrixGroups` por subgrupo** (WS4b): el preset load es el punto de encuentro — deriva `matrixGroups` DESDE `preset.tvs` (per-screen) con `collapseGroup` (mixed → `null`), un solo `store.write()`, y los writes de TV pasan por el mismo writeQueue/guard. Round-trip expand↔collapse verificado en ambos lados (verify-groups F/G, verify-broker-core sección 14).
4. **Pre-filtro cliente contra `estado.tvs` (reported-wins), NO contra `desired`**: decisión clave de WS5 — deduplicar contra `desired` (intención no confirmada) generaría no-ops falsos por one-join-lag. verify-dedupe [D] lo prueba: reported stale → re-POST SÍ emite join.
5. **Optimistic + enableReinitialize** (WS4e): `deriveUiState` mergea `optimistic.matrixGroups` sobre `desired` (mismo patrón que tvs/tvrack/zonasFuera) con revert funcional en error; `enableReinitialize` resincroniza el form al desired aceptado tras broadcast (test de llegada async con `rerender`).
6. **Broadcast SSE coherente**: `matrixGroups` entra en el snapshot real (`/api/broker/state`), en el evento `snapshot` del bus y en `broadcastDomain` incremental; `channelIntent` igual. `matrixModel` sobrevive snapshot/poll en el cliente (`applySnapshot` lo preserva).

## No-regresión (PR #13 y anclajes)

- **`confirmEncoder` (`server.js:259`) y `executeWrite` intactos en su flujo join→confirm→reported**: el guard WS5 termina ANTES del join (return en el bloque `skipJoin`, server.js:445-458); el diff no toca `CONFIRM_POLICY`. `verify-confirm-settling` VERDE en las 2 corridas de run-all (escenarios settle/no-op/unconfirmed/congestión/join-fail/settling av-stream).
- **Secuencia IR** (`sendChannelDigits`, `IR_CODES`, fallback dígito "2" → `loadChannelPreset`): sin cambios en todo el change.
- **Pseudo-canales 0000/0000A/0000B deshabilitados** (input `type="number"`, `Canales.jsx:91`): sin habilitar en ningún slice — decisión de referencia intencional respetada.
- **TVRACK y Zonas Fuera operativos**: fuera del branch `hasModel` de MatrizVideo; tests TVRACK/Zonas Fuera pasando; degradación sin modelo los deja operativos (test "sin matrixModel: degradación segura… TVRACK intacto").
- **WS2 sin drift**: 192 tests base + canalesFavoritos + drift de `estado.favoritos` intactos.

## Findings acumulados (estado al cierre del change)

### CRITICAL
Ninguno. En los 8 slices ni en esta verificación consolidada.

### WARNING (1 — sigue vigente)
- **W-1 (residual, de WS4b) — `verify-eventbus` heartbeat es flaky de timing** (ventana de 50ms sensible al scheduling del host; falla ~1 de cada varias corridas bajo carga). NO es de este change (WS4b no tocó `eventBus.cjs`); en las 2 corridas de este verify pasó verde. Impacto: `run-all.cjs` puede terminar ✗ por scheduling, no por defecto de código. Recomendación persiste: poll con deadline holgado (500-1000ms) en un slice de limpieza.

### SUGGESTION (abiertas, ninguna bloqueante — se heredan a seguimiento)
1. **`buildBrokerSnapshot` es código muerto** (`server/server.js:632`; sin callers — `/api/broker/state` construye inline y el bus usa `getSnapshot`). Riesgo de drift entre las 3 construcciones de snapshot. Unificar o eliminar en slice de limpieza. **Sigue vigente.**
2. **`sortTvsByGroup` código muerto para la app** (`src/data/tvGroups.js:38`; solo lo consume el harness `verify-broker-core.mjs:36,417,436`). Considerar eliminarlo (junto con `TV_GROUPS`/`GROUP_ORDER` si no hay otros consumidores). **Sigue vigente.**
3. **`ZONE_TITLES` duplica labels del modelo como literals del cliente** (`MatrizVideo.jsx:35-39`, display-only). Si el server renombra un `dir`, el título queda stale. Considerar campo `title` por zona en `matrixModel`. **Sigue vigente.**
4. **Sin test SSE puntual de `channelIntent`** (cobertura genérica en verify-eventbus/composition). Bajo riesgo. **Sigue vigente.**
5. **Broadcast duplicado en bg no-op** (server.js:455 + writeInBackground): ruido de SSE idempotente, sin impacto funcional. **Sigue vigente.**
6. **`lastBatch` con key sin `sub`**: solo afecta la etiqueta del `reason`; la decisión de salteo no usa lastBatch. **Sigue vigente.**
7. **Espejo cliente de helpers del server** (`expandFromModel`/`collapseGroup` duplican contrato de `expandGroups`/`collapseGroup`): mitigado por round-trip del verify que importa el módulo real; evaluar módulo compartido dual ESM/CJS si crece. **Sigue vigente.**
8. **POST `/api/matrix-groups` con `values:{}` responde 200 noop** (inconsistencia menor con "sin values"→400; con el pre-filtro WS5 el intent vacío ya no viaja desde el cliente). **Sigue vigente, riesgo marginal.**

## Follow-up fuera de alcance (registrado, NO cuenta como gap de este change)

- **Device `aMas15-Vwall-Libertador` (MAC `6C9308710CD2`) no modelado** (WS1): dispositivo real del Arranger, presente físicamente, ausente del modelo de zonas fuera (10 modeladas vs 11 reales). Change aparte: agregarlo a `destinations.js`/store/UI + verificar etiqueta con el usuario. Evidencia completa en `ws1-audit.md`. Nota adicional de la auditoría: `Docs/referencia-instalacion.md` usa nombres distintos para algunas MACs — el Arranger real coincide con `devices_all.txt`.

## No verificable sin hardware (limitación transversal, no gap)

- IR físico contra el deco (`send ir success` real), comportamiento del deco, settling físico de encoders: todo corre contra mock. El Arranger real NO fue golpeado (restricción respetada en todo el change, incluida la auditoría WS1 que fue estrictamente read-only).
- Sanitización del input `type="number"` en navegadores reales (pseudo-canales): deducida del estándar HTML.

## Veredicto

**PASS WITH WARNINGS** — Las 7 capabilities se cumplen JUNTAS: 22/22 requirements y 36/36 scenarios de las 7 specs verificados con evidencia propia (file:line + tests + verifies), la integración cross-slice es coherente (una sola cadena server-authoritative por dominio, guard dedupe en el camino único de escritura, escapes `force` plomeados end-to-end), y el árbol completo está verde (209/209 tests · 17 steps run-all · 140/140 broker-core · build exit 0). PR #13 intacto, pseudo-canales intencionalmente deshabilitados, TVRACK/Zonas Fuera operativos, WS1 cerrado con auditoría read-only y hallazgo registrado para change aparte.

**Listo para archive: SÍ.** Condiciones (ninguna bloqueante):
1. Registrar en el archive que la única WARNING residual es la flakiness de `verify-eventbus` (preexistente, ajena al change) con su recomendación de fix.
2. Llevar las 8 SUGGESTION abiertas al backlog/siguientes slices (lista arriba, ninguna rompe spec).
3. Registrar el follow-up `aMas15-Vwall-Libertador` como change aparte.
