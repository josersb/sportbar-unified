# shell-layout Specification

## Purpose

Responsive app shell with mobile-first CSS Grid, `<main>` landmark, container queries, and decomposed Aside sub-components.

## Requirements

| # | Requirement | MUST/SHALL | Summary |
|---|------------|------------|---------|
| SL1 | Body Grid Layout | MUST | `<main>` wraps `<Routes>`. Grid: columns `minmax(280px, 30%) 1fr`, rows `auto auto 1fr`. Class selectors only. Gaps/paddings via tokens. |
| SL2 | Mobile-First Breakpoints | MUST | `min-width` breakpoints; layout stacks single-column below 768px. |
| SL3 | Header Tokens | MUST | No inline styles. Logo `alt` ("Logo BetWarrior", "Logo Hipódromo Palermo"). Title `font-size: clamp()`. ThemeToggle `:focus-visible` via `--focus-ring-*`. |
| SL4 | Nav Single List | MUST | One `<ul>` with `role="list"`, `aria-label="Navegación principal"`. Min-height 44px. Visual separator via CSS pseudo-element. States (default/hover/focus-visible/active) via tokens. |
| SL5 | Aside Decomposition | MUST | Split into DecosStatus, AudioStatus, VideoMatrix sub-components. Each handles loading/error/empty/default states. Responsive width via grid. `<form>` not nested inside `<h3>`. TV elements with screen-reader roles. |
| SL6 | Container Query | SHALL | Aside sub-components use `container-type: inline-size`; `max-width: 15vw` replaced with `clamp()`. |
| SL7 | Shell Tests | MUST | Update `BodyResponsive.test.jsx` for mobile-first grid. Tests for Aside sub-component states. Visual regression on 6 routes. Skip-to-content link test. |

### Requirement: Body Grid Layout (SL1)

The shell MUST use CSS Grid with class selectors. `<main>` MUST wrap `<Routes>`. Grid template: `grid-template-columns: minmax(280px, 30%) 1fr; grid-template-rows: auto auto 1fr`.

#### Scenario: Desktop renders aside + main side by side

- GIVEN viewport width ≥ 1024px
- WHEN Body renders
- THEN aside occupies left column (280px–30%), `<main>` fills remaining space
- AND `<h1>` from Header is at row 1, Nav at row 2, `<main>` at row 3

#### Scenario: Mobile stacks vertically

- GIVEN viewport width < 768px
- WHEN Body renders
- THEN aside and `<main>` stack in single column
- AND no horizontal scroll appears

#### Scenario: `<main>` landmark exists

- GIVEN any route is active
- WHEN a screen reader inspects landmarks
- THEN `<main>` wraps the `<Routes>` content

### Requirement: Nav Single List (SL4)

Nav MUST render one `<ul>` with `role="list"` and `aria-label="Navegación principal"`. Links MUST have `min-height: 44px`. Visual separator between main links and "Presets Guardados" MUST use CSS only.

#### Scenario: Keyboard navigates all links

- GIVEN user presses Tab
- WHEN focus cycles through Nav
- THEN each link shows `:focus-visible` ring
- AND all 7 links + "Presets Guardados" section are focusable

#### Scenario: Safari retains list semantics

- GIVEN Safari browser with `list-style: none` applied
- WHEN VoiceOver inspects the `<ul>`
- THEN it announces as a list (due to `role="list"`)

### Requirement: Aside Decomposition (SL5)

Aside MUST decompose into 3 sub-components. Each MUST handle states: loading (spinner), error (message + retry), empty (contextual message), default (content).

#### Scenario: DecosStatus shows error state

- GIVEN Arranger API is unreachable
- WHEN Aside renders
- THEN DecosStatus shows error message with retry action
- AND AudioStatus and VideoMatrix render independently

#### Scenario: TV list accessible to screen readers

- GIVEN a TV has video source assigned
- WHEN screen reader inspects the TV element
- THEN it announces TV name and source (via `role` and `aria-label`)

### Requirement: Shell Tests (SL7)

Tests MUST cover: mobile-first grid layout, Aside sub-component states (loading/error/empty), visual regression on all 6 routes, skip-to-content link behavior.

#### Scenario: BodyResponsive test verifies mobile-first

- GIVEN viewport at 375px
- WHEN test renders Body
- THEN aside is stacked below `<main>`, not side-by-side
- AND no `@media (max-width: ...)` rules are required
