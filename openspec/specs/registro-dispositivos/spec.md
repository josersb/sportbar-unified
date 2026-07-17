# registro-dispositivos Specification

## Purpose
Typed device registry replacing flat `estado.decos[]`. Each IPEX5001 is defined with metadata and auto-detected capabilities from Arranger `get status` streams (VIDEO/AUDIO/IR/SERIAL/USB), falling back to manual config.

## Requirements

### Requirement: Device Registry — Single Source of Truth
`src/contexto/dispositivos.js` MUST define all 8 IPEX5001 devices with `{id, hardware, connected, provider, defaultChannel}`. No component SHALL hardcode device lists.

#### Scenario: Registry authority
- GIVEN app starts
- WHEN any component needs device metadata
- THEN queries `dispositivos.js`, not hardcoded arrays

#### Scenario: Add device = one registry entry
- GIVEN new IPEX5001 connected to Arranger
- WHEN developer adds entry to `dispositivos.js`
- THEN all UI components reflect new device automatically

### Requirement: Hybrid Capability Detection
System MUST auto-detect capabilities via `getDeviceStatus()` (Arranger `get status`), merging with manual config. If Arranger unreachable, manual config SHALL serve as fallback.

| Stream | Capability |
|--------|-----------|
| VIDEO | `videoSource` |
| AUDIO | `audioSource` |
| IR | `channelControl` |
| SERIAL | `serialGateway` |

#### Scenario: Auto-detection succeeds
- GIVEN Arranger reachable at 192.168.2.254
- WHEN app initializes → `getDeviceStatus()` called per device
- THEN capabilities derived from active streams
- AND auto-detected override manual config

#### Scenario: Arranger unreachable — fallback
- GIVEN Arranger not responding
- WHEN app initializes
- THEN manual config capabilities from `dispositivos.js` used
- AND app functions normally

#### Scenario: Streams change between sessions
- GIVEN device had IR active previously
- WHEN Arranger reports IR inactive (equipment disconnected)
- THEN `channelControl` removed for that device
- AND UI adapts on next reload
