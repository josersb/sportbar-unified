# Delta for a11y-basics

## ADDED Requirements

### Requirement: Skip-to-Content Link

A skip link MUST be the first focusable element in the DOM. It MUST become visible on focus and MUST target the `<main>` element.

#### Scenario: Tab moves focus to skip link first

- GIVEN the page is loaded
- WHEN user presses Tab
- THEN a "Skip to content" link appears and receives focus

#### Scenario: Skip link activates

- GIVEN skip link has focus
- WHEN user presses Enter
- THEN focus moves to `<main>` content

### Requirement: Touch Target Minimum

All interactive elements MUST have a minimum touch target size of 44×44px (WCAG 2.5.5 AAA recommendation, enforced as AA).

#### Scenario: Nav link meets touch target

- GIVEN Nav renders in mobile viewport
- WHEN measuring any Nav link's bounding box
- THEN height ≥ 44px
- AND width ≥ 44px (or full-width on stacked layout)

### Requirement: Reduced Motion

All transitions and animations MUST be disabled or reduced when `prefers-reduced-motion: reduce` is active.

#### Scenario: Reduced motion disables transitions

- GIVEN OS setting `prefers-reduced-motion: reduce`
- WHEN any interactive element transitions state
- THEN transition duration is `0s` or `0ms`
- AND no animation runs

### Requirement: Color Contrast

All text MUST meet WCAG AA contrast: ≥ 4.5:1 for normal text, ≥ 3:1 for large text (≥18px or ≥14px bold).

#### Scenario: Body text passes contrast check

- GIVEN the app renders in light theme
- WHEN contrast ratio of `--color-text-primary` against `--color-surface` is measured
- THEN ratio ≥ 4.5:1

### Requirement: Semantic Landmarks

The app shell MUST include `<main>` (wrapping page content) and `<nav>` (wrapping navigation) semantic landmarks.

#### Scenario: Landmarks exposed to assistive tech

- GIVEN a screen reader inspects the page
- WHEN navigating by landmarks
- THEN `<main>` and `<nav>` are announced as distinct regions

## MODIFIED Requirements

### Requirement: Focus-Visible Styles

All interactive elements MUST have visible `:focus-visible` styles using `--focus-ring-*` design tokens. The focus ring MUST appear on keyboard Tab navigation and MUST NOT appear on mouse click.

(Previously: Focus-visible was required but used hardcoded values; no token references.)

#### Scenario: Keyboard Tab navigation shows focus

- GIVEN the user presses Tab to navigate
- WHEN focus lands on a button, link, or input
- THEN a visible focus ring appears using `var(--focus-ring-color)` and `var(--focus-ring-width)`

#### Scenario: Mouse click does not show focus ring

- GIVEN the user clicks an element with a mouse
- WHEN the element receives focus
- THEN no persistent focus ring is shown (only `:focus-visible`, not `:focus`)

### Requirement: Route Context for Screen Readers

Navigation MUST indicate the current route to assistive technology via `aria-current="page"` on the active `<a>` element within the single `<ul>`.

(Previously: Required route context but did not specify `aria-current` on `<a>` elements.)

#### Scenario: Current page announced

- GIVEN the user is on a specific route
- WHEN a screen reader inspects the navigation
- THEN the active nav link has `aria-current="page"`
