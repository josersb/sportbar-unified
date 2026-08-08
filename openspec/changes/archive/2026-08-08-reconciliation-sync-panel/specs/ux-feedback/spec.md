# Delta for ux-feedback

## ADDED Requirements

### Requirement: Reconciliation Progress Bar

During reconciliation fetch, SyncPanel MUST display a progress bar (0-100%) with current domain count (e.g., "TVs 15/40"). Progress SHALL update live as each batch completes.

#### Scenario: Progress updates per batch

- GIVEN reconciliation is running with 40 TVs in batches of 4
- WHEN batch 5 completes (20/40)
- THEN progress bar shows 50% with label "TVs 20/40"

### Requirement: Diff Tables with Domain Tabs

SyncPanel MUST show diff results in tabbed interface, one tab per domain. Each tab badge SHALL show diff count. A "Todas" tab aggregates all diffs.

#### Scenario: Tabs reflect diff distribution

- GIVEN reconciliation found 3 TV diffs and 2 zonas-fuera diffs
- WHEN SyncPanel renders
- THEN tabs show "Todas (5) | TVs (3) | TVRACK-V (0) | TVRACK-A (0) | ZF-V (2) | ZF-A (0)"

### Requirement: Persistent Sync Tab Indicator

`Header.jsx` MUST permanently display a sync status tab: ✅ synced | ⚠️ N diffs | 🔄 fetching | ❌ error. Tab SHALL be visible on every page, not just MatrizVideo.

#### Scenario: Tab visible on all routes

- GIVEN user navigates to /audio or /canales
- WHEN Header renders
- THEN sync tab is visible with current status

### Requirement: Auto-Open on Diffs

When reconciliation detects N>0 diffs, SyncPanel SHALL auto-open if currently closed. If user manually closes it, it SHALL NOT auto-open again for the same reconciliation result.

#### Scenario: Drawer opens on diffs

- GIVEN SyncPanel is closed
- WHEN reconciliation completes with 5 diffs
- THEN drawer auto-opens to show diff results

#### Scenario: Manual close suppresses auto-open

- GIVEN drawer auto-opened with diffs
- WHEN user manually closes it
- THEN it does not re-open even if diffs remain
