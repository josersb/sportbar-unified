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
