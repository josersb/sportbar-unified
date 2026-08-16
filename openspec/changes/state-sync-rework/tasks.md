# Tasks: state-sync-rework — State Broker

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR 5: ~350–400 |
| 400-line budget risk | Medium; one PR 5 slice |
| Chained PRs recommended | Yes; do not split PR 5 |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 5 | Command surface | PR 5 | `node server/broker/verify/run-all.cjs` | mock + 2 tabs | revert PR 5 |

## Phase 1: Broker foundation (PR 1) ✅
- [x] 1.1 `server/broker/destinations.js` — destinations/VW map.
- [x] 1.2 `server/broker/mockArranger.js` — normal/blip/offline mock.
- [x] 1.3 `server/broker/arrangerClient.js` — retry/mock; FW-LOCKED getters.
- [x] 1.4 `server/broker/store.js` — lowdb, migration, backup, fresh-start.
- [x] 1.5 `server/broker/eventBus.js` — SSE heartbeat, cap, snapshot.
- [x] 1.6 Verify migration, fresh-start, `pnpm run sportbar:build`.

## Phase 2: Broker composition (PR 2) ✅
- [x] 2.1 `server/broker/writeQueue.js` — FIFO per destination.
- [x] 2.2 `server/broker/reconciler.js` — scan, adoption, single-flight.
- [x] 2.3 `server/server.js` — composition, auth/limits, SSE, writes.
- [x] 2.4 Verify POST, SSE, two clients without 429.

## Phase 3: Broker client (PR 3) ✅
- [x] 3.1 `src/hooks/useBrokerState.js`, `brokerClientCore.js` — SSE/fallback/sync.
- [x] 3.2 `src/App.jsx`, `src/contexto/Contexto.jsx` — snapshot; remove legacy polls/keys.
- [x] 3.3 `src/api/arrangerApi.js` — broker writes; retain command bypass.
- [x] 3.4 `src/componentes/MatrizVideo.jsx`, `SyncPanel.jsx`, `Header.jsx` — writes/status.
- [x] 3.5 `src/hooks/usePreset.js`, `src/componentes/MatrizPreset.jsx` — snapshot/load.
- [x] 3.6 `src/main.jsx`; delete `src/hooks/useArrangerReconciliation.js`.
- [x] 3.7 Verify 179 tests, broker suite, build, propagation, offline.

## Phase 4: Cleanup + E2E (PR 4) ✅
- [x] 4.1 `server/server.js` — remove legacy reads; retain writes/proxy.
- [x] 4.2 `vite.config.js` — broker/command proxies; remove fallback.
- [x] 4.3 Persist mock/two-tab checklist in `sdd/state-sync-rework/apply-progress`.
- [x] 4.4 Verify `run-all`, `pnpm test`, build, legacy sweep.

## Phase 5: Command-surface gap (PR 5)
- [x] 5.1 **RED→GREEN** `server/broker/arrangerClient.js`, `server/broker/verify/verify-arranger-client.cjs`: add `joinVideo`/`joinAudio`, identical retry/contract, intact FW-LOCKED banners. Verify node adapter/mock assertions. Depends 1.3.
- [x] 5.2 **RED→GREEN** `server/broker/mockArranger.js`, `server/broker/verify/verify-mock.cjs`: independent streams; AV changes both; offline/blip return `null`. Verify isolation sequence. Depends 5.1.
- [x] 5.3 **RED→GREEN** `server/server.js`, `server/broker/store.js`, `server/broker/writeQueue.js`, `server/broker/verify/verify-composition.cjs`: queued `(domain,sub,link)` dispatch reads desired `link` inside queue; linked writes emit one AV and confirm both; WR-9 forbids AV for single-stream false. Verify command log/reported state. Depends 5.2.
- [x] 5.4 **RED→GREEN** `server/server.js`, `server/broker/verify/verify-composition.cjs`: TVRACK/zona write-through and `POST /api/presets/:n/load`; preserve `video!==audio`; reject inconsistent linked snapshots pre-command. Verify responses, zero commands, mock streams. Depends 5.3.
- [x] 5.5 **RED→GREEN** `server/broker/reconciler.js`, `server/broker/verify/verify-reconciler.cjs`: preset audio≠video scan yields zero spurious adoptions/diffs; run `node server/broker/verify/run-all.cjs`. Depends 5.4.
- [x] 5.6 Gates: `server/broker/verify/run-all.cjs`, `package.json` scripts, `pnpm test` (179+), `pnpm run build` (not `sportbar:build`); manual mock E2E checks preset audio≠video and TVRACK audio-only leaves tab-2 video unchanged. Depends 5.5.
- [x] 5.7 Deltas: update this `openspec/changes/state-sync-rework/tasks.md` and merge `sdd/state-sync-rework/apply-progress`; verify `run-all`. Depends 5.6.
