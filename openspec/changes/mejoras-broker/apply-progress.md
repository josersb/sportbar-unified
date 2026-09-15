# Apply Progress: mejoras-broker

## WS2 — canales-favoritos (PR 1) ✅ COMPLETADO

Branch: `feat/mejoras-broker-ws2` (desde tracker `feat/mejoras-broker`). Fecha: 2026-09-14.

### Tasks

- [x] **T-2.1** `CANAL_ALLOWLIST` exportado en `src/data/canalesFavoritos.js` (Set de `ch.canal`, 21 entradas, incluye 1624). Además `reconcileFavoritos()` (helper CF-3). Test en `src/hooks/verify/verify-broker-core.mjs` sección 12 (contrato por parsing del source — canalesFavoritos.js importa imágenes que Node puro no resuelve).
- [x] **T-2.2** `submitCanal` en `src/componentes/Canales.jsx` valida contra `CANAL_ALLOWLIST.has(canal)`. Reemplaza el doble check viejo (`canal >= 100 && canal <= 2000` + `estado.favoritos`). `estado.favoritos` ya no se lee en el componente (único consumidor eliminado, campo conservado por persistencia).
- [x] **T-2.3** Rechazo explícito: `toast.warning("canal no válido")`, sin reset del input ni mutación del placeholder (CF-2).
- [x] **T-2.4** Drift reconciliado: default de `estado.favoritos` en `Contexto.jsx` realineado con la grilla (fuera 1614/1625/1629, dentro 1624); `App.jsx` reconcilia con `reconcileFavoritos` al hidratar desde localStorage Y en la migración localStorage→broker (no propaga drift al server) (CF-3).
- [x] **T-2.5** Tests: `Canales.test.jsx` (9 tests: +1624 con favoritos en drift, +9999 inválido toastea sin reset, +1614 obsoleto rechazado), `canalesFavoritos.test.js` (14 tests: +allowlist CF-1, +reconcile CF-3).

### Commits (work-unit)

| Hash | Mensaje |
|---|---|
| `4f02c2e` | feat(canales): validar canales contra CANAL_ALLOWLIST unica con rechazo por toast |
| `e547425` | fix(canales): reconciliar drift de estado.favoritos contra la allowlist al hidratar |

### Verificación (sin hardware)

- `pnpm test` → **192/192 tests pasando, 15 archivos** (incluye los 23 tests nuevos/extendidos de WS2).
- `node src/hooks/verify/verify-broker-core.mjs` → **80/80 verificaciones OK** (sección 12 nueva: allowlist).
- `npx eslint` sobre archivos tocados → único error es **preexistente** (`App.jsx:56` react-hooks/set-state-in-effect, código no tocado por WS2).

### Cambios acumulados

~165 líneas (149+16 insertions, 14 deletions) — dentro del presupuesto de 400.

### Desviaciones / notas

1. **verify-broker-core.mjs por parsing, no por import**: `canalesFavoritos.js` importa `svg/png` que Node puro no resuelve; el contrato de la allowlist se verifica leyendo el source con regex (misma cobertura, sin loader custom).
2. **Pseudo-canales 0000/0000A/0000B**: están en la allowlist (validación pasa), PERO el input es `type=number` (limitación preexistente desde v1) → "0000" se normaliza a "0" y "0000A/B" no se pueden ingresar. Su ejecución requeriría input de texto + rama `preset load` en `sendChannelDigits` — toca la secuencia IR, fuera del alcance WS2 ("no romper la secuencia IR"). **Follow-up sugerido** para un slice futuro.
3. **Advertencia act() en tests**: warnings preexistentes del suite (MatrizVideo/Canales), no introducidos por WS2.

### Rollback boundary

`git revert 4f02c2e e547425` — restaura la validación vieja (con drift). No toca `server/`, ni `confirmEncoder`, ni la secuencia IR (`sendChannelDigits` sin cambios).

## WS3 — canales-dtv-intent (PR 2) ✅ COMPLETADO

Branch: `feat/mejoras-broker-ws3` (desde `feat/mejoras-broker-ws2`). Fecha: 2026-09-14.

### Tasks

- [x] **T-3.1** Dominio `channelIntent` en `defaultSchemaV3` (`{desired, reported: null, version, lastUpdated}`). Backfill **idempotente** con nueva función `normalizeV3(seed)` (store.js) aplicada en `createStore` sobre TODAS las ramas de seed (v3 viejo en disco recibe el dominio sin backup ni rescan). `migrateV2ToV3`/`freshStartV3` lo incluyen; fresh-start conserva la intención si el legacy v3 la traía.
- [x] **T-3.2** App-domain setters (patrón presets): `getChannelIntent()` / `setChannelIntentEntry(decoId, entry)` — merge por entrada: el ACK solo pisa `ack`, conserva `canalActual`/`lastSentAt`.
- [x] **T-3.3** `POST /api/decos/:id/channel` (`DTV1..DTV8`): CD-2 noop (mismo canal vigente → `{ok, noop:true, reason:"canal ya sintonizado"}`, sin bump de versión) o setDesired `{canalActual, lastSentAt, ack:"pending"}` + `broadcastDomain("channelIntent")` + respuesta `{message:"cambiando al canal X"}`. `POST /api/decos/:id/channel/ack` persiste `accepted`/`rejected` (404 sin intención, 400 ack inválido). Dominio incluido en `/api/broker/state`, `buildBrokerSnapshot.versions` y `broadcastDomain` (payload = desired).
- [x] **T-3.4** Rehidratación al startup: la intención persiste en state.json y sobrevive reload (verify F2); evento SSE incremental vía broadcastDomain → bus.
- [x] **T-3.5** `setChannelIntent(deco, canal)` + `setChannelIntentAck(deco, ack)` en `arrangerApi.js` (con `writeError` y status HTTP).
- [x] **T-3.6** `brokerClientCore.js`: `DOMAIN_KEYS` +`channelIntent`; `DESIRED_KEY_DOMAINS` (presets, channelIntent) para la key del evento incremental; `deriveUiState` expone `channelIntent`; nuevo export puro `rehydrateDecosFromIntent(estado, snapshot)`.
- [x] **T-3.7** `App.jsx`: rehidrata `decos`/`dispositivos` desde `channelIntent.desired` con precedencia server en el efecto del snapshot (puro, sin loop: depende de snapshot, no de estado).
- [x] **T-3.8** `Canales.jsx` write-through: optimistic local → POST intención → noop "canal ya sintonizado" (SIN IR, sin ACK) / "cambiando al canal X" → `sendChannelDigits` (IR client-side intacto) → ACK accepted; catch del IR → ACK rejected + "error al cambiar canal, volvé a intentar"; catch del POST → mismo toast de reintento. El toast success viejo se reemplazó por los toasts exactos del spec UXF-1.
- [x] **T-3.9** Nuevo `server/broker/verify/verify-channel-intent.cjs`: 28 checks (A intención pending, B ack accepted, C ack rejected, D noop sin bump, E reported null, F snapshot+reload+2º server, G validaciones 400/404, H broadcast bus).
- [x] **T-3.10** Registrado en `run-all.cjs` (todas las verificaciones pasan); `verify-store.cjs` +T5 (backfill idempotente, normalizeV3, setter/merge ACK); `Canales.test.jsx` +4 tests WS3 (196/196 total).

### Commits (work-unit)

| Hash | Mensaje |
|---|---|
| `18e3132` | feat(broker): dominio channelIntent en el store v3 con backfill idempotente |
| `5da48ab` | feat(broker): intencion de canal DTV con ACK, noop sin IR y broadcast SSE |
| `f55d17d` | feat(canales): write-through de intencion de canal con ACK y toasts del spec |

### Verificación (sin hardware)

- `pnpm test` → **196/196 tests, 15 archivos** (192 de WS2 + 4 nuevos WS3).
- `node server/broker/verify/run-all.cjs` → **✓ TODAS LAS VERIFICACIONES PASARON** (incluye `verify-channel-intent` nuevo y `verify-store` extendido).
- `node src/hooks/verify/verify-broker-core.mjs` → **80/80 verificaciones OK**.
- `executeWrite`/`confirmEncoder`/settling de PR #13: **sin tocar** (verify-confirm-settling sigue verde en run-all).

### Cambios acumulados

~580 líneas authored (376 código en diff stat + ~200 en artefactos/verify nuevo) — sobre el presupuesto de 400 por PR individual, coherente con el forecast auto-chain del change (PR2 = slice WS3 completo).

### Desviaciones / notas

1. **`normalizeV3` no existía**: el task referenciaba ":325" (rama v3 de `createStore`, que usaba el seed tal cual). Se creó la función exportada y se aplicó en `createStore` — mismo efecto (backfill idempotente), mejor testeable.
2. **ACK `pending|accepted|rejected`** (spec CD-1) sobre `"acked"|"error"` del boceto de interfaces del design — prevalece el spec.
3. **Toast success viejo eliminado**: "Canal X enviado a DTV1" reemplazado por "cambiando al canal X" (UXF-1 exige esos toasts exactos; el success era redundante).
4. **Canal local = optimistic**: Canales sigue actualizando decos/dispositivos localmente (tests WS2 intactos) pero la fuente de verdad es el server — App rehidrata con precedencia server por SSE/snapshot.
5. **Lockfile drift**: `server/pnpm-lock.yaml` quedó modificado (instalación de deps, transitivo `ip-address` 10.5.0→10.7.0); NO se incluyó en los commits de WS3.

### Rollback boundary

`git revert f55d17d 5da48ab 18e3132` — quita el dominio `channelIntent` (store/server/api/hook/App/Canales). No toca `executeWrite`, `confirmEncoder` ni la secuencia IR (`sendChannelDigits` intacto). Un state.json con `channelIntent` cargan igual sin el dominio (los clientes viejos ignoran dominios desconocidos; el backfill solo agrega).

## WS4a — modelo declarativo + groups derivado (PR 3, REESCRITA) ✅ COMPLETADO

Branch: `feat/mejoras-broker-ws4a` (desde `feat/mejoras-broker-ws3b`). Fecha: 2026-09-15. **Historia reescrita localmente** (rama sin pushear): el port viejo (`c75669f`, GROUP_DEFS hardcodeado + `values[0]` mixed) se descartó vía `git reset --soft f49cd7c` y la slice se rehizo derivada del modelo data-driven. Verify-report WS4a viejo eliminado (stale tras el reencuadre).

### Tasks

- [x] **T-4a.1** `server/broker/matrixModel.js` creado: `MATRIX_MODEL` = 3 zonas / 10 subgrupos `{key,dir,screens}` (videowall: VWN/VWC/VWS de 1 pantalla; perimetro: Escalera N/C/S; barra: Norte/Libertador/Sur/Pista — 29 pantallas) + `combosBySize{3,4}` (5 combos de 3 + 6 de 4, opciones completas "DTVxyz" según contrato de interfaces del design). Helpers puros: `subgroups`, `subgroupKeys`, `findSubgroup`, `screensOf`, `optionsFor`, `decodeCombo`, `SOURCES`. MG-3/MG-4.
- [x] **T-4a.2** `server/broker/groups.js` reescrito: `GROUP_DEFS`/`GROUP_PATTERNS` **derivados** de `matrixModel` (cero literales duplicados); `expandGroups(values)` mismo contrato `{tvs, matrixGroups}` — VWN/VWC/VWS ahora son subgrupos de 1 pantalla **incluidos** en `matrixGroups` (sin caso especial de passthrough; destinos reales no-subgrupo como TVRACK siguen pasando directas); `collapseGroup(tvs, screens)` → patrón / valor único / **`null` en mixto** (MG-6, nunca `values[0]`; `undefined` reservado a entrada inválida o pantallas faltantes); `optionsFor` reexportado; MG-5: combo de longitud incorrecta se rechaza (clave omitida de tvs y matrixGroups); key `TvsBarraLibertador` (label "Libertador", MG-7).
- [x] **T-4a.3** `server/broker/verify/verify-groups.cjs` reescrito: 60 checks (A modelo MG-3: 3 zonas/10 subgrupos/29 pantallas canónicas sin solapamiento + dirs; B combos y decodificación; C optionsFor(1)/(3)/(4) exactos + derivación de groups.js; D expansión incl. rechazo MG-5 y VWall en matrixGroups (C8 invertido); E collapse con mixed→`null` (D6 invertido); F round-trips incl. VWall; G submit total 10 subgrupos→29 pantallas). Label actualizado en `run-all.cjs`.
- [x] **T-4a.4** Extender `verify-broker-core.mjs` con helpers de `matrixModel` — **absorbida en WS4c** (sección 13 del verify: contrato MG-3/MG-4/MG-5/MG-7 sobre los helpers exportados de `server/broker/matrixModel.js`, importado por interop CJS→ESM).

### Commits (work-unit)

| Hash | Mensaje |
|---|---|
| `0a0bca3` | docs(sdd): reencuadrar WS4 al modelo dinamico de grupos |
| `55885ed` | feat(broker): modelo declarativo matrixModel con groups derivado, mixed a null y VWall en matrixGroups |

### Verificación (sin hardware)

- `node server/broker/verify/verify-groups.cjs` → **✓ verify-groups OK (60 checks)**.
- `node server/broker/verify/run-all.cjs` → **✓ TODAS LAS VERIFICACIONES PASARON** (14 steps; `verify-confirm-settling` de PR #13 sigue verde; `executeWrite`/`confirmEncoder` intactos).
- `pnpm test` → **196/196 tests, 15 archivos** (sin regresión; la slice no toca frontend).
- `server.js` SIN TOCAR (sin wiring, eso es WS4b). Pseudo-canales 0000/0000A/0000B sin habilitar.

### Cambios acumulados

406 líneas authored (404 insertions, 2 deletions: matrixModel.js 124 + groups.js 121 + verify-groups.cjs 156 + run-all.cjs 5) — marginalmente sobre el presupuesto de 400 → recomendación `size:exception` para el PR3 (no se minificó el diff: comentarios y checks son parte del contrato).

### Desviaciones / notas

1. **Formato de `combosBySize`**: el prompt del slice listaba los combos sin prefijo (`["1234",…]`) pero el contrato de interfaces del design (actualizado en el reencuadre) los define **con prefijo** (`["DTV1234",…]`) como opciones completas del select. Prevalece el design — así `optionsFor(size)` devuelve valores homogéneos "DTV*" listos para el select y para `matrixGroups.desired`.
2. **Rechazo MG-5 en el módulo puro**: `expandGroups` omite la clave (ni tvs ni matrixGroups) cuando el combo existe pero su longitud no coincide con el subgrupo — sin canal de error. La validación con respuesta 400 la agrega WS4b en `POST /api/matrix-groups` (T-4b.3) validando contra `optionsFor(size)` antes de expandir.
3. **Secuencia de git**: el commit de reencuadre (`d08dfb2`) se había creado ENCIMA del port viejo; la secuencia de tasks.md asumía lo inverso. Se ejecutó `git reset --soft f49cd7c && git reset` y se re-commiteó: docs de reencuadre (`0a0bca3`, mismo contenido) + slice (`55885ed`). `verify-report-ws4a.md` y el commit de docs intermedio quedaron fuera de la historia. `server/pnpm-lock.yaml` NO incluido (drift preexistente de WS3).
4. **`collapseGroup` conserva `undefined` para pantallas faltantes** (igual que el port viejo): WS4b lo distingue de `null` (mixto) al derivar matrixGroups del preset.
5. **Rollback boundary**: `git revert 55885ed` elimina matrixModel/groups/verify (ningún módulo del server los requiere aún — wiring en WS4b). Los docs (`0a0bca3`) son independientes.

## WS4b — matrix-groups write-through (PR 4) ✅ COMPLETADO

Branch: `feat/mejoras-broker-ws4b` (desde `feat/mejoras-broker-ws4a`). Fecha: 2026-09-15.

### Tasks

- [x] **T-4b.1** `server/broker/store.js`: dominio `matrixGroups` (`{desired:{}, reported:null, version, lastUpdated}`) en `defaultSchemaV3`, `migrateV2ToV3`, `freshStartV3` (fresh-start conserva la intención si el legacy v3 la traía, igual que `channelIntent`) y backfill idempotente en `normalizeV3`. Setters patrón app-domain: `getMatrixGroups()` / `setMatrixGroups(values)` — MERGE shallow por clave de subgrupo (submit parcial conserva las demás entradas; la derivación desde preset escribe las 10 claves). `reported` queda null SIEMPRE (MG-1) — el estado por pantalla real vive en `domains.tvs`.
- [x] **T-4b.2** `server/server.js`: `broadcastDomain("matrixGroups")` → payload `desired` (app-only, igual que `channelIntent`); `versions.matrixGroups` + `matrixModel` top-level en `buildBrokerSnapshot` Y en el body real de `/api/broker/state` (que construía inline, sin pasar por buildBrokerSnapshot) Y en el evento SSE `snapshot` (el bus se crea con `getSnapshot: () => ({...store.getSnapshot(), matrixModel: MATRIX_MODEL})`).
- [x] **T-4b.3** `POST /api/matrix-groups {values}`: valida CADA entrada contra el modelo ANTES de tocar store/expandir — clave = subgrupo conocido (`matrixModel.findSubgroup`), valor ∈ `optionsFor(screens.length)` o null explícito → 400 con `{error, details[]}` si algo falla (rechaza DTV9, combo de tamaño incorrecto, key vieja `Livertador`, body malformado). Luego `expandGroups(valid)` → `setMatrixGroups` → `broadcastDomain("matrixGroups")` inmediato (el cliente ve la intención YA) → write-through por pantalla vía `writeInBackground` (claves app → `toArranger`, igual que preset load). La dedupe no-op pre-join queda para WS5 (guard en `executeWrite`); acá el writeQueue serializa por destino.
- [x] **T-4b.4** `POST /api/presets/:n/load`: deriva `matrixGroups` de `preset.tvs` server-side con `collapseGroup` para los 10 subgrupos del modelo — patrón → combo, uniforme → fuente única, mixed → null (MG-6, NUNCA `values[0]`), pantallas faltantes del preset → null (no representable). Persiste junto a los links app-only (un solo `store.write()`) y difunde `matrixGroups` en el broadcast final del load.
- [x] **T-4b.5** Nuevo `server/broker/verify/verify-matrix-groups.cjs`: 33 checks (A submit válido + expansión + convergencia reported; B rechazos MG-5 sin mutar store; C snapshot con matrixModel/versions/reported null; D broadcast bus; E preset mixed→null/uniforme/patrón/faltantes; F reload; G SSE snapshot con matrixModel+matrixGroups). `verify-store.cjs` +T6 (backfill idempotente, setter merge/bump, null mixto, rechazo no-objeto); `verify-composition.cjs` +2 checks (matrixModel top-level, versions.matrixGroups) +1 (preset load deriva matrixGroups); `run-all.cjs` +step.

### Commits (work-unit)

| Hash | Mensaje |
|---|---|
| `470fa9d` | feat(broker): dominio matrixGroups en el store v3 con backfill idempotente |
| `242254d` | feat(broker): endpoint matrix-groups con validacion optionsFor, snapshot matrixModel y preset server-side |
| `c6a5627` | docs(sdd): progreso WS4b y tareas T-4b marcadas |

### Verificación (sin hardware)

- `node server/broker/verify/verify-matrix-groups.cjs` → **✓ MATRIX-GROUPS OK (33 checks)**.
- `node server/broker/verify/run-all.cjs` → **✓ TODAS LAS VERIFICACIONES PASARON** (15 steps; `verify-confirm-settling` de PR #13 sigue verde; `executeWrite`/`confirmEncoder` intactos).
- `pnpm test` → **196/196 tests, 15 archivos** (sin regresión; la slice no toca frontend).
- Sin hardware real: todo contra mock (`VITE_MOCK_ARRANGER=1`); pseudo-canales 0000/0000A/0000B sin habilitar.

### Cambios acumulados

~490 líneas authored (199 insertions/10 deletions en código modificado + verify-matrix-groups.cjs nuevo ~230 + ~60 docs) — sobre el presupuesto de 400 → recomendación `size:exception` para PR4 (no se minificó el diff: checks/comentarios son parte del contrato).

### Desviaciones / notas

1. **`buildBrokerSnapshot` era código muerto**: `/api/broker/state` construía su body inline sin llamarlo. Se actualizó AMBOS (task T-4b.2 pide :549, pero el path real es el body inline) — mismo contrato: `versions.matrixGroups` + `matrixModel` top-level.
2. **Endpoint `toArranger` por pantalla**: el patch de `expandGroups` usa claves app (VWN..TV26); el write-through las convierte con `toArranger` + `isDestination` (VWN viaja como VW-Norte), igual que el preset load. Detectado por el mock ("destino inválido: VWN") en la primera corrida del verify.
3. **Dedupe (T-4b.3)**: el word "dedupe" del task se resuelve con la serialización por destino del writeQueue; el guard no-op pre-join explícito es WS5 (T-5.1) y NO se adelantó para no rozar `executeWrite`/`confirmEncoder` (PR #13).
4. **Setter merge, no replace**: `setMatrixGroups` hace merge shallow — un submit parcial no borra las otras entradas y la derivación de preset (10 claves) cubre todo el dominio.
5. **`server/pnpm-lock.yaml`** NO incluido (drift preexistente de WS3).
6. **T-4a.4 sigue pendiente** (fuera de este slice, se absorbe en WS4c).

### Rollback boundary

`git revert` de los 2 commits feat — quita el dominio `matrixGroups` (store/server/verify). Un state.json con `matrixGroups` carga igual sin el dominio (backfill solo agrega; clientes viejos ignoran dominios desconocidos). No toca `executeWrite`, `confirmEncoder`, la secuencia IR ni el cliente (WS4c/d/e pendientes).

## WS4c — plumbing cliente (PR 5) ✅ COMPLETADO

Branch: `feat/mejoras-broker-ws4c` (desde `feat/mejoras-broker-ws4b`). Fecha: 2026-09-15. **Reanudación**: un intento previo abortó por error de red y dejó el working tree con cambios sin commitear — se auditó con `git diff` antes de continuar; todo el trabajo recuperado estaba dentro del alcance de WS4c.

### Tasks

- [x] **T-4c.1** `brokerClientCore.js`: `DOMAIN_KEYS` +`matrixGroups`; `DESIRED_KEY_DOMAINS` +`matrixGroups` (el evento incremental trae `desired`); `applySnapshot` preserva `matrixModel` top-level (`snapshot.matrixModel ?? prev.matrixModel ?? null` — antes lo descartaba al reconstruir el objeto; `applyPollBody` hereda por delegación); `deriveUiState` expone `matrixGroups` (desired tal cual) + `matrixModel` (null si no fue servido — degradación segura).
- [x] **T-4c.2** `GROUP_DEFS`/`GROUP_PATTERNS` hardcodeados eliminados del cliente (MG-4 — cero literales duplicados). Nuevos exports puros: `expandFromModel(values, model)` — espejo cliente de `expandGroups` del server, expande desde el modelo SERVIDO (patrón declarado por posición, valor único, passthrough de destinos no-subgrupo, rechazo MG-5 por omisión, `null` → clave omitida) y `collapseGroup(tvs, screens, combosBySize)` — espejo de `collapseGroup` del server (mixto → `null` MG-6, nunca `values[0]`; `undefined` reservado a entrada inválida/pantallas faltantes).
- [x] **T-4c.3** `arrangerApi.js`: `setMatrixGroups(values)` → `POST /api/matrix-groups {values}` con `writeError` y status HTTP. Cliente read-only (MG-1): solo reporta la intención; el submit de MatrizVideo la consume en WS4e.
- [x] **T-4c.4** `App.jsx`: `matrixGroups`/`matrixModel` derivados del snapshot en el mismo `useMemo` y **inyectados al contexto con precedencia server** (patrón idéntico a `channelIntent` de WS3). `verify-broker-core.mjs` extendido: sección 13 (**T-4a.4 absorbida** — helpers del `matrixModel` del server por interop CJS→ESM, MG-3/4/5/7) y sección 14 (WS4c: preservación snapshot/poll, dominio app-only, deriveUiState, expandFromModel con MG-5/MG-6, round-trip expand→collapse, checks anti-duplicación por parsing del source, contrato de `setMatrixGroups` e inyección en App).

### Commits (work-unit)

| Hash | Mensaje |
|---|---|
| `54c7157` | feat(broker-client): plumbing cliente matrixGroups/matrixModel derivado del modelo servido |
| *(este commit)* | docs(sdd): progreso WS4c y tareas T-4c marcadas |

### Verificación (sin hardware)

- `pnpm test` → **196/196 tests, 15 archivos** (sin regresión; WS4c no agrega tests vitest — su contrato vive en verify-broker-core).
- `node src/hooks/verify/verify-broker-core.mjs` → **120/120 verificaciones OK** (80 previas + 40 nuevas: 12 de la sección 13 / 28 de la sección 14).
- `node server/broker/verify/run-all.cjs` → **✓ TODAS LAS VERIFICACIONES PASARON** (sin cambios en server; `verify-confirm-settling` de PR #13 sigue verde).
- `npx eslint` sobre archivos tocados → solo errores **preexistentes** (`brokerClientCore.js:41,47` no-undef `__DEV__`/`process` en `isLoggingEnabled` — código no tocado por WS4c — y `App.jsx:59` react-hooks/set-state-in-effect, documentado desde WS2).

### Cambios acumulados

437 líneas authored (377 insertions, 60 deletions) — sobre el presupuesto de 400 → recomendación `size:exception` para PR5 (no se minificó el diff: comentarios de contrato y checks del verify son parte de la entrega; la cadena auto-chain ya asigna PR5 = WS4c como slice propio).

### Desviaciones / notas

1. **`MatrizVideo.jsx` conservado (no revertido)**: el intento previo tocó SOLO plomería de datos — reemplaza `GROUP_DEFS` por `modelScreens()` derivado del `matrixModel` servido en `initialValues` — y es **indispensable**: WS4c elimina `GROUP_DEFS` de `brokerClientCore.js`, así que revertir rompería la compilación del componente. El render de selects y el submit (switches legacy) están intactos para WS4d/WS4e. El mapping legacy form-key `TvsBarraLivertador` → model-key `TvsBarraLibertador` es transitorio hasta T-4d.2.
2. **Degradación segura en MatrizVideo**: sin `matrixModel` servido, `modelScreens()` devuelve null → `collapseGroup` devuelve undefined → el form cae al default "DTV1" (nunca literales propios; WS4d deshabilitará los selects).
3. **`expandFromModel` acepta combo no declarado como valor único** (espejo del server): la validación dura MG-5 con 400 vive en `POST /api/matrix-groups` (WS4b) — el helper cliente es read-only y no decide.
4. **`server/pnpm-lock.yaml` NO incluido** (drift preexistente de WS3, intacto).
5. **Pseudo-canales 0000/0000A/0000B** siguen deshabilitados; `executeWrite`/`confirmEncoder` (PR #13) sin tocar.

### Rollback boundary

`git revert 54c7157` — restaura `GROUP_DEFS`/`GROUP_PATTERNS` hardcodeados en el cliente y la firma vieja de `collapseGroup`. El server (WS4a/WS4b) queda intacto y un cliente viejo ignora `matrixGroups`/`matrixModel` (dominios desconocidos). No toca `executeWrite`, `confirmEncoder` ni la secuencia IR.

## WS4d — MatrizVideo renderiza del modelo (PR 6) ✅ COMPLETADO

Branch: `feat/mejoras-broker-ws4d` (desde `feat/mejoras-broker-ws4c`). Fecha: 2026-09-15.

### Tasks

- [x] **T-4d.1** `MatrizVideo.jsx`: selects generados por loop `zonas→subgrupos` del `matrixModel` SERVIDO — label = `dir` del subgrupo (MG-7: "Libertador" viene del modelo), opciones = `getByCapability('videoSource')` (DTV1..8, fuente de dispositivos ya existente) + `matrixModel.combosBySize[size]` (MG-4: cero literales de combos). Los 3 bloques hardcodeados de selects ELIMINADOS (~120 líneas). Títulos de zona en mapa `ZONE_TITLES` (display, no duplica opciones). Sin modelo → mensaje "Modelo de matriz no disponible", SIN selects de grupos y botón Enviar `disabled` (nunca literales ni selects adivinados); TVRACK y Zonas Fuera siguen operativos.
- [x] **T-4d.2** `initialValues` con PRECEDENCIA SERVER: `matrixGroups.desired[key] !== undefined ? serverValue : collapseGroup(tvs, screens, combosBySize)`. Key del form renombrada `TvsBarraLivertador` → `TvsBarraLibertador` en TODAS las referencias (render data-driven + submit legacy) — cierra W-2: el futuro `POST /api/matrix-groups` ya no recibiría 400 por key vieja.
- [x] **T-4d.3** Representación honesta (MG-6, cierra W-1): derivado `null` → opción `__mixto__` "Mixto / Personalizado" (renderizada solo cuando aplica); derivado `undefined` (sin datos: pantallas faltantes) → opción "" "Sin datos" (sin selección, nunca DTV1 coaccionado). Submit legacy: `isSourceValue()` (regex `DTV\d+`) como guard por grupo — grupo Mixto/Sin datos NO expande (sin intención representable); las TVs de ese grupo conservan su fuente real (re-escritura no-op en el batch de 29, comportamiento de escritura SIN cambios).
- [x] **T-4d.4** `MatrizVideo.test.jsx` +8 tests WS4d (36 total en el archivo, 204/204 suite): render 3 zonas/10 subgrupos con labels `dir` (y "Livertador" ausente), opciones por tamaño (VWN=8, Libertador=13 con DTV542 sí y DTV1234 no, Barra Norte=14 con DTV1234 sí y DTV123 no), Mixto con `null` (precedencia server sobre collapse), precedencia server (desired DTV542 gana sobre collapse DTV123), "Sin datos" con tvs vacío, submit expande con key renombrada (DTV542 → TV01=DTV5/TV02=DTV4/TV03=DTV2), submit conserva fuente real del grupo Mixto (anti-W-1), y degradación sin modelo (sin selects, Enviar disabled, TVRACK intacto).

### Commits (work-unit)

| Hash | Mensaje |
|---|---|
| `564ee06` | feat(broker-client): MatrizVideo renderiza desde el modelo servido con Mixto y rename Libertador |

### Verificación (sin hardware)

- `pnpm test -- src/componentes/MatrizVideo.test.jsx` → **36/36** (28 previos + 8 nuevos WS4d).
- `pnpm test` → **204/204 tests, 15 archivos** (196 + 8; sin regresiones).
- `node src/hooks/verify/verify-broker-core.mjs` → **120/120 verificaciones OK** (checks `ws4c: MatrizVideo sin GROUP_DEFS` y anti-duplicación siguen verdes).
- `node server/broker/verify/run-all.cjs` → **✓ TODAS LAS VERIFICACIONES PASARON** (server sin cambios; `verify-confirm-settling` de PR #13 sigue verde; `executeWrite`/`confirmEncoder` intactos).

### Cambios acumulados

469 líneas authored (313 insertions, 156 deletions) — sobre el presupuesto de 400 → recomendación `size:exception` para PR6 (no se minificó el diff: los 156 deletions son los 3 bloques hardcodeados de selects que MG-4 exige eliminar; los 8 tests nuevos son parte del contrato de la entrega; la cadena auto-chain ya asigna PR6 = WS4d como slice propia).

### Desviaciones / notas

1. **Degradación sin modelo = "sin selects" (no "selects deshabilitados")**: sin `matrixModel` no hay datos para renderizar selects (¿cuántos?, ¿con qué opciones?) — renderizarlos requeriría hardcodear, prohibido por MG-4. Se muestra un aviso y Enviar queda `disabled`; TVRACK/Zonas Fuera siguen operativos. Variante permitida por el task ("selects deshabilitados / sin opciones").
2. **Opciones de fuentes desde `getByCapability('videoSource')`**, no de un literal DTV1..8 del cliente: el snapshot `matrixModel` solo sirve `zones`+`combosBySize` (SOURCES vive server-side); la lista de dispositivos con capability `videoSource` es la fuente de DTVs que ya usaba el componente (TVRACK la sigue usando). Combos: 100% del modelo servido.
3. **Labels de subgrupo = `dir` plano** ("Norte", "Libertador", "Pista"...): el modelo no tiene campo de nombre largo; los títulos de zona (mapa `ZONE_TITLES`) dan el contexto. El título de la zona Barra corregido a "Libertador" (MG-7, antes "Livertador").
4. **Grupo Mixto en submit legacy**: NO expande, pero las TVs del grupo se re-envían con su fuente actual dentro del batch de 29 (no-op funcional; WS5 dedupe los absorberá). Alternativa descartada (filtrar 4 writes del batch) porque cambiaba el comportamiento de escritura, vetado por el DoD de WS4d.
5. **Indentación del submit legacy sin re-indentar**: los switches envueltos en `if (isSourceValue(...))` conservan su indentación original — son transitorios y se ELIMINAN en WS4e (T-4e.1); re-indentar habría inflado ~300 líneas el diff.
6. **`server/pnpm-lock.yaml` NO incluido** (drift preexistente de WS3, intacto).
7. **Pseudo-canales 0000/0000A/0000B** deshabilitados; `confirmEncoder`/`executeWrite` (PR #13) sin tocar.

### Rollback boundary

`git revert 564ee06` — restaura los bloques hardcodeados de selects, la key legacy `TvsBarraLivertador` y la coacción `|| "DTV1"` de W-1/W-2. El server (WS4a/WS4b) y el plumbing (WS4c) quedan intactos; un cliente viejo ignora `matrixGroups`/`matrixModel`. No toca `executeWrite`, `confirmEncoder` ni la secuencia IR.

## WS4e — submit server-side (PR 7) ✅ COMPLETADO

Branch: `feat/mejoras-broker-ws4e` (desde `feat/mejoras-broker-ws4d`). Fecha: 2026-09-15.

### Tasks

- [x] **T-4e.1** `MatrizVideo.jsx`: el submit construye el INTENT por subgrupo a partir de `groupZones`/values del form (solo valores `isSourceValue`), lo aplica como overlay optimista (`applyOptimistic("matrixGroups", intent)`, capturando `getOptimisticDomain` previo) y lo envía con UN único POST vía `setMatrixGroups(intent)` → `/api/matrix-groups`. El server valida contra `optionsFor(size)` (MG-5), expande (`expandGroups`, MG-4), persiste, broadcastea y hace el write-through por `writeQueue`. ELIMINADOS: el switch de expansión por grupo (~288 líneas), el batch de 29 POSTs por-TV (`setTvSource` + `sortTvsByGroup` + `DESTINOS_TV` + BATCH_SIZE), sus rollbacks parciales y toasts de conteo. Toasts: éxito "Matriz de video actualizada"; error del POST → `revertOptimistic("matrixGroups", ...)` + `writeErrorMessage(err, "Matriz de video")` (hotfix 5, evidencia #908). Subgrupos en estado **Mixto (`__mixto__`)** o **Sin datos (`""`)** se OMITEN del intent (no hay intención expandible; el merge shallow del server conserva las entradas previas). TVRACK y Zonas Fuera intactos (fuera del form). **W-1 del verify WS4d CERRADO**: `enableReinitialize` en el Formik — el form se reinicializa cuando `initialValues` cambia de contenido (deep-compare interno de Formik 2.2.9, verificado en `formik.cjs.development.js:556-567`; el churn de identidad no resetea), así que los selects montados tarde reflejan el valor real al llegar el snapshot async, y tras un submit el broadcast SSE de `matrixGroups` resincroniza el form con el desired aceptado.
- [x] **T-4e.2** `brokerClientCore.js` `deriveUiState`: el overlay optimista de `matrixGroups` ahora gana sobre `desired` (merge spread, mismo patrón que tvs/tvrack/zonasFuera — hace REAL el optimistic de T-4e.1: feedback visual inmediato y revert funcional en error). `MatrizVideo.test.jsx`: 5 tests de submit legacy reemplazados por 9 tests WS4e (un solo POST con payload exacto de 10 subgrupos; NO llama `setTvSource`; omite Mixto/Sin datos del intent; intent vacío cuando todos están Sin datos; optimistic antes del POST; revert + error en 429; key renombrada con combo elegido; grupo Mixto no viaja) + test W-1 de llegada async con `rerender` (cierra S-2 del verify WS4d). `verify-broker-core.mjs` +sección 15 (10 checks WS4e: contrato funcional del merge del overlay + parsing del submit).

### Commits (work-unit)

| Hash | Mensaje |
|---|---|
| `b489225` | feat(broker-client): submit server-side de matrixGroups en MatrizVideo con optimistic y enableReinitialize |

### Verificación (sin hardware)

- `pnpm test -- src/componentes/MatrizVideo.test.jsx` → **39/39**.
- `pnpm test` → **207/207 tests, 15 archivos** (204 + 3 netos: 5 submit tests reemplazados por 9 WS4e + 1 W-1 async).
- `node src/hooks/verify/verify-broker-core.mjs` → **130/130 verificaciones OK** (120 + 10 de la sección 15 WS4e).
- `node server/broker/verify/run-all.cjs` → **✓ TODAS LAS VERIFICACIONES PASARON** (server sin cambios en esta slice; `verify-confirm-settling` de PR #13 sigue verde; `executeWrite`/`confirmEncoder` intactos).
- `npx eslint` sobre archivos tocados → solo errores **preexistentes** (`brokerClientCore.js:41,47` no-undef `__DEV__`/`process` en `isLoggingEnabled`, código no tocado).
- Sin hardware real: todo contra mock; el Arranger real NO fue golpeado; pseudo-canales 0000/0000A/0000B deshabilitados.

### Cambios acumulados

750 líneas en diff-stat (263 insertions, 487 deletions en código + tests + verify). El diff-stat total excede el presupuesto de 400 → recomendación `size:exception` para PR7: las 487 deletions son el switch legacy (~288 líneas) + el batch de 29 POSTs + sus rollbacks que el task T-4e.1 exige ELIMINAR, y las reescrituras de tests son parte del contrato. No se minificó el diff (comentarios de contrato, checks del verify y tests intactos). La cadena auto-chain ya asigna PR7 = WS4e como slice propia.

### Desviaciones / notas

1. **`deriveUiState` ahora mergea `optimistic.matrixGroups`** (1 línea + comentario): el task pide `applyOptimistic("matrixGroups", values)` pero sin el merge el overlay era invisible para la UI (deriveUiState exponía `desired` tal cual). Con el merge, el optimistic sigue el patrón exacto de tvs/tvrack/zonasFuera (fix real-hardware A + revert hotfix 5 funcionales). MG-1 intacto: sin overlay, expone desired tal cual (check `ws4e: deriveUiState sin overlay expone desired tal cual`).
2. **Formik 2.2.9 deep-compara `initialValues`** en el effect de `enableReinitialize` (`formik.cjs.development.js:556-567`: `!isEqual(initialValues.current, props.initialValues)`): el reset NO se dispara por churn de identidad (tvs del snapshot crea objetos nuevos cada poll) sino solo por cambio de contenido. Riesgo residual aceptado: si otro operador (o un preset load) cambia `matrixGroups` mientras alguien edita el form sin submittear, el form se resincroniza al server (server-authoritative, precedencia de MG-1/MG-2).
3. **El batch ordering (hotfix 6, `sortTvsByGroup`) desaparece del cliente**: el orden de los writes es ahora responsabilidad del server (`writeQueue` serializa por destino en el orden de expansión de `expandGroups`). El orden de expansión del server recorre los subgrupos del modelo — mismo agrupamiento físico que el hotfix 6 ordenaba cliente-side. No requería cambios en server.
4. **Intent vacío (todos los grupos Mixto/Sin datos) se envía igual** (`{}`): el endpoint lo acepta (merge no-op + bump de versión + broadcast). Comportamiento elegido por simplicidad — un submit siempre da feedback (toast éxito) y el server es quien decide que no hay nada que escribir. Test "envía intent vacío cuando todos los grupos están Sin datos".
5. **Toasts de conteo del batch eliminados** ("N de 29 órdenes no fueron procesadas..."): ya no aplica a un POST único; el error usa `writeErrorMessage` que distingue 429/5xx/network (mismo helper que TVRACK/Zonas Fuera).
6. **act() warnings en tests**: preexistentes del suite (documentados desde WS2), no introducidos.
7. **`server/pnpm-lock.yaml` NO incluido** (drift preexistente de WS3, intacto).

### Rollback boundary

`git revert b489225` — restaura el switch legacy de expansión por grupo, el batch de 29 POSTs por-TV, `sortTvsByGroup`/`DESTINOS_TV` y los tests WS4d de submit; quita `enableReinitialize` y el merge del overlay en `deriveUiState`. El server (WS4a/WS4b) y el plumbing (WS4c) quedan intactos — el endpoint `/api/matrix-groups` sigue operativo para clientes futuros. No toca `executeWrite`, `confirmEncoder` ni la secuencia IR.

## WS5 — dedupe (PR 8) ✅ COMPLETADO

Branch: `feat/mejoras-broker-ws5` (desde `feat/mejoras-broker-ws4e`). Fecha: 2026-09-15.

### Tasks

- [x] **T-5.1** Guard pre-join en `executeWrite` (server.js, ANTES de emitir el join): no-op iff el `reported` CONFIRMADO del destino ya es la fuente pedida (video+audio si linked; extracción por dominio: tvs `reported[key]`, tvrack `reported[sub]`, zonasFuera `reported[key][sub]`) && no hay writes pendientes detrás de esta tarea. Setea `desired` (sección 1 intacta), persiste, broadcastea y retorna `{ok:true, noop:true, confirmed:true, reported:<confirmado>}` SIN join. `confirmEncoder` y su ventana de settling (PR #13) SIN TOCAR — el guard termina antes del join.
- [x] **T-5.2** `lastBatch` in-memory `Map<dest,{source,sub,at}>` (no persistido): se actualiza en CADA executeWrite (emita join o lo saltee) y marca resubmits idénticas para el `reason` del no-op ("resubmit idéntica (lastBatch)" vs "reported confirmado"). NO participa de la decisión de salteo — evitar no-ops falsos (decisión del prompt).
- [x] **T-5.3** `force:true` saltea el guard: plomería `executeWrite(dest, source, sub, writeId, timings, opts)` ← `writeInBackground(..., opts)`. Expuesto en `/api/tvs/:id/source` (body `{force}`, log `[force]`), `/api/matrix-groups` (body `{force}` → todos los writes del submit) y respuestas sync de tvrack/zonas-fuera con `ok`/`noop` aditivos. API cliente: `setTvSource(id, source, {force})` y `setMatrixGroups(values, {force})`.
- [x] **T-5.4** Cliente (`MatrizVideo.jsx`): submit extraído a `buildIntent(values)` + `submitIntent(values, {force})`. Pre-filtro: por subgrupo, `collapseGroup(estado.tvs, g.screens, combosBySize) !== valor` → viaja; iguales se omiten. `estado.tvs` es reported-wins (reportado confirmado u overlay propio en vuelo) → ante duda NO se saltea (one-join-lag re-envía). Intent vacío → `toast.info("sin cambios")` SIN POST ni optimistic (UXF-2). Botón "Forzar reenvío" (Formik render-prop, `variant="secondary"`) envía el intent COMPLETO con `force:true` — escape explícito del operador.
- [x] **T-5.5** Nuevo `verify-dedupe.cjs` (30 checks, 6 escenarios): A no-op confirmado con reason lastBatch; B force reenvía; C matrix-groups un-solo-cambio (4 joins → resubmit idéntica 0 joins → 2 subgrupos 7 joins, solo destinos afectados); D one-join-lag NO genera no-op falso (reported stale → re-POST emite join, 2 joins, re-read converge); E intención repetida en vuelo (bg, isBusy) → 1 join total; F TVRACK por sub-stream. `writeQueue.hasPending(key)` añadido (tareas encoladas sin arrancar; `isBusy` intacto). Registrado en `run-all.cjs` (17 steps).
- [x] **T-5.6** `MatrizVideo.test.jsx`: 9 tests WS4e adaptados al pre-filtro (cambian UN subgrupo y assertean el payload pre-filtrado — el comportamiento nuevo ES el punto de WS5), test "sin cambios" (sin POST, sin optimistic, toast info), 2 tests "Forzar reenvío" (intent completo + `{force:true}`; nunca "sin cambios"). Mock de `useToast` añadido al archivo. `verify-broker-core.mjs`: +sección 16 (10 checks WS5) + 5 checks ws4e/ws4c actualizados al nuevo contrato → 140/140.

### Commits (work-unit)

| Hash | Mensaje |
|---|---|
| `263ed3f` | feat(broker): guard pre-join dedupe en executeWrite con lastBatch y escape force |
| `0e74f32` | feat(broker-client): pre-filtro de subgrupos confirmados y forzar reenvio en MatrizVideo |
| `<hash-3>` | docs(sdd): progreso WS5 y tareas T-5.x marcadas |

### Verificación (sin hardware)

- `node server/broker/verify/verify-dedupe.cjs` → **✓ DEDUPE OK (guard pre-join + force + un-solo-cambio + one-join-lag + in-flight + tvrack)** (30 checks).
- `node server/broker/verify/run-all.cjs` → **✓ TODAS LAS VERIFICACIONES PASARON** (17 steps incl. `verify-dedupe` nuevo; `verify-confirm-settling` de PR #13 VERDE; `executeWrite` conserva su flujo join→confirm→reported).
- `pnpm test` → **209/209 tests, 15 archivos** (207 + 3 nuevos − 1 reemplazado).
- `node src/hooks/verify/verify-broker-core.mjs` → **140/140 verificaciones OK** (130 + 10 sección 16; 5 checks ws4e/ws4c actualizados al contrato con pre-filtro).
- `npx eslint` sobre archivos tocados → único error **preexistente** (`writeQueue.js:116` no-undef `module` — CJS con config browser; `module.exports` ya existía).
- Sin hardware real: todo contra mock (`VITE_MOCK_ARRANGER=1`); el Arranger real NO fue golpeado; pseudo-canales 0000/0000A/0000B deshabilitados.

### Cambios acumulados

~430 líneas authored (server: writeQueue ~30 + server.js ~90 + verify-dedupe ~300 nuevo; cliente: api ~10 + MatrizVideo ~75 + tests ~120) — marginalmente sobre el presupuesto de 400 → recomendación `size:exception` para PR8 (los checks del verify-dedupe y los tests son parte del contrato; la cadena auto-chain ya asigna PR8 = WS5 como slice propia).

### Desviaciones / notas

1. **`!writeQueue.isBusy(dest)` del guard se implementa como `!writeQueue.hasPending(dest)`**: dentro de `executeWrite` (que corre DENTRO de la cadena del writeQueue) `isBusy(dest)` es SIEMPRE true — la propia tarea vive en el Map hasta el `finally`. El "no busy" real del spec ("nada pendiente detrás de esta tarea") se materializó con `writeQueue.hasPending(key)`, que cuenta tareas encoladas sin arrancar. `isBusy`/`pendingCount`/`pendingKeys` conservan su semántica (verify-writequeue verde).
2. **Dedupe en vuelo por FIFO, no por lastBatch**: serializado por destino, cuando la tarea idéntica duplicada corre, la original YA terminó → `reported` confirmado la atrapa. El escenario spec "intención repetida con isBusy" queda cubierto (verify E: 2 POSTs casi simultáneos → 1 join). `lastBatch` se usó como marcador de resubmit para el `reason`, NO como condición de salteo (un `lastBatch` match con `reported` divergente habría generado no-op falso tras un cambio externo del hardware).
3. **Respuesta no-op del sync path**: `{ok, noop:true, confirmed:true, reported:<confirmado>}` — mantiene verdes los checks de `verify-confirm-settling` escenario C (`ok:true`, `confirmed:true`, `reported === "DTV3"`). `noop` también añadido (aditivo) a las respuestas sync de tvrack/zonas-fuera, y el broadcast de dominio se omite en el sync path cuando hay no-op (el guard ya broadcasteó).
4. **Pre-filtro cliente contra `estado.tvs` (reported-wins), no contra `matrixGroups.desired`**: `desired` es intención no confirmada — deduplicar contra ella sí generaría no-ops falsos (one-join-lag). El merge de deriveUiState (reported gana + overlay propio) hace que solo se salteen subgrupos genuinamente confirmados o con intención propia idéntica en vuelo; ante duda viaja el POST (el server re-decide con su guard).
5. **Toasts**: éxito normal "Matriz de video actualizada"; vía force "Matriz de video reenviada"; sin cambios `info("sin cambios")` (UXF-2). El test "envía intent vacío cuando todos Sin datos" de WS4e fue reemplazado por el de "sin cambios" (el intent vacío ya no viaja).
6. **Preset load hereda el guard**: los writes del preset (`writeQueue.enqueue` directo, sin force) deduplican no-ops — recargar el preset vigente emite 0 joins (DoD "zonas no-op"). Sin cambio de código: el guard vive en `executeWrite`.
7. **`server/pnpm-lock.yaml` NO incluido** (drift preexistente de WS3, intacto).

### Rollback boundary

`git revert` de los 2 commits feat — quita el guard pre-join, `lastBatch`, `hasPending` y el pre-filtro/botón force del cliente. `confirmEncoder`/settling (PR #13) quedan intactos (el guard era aditivo y anterior al join). El endpoint acepta `force` desconocido (campo ignorado) → clientes nuevos no rompen contra server viejo. No toca la secuencia IR (`sendChannelDigits`), el dominio `channelIntent` ni `matrixModel`.

## WS1 — auditoría read-only (PR 9) ⬜ pendiente
