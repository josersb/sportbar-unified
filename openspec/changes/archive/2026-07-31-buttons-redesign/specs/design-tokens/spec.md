# Delta for design-tokens

## ADDED Requirements

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

### Edge Cases

- **Missing token**: CSS `var()` fallbacks ensure no visual breakage if a token is undefined.
- **Dark override missing**: Button renders light-mode color in dark mode → visual regression.
- **Token naming collision**: Verify no existing tokens use `--btn-` prefix before adding.
