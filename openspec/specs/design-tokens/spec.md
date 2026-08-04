# design-tokens Specification

## Purpose

Define all visual properties — colors, spacing, typography, shadows, borders, and transitions — as CSS custom properties in `:root`, supporting both light and dark themes.

## Requirements

### Requirement: Design Token System

The system MUST declare all colors, spacing, typography, shadows, borders, and transitions as CSS custom properties in a single `:root` block within `src/index.css`. Tokens MUST be the single source of truth for all component styles.

#### Scenario: Token availability

- GIVEN the app is loaded in any browser
- WHEN any component renders
- THEN all CSS custom properties from `:root` are available for use via `var(--token-name)`

#### Scenario: Token completeness

- GIVEN an existing CSS rule uses a hardcoded color, spacing, or shadow value
- WHEN that component is migrated to CSS Modules
- THEN the migrated rule MUST reference a design token instead of a hardcoded value

### Requirement: Theme-Ready Token Structure

Tokens MUST be organized to support theme switching. Color tokens MUST use semantic names (e.g., `--color-surface`, `--color-text-primary`) rather than literal color names.

#### Scenario: Semantic token naming

- GIVEN the token system is defined
- WHEN a component needs a background color
- THEN the component MUST use `var(--color-surface)` or equivalent semantic token, not `var(--color-white)` or a hex value

#### Scenario: Spacing scale

- GIVEN the token system is defined
- WHEN any component applies margin or padding
- THEN the value MUST come from the spacing scale tokens (`--space-xs` through `--space-xl`)

### Requirement: Transition Token

The system MUST define a transition token for consistent animation timing across all interactive elements.

#### Scenario: Interactive element transition

- GIVEN an interactive element (button, link, input)
- WHEN the element changes state (hover, focus, active)
- THEN the transition duration MUST use the system transition token

### Requirement: Button Spacing Tokens

The system MUST define button-specific padding tokens in `:root`: `--btn-padding-x-sm`, `--btn-padding-x-md`, `--btn-padding-x-lg`, `--btn-padding-y-sm`, `--btn-padding-y-md`, `--btn-padding-y-lg`.

#### Scenario: Token availability for Button

- GIVEN `src/styles/tokens.css` is loaded
- WHEN the Button component references `var(--btn-padding-x-md)`
- THEN the token resolves to a valid length value

### Requirement: Semantic Button Color Tokens

The system MUST define per-variant semantic button color tokens for all 5 variants: `--btn-primary-bg`, `--btn-primary-hover-bg`, `--btn-primary-active-bg`, `--btn-primary-text`, `--btn-primary-border` (same pattern for secondary, danger, ghost, outline). Total: 25 tokens.

#### Scenario: Primary button hover via token

- GIVEN `:root` defines `--btn-primary-hover-bg`
- WHEN a user hovers over a primary button
- THEN the background resolves to `var(--btn-primary-hover-bg)`

#### Scenario: Dark mode override for button tokens

- GIVEN `[data-theme="dark"]` defines `--btn-primary-bg` with a dark-mode value
- WHEN dark mode is active
- THEN primary buttons render with the dark-mode background color

### Requirement: Selected State Glow Token

The system MUST define `--btn-selected-glow` in `:root` for the selected state subtle glow effect.

#### Scenario: Selected button with glow

- GIVEN `--btn-selected-glow` is defined
- WHEN a button enters selected state
- THEN `box-shadow` resolves to `var(--btn-selected-glow)`

### Requirement: Button Layout Tokens

The system MUST define `--btn-radius` (inherits from `--radius-md`), `--btn-font-weight` (inherits from `--font-weight-bold`), and `--btn-gap` (icon-text spacing).

#### Scenario: Token inheritance

- GIVEN `--btn-radius` is defined as `var(--radius-md)`
- WHEN button border-radius is applied
- THEN the value matches `--radius-md` (8px)

### Requirement: Font-Weight Scale

The system MUST add `--font-weight-medium` (500) and `--font-weight-semibold` (600) to `:root`.

#### Scenario: Medium weight available

- GIVEN `:root` defines `--font-weight-medium: 500`
- WHEN ghost or outline button uses medium weight for lighter visual presence
- THEN `font-weight` resolves to 500

### Requirement: Neutral Shadow Token

The system MUST define `--shadow-xs` for subtle depth without color bias (unlike existing `--shadow-sm` which uses brand red).

#### Scenario: Subtle elevation

- GIVEN `--shadow-xs` is defined (e.g., `0 1px 2px rgba(0,0,0,0.08)`)
- WHEN a button uses `box-shadow: var(--shadow-xs)`
- THEN a neutral, barely-visible shadow is rendered
