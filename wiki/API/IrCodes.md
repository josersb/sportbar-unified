# IrCodes

Tabla de códigos IR hexadecimales para cambio de canal dígito a dígito en decodificadores DirecTV.

Ubicación: `src/data/irCodes.js`

## Códigos

| Dígito | Código Hex (Pronto) |
|--------|---------------------|
| 0 | `0000 006c 000a 000a 00e5 ...` |
| 1 | `0000 006c 000a 000a 00e5 ...` |
| ... | ... |

Cada dígito (0-9) tiene su código IR único. La función `sendChannelDigits` de [[ArrangerApi]] envía cada dígito secuencialmente con 300ms de delay.

## Uso

Usado exclusivamente por `sendChannelDigits` en [[ArrangerApi]] para cambio de canal dinámico sin depender de presets pre-grabados en el Arranger.

## Relaciones

- Usado por [[ArrangerApi]] → `sendChannelDigits`
- Llamado desde [[../Componentes/Canales]]
- [[../README]] — documentación general
