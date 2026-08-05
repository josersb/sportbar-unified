# GetStatus

> ⚠️ **NO DISPONIBLE en el hardware actual.** Requiere firmware ≥1.4.0.0. El controlador Arranger IPEXCB del SportBar ejecuta **v1.3.4 (API V210826)**. Este comando es exclusivo de V1.4.0.0 y devuelve `invalid property`. La función está implementada en `arrangerApi.js` pero no es funcional hasta actualizar el firmware.

Comando `get status` del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para consultar el estado de un dispositivo específico o de un stream individual (video, audio, usb, serial, ir).

## Sintaxis

```
get status [key:<security_key>] <device_name> [<stream>]
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `device_name` | Nombre del encoder o decoder a consultar |
| `stream` | Tipo de stream: `video`, `audio`, `usb`, `serial`, `ir` (opcional) |

## Valor de retorno

Cuando no se especifica stream, retorna el estado general del dispositivo (equivalente a la pestaña Status de la UI del Arranger).

### Estados de dispositivo

| Estado | Descripción |
|--------|-------------|
| `connected` | Dispositivo operativo y conectado |
| `stopped` | Dispositivo detenido |
| `timeout` | Timeout de conexión |
| `disconnected` | Dispositivo desconectado |
| `out of range` | Dispositivo fuera de rango |

### Posibles errores

- `incomplete` — comando incompleto
- `invalid stream '<stream>'` — tipo de stream inválido
- `device '<device_name>' not found` — dispositivo no encontrado

## Ejemplos

```
get status Encoder1
get status Decoder1
get status Encoder1 audio
get status Decoder1 video
get status Encoder1 serial
get status Decoder1 ir
get status key:abc123 Encoder1
```

## Notas

- Sin especificar stream, el comando retorna el estado general tal como se ve en la UI del Arranger.
- Los decoders soportan consulta por suscripción (qué encoder está conectado a cada stream).
- Los encoders soportan consulta por stream propio (video, audio, usb, serial, ir).

## Implementación en SportBar

- **Estado**: 🔲 No implementado en `arrangerApi.js`
- La función `getDeviceStatus()` consulta el estado vía el proxy Express (`/api/device/:id/status`), no directamente con `get status`.
- Valor potencial: verificar conectividad de dispositivos sin depender del proxy Express.

## Ver también

- [[ArrangerApi]] — cliente API central del sistema
- [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — controlador físico
