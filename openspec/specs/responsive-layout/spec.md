# responsive-layout Specification

## Purpose

Ensure the control panel adapts to mobile, tablet, and desktop viewports with a collapsible aside, flexible form layouts, and adaptive navigation.

## Requirements

### Requirement: Collapsible Aside

The sidebar (`Aside`) MUST collapse when viewport width is below 768px. A toggle button MUST be visible to expand/collapse the aside.

#### Scenario: Aside collapses on narrow viewport

- GIVEN the viewport width is less than 768px
- WHEN any page renders
- THEN the aside is hidden or collapsed by default
- AND a toggle button (hamburger or equivalent) is visible

#### Scenario: Toggle expands aside

- GIVEN the viewport is below 768px and the aside is collapsed
- WHEN the user clicks the toggle button
- THEN the aside expands to show navigation links
- AND clicking the toggle again collapses the aside

#### Scenario: Aside visible on desktop

- GIVEN the viewport width is 768px or greater
- WHEN any page renders
- THEN the aside is fully visible without a toggle button

### Requirement: Flexible Forms

All form layouts MUST use `flex-wrap` and relative width units (`%`, `rem`, `fr`) so they reflow on narrow screens without horizontal scrolling.

#### Scenario: Form reflows on narrow viewport

- GIVEN a form with multiple input fields in a row
- WHEN the viewport width drops below 600px
- THEN fields stack vertically instead of overflowing horizontally

### Requirement: Adaptive Navigation

Top navigation (`Nav`) MUST adapt to narrow screens without breaking layout or hiding critical links.

#### Scenario: Navigation on mobile

- GIVEN the viewport width is below 480px
- WHEN the Nav component renders
- THEN all navigation links remain accessible
- AND the layout does not overflow horizontally

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
