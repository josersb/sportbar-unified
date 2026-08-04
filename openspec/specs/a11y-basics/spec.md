# a11y-basics Specification

## Purpose

Establish baseline accessibility for the control panel: keyboard navigation, screen reader support, and visible focus indicators.

## Requirements

### Requirement: Focus-Visible Styles

All interactive elements MUST have visible `:focus-visible` styles so keyboard users can track focus position.

#### Scenario: Keyboard Tab navigation shows focus

- GIVEN the user presses Tab to navigate
- WHEN focus lands on a button, link, or input
- THEN a visible focus ring or outline appears on the focused element

#### Scenario: Mouse click does not show focus ring

- GIVEN the user clicks an element with a mouse
- WHEN the element receives focus
- THEN no persistent focus ring is shown (only `:focus-visible`, not `:focus`)

### Requirement: Form Labels

All form input fields MUST have associated `<label>` elements linked via `htmlFor`/`id` attributes.

#### Scenario: Label associated with input

- GIVEN a form contains a text input
- WHEN the form renders
- THEN a `<label>` element exists with `htmlFor` matching the input's `id`

### Requirement: Aria Labels for Interactive Elements

Interactive elements without visible text (icon buttons, toggles) MUST have `aria-label` attributes describing their action.

#### Scenario: Icon button has aria-label

- GIVEN a button contains only an icon with no visible text
- WHEN the button renders
- THEN it has an `aria-label` attribute (e.g., `aria-label="Toggle dark mode"`)

#### Scenario: Toggle has accessible name

- GIVEN the dark mode toggle or aside toggle
- WHEN the element renders
- THEN it has an `aria-label` or `aria-labelledby` attribute

### Requirement: Route Context for Screen Readers

Navigation MUST indicate the current route to assistive technology.

#### Scenario: Current page announced

- GIVEN the user is on a specific route
- WHEN a screen reader inspects the navigation
- THEN the active nav link has `aria-current="page"` or equivalent indicator

### Requirement: Button Touch Targets

All interactive buttons MUST have a minimum touch target of 44×44px to comply with WCAG 2.2 AA Success Criterion 2.5.8.

#### Scenario: Small button meets target

- GIVEN a Button component with `size="sm"`
- WHEN the button renders in the viewport
- THEN both computed width and height are ≥ 44px

#### Scenario: Icon-only button meets target

- GIVEN an icon-only Button (no text children)
- WHEN the button renders
- THEN the clickable area is ≥ 44×44px

### Requirement: Button Contrast Ratio

Button text (or icon) MUST achieve a minimum contrast ratio of 3:1 against the button background, per WCAG AA for large text / UI components.

#### Scenario: Primary button contrast in light mode

- GIVEN a primary button in light theme
- WHEN contrast ratio is measured between text color and background
- THEN ratio ≥ 3:1

#### Scenario: Danger button contrast in dark mode

- GIVEN a danger button with `[data-theme="dark"]` active
- WHEN contrast ratio is measured
- THEN ratio ≥ 3:1

### Requirement: Loading State Aria

Buttons with `loading={true}` MUST set `aria-busy="true"` and provide an accessible label indicating loading status.

#### Scenario: Loading button announces busy state

- GIVEN a Button with `loading={true}`
- WHEN inspected with accessibility tools
- THEN `aria-busy="true"` is present
- AND `aria-label="Cargando..."` is present (unless overridden by explicit aria-label prop)

### Requirement: Disabled State Aria

Disabled buttons MUST use the `aria-disabled` attribute in addition to CSS visual styling. CSS `pointer-events: none` alone is insufficient.

#### Scenario: Disabled button with aria

- GIVEN a Button with `disabled` attribute
- WHEN the button renders
- THEN `aria-disabled="true"` is set on the element
- AND the button is removed from tab order (`tabindex="-1"` or native disabled behavior)

### Requirement: Double-Submit Prevention

Loading buttons MUST prevent double-submission by blocking click events when `loading={true}`.

#### Scenario: Rapid clicks during loading

- GIVEN a Button with `loading={true}`
- WHEN the user clicks the button rapidly 3 times
- THEN the onClick handler fires zero times
- AND no duplicate form submissions occur

### Requirement: Focus-Visible Specifications

The focus-visible ring on buttons MUST be 3px wide with 2px offset from the element edge, using `--focus-ring-color` token. The ring MUST NOT appear on mouse clicks.

#### Scenario: Keyboard Tab shows ring

- GIVEN the user presses Tab to focus a button
- WHEN focus lands on the button
- THEN a 3px outline appears with color `var(--focus-ring-color)`
- AND outline is offset 2px from the button edge

#### Scenario: Mouse click shows no ring

- GIVEN the user clicks a button with a mouse
- WHEN the button receives focus
- THEN no persistent focus ring is visible
