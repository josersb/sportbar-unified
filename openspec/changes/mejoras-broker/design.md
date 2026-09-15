# Design: mejoras-broker

## Technical Approach

Extend the broker's app-only model with two versioned server-authoritative domains (`channelIntent`, `matrixGroups`), reusing the existing `presets` precedent (`reported: null`, `desired` broadcast). WS4 replaces the hardcoded group switches with one declarative, server-served model (`zones→subgroups{key,dir,screens[]}` + `combosBySize{3,4}`): the client renders the selects from it and submits subgroup values only. WS2 unifies favorites into one allowlist. WS5 adds a pre-join dedupe guard inside `executeWrite` (never touching `confirmEncoder`). WS3/WS4 gain write-through + SSE + rehydration; WS1 stays read-only.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Where channel/groups live | New `domains.channelIntent` and `domains.matrixGroups`, each `{desired, reported:null, version, lastUpdated}` | (a) `appOnly.appState` blob; (b) new SSE event type; (c) unversioned `appOnly.*` | `presets` already proves an app-only domain: reuses `bumpVersion`, `buildBrokerSnapshot.versions`, `broadcastDomain`, SSE `state`, `?since` polling, client `DOMAIN_KEYS`. appState has no version/SSE/precedence. |
| Schema version | Keep `SCHEMA_VERSION=3`; `defaultSchemaV3()` (store.js:74) adds both domains; idempotent `normalizeV3(seed)` backfill on v3 load (store.js:325) | Bump to v4 + forced backup/rescan | Old v3 files only need two default keys; v4 would trigger a needless backup + Arranger rescan. v2→v3 (`migrateV2ToV3`, `freshStartV3`) inherit them via `defaultSchemaV3`. |
| WS3 semantics | Intention only `{canalActual, lastSentAt, ack}`; ACK = controller (`send ir success`), never the deco | Model channel as `reported` | V210826 exposes no channel read; reporting it would be false confirmation. |
| WS3 IR transport | Server owns the intent write-through; IR digits stay client-side via `/api/command`, client posts the ACK | Move `sendChannelDigits`+`IR_CODES` to server | `IR_CODES` and the `"2"→loadChannelPreset` fallback (arrangerApi.js:318-319) are client-only ES data; duplicating them is large and risks the IR path. |
| WS4 model home | Declarative `zones→subgroups{key,dir,screens[]}` (VideoWall 1-screen; Perímetro/Barra 3-4 screens) + `combosBySize{3,4}` in `server/broker/matrixModel.js`, shipped read-only as snapshot `matrixModel`; client renders from it | Shared ES/CJS module; client copy; hardcoded `GROUP_DEFS`/`GROUP_PATTERNS` + 7 switches | One source, zero drift; add subgroup/TV = edit data. Combo string = source per screen, position-by-position. |
| WS4 groups.js | Extend the WS4a pure module to derive from `matrixModel`; keep `expandGroups`/`collapseGroup` contract + real-destination passthrough | Replace the module | WS4a port contract + verify harness survive; only the literals change. |
| WS4 owner & mixed | Server expands subgroup→screens, persists `matrixGroups.desired`, derives it from preset `tvs` on `POST /api/presets/:n/load`; client submits subgroup values only. `collapseGroup`→`null` when screens match no combo and aren't all-equal; UI shows "Mixto / Personalizado" | Client expands/persists; stored group wins; `values[0]` for mixed | Single owner, all clients converge; the UI must never lie about the operator's intention. |
| WS5 dedupe evidence | No-op only when `desired===source` AND `reported[key]===source` (confirmed) AND `!writeQueue.isBusy(dest)`; `force:true` bypasses; `lastBatch` in-memory `Map<dest,{source,at}>` flags identical resubmits | Dedupe against `desired`/stale `reported` | `reported` is only written by confirmed reads (server.js:419-468), so it is trustworthy; `force` is the one-join-lag escape. |

## Data Flow

```
Canales submit ─POST /api/decos/:id/channel─► setDesired(channelIntent) ─► broadcast SSE
      └─ sendChannelDigits (IR via /api/command) ─► POST ack ─► channelIntent.ack ─► broadcast

MatrizVideo submit ─POST /api/matrix-groups {values}─► matrixModel.expandGroups() ─► dedupe ─► writeQueue.enqueue
                                                          └─► setDesired(matrixGroups) ─► broadcast
preset load ─► derive matrixGroups from preset.tvs (matrixModel.collapse; null = mixed) ─► setDesired ─► broadcast
boot: snapshot.matrixModel + domains.matrixGroups.desired ─► MatrizVideo render/rehydrate ─► UI
```

## File Changes

| File | Action | Description |
|---|---|---|
| `server/broker/store.js` | Modify | `defaultSchemaV3` +2 domains; `normalizeV3`; app-domain setters/getters |
| `server/broker/matrixModel.js` | Create | Declarative `zones`/`subgroups{key,dir,screens[]}`/`combosBySize{3,4}` + pure helpers (`screensOf`, `optionsFor`) |
| `server/broker/groups.js` | Modify | Extend WS4a to derive from `matrixModel`; `collapseGroup` → `null` on mixed; fix `Livertador`→`Libertador` |
| `server/server.js` | Modify | `POST /api/decos/:id/channel`, `POST /api/matrix-groups`; snapshot ships `matrixModel`; `broadcastDomain` + `/api/broker/state` loops include new domains (server.js:719); WS5 guard before the join (:386); preset-load derives `matrixGroups` |
| `src/data/canalesFavoritos.js` | Modify | Export `CANAL_ALLOWLIST` Set |
| `src/componentes/Canales.jsx` | Modify | Validate vs allowlist (:32); toast on invalid (:45-48); "ya sintonizado" dedupe; WS3 write-through + ACK |
| `src/App.jsx` | Modify | Rehydrate `dispositivos`/`decos` from `channelIntent` (after :56), server precedence |
| `src/componentes/MatrizVideo.jsx` | Modify | Render selects from served `matrixModel` (no switches); `initialValues` from `matrixGroups` (fallback model collapse); submit → `POST /api/matrix-groups`; "Mixto / Personalizado" option |
| `src/hooks/brokerClientCore.js` | Modify | `DOMAIN_KEYS` +`matrixGroups` (:21) + `DESIRED_KEY_DOMAINS`; `deriveUiState` exposes `matrixGroups`; drop hardcoded `GROUP_DEFS`/`GROUP_PATTERNS` |
| `src/api/arrangerApi.js` | Modify | `setTvSource(id, source, {force})`, `setChannelIntent`, `setMatrixGroups` |

## Interfaces / Contracts

```js
// snapshot.matrixModel (read-only config; ships in /api/broker/state + SSE snapshot)
{ zones: [{ key: "barra", subgroups: [
    { key: "TvsBarraLibertador", dir: "Libertador", screens: ["TV01","TV02","TV03"] }, … ] }, … ],
  combosBySize: { 3: ["DTV123","DTV121","DTV542","DTV143","DTV153"],
                  4: ["DTV1234","DTV1212","DTV1231","DTV5432","DTV3254","DTV1354"] } }
// domains.channelIntent.desired
{ DTV1: { canalActual: "1624", lastSentAt: "2026-09-12T…", ack: "pending"|"acked"|"error" } }
// domains.matrixGroups.desired — subgroup key → combo | single source | null (mixed)
{ TvsBarraLibertador: "DTV123", TvsBarraSur: null, … }
// POST /api/matrix-groups  body { values: { TvsBarraSur: "DTV1234" } } → { ok, accepted, noop? }
// POST /api/tvs/:id/source  body { source, force? }  → { ok, noop?, reason? }
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `matrixModel` helpers, `expandGroups`, `collapseGroup` (mixed→`null`), allowlist | `src/hooks/verify/verify-broker-core.mjs`; extend `verify-groups.cjs` |
| Component | Canales valid/invalid toast; MatrizVideo model-rendered selects + "Mixto / Personalizado" | new `Canales.test.jsx`; extend `MatrizVideo.test.jsx` (jsdom) |
| Integration | channel intent write-through + rehydrate; matrix-groups persist/broadcast; preset-derived groups (mixed→`null`); dedupe no-op/force; `confirmEncoder` intact | new `verify-channel-intent.cjs`, `verify-matrix-groups.cjs`, `verify-dedupe.cjs`; keep `verify-confirm-settling.cjs` green |

Commands: `pnpm test` · `node server/broker/verify/run-all.cjs` · all with `VITE_MOCK_ARRANGER=1 BROKER_FILE_LOG=0`.

## Threat Matrix

N/A — no routing/URL-classification, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The only external boundary (outbound Arranger join/IR dispatch) is an existing HTTP client; its new risk (suppressing a real join) is tracked below with a `force` escape.

## Migration / Rollout

Slices WS2→WS3→WS4→WS5→WS1, one PR each. Old v3 `state.json` backfilled by `normalizeV3` (no backup/rescan). Rollback = `git revert` per slice; WS3/WS4 degrade to read-only when the domain is absent (WS4: group selects disabled if `matrixModel` is missing — no client-side literals); WS5 disables by removing the pre-join guard or sending `force`. Unknown domains are ignored by old clients (`applyStateEvent` gates on `DOMAIN_KEYS`).

## Risks

- **False no-op (one-join-lag)**: dedupe only against confirmed `reported`, plus `force` and the reconciler's re-reads (server.js:301-338).
- **PR #13 regression**: guard sits before the join; `confirmEncoder`/settling untouched; `verify-confirm-settling` stays green.
- **WS4 mixed/absence**: an unknown mixture must render "Mixto / Personalizado" (`null`), never `values[0]`; a snapshot without `matrixModel` disables the group selects rather than guessing.
- **Favorites deprecation**: verify no other consumer of `estado.favoritos` before removing.

## Open Questions

- [ ] Confirm `dir` semantics (display label vs Arranger direction) and whether 1-screen VideoWall subgroups are recorded in `matrixGroups`.
- [ ] Confirm no other consumer reads `estado.favoritos` before deprecating it (grep in tasks).
- [ ] `lastBatch` retention: pure in-memory (chosen) vs persisted — finalize in tasks.
