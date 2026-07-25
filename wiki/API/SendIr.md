# SendIr

Comando `send ir` del [[../Dispositivos/Arranger-IPEXCB|Arranger IPEXCB]] para enviar señales infrarrojas (IR) a encoders y decoders desde un sistema de control.

## Sintaxis

```
send ir [key:<security_key>] <device_name> / <group_name> / all / all_tx / all_rx <data_hex>
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `device_name` | Nombre del decoder, encoder, grupo, `all`, `all_tx` o `all_rx` |
| `data_hex` | String hexadecimal con el código infrarrojo en formato Pronto |

## Formato de `data_hex`

- String de caracteres ASCII representando el código infrarrojo en formato **Pronto HEX**.
- La longitud debe ser múltiplo de 8 (múltiplo de 4 bytes).
- Máximo: 256 burst pairs (1032 bytes de longitud máxima).
- Los códigos se aprenden de controles remotos físicos o se importan de la base de datos Global Cache.

## Valor de retorno

```
send ir success
send ir error [mensaje]
```

### Posibles errores

- `incomplete` — comando incompleto
- `max length exceeded` — código IR excede 256 burst pairs
- `length of HEX data should be in multiples of 4 bytes` — longitud de datos inválida
- `invalid HEX data` — datos hexadecimales inválidos
- `invalid response` — respuesta inválida
- `device '<device_name>' not found` — dispositivo no encontrado
- `device '<device_name>' disconnected` — dispositivo desconectado
- `group devices not found` — no se encontraron dispositivos en el grupo

## Ejemplos

```
send ir Decoder1 0000006D0000002200AC00AC001500400015004000150040...
send ir MyGroup 0000006D0000002200AC00AC001500400015004000150040...
send ir key:abc123 all_rx 000006D0000002200AC00AC001500400015004000150040...
```

## Implementación en SportBar

- **Estado**: ✅ Implementado como `sendIrCommand(deviceId, hexCode)` en `arrangerApi.js:135`
- Usado por `sendChannelDigits()` para cambio de canal dígito a dígito en decodificadores DirecTV.
- El comando se construye como `send ir {deviceId} {hexCode}` y se envía vía `sendArrangerCommand()`.
- **Edge case conocido**: El dígito `2` falla con `send ir` en los DirecTV — `sendChannelDigits()` usa `loadChannelPreset()` como fallback para ese dígito específico (ver `arrangerApi.js:157`).

## Ver también

- [[IrCodes]] — tabla de códigos IR hexadecimales para DirecTV
- [[ArrangerApi]] — cliente API central del sistema
- [[../Dispositivos/DirecTV-Decos]] — decodificadores controlados vía IR
- [[SendSerial]] — envío de comandos RS-232
