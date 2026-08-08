# Design: Reconciliation & Sync Panel

## Technical Approach

Extract `useArrangerReconciliation` hook that batches `getEncoder(dest, subscription)` calls (BATCH_SIZE=4) across 5 domains, comparing results against React state. Accumulate all diffs in a ref, then `setEstadoApp` ONCE at completion — zero partial renders. SyncPanel sits in Body.jsx as a collapsible right drawer (CSS Grid column 300px) with per-domain tabs. Header gains a persistent sync-tab. `reconciliationStatus` joins ContextoUser for global observability.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Recon API | `getEncoder(decoder, subscription)` per destination, batched 4-at-a-time | `fetchMatrixState` (single fetch, all-or-nothing) | Granular progress, partial results on timeout, per-batch AbortController. Existing `fetchMatrixState` is opaque — can't track per-destination progress. |
| Drawer technology | CSS transition on `max-width` + `opacity` | JS animation, framer-motion | Zero dependencies, CSS Grid `grid-template-columns: 1fr 300px` toggles seamlessly, browser-native performance. |
| Hook state machine | `useReducer` with explicit transitions: idle→reconciling→synced\|diffs\|error | `useState` flags | 8-status state machine prevents impossible states (e.g. aborting from idle). |
| Batch apply | Single `setEstadoApp` at completion, diffs accumulated in `useRef` | `setEstadoApp` per domain | Eliminates 3-4 re-renders. Ref avoids stale closure. |
| Domain tabs | Static 5-tab array `['TVs','TVRACK Video','TVRACK Audio','ZF Video','ZF Audio']` | Dynamic from data | Predictable layout, tabs visible even with 0 diffs in a domain. |

## Data Flow

```
App.jsx
  │ estadoLoaded → setTimeout(500ms) → reconcile()
  ▼
useArrangerReconciliation
  │ dispatch({type:'START'})
  │ for each domain → batch(getEncoder, 4) via Promise.allSettled
  │   ├─ TV: 40 dests → 10 batches of 4 → ~12s
  │   ├─ TVRACK video: 1 call → ~300ms
  │   ├─ TVRACK audio: 1 call → ~300ms
  │   ├─ ZF video: ~10 dests → 3 batches → ~3s
  │   └─ ZF audio: ~10 dests → 3 batches → ~3s
  │ accumulate diffs in ref → compare encoder vs estado.tvs/zf
  ▼
dispatch({type:'DONE', diffs}) → setEstadoApp(merged) ONCE
  ▼
ProviderUser { ...prev, reconciliationStatus }
  ├── SyncPanel reads via useContext → shows tabs + diff rows
  ├── Header reads → status icon ✅⚠️🔄❌
  └── Aside reads → stale-data awareness
```

## Hook API

```js
// Inputs (via useContext internals)
//   estado.tvs, tvrackState, zonasFueraState, handleChangeEstadoVideo,
//   handleChangeTvrack, handleZonasFueraChange

// Return
const {
  progress,     // 0..100
  diffs,        // [{ domain, dest, appValue, arrangerValue }]
  status,       // idle | reconciling | synced | diffs | error
  elapsedMs,    // milliseconds since reconcile() start
  lastSync,     // ISO timestamp of last completed sync
  reconcile,    // () => void — no-op if status===reconciling
} = useArrangerReconciliation();
```

Internal state machine (useReducer):
```
idle ──reconcile()──▶ reconciling ──all batches ok──▶ synced | diffs
                           │                              ▲
                           └──all fail────────────▶ error ─┘ (retry→reconciling)
                           └──unmount──────────────▶ (abort all)
```

## SyncPanel Component Structure

```
SyncPanel.jsx
├── .drawer (CSS: max-width transition, flex column)
│   ├── .header: title "Sync Arranger" + close button
│   ├── .progressBar: <progress value={pct}/>, "40/40 · 12.3s"
│   ├── .tabs: [TVs (N), TVRACK Video (N), TVRACK Audio (N), ZF Video (N), ZF Audio (N)]
│   └── .tabContent:
│       └── .diffTable: per row → .source, .dest, .appVal, .arrangerVal, .actions(Apply|Ignore)
```

CSS Module layout: `.drawer { width: 300px; transition: max-width 0.3s, opacity 0.3s; }`. Collapsed: `max-width: 0; opacity: 0; overflow: hidden`. Uses existing design tokens `var(--gap-*)`.

Toggle button lives in Header as `.syncTab` — always visible, reads `reconciliationStatus.status` from context.

## State Management

Contexto.jsx additions to ProviderUser value:
```js
reconciliationStatus: {
  status, progress, diffs, elapsedMs, lastSync
}
```

`App.jsx` maintains `reconciliationStatus` state, passes to both ProviderUser and SyncPanel. Hook produces status → App.jsx `setReconciliationStatus` on each dispatch.

## Drawer Animation

CSS approach: Body.jsx grid adds a conditional `.drawer` column.

```
Body.module.css:
  .container { grid-template-columns: 1fr; }
  .containerWithDrawer { grid-template-columns: 1fr 300px; }

Body.jsx:
  <div className={showDrawer ? styles.containerWithDrawer : styles.container}>
```

Transition via CSS: `grid-template-columns` doesn't animate natively. Instead, draw the drawer as an absolute/fixed panel overlaid on main content, animated with `transform: translateX(100%) → translateX(0)`. This is a standard sliding panel pattern, smoother than grid column toggling. Mobile (<768px): drawer becomes full-width bottom sheet via `@media` query.

## Edge Case Strategy

| Case | Strategy |
|------|----------|
| Arranger offline | All `getEncoder` fail → status='error'. Read last result from `localStorage('arrangerSyncCache')` → show with ⚠️ stale badge. |
| Partial timeouts | `Promise.allSettled` per batch. Failed dests marked `{error: true}` in diffs. Domain tab shows ⚠️ pass/fail count. |
| Double-call | `if (status === 'reconciling') return;` — idempotent guard. |
| Unmount cleanup | `useEffect` cleanup calls `controller.abort()`. Pending fetches reject with AbortError, caught and ignored. |
| localStorage persistence | On each successful sync, save `{ diffs, timestamp, status }` to `arrangerSyncCache`. Read on mount for instant display before new sync. |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useArrangerReconciliation.js` | **Create** | Hook with useReducer, 5-domain batching, AbortController, localStorage cache |
| `src/componentes/SyncPanel.jsx` | **Create** | Drawer component: progress bar, domain tabs, diff table, Apply/Ignore handlers |
| `src/componentes/SyncPanel.module.css` | **Create** | Drawer slide animation, tab styling, diff table, progress bar |
| `src/App.jsx` | **Modify** | Replace inline reconciliation (L135-192) with `useArrangerReconciliation` call; add `reconciliationStatus` to ProviderUser value |
| `src/contexto/Contexto.jsx` | **Modify** | Add `reconciliationStatus` initial value `{ status:'idle', progress:0, diffs:[], elapsedMs:0, lastSync:null }` to provider defaults |
| `src/componentes/Body.jsx` | **Modify** | Add SyncPanel as sibling to grid container, manage `showDrawer` state via context |
| `src/componentes/Header.jsx` | **Modify** | Add sync-tab button reading `reconciliationStatus` |
| `src/componentes/Header.module.css` | **Modify** | Sync-tab positioning in `.headerRight` |
| `src/componentes/MatrizVideo.jsx` | **Modify** | Remove `handleSyncMatrix`, `matrixDiff`, `matrixResult` state; remove inline diff panel (L45-78, L139-170) |
| `src/componentes/MatrizVideo.module.css` | **Modify** | Remove `.syncRow`, `.diffPanel`, `.diffTable` styles |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. All operations are in-browser React state management and HTTP fetch to existing Express proxy.

## Migration / Rollout

No migration required. Rollback: revert commit. localStorage `arrangerSyncCache` is new — ignored by previous code. Aside panels use existing state until reconciliationStatus propagates (graceful degradation).

## Open Questions

- [ ] Should the hook auto-retry on error (exponential backoff), or leave retry to user via SyncPanel button?
- [ ] For Apply action: should it call `joinMultipleTVs` (batched) or individual `assignSourceToDestination`?
