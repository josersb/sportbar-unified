# button-system Specification

## Purpose

Unified `Button` component replacing 9 ad-hoc implementations. Token-driven, WCAG 2.2 AA, both light/dark themes.

## Requirements

### Requirement: Button Variants

The Button component MUST support 5 variants: `primary`, `secondary`, `danger`, `ghost`, `outline`. Each variant MUST render distinct visual styling via design tokens (`--btn-{variant}-*`).

#### Scenario: Primary variant renders brand colors

- GIVEN a Button with `variant="primary"`
- WHEN the button renders
- THEN background resolves to `--btn-primary-bg`
- AND text resolves to `--btn-primary-text`
- AND border resolves to `--btn-primary-border`

#### Scenario: Ghost variant is transparent

- GIVEN a Button with `variant="ghost"`
- WHEN the button renders
- THEN background is transparent
- AND text uses brand color
- AND border is transparent (no visible border in default state)

### Requirement: Button Sizes

The Button MUST support 3 sizes: `sm`, `md`, `lg`. Each size MUST adjust padding-x, padding-y, font-size, and min-height via `--btn-padding-{x,y}-{size}` tokens.

#### Scenario: Small button dimensions

- GIVEN a Button with `size="sm"`
- WHEN the button renders
- THEN min-height ≥ 44px (touch target compliance)
- AND padding is smaller than md

#### Scenario: Large button dimensions

- GIVEN a Button with `size="lg"`
- WHEN the button renders
- THEN min-height ≥ 48px
- AND font-size is larger than md

### Requirement: Button States

The Button MUST support 6 states: `default`, `hover`, `active`, `focus-visible`, `disabled`, `loading`. The loading state MUST display a spinner and set `aria-busy="true"`.

#### Scenario: Hover state transitions

- GIVEN a primary button in default state
- WHEN the user hovers over it
- THEN background transitions to `--btn-primary-hover-bg` within 150ms

#### Scenario: Loading state prevents interaction

- GIVEN a Button with `loading={true}`
- WHEN the user clicks the button
- THEN the onClick handler is NOT invoked
- AND `aria-busy="true"` is set
- AND a spinner or loading indicator is visible

#### Scenario: Disabled state is inert

- GIVEN a Button with `disabled` attribute
- WHEN the button renders
- THEN `aria-disabled="true"` is set
- AND cursor is `not-allowed`
- AND opacity is reduced

### Requirement: Selected State

The Button MUST support a selected state that uses fill (brand background) + thick border (3px brand color) + subtle glow (`--btn-selected-glow`). The selected state MUST be unmistakable from hover without relying on hover interaction.

#### Scenario: Selected DTV button

- GIVEN a MatrizVideo DTV selection button
- WHEN the button is in selected state
- THEN background is filled with brand color
- AND border is 3px solid brand color
- AND box-shadow uses `--btn-selected-glow`

#### Scenario: Selected vs hover distinction

- GIVEN a button in default state
- WHEN comparing hover and selected states visually
- THEN selected state shows fill + thick border + glow
- AND hover shows only background color change

### Requirement: Polymorphic `as` Prop

The Button MUST support `as="button"` (default, renders `<button>`) and `as="input"` (renders `<input type="submit">`). Both MUST receive identical visual styling via the same CSS classes.

#### Scenario: Input submit rendering

- GIVEN a Button with `as="input"`
- WHEN the component renders
- THEN output is `<input type="submit">`
- AND the element has the same visual CSS classes as a `<button>`

#### Scenario: Default button rendering

- GIVEN a Button without explicit `as` prop
- WHEN the component renders
- THEN output is `<button>`
- AND all standard button attributes (onClick, disabled, type) are forwarded

### Requirement: Icon Support

The Button MUST support an `icon` prop (React node) that renders left-aligned before text content, with spacing controlled by `--btn-gap` token.

#### Scenario: Icon with text

- GIVEN a Button with `icon={<SearchIcon />}` and `children="Search"`
- WHEN the button renders
- THEN the icon appears to the left of "Search"
- AND spacing between icon and text uses `--btn-gap`

#### Scenario: Icon-only button

- GIVEN a Button with `icon={<SearchIcon />}` and no `children`
- WHEN the button renders
- THEN the icon renders centered
- AND `aria-label` is required (per a11y-basics spec)

### Requirement: Width Adaptability

The Button MUST work at intrinsic width (content-sized) and at `width: 100%` when placed inside layout containers such as MatrizPreset cards.

#### Scenario: Full-width in container

- GIVEN a parent container with `display: flex` or `display: grid`
- WHEN a Button renders inside with no explicit width
- THEN the button fills available width if the parent constrains it

#### Scenario: Intrinsic width

- GIVEN a Button with short text in an unconstrained container
- WHEN the button renders
- THEN width matches content plus padding (does not stretch)

### Requirement: Dark Mode Compatibility

All 6 states and all 5 variants MUST have `[data-theme="dark"]` overrides for every `--btn-*` token, ensuring appropriate contrast and aesthetics in dark mode.

#### Scenario: Dark mode primary button

- GIVEN `[data-theme="dark"]` is active
- WHEN a primary button renders
- THEN background uses dark-mode `--btn-primary-bg` value (lighter than surface, not white)
- AND text contrast ≥ 3:1 against background

#### Scenario: Dark mode selected glow

- GIVEN `[data-theme="dark"]` is active
- WHEN a button is in selected state
- THEN `--btn-selected-glow` uses a subtle, non-neon color appropriate for dark backgrounds

### Requirement: Touch Target

All button variants and sizes MUST have a minimum touch target of 44×44px to comply with WCAG 2.2 AA.

#### Scenario: Small button touch target

- GIVEN a Button with `size="sm"`
- WHEN measured in the viewport
- THEN both width and height ≥ 44px

### Requirement: Loading State Guard

Buttons in loading state MUST prevent double-submission by disabling interaction via both `disabled` attribute and `aria-busy="true"`.

#### Scenario: Rapid clicks during loading

- GIVEN a Button with `loading={true}`
- WHEN the user clicks rapidly multiple times
- THEN no additional onClick events fire
- AND the button remains in loading state

### Edge Cases

- **Empty children**: Button renders with min-height but no visible content (icon-only button with missing aria-label → a11y violation).
- **Very long text**: Text SHOULD NOT overflow; use `max-width` or `text-overflow: ellipsis`.
- **Missing props**: No variant defaults to `primary`; no size defaults to `md`.
- **Rapid enable/disable**: Toggling `disabled` or `loading` MUST update DOM attributes synchronously without stale state.
