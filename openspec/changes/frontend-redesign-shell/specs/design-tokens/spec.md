# Delta for design-tokens

## ADDED Requirements

### Requirement: Expanded Token Surface

The system MUST declare new CSS custom properties in `:root`: `--border-radius-sm/md/lg`, `--line-height-tight/normal/relaxed`, `--focus-ring-color`, `--focus-ring-width`, `--focus-ring-offset`, `--touch-target-min: 44px`, `--gap-xs/sm/md/lg/xl`, `--font-weight-normal: 400`, `--font-size-xs: 0.75rem`.

#### Scenario: New tokens available at runtime

- GIVEN the app is loaded
- WHEN `getComputedStyle(document.documentElement)` is called
- THEN all 12+ new tokens are defined with valid CSS values

### Requirement: Dark Mode Variants for New Tokens

Every new token MUST declare a `[data-theme="dark"]` variant. Focus-ring tokens, border-radius, and spacing tokens MAY share values across themes.

#### Scenario: Dark mode applies new tokens

- GIVEN `data-theme="dark"` is set on `<html>`
- WHEN a component uses `var(--border-radius-md)`
- THEN the resolved value matches the dark-mode declaration

#### Scenario: Focus-ring tokens work in both themes

- GIVEN either light or dark theme
- WHEN an element receives `:focus-visible`
- THEN `outline` uses `var(--focus-ring-color)` and `var(--focus-ring-width)`

### Requirement: Token Completeness for Shell

Shell components (Body, Header, Nav, Aside) MUST NOT contain hardcoded values. All spacing, colors, typography, and interactive states MUST reference CSS custom properties.

#### Scenario: No hardcoded values in shell CSS

- GIVEN the shell redesign is complete
- WHEN scanning `*.module.css` files for Body, Header, Nav, Aside
- THEN no `px`, `rem`, hex color, or `rgb()` values appear outside of `:root` declarations

## MODIFIED Requirements

### Requirement: Design Token System

The system MUST declare all colors, spacing, typography, shadows, borders, transitions, border-radius, line-height, focus-ring, touch-target, and gap-scale values as CSS custom properties in a single `:root` block within `src/styles/tokens.css`. Tokens MUST be the single source of truth for all component styles.

(Previously: Token system was declared in `src/index.css` and excluded border-radius, line-height, focus-ring, touch-target, and gap-scale categories.)

#### Scenario: Token availability

- GIVEN the app is loaded in any browser
- WHEN any component renders
- THEN all CSS custom properties from `:root` are available for use via `var(--token-name)`

#### Scenario: Token completeness

- GIVEN an existing CSS rule uses a hardcoded color, spacing, or shadow value
- WHEN that component is migrated to CSS Modules
- THEN the migrated rule MUST reference a design token instead of a hardcoded value

#### Scenario: New token categories available

- GIVEN a shell component needs border-radius, touch target sizing, or focus-ring
- WHEN the component renders
- THEN the value MUST reference a design token from the expanded set
