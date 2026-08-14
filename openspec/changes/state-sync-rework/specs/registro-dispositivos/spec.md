# Delta for registro-dispositivos

## MODIFIED Requirements

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
