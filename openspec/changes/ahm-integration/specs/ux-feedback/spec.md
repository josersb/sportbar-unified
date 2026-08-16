# Delta for ux-feedback

## ADDED Requirements

### Requirement: AHM Connection Indicator

The UI MUST display a visual indicator of AHM-32 connectivity status in the Audio component. The indicator MUST reflect three states: connected, disconnected, and reconnecting.

#### Scenario: AHM connected — green indicator
- GIVEN the AHM WebSocket and TCP bridge are healthy
- WHEN the Audio component renders
- THEN a green dot with label "Conectado" is visible
- AND mute/level controls are enabled

#### Scenario: AHM disconnected — red indicator
- GIVEN the AHM bridge is unreachable
- WHEN the `connected` flag is false
- THEN a red dot with label "Audio no disponible" is displayed
- AND all audio controls are disabled

#### Scenario: AHM reconnecting — yellow indicator
- GIVEN the WebSocket is attempting reconnection
- WHEN `connected` is false but reconnect is in progress
- THEN a yellow pulsing dot with label "Reconectando..." is displayed
- AND controls remain disabled until connection is restored

### Requirement: AHM Error Feedback

All AHM-related errors MUST display a toast notification. When zone commands are rejected because the AHM is offline, the user MUST receive clear feedback.

#### Scenario: Error toast on AHM rejection
- GIVEN the AHM is offline
- WHEN the user attempts to change a zone level or mute
- THEN an error toast appears: "AHM-32 no disponible. Verifique la conexión."
- AND the toast auto-dismisses after 5 seconds

## MODIFIED Requirements

### Requirement: Success Feedback

All successful operations MUST display a success toast notification. The toast MUST auto-dismiss after a short duration. **(Previously: only covered preset save and channel assignment. Extended to include AHM audio operations.)**

#### Scenario: Success toast after preset save
- GIVEN the user saves a preset
- WHEN the API responds with success
- THEN a toast notification appears with a success message
- AND the toast disappears automatically after 3–5 seconds

#### Scenario: Success toast after channel assignment
- GIVEN the user assigns a channel to a TV
- WHEN the API responds with success
- THEN a success toast appears confirming the operation

#### Scenario: Success toast after AHM zone change
- GIVEN the user changes zone level or mute
- WHEN the AHM confirms the change (verified state received)
- THEN a success toast appears: "Nivel de {zona} actualizado"
- AND the toast auto-dismisses after 3 seconds
