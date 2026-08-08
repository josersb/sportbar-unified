# Tasks: Reconciliation & Sync Panel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700 (add+del) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1: hook+wiring (~210) · PR2: SyncPanel UI (~220) · PR3: edge cases (~60) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main (v2 as trunk, merge in order) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback |
|------|------|----|--------------|-----------------|----------|
| 1 | Hook + non-blocking wiring | PR1 (~210) | `pnpm run build` | App boot: reconcile ≤12s, single setEstadoApp | Revert commit; delete src/hooks/useArrangerReconciliation.js |
| 2 | SyncPanel drawer + header tab | PR2 (~220) | `pnpm run build` | Change 1 TV in estado.tvs → drawer auto-opens, Apply fixes row | Revert commit; delete SyncPanel files |
| 3 | Offline / partial / cache + MatrizVideo cleanup | PR3 (~60) | `pnpm run build` | Stop Arranger → error + cached result with stale badge | Revert commit; arrangerSyncCache ignored by old code |

## Phase 1: Hook extraction (PR 1 · ~240 lines)

- [x] 1.1 Create `src/hooks/useArrangerReconciliation.js` with useReducer machine: idle→reconciling→synced|diffs|error
- [x] 1.2 5-domain batched fetch (BATCH_SIZE=4, Promise.allSettled): TVs 40 dests, TVRACK video/audio 1 call, ZF video/audio ~10 dests
- [x] 1.3 Compare vs estado.tvs / tvrackState / zonasFueraState; accumulate diffs in useRef; elapsedMs per run
- [x] 1.4 Expose {progress,diffs,status,elapsedMs,lastSync,reconcile}; no-op when reconciling; AbortController abort on unmount

## Phase 2: Non-blocking wiring (PR 1 · ~30 lines)

- [x] 2.1 App.jsx: drop inline reconcile effect (L135-192); call hook; reconcile() via setTimeout(500) after estadoLoaded
- [x] 2.2 App.jsx: single setEstadoApp batch at DONE; pass reconciliationStatus into ProviderUser value
- [x] 2.3 Contexto.jsx: reconciliationStatus default {status:'idle',progress:0,diffs:[],elapsedMs:0,lastSync:null}

## Phase 3: SyncPanel UI (PR 2 · ~310 lines)

- [x] 3.1 Create SyncPanel.jsx + SyncPanel.module.css: fixed right drawer, translateX transition, <progress> + "40/40 · 12.3s" (UX-ADD1)
- [x] 3.2 Tabs: Todas + 5 domain tabs, diff badges (UX-ADD2); per-row Apply → assignVideoSource/assignAudioSource; Ignore
- [x] 3.3 Header.jsx + Header.module.css: persistent tab ✅/⚠️N/🔄/❌ all routes (AR-R4, UX-ADD3, RL-ADD2), click toggles drawer
- [x] 3.4 Body.jsx: mount SyncPanel; auto-open on new diffs; manual close suppresses re-open (UX-ADD4)
- [x] 3.5 Responsive: ≥768px right overlay; <768px full-width bottom sheet (RL-ADD1)
- [x] 3.6 MatrizVideo.jsx: remove handleSyncMatrix/matrixDiff/matrixResult + inline diff (L45-78, L139-170); keep manual button delegating to reconcile()
- [x] 3.7 MatrizVideo.module.css: remove .syncRow/.diffPanel/.diffTable; verify no stale refs in MatrizVideo.test.jsx

## Phase 4: Edge cases (PR 3 · ~60 líneas forecast; scope real ampliado con 4.4/4.5)

- [x] 4.1 localStorage `arrangerSyncCache` {diffs,timestamp,status}: read on mount (write ya en PR1), cache <24h poblá lastSync + cachedDiffs; stale >1h con ⚠️ "datos pueden estar desfasados"; datos frescos reemplazan cache (AR-R6)
- [x] 4.2 Offline: all batches fail → status error; show cached result + ⚠️ stale badge + timestamp (AR-R6)
- [x] 4.3 Partial timeouts: destinos sin respuesta (encoder null) → banner "⚠️ X/Y destinos respondieron · Z sin respuesta", fila con "—" en Arranger, Aplicar deshabilitado (AR-R7)
- [x] 4.4 Retry manual-only via reconcile() (resuelto: sin auto-retry); contador "Reintento N/3", tras 3 fallos "Arranger no disponible. Verificá la conexión de red."
- [x] 4.5 Apply semantics (finding PR2): tras el batch en App.jsx → toast "✅ N cambios aplicados desde Arranger" + clearDiffs(); Aplicar manual sigue empujando diff.app al hardware
- [x] 4.6 Stale badge Header + SyncPanel: lastSync null o >1h → ⚠️ pulse en Header (stalePulse) + footer "Última sincronización: hace X horas · HH:MM" en SyncPanel
