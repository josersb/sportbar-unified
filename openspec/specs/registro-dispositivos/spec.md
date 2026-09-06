# registro-dispositivos Specification

## Purpose
Typed device registry replacing flat `estado.decos[]`. Each IPEX5001 is defined with metadata and manual capabilities declared in `dispositivos.js` (sin detección automática por `get status`, FW-locked v1.3.4).

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

Las capabilities MUST ser manual-only: declaradas en el registro `dispositivos.js`. No SHALL haber detección automática vía `getDeviceStatus()` (código muerto) ni `get status` (FW-locked v1.3.4).

| Stream | Capability |
|--------|-----------|
| VIDEO | `videoSource` |
| AUDIO | `audioSource` |
| IR | `channelControl` |
| SERIAL | `serialGateway` |

(Previously: auto-detección vía `getDeviceStatus()` con merge sobre config manual y fallback)

#### Scenario: Capabilities desde registro manual

- GIVEN `dispositivos.js` declara capabilities por dispositivo
- WHEN un componente consulta capabilities
- THEN usa las del registro manual, sin llamada al Arranger

#### Scenario: Cambio de equipment actualiza registro

- GIVEN un dispositivo cambia de equipo (IR desconectado)
- WHEN el operador actualiza `dispositivos.js`
- THEN la UI refleja la nueva capability al recargar

### Requirement: Destination Registration
The system SHALL register IPEX5002 decoder destinations alongside IPEX5001 source devices. A helper function MUST expose the full destination list to components.

#### Scenario: Destinations exposed to components
- GIVEN app initializes with 10 IPEX5002 destinations in estado.tvs
- WHEN a component needs destination metadata
- THEN it can query the destination list with labels and Arranger names

#### Scenario: Source and destination separation
- GIVEN both IPEX5001 sources (DTV1-DTV8) and IPEX5002 destinations are registered
- WHEN getByCapability('videoSource') is called
- THEN it returns only sources, not destinations
