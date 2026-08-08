# arranger-reconciliation Specification

## Purpose

Unified Arranger state reconciliation via `useArrangerReconciliation` hook covering 5 domains, non-blocking startup, redesigned SyncPanel drawer, and edge-case handling.

## Requirements

### Requirement: Unified Reconciliation Hook

`useArrangerReconciliation()` MUST expose `{ progress, diffs, status, elapsedMs, lastSync, reconcile }`. Status SHALL be one of: `idle | reconciling | synced | diffs | error`. The hook MUST compare app state against Arranger responses across 5 domains: TVs, TVRACK video, TVRACK audio, zonas-fuera video, zonas-fuera audio.

| Domain | Count | Arranger Query |
|--------|-------|---------------|
| TVs | ~29-40 | `get encoder {dest}` per destination |
| TVRACK video | 1 | `get encoder TVRACK` |
| TVRACK audio | 1 | `get encoder TVRACK` |
| Zonas-fuera video | ~3-6 | `get encoder {zoneId}` |
| Zonas-fuera audio | ~3-6 | `get encoder {zoneId}` |

#### Scenario: Idle on mount

- GIVEN hook mounts in App.jsx
- WHEN no reconciliation has started
- THEN status is `idle`, diffs is empty array

#### Scenario: Full reconciliation completes

- GIVEN Arranger responds to all 40+ `get encoder` queries within 12s (BATCH_SIZE=4)
- WHEN `reconcile()` finishes
- THEN status is `synced` (0 diffs) or `diffs` (N>0 diffs)

### Requirement: Non-Blocking Deferred Startup

`App.jsx` MUST call `reconcile()` via `setTimeout(500)` post-mount. The hook MUST accumulate all domain results and call `setEstadoApp` ONCE at completion — zero partial re-renders. UI MUST be interactive within 1s of mount.

#### Scenario: First render is immediate

- GIVEN the app mounts
- WHEN React renders the initial tree
- THEN UI is interactive (buttons, nav) before reconciliation starts
- AND reconcile fires after 500ms delay

#### Scenario: Single state update

- GIVEN reconciliation finds 12 differences across 4 domains
- WHEN all batches complete
- THEN `setEstadoApp` is called exactly once with merged diffs

### Requirement: SyncPanel Drawer UI

`SyncPanel.jsx` MUST render as a collapsible right drawer containing: progress bar (0-100% with domain count), tabs per domain, diff table per row with source/destination columns, and per-row actions `Apply` / `Ignore`.

#### Scenario: Drawer shows diffs after reconciliation

- GIVEN reconciliation found 3 diffs (2 TVs, 1 zonas-fuera video)
- WHEN SyncPanel renders
- THEN progress bar shows 100%, tabs show "TVs (2)" and "zonas-fuera video (1)", each diff row has Apply+Ignore buttons

#### Scenario: Apply a diff row

- GIVEN a diff row shows TV01 currently DTV1 but should be DTV3
- WHEN user clicks "Apply"
- THEN `join av DTV3 TV01` is sent and row removed from diffs

#### Scenario: Ignore keeps app state

- GIVEN a diff row for TVRACK audio
- WHEN user clicks "Ignore"
- THEN row is dismissed, no Arranger command sent, app state unchanged

### Requirement: Persistent Tab Indicator

`Header.jsx` MUST show a sync tab with status icon: ✅ synced | ⚠️ N diffs | 🔄 fetching | ❌ error. Tab SHALL be always visible, clickable to toggle SyncPanel.

#### Scenario: Tab reflects sync state

- GIVEN reconciliation is running
- WHEN Header renders
- THEN tab shows 🔄 with progress percentage
- AND clicking it toggles SyncPanel drawer

### Requirement: reconciliationStatus in Context

`Contexto.jsx` MUST expose `reconciliationStatus` with `{ status, progress, diffs, elapsedMs, lastSync }` so Aside panels can consult without timing coupling.

#### Scenario: Aside reads sync status

- GIVEN reconciliation finished with 5 diffs
- WHEN a sidebar component reads `reconciliationStatus`
- THEN it sees `{ status: "diffs", diffs: [...5 items], lastSync: timestamp }`

### Requirement: Arranger Offline Resilience

When Arranger is unreachable, `reconcile()` MUST return `status: "error"` and the hook MUST preserve the last successful result from localStorage. SyncPanel SHALL display cached result with timestamp.

#### Scenario: Offline shows cached result

- GIVEN Arranger is offline
- WHEN `reconcile()` is called
- THEN status is `error`, last successful diffs shown with stale-data warning and timestamp

### Requirement: Partial Timeout Handling

If individual `get encoder` calls timeout, the hook MUST continue remaining domains. Results SHALL be partial with a warning indicator and per-domain pass/fail summary.

#### Scenario: 3 TVs timeout, rest succeed

- GIVEN 3 of 40 TV queries timeout (12s each)
- WHEN reconciliation completes
- THEN status is `diffs` with warning, succeeded domains marked ✅, failed TV domain shows ⚠️ with count

### Requirement: Double-Call Prevention

While `status === "reconciling"`, subsequent `reconcile()` calls MUST be no-ops. AbortController SHALL cancel in-flight requests on component unmount.

#### Scenario: Second call ignored

- GIVEN reconciliation is in progress (status: reconciling)
- WHEN user clicks sync tab again
- THEN no new requests are sent, current progress continues

#### Scenario: Cleanup on unmount

- GIVEN reconciliation is running with pending requests
- WHEN component unmounts
- THEN AbortController.abort() is called, all in-flight requests cancelled
