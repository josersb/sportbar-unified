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
- [ ] **T-4a.4** Extender `verify-broker-core.mjs` con helpers de `matrixModel` — **fuera del alcance de esta pasada** (el prompt del slice acota a matrixModel/groups/verify-groups/run-all + eliminar report). Queda para re-apply o se absorbe en WS4c (T-4c.4 también extiende ese verify).

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

## WS5 — dedupe (PR 5) ⬜ pendiente
## WS5 — dedupe (PR 5) ⬜ pendiente
## WS1 — auditoría read-only (PR 6) ⬜ pendiente
