# Proposal: state-sync-rework

## Intent

Convertir el server Express en un **State Broker**: única fuente de verdad del estado, eliminando las 3 fuentes compitiendo (server, localStorage, Arranger) y los 6 mecanismos de fallo (pisado a defaults, loop re-sync, TVRACK reset, zonas vacías, bug SyncPanel tvrack, races TOCTOU). Ningún cliente llama al Arranger; toda consulta pasa por el broker. Arranger v1.3.4 sin eventos → polling `get encoder` como única lectura.

## Scope

### In Scope
- Server dueño del estado con modelo `desired`/`reported`, versionado por dominio (`version`/`lastUpdated`), escrituras serializadas por destino con `await`.
- Reconciliación periódica server-side con **auto-adopt (Arranger gana)**: adopción por destino SOLO con lectura confirmada válida; null/blip no pisa.
- SSE Broker→Clientes (snapshot inicial + incremental + reconexión) + polling de respaldo; reemplaza los 3 polls + 4º fetch.
- Presets = snapshot completo (tvs + zonasFuera + tvrack) + migración de formato viejo.
- Arranque background+stale: sirve persistido, escanea Arranger (~24s), UI usable al instante.
- Backfill FRESH START: state.json envenenado NO se migra — estado de matriz se reconstruye desde el Arranger físico; presets viejos se migran; estado app-only se conserva.
- Eliminar: `reconciledRef` 2s, POSTs fire-and-forget, poll estado (pisa todo), código muerto (`reconstructMatrixState`, `getDeviceStatus`), keys legacy (`TvsBarra*`/`TvsEscalera*`), POST `/api/state` completo, mapeo VW ×3.
- Fix bug (e): `SyncPanel.applyDiff` tvrack sin persistencia.

### Out of Scope
- Audio Tesira RS-232 (Norte/Centro/Sur) — app-only, dueño server, sin arbitraje Arranger.
- Rediseño visual del SyncPanel más allá del cambio de rol (gate → indicador).
- CI/CD; firmware upgrade.

## Capabilities

### New Capabilities
- `state-broker`: server dueño del estado; desired/reported; escrituras serializadas+versionadas; flujo comando con await; cache del hardware.
- `sync-broadcast`: SSE snapshot+incremental+reconexión; polling respaldo; estado sync `synced/stale/out_of_sync/offline`.
- `preset-complete-snapshot`: snapshot completo + migración formato.

### Modified Capabilities
- `arranger-reconciliation`: reconciliación → server-side auto-adopt; SyncPanel → indicador de estado; buildDiffs conservado.
- `arranger-api-centralized`: quitar `getDeviceStatus`/`reconstructMatrixState`; consolidar VW; proxy único camino.
- `zonas-fuera-state`: endpoints write-through con await; inclusión en presets; SSE.
- `migracion-localstorage`: migración formato preset + política fresh-start.
- `registro-dispositivos`: reconciliar drift (`getDeviceStatus` es código muerto; capability detection manual-only).

## Approach

Fases: (1) Broker + versionado server; (2) SSE + cliente consume; (3) reconciliación auto-adopt; (4) presets snapshot + fresh-start; (5) limpieza dead code + fix (e). Verificación: mock Arranger (`VITE_MOCK_ARRANGER`), `pnpm run sportbar:build`, manual multi-PC.

## Affected Areas

| Área | Impacto |
|---|---|
| `server/server.js` | Store, SSE, reconciliación, rate limiter |
| `src/App.jsx` | Elimina 3 polls + persist; consume SSE |
| `src/hooks/useArrangerReconciliation.js` | → server; cliente consume reported |
| `src/contexto/Contexto.jsx` | Keys legacy, status sync |
| `src/api/arrangerApi.js` | Dead code, VW |
| `src/hooks/usePreset.js`, `MatrizPreset.jsx`, `SyncPanel.jsx` | Presets snapshot, rol indicador, fix (e) |

## Risks

| Riesgo | Likelihood | Mitigación |
|---|---|---|
| Regresión camino crítico sin test runner | High | Mock + manual + build |
| Auto-adopt pisa estado bueno por lectura parcial | Med | Adopción por destino solo lectura confirmada |
| Rate limiter 429 heredado | Med | Rediseñar presupuesto (SSE reduce GETs) |
| Incompatibilidad coexistencia Windows v1.0 | Med | Migración conjunta; proxy único camino |

## Rollback Plan

Revertir commit (rama feat aislada desde v2); `state.backup.json` previo; presets viejos en localStorage.

## Dependencies

Arranger v1.3.4 (batch 4, 12s/subscription); `VITE_ARRANGER_TOKEN`; lowdb; sin test runner.

## Success Criteria

- [ ] 2 browsers ven cambio <1s vía SSE sin polling.
- [ ] Auto-adopt reported→desired sin pisar nulls (mock con blip).
- [ ] Preset restaura tvs+zonasFuera+tvrack.
- [ ] Bug (e) cerrado: diff tvrack no reaparece.
- [ ] UI usable <1s, sync <30s.
- [ ] `pnpm run sportbar:build` verde.
