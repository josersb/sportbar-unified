# Tasks: mejoras-broker

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–1780 restantes (authored) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR3 WS4a → PR4 WS4b → PR5 WS4c → PR6 WS4d → PR7 WS4e → PR8 WS5 → PR9 WS1 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| WS2 | Allowlist única + rechazo con toast | PR 1 | `pnpm test -- src/componentes/Canales.test.jsx` | `VITE_MOCK_ARRANGER=1 pnpm dev` → canal 1624 / inválido | revert `src/data/canalesFavoritos.js`, `src/componentes/Canales.jsx` |
| WS3 | Intención de canal server-side + ACK + rehidratación | PR 2 | `node server/broker/verify/verify-channel-intent.cjs` | mock server, reload + 2º cliente SSE | revert dominio `channelIntent` (store/server/hook/App/api) |
| WS4a | Modelo declarativo + `groups` derivado + verifies | PR 3 | `node server/broker/verify/verify-groups.cjs` | N/A — módulo puro, sin boundary runtime | revert slice (aún sin mergear; `git reset`) |
| WS4b | Dominio `matrixGroups` + endpoint + snapshot + preset server-side | PR 4 | `node server/broker/verify/verify-matrix-groups.cjs` | `VITE_MOCK_ARRANGER=1 pnpm run sportbar:dev` → submit + preset load + reload | revert dominio `matrixGroups` en `store.js`/`server.js` |
| WS4c | Plumbing cliente (`matrixModel`/`matrixGroups`) | PR 5 | `node src/hooks/verify/verify-broker-core.mjs` | N/A — lógica pura sin DOM | revert `brokerClientCore.js`/`arrangerApi.js`/`App.jsx` |
| WS4d | MatrizVideo renderiza del modelo + Mixto | PR 6 | `pnpm test -- src/componentes/MatrizVideo.test.jsx` | `VITE_MOCK_ARRANGER=1 pnpm run sportbar:dev` → `/matrizvideo` | revert render de `MatrizVideo.jsx` |
| WS4e | Submit server-side (`POST /api/matrix-groups`) | PR 7 | `pnpm test -- src/componentes/MatrizVideo.test.jsx` | mock server, submit + snapshot `tvs` | revert submit de `MatrizVideo.jsx` (+`setMatrixGroups`) |
| WS5 | Dedupe pre-join + escape `force` | PR 8 | `node server/broker/verify/verify-dedupe.cjs` | mock server, doble submit + forzar | quitar guard pre-join en `server.js` (`confirmEncoder` intacto) |
| WS1 | Auditoría read-only de identidad | PR 9 | N/A — solo lectura, requiere Arranger real | `get devices all` (read-only) | revert `openspec/changes/mejoras-broker/ws1-audit.md` |

## Resolución de Open Questions

- **Consumidores de `estado.favoritos`**: único consumidor funcional es `src/componentes/Canales.jsx:16,32`. El resto son defaults (`src/contexto/Contexto.jsx:60`), mocks de test, o comentarios. Se conserva el campo por persistencia, pero la validación MUST migrar a `CANAL_ALLOWLIST`.
- **Retención de `lastBatch`**: no existe hoy. Se implementa **in-memory** `Map<dest,{source,at}>`, NO persistido (confirmado).
- **WS4 `dir`**: es una **etiqueta de display** (Norte/Centro/Sur/Libertador/Pista), NO una dirección del Arranger. El único mapeo a hardware es `screens[]` (interface del design: `dir:"Libertador"`; labels actuales de `MatrizVideo`). Confirmar con el usuario: si `dir` fuera dirección Arranger, sólo cambia el literal, no el modelo.
- **WS4 key interna**: se renombra `TvsBarraLivertador` → `TvsBarraLibertador` (spec MG-3 fija la key) **y** la etiqueta a "Libertador" (MG-7). No hay datos persistidos con la key vieja (`matrixGroups` es dominio nuevo; los presets guardan `tvs`), así que el rename es libre.
- **WS4 VWall en `matrixGroups`**: VWN/VWC/VWS SÍ se registran (subgrupos de 1 pantalla) → `verify-groups.cjs` C8 se invierte.

## WS2 — canales-favoritos (PR 1 · hash 96ea351c)

- [x] **T-2.1** Exportar `CANAL_ALLOWLIST` (Set de `ch.canal`) en `src/data/canalesFavoritos.js`. Acepta: contiene 1624. Test: extender `src/hooks/verify/verify-broker-core.mjs`.
- [x] **T-2.2** Validar en `src/componentes/Canales.jsx:32` contra `CANAL_ALLOWLIST.has(String(canal))`. Acepta: canal de la grilla siempre ejecuta (CF-1).
- [x] **T-2.3** `src/componentes/Canales.jsx:45-48`: reemplazar reset silencioso por `toast.warning("canal no válido")`, sin mutar placeholder. Acepta: CF-2.
- [x] **T-2.4** Reconciliar drift de `estado.favoritos` contra la allowlist al hidratar/grilla. Acepta: CF-3.
- [x] **T-2.5** Extender `src/componentes/Canales.test.jsx`: válido ejecuta; inválido toastea sin reset; drift.

**DoD WS2**: 1624 aceptado; inválido toastea sin reset; `pnpm test` verde; un solo consumidor documentado.

## WS3 — canales-dtv-intent (PR 2 · commits 18e3132, 5da48ab, f55d17d)

- [x] **T-3.1** `server/broker/store.js:74` `defaultSchemaV3` + dominio `channelIntent` `{desired,reported:null,version,lastUpdated}`; backfill idempotente en `normalizeV3` (nueva función, aplicada en `createStore` sobre TODAS las ramas de seed). Acepta: state v3 viejo carga (verify-store T5: sin backup, sin rescan, tvs intacto).
- [x] **T-3.2** Setter/getter app-domain de `channelIntent` (patrón `presets`): `getChannelIntent()` / `setChannelIntentEntry(decoId, entry)` — el ACK mergea sin pisar canalActual/lastSentAt.
- [x] **T-3.3** `server/server.js` `POST /api/decos/:id/channel`: noop CD-2 (mismo canal vigente → `{noop:true, reason:"canal ya sintonizado"}`, sin bump ni IR) o setDesired `{canalActual, lastSentAt, ack:"pending"}` + `broadcastDomain`; `POST /api/decos/:id/channel/ack` persiste `accepted`/`rejected`; incluido en `/api/broker/state` y `buildBrokerSnapshot.versions`. Acepta: CD-1/CD-3/CD-4.
- [x] **T-3.4** Rehidratación al startup (persistencia state.json + backfill) + evento SSE incremental vía `broadcastDomain("channelIntent")` (payload = desired). Acepta: CD-5 (verify F1/F2: snapshot, reload y 2º server).
- [x] **T-3.5** `src/api/arrangerApi.js` `setChannelIntent(deco, canal)` + `setChannelIntentAck(deco, ack)`.
- [x] **T-3.6** `src/hooks/brokerClientCore.js`: `DOMAIN_KEYS` +`channelIntent`; key `desired` para dominios app-only (`DESIRED_KEY_DOMAINS`); `deriveUiState` expone `channelIntent`; nuevo `rehydrateDecosFromIntent`.
- [x] **T-3.7** `src/App.jsx` rehidratar `dispositivos`/`decos` desde `channelIntent` con precedencia server (`rehydrateDecosFromIntent` en el efecto del snapshot).
- [x] **T-3.8** `src/componentes/Canales.jsx` write-through: POST intención → noop "canal ya sintonizado" SIN IR / "cambiando al canal X" → IR client-side → ACK accepted|rejected; toasts exactos CD-2/CD-3/CD-4.
- [x] **T-3.9** Nuevo `server/broker/verify/verify-channel-intent.cjs`: accepted/rejected/same-channel/sin `reported`/reload/snapshot/validaciones/broadcast (28 checks).
- [x] **T-3.10** Registrado en `server/broker/verify/run-all.cjs`; `verify-store.cjs` +T5 (backfill, setter, merge ACK); `Canales.test.jsx` +4 tests WS3.

**DoD WS3**: CD-1…CD-5; `node server/broker/verify/run-all.cjs` verde; reload y 2º cliente rehidratan.

## WS4 — matriz de grupos data-driven (PR 3–7 · rama `feat/mejoras-broker-ws4a`)

Reencuadre aprobado: modelo declarativo único `zones→subgroups{key,dir,screens}` + `combosBySize{3,4}`. El modelo es la ÚNICA fuente de opciones y expansión; el server es dueño de `matrixGroups`. 3 zonas / 10 subgrupos / 29 pantallas.

### Manejo de los 4 commits actuales de `feat/mejoras-broker-ws4a`

- La rama NO está pusheada ni tiene PR → **se reescribe localmente**, sin force-push a remoto.
- Secuencia determinística (no interactiva, working tree nunca se pierde):
  1. `git add openspec/changes/mejoras-broker/design.md openspec/changes/mejoras-broker/specs/matrix-groups-state/spec.md && git commit -m "docs(sdd): reencuadre WS4 data-driven"`
  2. `git reset --soft f49cd7c && git reset` (HEAD al base previo a `c75669f`; todo queda como cambios locales)
  3. Reescribir `groups.js`/`verify-groups.cjs`, crear `matrixModel.js` y re-commitear la slice (abajo); eliminar `verify-report-ws4a.md` (stale — lo regenera `sdd-verify`). **No** incluir `server/pnpm-lock.yaml`.
- El port original (`GROUP_DEFS` hardcodeado + `values[0]` mixed) se **descarta**, no se parchea: la slice se rehace.

### WS4a — modelo declarativo + `groups` derivado (PR 3)

- [x] **T-4a.1** Crear `server/broker/matrixModel.js`: `MATRIX_MODEL` = 3 zonas / 10 subgrupos `{key,dir,screens}` (VWN/VWC/VWS = 1 pantalla) + `combosBySize{3,4}`; helpers puros `screensOf`, `optionsFor(model,size)`, `subgroupKeys`. Acepta MG-3/MG-4.
- [x] **T-4a.2** Reescribir `server/broker/groups.js`: `GROUP_DEFS`/`GROUP_PATTERNS` **derivados** de `matrixModel`; `expandGroups` recorre subgrupos (VWall incluido en `matrixGroups`); `collapseGroup` → `null` en mixed (nunca `values[0]`); `optionsFor(size)`; key `TvsBarraLibertador`.
- [x] **T-4a.3** Reescribir `server/broker/verify/verify-groups.cjs`: A = 10 subgrupos, C8 = VWall SÍ en `matrixGroups`, D6 = mixed → `null`, F = 10 subgrupos/29 pantallas, + rechazo de combo de tamaño incorrecto. Actualizar label en `run-all.cjs`.
- [x] **T-4a.4** Extender `src/hooks/verify/verify-broker-core.mjs` con los helpers de `matrixModel` (read-only sobre server). *(Absorbida en WS4c — sección 13 del verify.)*

**DoD WS4a**: `node server/broker/verify/verify-groups.cjs` verde; `run-all.cjs` verde; sin wiring en `server.js`.

### WS4b — dominio `matrixGroups` + endpoint + snapshot (PR 4)

- [x] **T-4b.1** `server/broker/store.js`: `defaultMatrixGroups()` (`{desired:{},reported:null,version,lastUpdated}`); añadirlo a `defaultSchemaV3` (:85), `migrateV2ToV3`, `freshStartV3` y backfill idempotente en `normalizeV3` (:107); `getMatrixGroups()`/`setMatrixGroups(values)` (patrón `presets`).
- [x] **T-4b.2** `server/server.js`: `broadcastDomain("matrixGroups")` → payload `desired`; `versions.matrixGroups` + `matrixModel` top-level en `buildBrokerSnapshot` (:549) y en el evento SSE `snapshot`.
- [x] **T-4b.3** `server/server.js`: `POST /api/matrix-groups {values}` — validar cada valor contra `optionsFor(size)` (rechazo de tamaño incorrecto) → `expandGroups` → dedupe → `writeQueue`; persistir + `broadcastDomain`. Acepta MG-1/MG-5.
- [x] **T-4b.4** `server/server.js` `POST /api/presets/:n/load` (:806): derivar `matrixGroups` de `preset.tvs` con `collapseGroup` (mixed → `null`), persistir y difundir. Acepta MG-2/MG-6.
- [x] **T-4b.5** Nuevo `server/broker/verify/verify-matrix-groups.cjs`: accept/reject-tamaño, snapshot con `matrixModel`+`matrixGroups`, broadcast, preset mixed → `null`, `reported:null`. Extender `verify-store.cjs` (T6 backfill/setter), `verify-composition.cjs` (endpoint+snapshot) y `run-all.cjs`.

**DoD WS4b**: MG-1…MG-6 server-side; `run-all.cjs` verde.

### WS4c — plumbing cliente (PR 5)

- [x] **T-4c.1** `src/hooks/brokerClientCore.js`: `DOMAIN_KEYS` +`matrixGroups` (:21); `DESIRED_KEY_DOMAINS` +`matrixGroups`; `applySnapshot`/`applyPollBody` **preservan `matrixModel` top-level** (hoy lo descartan); `deriveUiState` expone `matrixGroups` + `matrixModel`.
- [x] **T-4c.2** Quitar `GROUP_DEFS`/`GROUP_PATTERNS` hardcodeados (:710-733); `collapseGroup(tvs, screens, combosBySize)` y `expandFromModel(values, model)` derivados del modelo servido.
- [x] **T-4c.3** `src/api/arrangerApi.js` `setMatrixGroups(values)`.
- [x] **T-4c.4** `src/App.jsx`: inyectar `matrixModel`/`matrixGroups` al contexto (memo junto a `deriveUiState` :49). Extender `verify-broker-core.mjs`.

**DoD WS4c**: `matrixModel` sobrevive snapshot/poll; `node src/hooks/verify/verify-broker-core.mjs` verde.

### WS4d — MatrizVideo renderiza del modelo (PR 6)

- [ ] **T-4d.1** `src/componentes/MatrizVideo.jsx`: selects desde `matrixModel` (loop zonas→subgrupos, label desde `dir`, opciones = DTV1..DTV8 + `optionsFor(size)`); borrar los bloques hardcodeados (:513-630). Sin `matrixModel` → selects deshabilitados (nunca literales).
- [ ] **T-4d.2** `initialValues` desde `domains.matrixGroups.desired` con fallback `collapseGroup` del modelo (:119-130); renombrar el campo del switch `TvsBarraLivertador`→`TvsBarraLibertador` (submit transitorio intacto).
- [ ] **T-4d.3** Mostrar `"Mixto / Personalizado"` cuando el valor derivado es `null` (MG-6); `undefined` → fallback/sin selección.
- [ ] **T-4d.4** Extender `src/componentes/MatrizVideo.test.jsx`: render desde modelo, Mixto, fallback sin modelo.

**DoD WS4d**: MG-6; comportamiento de escritura sin cambios (submit sigue por-TV).

### WS4e — expansión server-side (PR 7)

- [ ] **T-4e.1** `src/componentes/MatrizVideo.jsx`: submit → `setMatrixGroups(values)` (POST `/api/matrix-groups`); eliminar el switch (:146-433) y el batch de `setTvSource`; optimistic con `applyOptimistic("matrixGroups", values)`; toasts de error existentes.
- [ ] **T-4e.2** Extender `MatrizVideo.test.jsx`: submit llama `setMatrixGroups` una vez; no llama `setTvSource` por TV.

**DoD WS4e**: MG-1; cliente read-only; un solo POST por submit.

**Orden obligatorio**: WS4e ANTES de WS5 — WS5 reescribe el mismo submit de `MatrizVideo.jsx` (pre-filter + `force`).

## WS5 — dedupe (PR 8 · hash d4b8e196)

- [ ] **T-5.1** `server/server.js:386` guard pre-join en `executeWrite`: no-op iff `desired===source && reported[key]===source && !writeQueue.isBusy(dest)`; responde `{ok,noop:true}`. NO tocar `confirmEncoder`/settling.
- [ ] **T-5.2** `lastBatch` in-memory `Map<dest,{source,at}>` (no persistido) marca resubmits idénticas.
- [ ] **T-5.3** Param `force:true` saltea el guard; `setTvSource(id, source, {force})` en `src/api/arrangerApi.js`.
- [ ] **T-5.4** `src/componentes/MatrizVideo.jsx`: pre-filter cliente `tvs[dest]===source`; toast "sin cambios"; acción "forzar reenvío".
- [ ] **T-5.5** Nuevo `server/broker/verify/verify-dedupe.cjs`: no-op/repetida/isBusy/force/reported-stale. `server/broker/verify/verify-confirm-settling.cjs` (read-only) MUST seguir verde — no romper PR #13.
- [ ] **T-5.6** Extender `src/componentes/MatrizVideo.test.jsx`: pre-filter + force.

**DoD WS5**: escenarios WS5-DEDUPE + zonas no-op (zonas-fuera-state); `run-all.cjs` verde incl. `verify-confirm-settling`.

## WS1 — auditoría read-only (PR 9 · hash 08994679)

- [ ] **T-1.1** Procedimiento read-only: `get devices all` vs `aMas15-Vwall-Libertador`; documentar hallazgo en `openspec/changes/mejoras-broker/ws1-audit.md`. Cero writes. Referencia `API commands/devices_all.txt` (read-only).
- [ ] **T-1.2** Si la identidad no coincide con ningún dispositivo modelado → registrar hallazgo para change aparte; no modelar aquí.
- [ ] **T-1.3** Test: N/A — requiere Arranger real (sin hardware en entorno de agente); la evidencia es la salida read-only del comando.

**DoD WS1**: hallazgo documentado con evidencia; cero writes.
