# Tasks: mejoras-broker

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~950–1150 (authored) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 WS2 → PR2 WS3 → PR3 WS4a → PR4 WS4b → PR5 WS5 → PR6 WS1 |
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
| WS4a | Port `expandGroups` al server + unit | PR 3 | `node server/broker/verify/verify-groups.cjs` | N/A (módulo puro, sin boundary runtime) | delete `server/broker/groups.js` + su test |
| WS4b | `matrixGroups` write-through + preset server-side | PR 4 | `node server/broker/verify/verify-matrix-groups.cjs` | mock server, submit + preset load + reload | revert dominio `matrixGroups` (store/server/MatrizVideo/hook/api) |
| WS5 | Dedupe pre-join + escape `force` | PR 5 | `node server/broker/verify/verify-dedupe.cjs` | mock server, doble submit + forzar | quitar guard pre-join en `server.js` (`confirmEncoder` intacto) |
| WS1 | Auditoría read-only de identidad | PR 6 | N/A — solo lectura, requiere Arranger real | `get devices all` (read-only) | revert `openspec/changes/mejoras-broker/ws1-audit.md` |

## Resolución de Open Questions

- **Consumidores de `estado.favoritos`**: único consumidor funcional es `src/componentes/Canales.jsx:16,32`. El resto son defaults (`src/contexto/Contexto.jsx:60`), mocks de test, o comentarios. Se conserva el campo por persistencia, pero la validación MUST migrar a `CANAL_ALLOWLIST`.
- **Retención de `lastBatch`**: no existe hoy. Se implementa **in-memory** `Map<dest,{source,at}>`, NO persistido (confirmado).

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

## WS4a — port groups (PR 3 · hash b1a7a38b)

- [ ] **T-4a.1** Crear `server/broker/groups.js`: port de `GROUP_DEFS`/`GROUP_PATTERNS`/`expandGroups()` desde `src/hooks/brokerClientCore.js:663-686` (read-only); cubrir los 9 grupos (MG-3).
- [ ] **T-4a.2** Nuevo `server/broker/verify/verify-groups.cjs`: 9 grupos + expansión determinista.
- [ ] **T-4a.3** Registrar en `server/broker/verify/run-all.cjs`.

**DoD WS4a**: unit verde; sin wiring (no tocar `server.js`).

## WS4b — matrix-groups write-through (PR 4 · hash 5b4ef328)

- [ ] **T-4b.1** `server/broker/store.js`: dominio `matrixGroups` + `normalizeV3`.
- [ ] **T-4b.2** `server/server.js`: `POST /api/matrix-groups {values}` → `expandGroups` → dedupe → `writeQueue`; `broadcastDomain`; snapshot (:719).
- [ ] **T-4b.3** `server/server.js`: preset-load deriva `matrixGroups` del preset `tvs` server-side y difunde (MG-2).
- [ ] **T-4b.4** `src/hooks/brokerClientCore.js:21,:212` `DOMAIN_KEYS` +`matrixGroups`; `deriveUiState`; fix fallback `collapseGroup` (:706-708).
- [ ] **T-4b.5** `src/componentes/MatrizVideo.jsx`: `initialValues` desde `matrixGroups` (fallback `collapseGroup`); submit → POST; sin persistir (MG-1).
- [ ] **T-4b.6** `src/api/arrangerApi.js` `setMatrixGroups(values)`.
- [ ] **T-4b.7** Nuevo `server/broker/verify/verify-matrix-groups.cjs`; extender `MatrizVideo.test.jsx`; registrar en `run-all.cjs`.

**DoD WS4b**: MG-1…MG-3; snapshot con 9 grupos; preset resuelto server-side.

## WS5 — dedupe (PR 5 · hash d4b8e196)

- [ ] **T-5.1** `server/server.js:386` guard pre-join en `executeWrite`: no-op iff `desired===source && reported[key]===source && !writeQueue.isBusy(dest)`; responde `{ok,noop:true}`. NO tocar `confirmEncoder`/settling.
- [ ] **T-5.2** `lastBatch` in-memory `Map<dest,{source,at}>` (no persistido) marca resubmits idénticas.
- [ ] **T-5.3** Param `force:true` saltea el guard; `setTvSource(id, source, {force})` en `src/api/arrangerApi.js`.
- [ ] **T-5.4** `src/componentes/MatrizVideo.jsx`: pre-filter cliente `tvs[dest]===source`; toast "sin cambios"; acción "forzar reenvío".
- [ ] **T-5.5** Nuevo `server/broker/verify/verify-dedupe.cjs`: no-op/repetida/isBusy/force/reported-stale. `server/broker/verify/verify-confirm-settling.cjs` (read-only) MUST seguir verde — no romper PR #13.
- [ ] **T-5.6** Extender `src/componentes/MatrizVideo.test.jsx`: pre-filter + force.

**DoD WS5**: escenarios WS5-DEDUPE + zonas no-op (zonas-fuera-state); `run-all.cjs` verde incl. `verify-confirm-settling`.

## WS1 — auditoría read-only (PR 6 · hash 08994679)

- [ ] **T-1.1** Procedimiento read-only: `get devices all` vs `aMas15-Vwall-Libertador`; documentar hallazgo en `openspec/changes/mejoras-broker/ws1-audit.md`. Cero writes. Referencia `API commands/devices_all.txt` (read-only).
- [ ] **T-1.2** Si la identidad no coincide con ningún dispositivo modelado → registrar hallazgo para change aparte; no modelar aquí.
- [ ] **T-1.3** Test: N/A — requiere Arranger real (sin hardware en entorno de agente); la evidencia es la salida read-only del comando.

**DoD WS1**: hallazgo documentado con evidencia; cero writes.
