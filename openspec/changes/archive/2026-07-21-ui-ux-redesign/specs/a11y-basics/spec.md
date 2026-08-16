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
