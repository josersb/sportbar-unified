# ahm-websocket-bridge Specification

## Purpose

TCP/MIDI↔WebSocket bridge in Express: TLS-authenticated persistent TCP connection to AHM-32, bidirectional MIDI message translation, heartbeat, and state broadcast to WebSocket clients.

## Requirements

| # | Requirement | Strength | Description |
|---|-------------|----------|-------------|
| R1 | TCP TLS connection | MUST | Connect to AHM at `{AHM_HOST}:{AHM_PORT}` via TLS (port 51327). Send `UserProfile,UserPassword` on connect. Await `AuthOK` (6 bytes) before accepting commands. |
| R2 | Auto-reconnect | MUST | Exponential backoff: 1s → 2s → 4s → … → 30s max. Reset delay on successful connect. |
| R3 | MIDI parsing | MUST | Accumulate binary chunks into complete MIDI messages. Handle running status. Parse Note On/Off, NRPN, SysEx (F0…F7). Emit parsed events by type. |
| R4 | JSON↔MIDI translation | MUST | Accept JSON commands (`{type, zone, value}`), translate to MIDI via `ahm-midi.js` factory, write to TCP socket. |
| R5 | Heartbeat | MUST | Send keepalive query every 30s (`AHM_HEARTBEAT_MS`). Force reconnect on heartbeat failure. |
| R6 | State broadcast | MUST | On any AHM state change, broadcast updated state to ALL connected WebSocket clients. On new client connect, send full zone state snapshot. |
| R7 | Error handling | MUST | Emit structured errors for: auth failure, TCP timeout, MIDI parse error, broken pipe. Log errors server-side. Broadcast `{type:"error", message}` to clients. |
| R8 | Graceful shutdown | SHOULD | On SIGTERM, close TCP socket, close WebSocket server, flush pending commands. |
| R9 | Command queue | SHOULD | Queue commands sent while disconnected. On reconnect, replay only latest command per zone (deduplicate by zone+type). |

## Scenarios

### Scenario: Successful TLS handshake and auth
- GIVEN AHM_HOST=192.168.1.50 and AHM_PORT=51327 are configured
- WHEN AhmBridge.connect() is called
- THEN a TLS socket opens to 192.168.1.50:51327
- AND `UserProfile,UserPassword` is sent after connect
- AND the bridge waits for "AuthOK" before marking connected=true

### Scenario: Auth failure closes socket immediately
- GIVEN AHM credentials are incorrect
- WHEN the bridge sends profile,password after TLS connect
- THEN the AHM closes the TCP connection without "AuthOK"
- AND the bridge emits error "AHM auth rejected"
- AND reconnect is NOT retried automatically

### Scenario: Heartbeat keeps TCP alive
- GIVEN the bridge is connected and idle for 30s
- WHEN the heartbeat timer fires
- THEN a MIDI getLevel query is sent to the AHM
- AND if a response is received, the connection is considered healthy
- AND if no response within 5s, the bridge forces reconnect

### Scenario: State broadcast on AHM response
- GIVEN 2 WebSocket clients are connected
- WHEN the AHM responds to a getLevel query with zone 0 at -21.5 dB
- THEN ALL connected clients receive `{type:"state", zone:"norte", level:-21.5, mute:false}`
- AND the bridge caches the last known state per zone

### Scenario: Reconnection replays latest commands
- GIVEN the bridge was disconnected for 60s and 3 level commands were queued for zone "centro"
- WHEN the bridge reconnects
- THEN only the LAST level command for "centro" is replayed
- AND all clients receive the full current state snapshot
