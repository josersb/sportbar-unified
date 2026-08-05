# dark-mode Specification

## Purpose

Allow users to toggle between light and dark visual themes, with preference persisted across sessions.

## Requirements

### Requirement: Theme Toggle

The user MUST be able to switch between light and dark themes via a toggle control. The active theme MUST be applied by setting `data-theme` attribute on the document root element.

#### Scenario: User activates dark mode

- GIVEN the app is in light mode
- WHEN the user clicks the dark mode toggle
- THEN the `<html>` element gains `data-theme="dark"`
- AND all components render with dark theme colors via CSS custom property overrides

#### Scenario: User returns to light mode

- GIVEN the app is in dark mode
- WHEN the user clicks the dark mode toggle
- THEN the `<html>` element has `data-theme="light"` (or no `data-theme` attribute)
- AND all components render with light theme colors

### Requirement: Theme Persistence

The selected theme preference MUST persist in `localStorage` and MUST be restored on next page load.

#### Scenario: Theme survives page reload

- GIVEN the user has selected dark mode
- WHEN the page is reloaded
- THEN the app renders in dark mode without requiring a new toggle action

#### Scenario: Default theme for new users

- GIVEN no theme preference exists in localStorage
- WHEN the app loads for the first time
- THEN the app MUST default to light mode

### Requirement: Theme Coverage

All components MUST respond to `[data-theme="dark"]` by rendering appropriate dark-mode colors.

#### Scenario: Component consistency in dark mode

- GIVEN dark mode is active
- WHEN any page or component renders
- THEN text, backgrounds, borders, and interactive elements use dark-appropriate colors
- AND no element retains light-mode-only hardcoded colors

### Requirement: Button Token Dark Overrides

All `--btn-*` design tokens MUST have corresponding `[data-theme="dark"]` overrides that provide adjusted values for dark backgrounds. Every button state and variant MUST render correctly in dark mode.

#### Scenario: Dark mode primary button

- GIVEN `[data-theme="dark"]` is active on `<html>`
- WHEN a primary button renders
- THEN background resolves to `--btn-primary-bg` dark-mode value
- AND text resolves to `--btn-primary-text` dark-mode value
- AND hover/active/selected states use their respective dark-mode token values

#### Scenario: Dark mode ghost button

- GIVEN `[data-theme="dark"]` is active
- WHEN a ghost variant button renders
- THEN background is transparent
- AND text color is visible against dark surface (contrast ≥ 3:1)

### Requirement: Lighter Backgrounds in Dark Mode

Button background colors in dark mode MUST be lighter than the dark surface color, never full white (`#ffffff`). They MUST use a controlled lightness range appropriate for dark UIs.

#### Scenario: Button bg vs surface distinction

- GIVEN `[data-theme="dark"]` with `--color-surface: #1a1a2e`
- WHEN a primary button renders
- THEN its background lightness is ≥ 20% and ≤ 40% (L in HSL)
- AND the button is clearly distinguishable from the dark surface

#### Scenario: No white backgrounds in dark mode

- GIVEN `[data-theme="dark"]` is active
- WHEN any button variant renders in any state
- THEN no button background resolves to `#ffffff` or near-white (`L > 90%`)

### Requirement: Adjusted Glow for Dark Mode

The `--btn-selected-glow` token MUST use a dark-mode-appropriate value — subtle and complementary to dark backgrounds, avoiding neon or harsh glows.

#### Scenario: Selected glow in dark mode

- GIVEN `[data-theme="dark"]` is active and a button is selected
- WHEN the glow is inspected
- THEN glow opacity ≤ 0.4
- AND glow color is harmonious with dark surface (not neon green/yellow)
- AND glow is visible but not distracting

#### Scenario: Theme toggle preserves selected state

- GIVEN a button is in selected state
- WHEN the user toggles between light and dark themes
- THEN the selected state glow transitions smoothly
- AND the visual appearance updates within 150ms

### Requirement: Button Contrast in Dark Mode

All button text MUST maintain ≥ 3:1 contrast ratio against button backgrounds in dark mode, matching the a11y-basics contrast requirement.

#### Scenario: Danger button contrast

- GIVEN `[data-theme="dark"]` is active
- WHEN a danger button renders
- THEN text-to-background contrast ≥ 3:1
