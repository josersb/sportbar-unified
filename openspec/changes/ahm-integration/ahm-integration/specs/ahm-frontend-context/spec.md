# ahm-frontend-context Specification

## Purpose

Isolated React context and WebSocket client for AHM audio state. Manages connection lifecycle, zone state (level, mute, connected), and exposes a stable API to consuming components.

## Requirements

| # | Requirement | Strength | Description |
|---|-------------|----------|-------------|
| R1 | Zone state | MUST | Maintain per-zone state: `{norte, centro, sur}` with `{level:Number, mute:Boolean}`. Initialize with sensible defaults (-40 dB, muted) until first sync from AHM. |
| R2 | Connection flag | MUST | Expose `connected:Boolean` reflecting WebSocket + AHM TCP bridge health. True only when both are healthy. |
| R3 | WebSocket lifecycle | MUST | Connect to `ws://{host}/ws/ahm` on mount. Auto-reconnect with 1s→5s→10s→30s backoff on disconnect. Clean up on unmount. |
| R4 | Optimized re-renders | SHOULD | Only re-render consumers whose zone changed. Use `useMemo`/`React.memo` or split context (state vs dispatch). |
| R5 | API client | MUST | Expose via context: `setLevel(zone, dB)`, `setMute(zone, bool)`. Methods send JSON commands over WebSocket: `{type:"level", zone, value}` / `{type:"mute", zone, value}`. |
| R6 | State sync handler | MUST | On `{type:"state"}` WS message, update matching zone WITHOUT touching other zones. On `{type:"connected"}`, update connection flag. |
| R7 | Provider isolation | MUST | `ProviderAHM` wraps ONLY audio consumers. Does NOT import or touch `Contexto.jsx` (video). |

## Scenarios

### Scenario: Initial connection and state sync
- GIVEN the browser loads the app
- WHEN `ProviderAHM` mounts and WebSocket connects
- THEN the server sends a full state snapshot `{type:"state", zones:{…}}`
- AND `ahmState.zones` is populated with AHM-authoritative values
- AND `ahmState.connected` is set to true

### Scenario: External AHM change reflected in UI
- GIVEN an operator mutes "norte" via the physical AHM panel
- WHEN the server's next heartbeat detects the change and broadcasts it
- THEN only the "norte" zone state updates in React
- AND the "norte" UI re-renders with mute=true
- AND "centro" and "sur" components do NOT re-render

### Scenario: WebSocket disconnect recovery
- GIVEN the WebSocket disconnects due to network blip
- WHEN 3 seconds pass
- THEN the client reconnects with backoff (1s, 2s, 4s…)
- AND on reconnect, the server sends a fresh state snapshot
- AND `connected` transitions: true → false → true

### Scenario: AHM unreachable — UI degrades
- GIVEN the AHM-32 is powered off
- WHEN the bridge cannot establish TCP connection
- THEN `connected` is false
- AND `setMute` / `setLevel` calls are silently rejected (server returns error)
- AND the UI shows "Audio no disponible"
