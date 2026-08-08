# Delta for responsive-layout

## ADDED Requirements

### Requirement: SyncPanel Responsive Behavior

SyncPanel drawer MUST adapt to viewport width. At ≥768px: right-side drawer alongside main content. At <768px: drawer SHALL collapse to hidden state with tab toggle still accessible.

#### Scenario: Desktop drawer visible

- GIVEN viewport ≥768px and SyncPanel is open
- WHEN page renders
- THEN drawer occupies right 30-40% of viewport alongside main content

#### Scenario: Mobile drawer hidden

- GIVEN viewport <768px
- WHEN SyncPanel drawer would normally open
- THEN drawer renders as full-width overlay, main content shifts behind

### Requirement: Sync Tab Always Visible

The sync status tab in Header MUST be always visible regardless of viewport width, even when mobile navigation collapses other elements.

#### Scenario: Tab persists on mobile

- GIVEN viewport is 375px wide
- WHEN Header renders
- THEN sync status tab is visible and clickable
