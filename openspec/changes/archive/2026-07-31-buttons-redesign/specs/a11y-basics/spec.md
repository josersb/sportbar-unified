# Delta for a11y-basics

## ADDED Requirements

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

### Edge Cases

- **Loading → enabled transition**: `aria-busy` MUST be removed and `onClick` MUST be re-enabled synchronously.
- **Disabled icon-only button**: MUST still have `aria-label` for accessible name.
- **Contrast measurement**: Use APCA or WCAG relative luminance formula; measure on actual rendered colors, not token values.
