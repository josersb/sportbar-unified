# SendSerial

Comando `send serial` del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para enviar datos seriales RS-232 desde un sistema de control a encoders y decoders.

## Sintaxis

```
send serial [key:<security_key>] <device_name> / <group_name> / all / all_tx / all_rx "<data_string>" [<feedback> ["<feedback_string>"]]
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `device_name` | Nombre del encoder, decoder, grupo, `all`, `all_tx` o `all_rx` |
| `data_string` | String de datos a enviar (ASCII o HEX) |
| `feedback` | Modo de feedback: `reply`, `equals` o `contains` (opcional) |
| `feedback_string` | String esperado para comparar con `equals` o `contains` (opcional) |

## Modos de operación serial

El puerto RS-232 puede configurarse en dos modos:

| Modo | Formato de `data_string` | Bytes escapables |
|------|--------------------------|-------------------|
| **ASCII** | Texto ASCII con escapes `\x0D` (CR) y `\x0A` (LF) | Solo `\x0D` y `\x0A` |
| **HEX** | Bytes hexadecimales (ej: `00FF`, `\x00\xFF`) | Cualquier byte |

## Modos de feedback

| Modo | Descripción |
|------|-------------|
| `reply` | Espera cualquier respuesta del dispositivo |
| `equals "<string>"` | Espera que la respuesta sea exactamente igual al string |
| `contains "<string>"` | Espera que la respuesta contenga el string especificado |

**Restricción**: Los modos de feedback solo funcionan cuando `device_name` es un encoder o decoder individual (no grupos ni `all`).

## Baud rates soportados

2400, 4800, 9600, 19200, 38400, 57600, 115200.

## Valor de retorno

```
send serial success [data_recibido]
send serial error [mensaje]
```

### Posibles errores

- `incomplete` — comando incompleto
- `invalid format` — formato inválido
- `invalid HEX data` — datos HEX inválidos
- `invalid HEX feedback` — feedback HEX inválido
- `invalid parameter` — parámetro inválido
- `invalid response` — respuesta inválida
- `device '<device_name>' not found` — dispositivo no encontrado
- `device '<device_name>' disconnected` — dispositivo desconectado
- `group devices not found` — no se encontraron dispositivos en el grupo

## Ejemplos

```
send serial Decoder1 "my data string\x0D"
send serial Encoder1 "\x00\x01\x02\x03\x04"
send serial Decoder1 "my data string" reply
send serial Decoder1 "my data string\x0D" contains "\x0D"
send serial Decoder1 "my data string\x0D\x0A" equals "OK"
send serial key:abc123 Decoder1 "000102FF"
send serial MyGroup "my data string\x0D"
```

## Implementación en SportBar

- **Estado**: ✅ Implementado como `sendSerialCommand(device, command)` en `arrangerApi.js:113`
- **BUG CONOCIDO**: La función envía `\\x0A` como string literal (backslash + x + 0 + A), no como el byte `0x0A` (line feed). La línea `const payload = \`${command}\\x0A\`;` en `arrangerApi.js:114` debería usar `\x0A` (escape real) en lugar de `\\x0A` (string literal).
- Para enviar `0x0D` (carriage return), el comando Tesira probablemente requiera `\\x0D` con el mismo bug.
- Usado por [[../Componentes/Audio]] para controlar el procesador Tesira vía comandos seriales a través del encoder DTV1.
- **Corrección propuesta**: Cambiar `const payload = \`${command}\\x0A\`;` por `const payload = \`${command}\x0A\`;` para enviar el byte LF real.

## Ver también

- [[ArrangerApi]] — cliente API central del sistema
- [[../Componentes/Audio]] — control de audio que usa `send serial`
- [[../Conceptos/ZonasAudio]] — zonas controladas vía Tesira/RS-232
- [[SendIr]] — envío de comandos infrarrojos
