# ux-feedback Specification

## Purpose

Provide clear visual feedback for user actions: loading states during API calls, success toasts after operations, active navigation indicators, and focus styles.

## Requirements

### Requirement: Loading States

All form submissions and preset operations MUST show a loading indicator while the API call is in progress. The submit button MUST be disabled during loading to prevent double submission.

#### Scenario: Loading on preset save

- GIVEN the user clicks "Save Preset"
- WHEN the Arranger API call is in flight
- THEN the save button shows a loading state (spinner or text change)
- AND the button is disabled to prevent duplicate requests

#### Scenario: Loading on form submit

- GIVEN any form that triggers an API call
- WHEN the submit action is initiated
- THEN the submit button MUST enter loading state until the API responds

### Requirement: Success Feedback

All successful operations MUST display a success toast notification. The toast MUST auto-dismiss after a short duration.

#### Scenario: Success toast after preset save

- GIVEN the user saves a preset
- WHEN the API responds with success
- THEN a toast notification appears with a success message (e.g., "Preset guardado")
- AND the toast disappears automatically after 3–5 seconds

#### Scenario: Success toast after channel assignment

- GIVEN the user assigns a channel to a TV
- WHEN the API responds with success
- THEN a success toast appears confirming the operation

### Requirement: Preset Load Without Page Reload

Loading a preset MUST update application state via Context (`setEstadoApp`), NOT via `window.location.reload()`. The UI MUST reflect the new preset state without a full page refresh.

#### Scenario: Preset load updates state in-place

- GIVEN the user selects a preset to load
- WHEN the preset is applied
- THEN the application state updates via Context API
- AND the UI re-renders to reflect the loaded preset
- AND `window.location.reload()` is NOT called

### Requirement: Active Navigation

The navigation MUST visually indicate which route is currently active.

#### Scenario: Active route highlighted

- GIVEN the user is on the `/matrizvideo` route
- WHEN the navigation renders
- THEN the "Matriz Video" link has an active class (e.g., `.active`)
- AND it is visually distinct from inactive links
