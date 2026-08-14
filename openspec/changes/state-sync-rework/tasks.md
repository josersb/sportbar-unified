# Tasks: state-sync-rework — State Broker

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,700–1,900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 (stacked-to-main) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Broker foundation: destinations, mock, arrangerClient (FW-LOCKED), store v3+backup+fresh-start, eventBus | PR 1 | `node -e` migración fixture v2 + smoke mock | `VITE_MOCK_ARRANGER=1 pnpm run sportbar:dev` | revert commit; cliente actual intacto |
| 2 | writeQueue + reconciler + server.js composition (endpoints nuevos, token único, limiters; legacy conservados) | PR 2 | `POST /api/tvs/:id/source` confirmado vs mock | mock normal + 2 clientes SSE | revert PR 2; legacy endpoints siguen |
| 3 | Cliente: useBrokerState, App/Contexto/api/componentes/presets; delete useArrangerReconciliation | PR 3 | `pnpm run sportbar:build` + propagación <1s en 2 pestañas | mock normal/offline | revert PR 3; server PR 2 sirve al cliente viejo |
| 4 | Limpieza: endpoints legacy removidos, vite proxy, E2E final | PR 4 | `pnpm run sportbar:build` + E2E manual | mock + 2 browsers | revert PR 4; PR 2-3 permanecen funcionales |

## Phase 1: Broker foundation (PR 1)
- [x] 1.1 `server/broker/destinations.js` — 40 destinos canónicos + mapa VW-*↔VW (absorbe maps cliente). Verify: export único, sin duplicados.
- [x] 1.2 `server/broker/mockArranger.js` — modos normal/blip/offline, `join`/`get encoder` deterministas.
- [x] 1.3 `server/broker/arrangerClient.js` — `getEncoder`/`join` con retry + switch mock; getters `get matrix`/`joins`/`status` conservados con banner FW-LOCKED, no expuestos al cliente.
- [x] 1.4 `server/broker/store.js` — lowdb v3, schema `desired`/`reported`, versiones por dominio; migración v2→v3 + `state.backup.json`; fresh-start (matriz desde Arranger, presets migrados, app-only conservado).
- [x] 1.5 `server/broker/eventBus.js` — hub SSE: heartbeat 25s, máx 10 conexiones, snapshot en cada connect.
- [x] 1.6 Verify PR 1: migración sobre fixture v2 genera backup; fresh-start reconstruye; gate `pnpm run sportbar:build`.

## Phase 2: Broker composition (PR 2)
- [x] 2.1 `server/broker/writeQueue.js` — FIFO por destino (`Map<key,Promise>`), máx 1 join/destino. Verify: doble POST TV01 en serie, última intención gana.
- [x] 2.2 `server/broker/reconciler.js` — scan batch 4, buildDiffs (del hook), auto-adopt solo lectura confirmada (null/blip no pisa), single-flight; intervalo `RECONCILER_INTERVAL_MS` (default 300000).
- [x] 2.3 `server/server.js` — composition root: token único `VITE_ARRANGER_TOKEN || ARRANGER_TOKEN` fail-fast (gap 2); limiters reads 300/writes 240/15min, stream y proxy sin limiter; endpoints `GET /api/stream`, `GET /api/broker/state?since=`, `POST /api/app-state`, `POST /api/tvs/:id/source`, `POST /api/presets/:n/load`; POSTs tvrack/zonas-fuera/presets write-through+await+broadcast; endpoints legacy conservados.
- [x] 2.4 Verify PR 2: POST respondido con reported confirmado; SSE <1s; 2 clientes SSE sin 429; cliente actual operativo.

## Phase 3: Cliente broker (PR 3) ✅ COMPLETO (apply batch 2026-08-14)
- [x] 3.1 `src/hooks/useBrokerState.js` — SSE + snapshot + delta por dominio, reconexión auto, fallback poll versionado vs broker (5s→30s backoff), enum `synced|stale|out_of_sync|offline`. → core puro `src/hooks/brokerClientCore.js` + `verify-broker-core.mjs` 43/43 + `verify-broker-client.mjs` 15/15 (contra server real mock)
- [x] 3.2 `src/App.jsx` — elimina 3 polls (~L297/307/332), persist effect, refs de parcheo; sin join cliente. → reescrito sobre snapshot SSE; escrituras confirmed-only via broker
- [x] 3.3 `src/contexto/Contexto.jsx` — quita keys legacy; `syncStatus`+`lastSync` estables. → sin TvsBarra*/TvsEscalera*/tvs.TVRACK; `syncStatus` memo estable + `syncDiffs` informativos
- [x] 3.4 `src/api/arrangerApi.js` — reduce a cliente del broker; elimina `getDeviceStatus` (L348), `reconstructMatrixState` (L141), getters directos; setters → POSTs broker. → nuevo `setTvSource`/`fetchBrokerState`/`setAppState`/presets snapshot; proxy `/api/command` conservado (IR/serial/preset-deco)
- [x] 3.5 `src/componentes/MatrizVideo.jsx` — sin 4º fetch tvrack; escrituras confirmed-only vía broker. → grupos derivados con `collapseGroup` (sin keys legacy); submit → `POST /api/tvs/:id/source` batch
- [x] 3.6 `src/componentes/SyncPanel.jsx` → indicador; elimina `applyDiff` + Apply/Ignore (bug e muerto, sin reintroducir diff tvrack). → drawer indicador + diffs informativos sin acciones
- [x] 3.7 `src/componentes/Header.jsx` — tab con enum sync. → icono ✅/⏳/⚠️/❌ según `syncStatus`
- [x] 3.8 `src/main.jsx` — elimina dev helper `reconstructMatrixState`. → quitado
- [x] 3.9 `usePreset.js`+`MatrizPreset.jsx` — snapshot `{tvs, zonasFuera, tvrack}` + migración de viejos; load vía `POST /api/presets/:n/load` (sin BATCH 8 cliente). → `migrarPreset` cliente + savePreset/loadPreset/deletePresetServer
- [x] 3.10 Delete `src/hooks/useArrangerReconciliation.js` (reemplazado por reconciler server-side). → eliminado + VideoMatrix lee TVRACK de tvrackState
- [x] 3.11 Verify PR 3: propagación PC-A→PC-B <1s; tvrack no reaparece tras recarga; offline → indicador + persistido. → verify node 43/43 + 15/15 + `pnpm run build` ✓ 4.25s + `pnpm test` 179/179; checklist manual en apply-progress

## Phase 4: Limpieza + E2E (PR 4)
- [ ] 4.1 `server/server.js` — remueve `GET|POST /api/state`, `GET /api/tvrack/state`, `GET /api/zonas-fuera/state`, `GET /api/matrix/state`, `GET /api/device/:id/status`.
- [ ] 4.2 `vite.config.js` — proxy `/api/stream`,`/api/broker`,`/api/tvs`; quita fallback `/api`→Arranger (resta solo `/api/command/:command/:token`).
- [ ] 4.3 E2E manual: 2 browsers con mock — propagación <1s, reconexión, preset 3 dominios restaura tvs+zonasFuera+tvrack, fresh-start con state.json envenenado, modos offline/blip.
- [ ] 4.4 Gate: `pnpm run sportbar:build`; barrido `Select-String` — sin keys legacy, `applyDiff`, ni polls residuales.
