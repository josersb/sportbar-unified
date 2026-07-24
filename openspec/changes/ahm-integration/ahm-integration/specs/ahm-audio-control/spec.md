# ahm-audio-control Specification

## Purpose

Zone-level mute and volume control for Norte, Centro, Sur via MIDI over the AHM bridge. AHM-32 is the authoritative source — all state is read back and verified after commands.

## Requirements

| # | Requirement | Strength | Description |
|---|-------------|----------|-------------|
| R1 | Set zone level | MUST | Accept dB value (-inf to +10), convert to MIDI NRPN, send via bridge. After send, issue getLevel to verify. Broadcast verified value to all clients. |
| R2 | Set zone mute | MUST | Accept boolean, convert to MIDI Note On (vel=0x7F) / Note Off (vel=0x3F), send via bridge. After send, issue getMute to verify. Broadcast verified value. |
| R3 | Get zone level | MUST | Issue MIDI SysEx getLevel query for a zone. Parse response into dB value. Emit state update. |
| R4 | Get zone mute | MUST | Issue MIDI getMute query for a zone. Parse response into boolean. Emit state update. |
| R5 | Range validation | MUST | Reject level values outside [-inf, +10] dB before MIDI translation. Clamp values to range. |
| R6 | Offline behavior | MUST | When bridge.connected is false, reject commands with error "AHM no disponible". Return current cached state. Do NOT queue — let bridge handle queue semantics. |

## Scenarios

### Scenario: Set level and verify
- GIVEN zone "norte" is currently at -30 dB
- WHEN setLevel("norte", -21.5) is called
- THEN a MIDI NRPN message with dbToMidi(-21.5) is sent to the AHM
- AND a SysEx getLevel("norte") query follows
- AND when the AHM responds with -21.5 dB, state is broadcast to clients

### Scenario: Mute toggle
- GIVEN zone "sur" is unmuted
- WHEN setMute("sur", true) is called
- THEN MIDI Note On (vel=0x7F) is sent
- AND getMute("sur") is queried
- AND the verified mute=true state is broadcast

### Scenario: Invalid level rejected
- GIVEN any zone
- WHEN setLevel(zone, 15.0) is called
- THEN the value is clamped to +10 dB before MIDI translation
- AND a warning is logged

### Scenario: AHM offline — commands rejected
- GIVEN bridge.connected is false
- WHEN setLevel("centro", -10) is called
- THEN the command is rejected with error "AHM no disponible"
- AND no MIDI message is generated
