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
