# Spec: Reconciliation & Sync Panel

> Change: `reconciliation-sync-panel` | Date: 2026-08-07 | Artifact store: hybrid (engram + openspec)

## arranger-reconciliation (NEW) — 8 requirements, 10 scenarios

| ID | Requirement | Scenarios |
|----|------------|-----------|
| AR-R1 | `useArrangerReconciliation()` hook exposes `{progress,diffs,status,elapsedMs,lastSync,reconcile}` with 5 domains (TVs, TVRACK-V, TVRACK-A, ZF-V, ZF-A). Status: idle|reconciling|synced|diffs|error. | Idle on mount; Full reconciliation with BATCH_SIZE=4 completes ≤12s. |
| AR-R2 | Non-blocking startup: `App.jsx` calls `reconcile()` via `setTimeout(500)` post-mount. Single `setEstadoApp` batch at finish. UI interactive within 1s. | First render immediate; Single state update for all diffs. |
| AR-R3 | `SyncPanel.jsx` right drawer with progress bar (0-100%), domain tabs, diff table per row with Apply/Ignore actions. | Drawer shows diffs after reconciliation; Apply sends `join av` and removes row; Ignore keeps app state. |
| AR-R4 | `Header.jsx` persistent tab: ✅ synced, ⚠️ N diffs, 🔄 fetching, ❌ error. Clickable to toggle drawer. | Tab reflects live status; Click toggles SyncPanel. |
| AR-R5 | `Contexto.jsx` exposes `reconciliationStatus` for Aside observability without timing coupling. | Aside reads sync status without race conditions. |
| AR-R6 | Arranger offline → status `error`, last cached result from localStorage displayed with timestamp. | Offline shows stale-data warning + last sync timestamp. |
| AR-R7 | Partial timeouts: remaining domains continue. Results partial with per-domain pass/fail summary. | 3 TVs timeout, others succeed → diffs with ⚠️ warning. |
| AR-R8 | Double-call prevention: while status=`reconciling`, subsequent `reconcile()` is no-op. AbortController cancels on unmount. | Second call ignored during active reconciliation; Cleanup aborts in-flight requests. |

## ux-feedback (DELTA) — 4 added requirements, 5 scenarios

| ID | Requirement | Scenarios |
|----|------------|-----------|
| UX-ADD1 | Progress bar during fetch: 0-100%, live domain count label (e.g. "TVs 20/40"). | Progress updates per batch (50% at batch 5/10). |
| UX-ADD2 | Diff tables with domain tabs: one tab per domain, badge with diff count, "Todas" aggregate tab. | Tabs reflect diff distribution (TVs 3, ZF-V 2, etc.). |
| UX-ADD3 | Persistent sync tab in `Header.jsx` visible on ALL routes, not only MatrizVideo. | Tab visible on /audio, /canales, etc. |
| UX-ADD4 | Auto-open drawer on diffs detected. Manual close suppresses re-open for same result. | Drawer opens on new diffs; Manual close prevents re-open. |

## responsive-layout (DELTA) — 2 added requirements, 3 scenarios

| ID | Requirement | Scenarios |
|----|------------|-----------|
| RL-ADD1 | SyncPanel drawer adapts: ≥768px right-drawer alongside main. <768px hidden with tab toggle. | Desktop drawer visible at 30-40% width; Mobile drawer hidden by default. |
| RL-ADD2 | Sync tab always visible in Header regardless of viewport, even when mobile nav collapses. | Tab persists at 375px viewport. |
