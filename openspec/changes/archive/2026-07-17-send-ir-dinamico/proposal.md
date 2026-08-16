# Propuesta: Envío IR Dinámico para Cambio de Canales

## Intención
Eliminar la dependencia de presets pre-grabados en el Arranger para cambio de canales DirecTV. Actualmente `loadChannelPreset` requiere que cada combinación deco+canal tenga un preset físico en el Arranger, lo que impide cambiar a canales no pre-grabados y crea fricción operativa. El reemplazo envía códigos IR dígito por dígito directamente, sin presets.

## Alcance

### Dentro del alcance
- `src/data/irCodes.js` — tabla de lookup `{ dígito: hexCode }` con los 10 dígitos (0-9)
- `src/api/arrangerApi.js` — nuevas funciones `sendIrCommand(deviceId, hexCode)` y `sendChannelDigits(deviceId, channel)`
- `src/componentes/Canales.jsx` — reemplazar `loadChannelPreset(decoNumber, canal)` por `sendChannelDigits(selectedDeco, canal)`
- Tests unitarios actualizados para ambas funciones nuevas + tests de componente Canales
- Delay de **300ms** entre cada dígito enviado (replica el `preset delay` real del Arranger)

### Fuera del alcance
- Aprender códigos IR desde el control remoto físico (los 10 ya están recolectados)
- Enviar IR a dispositivos que no sean DTV1-DTV6 (ej: TVs, audio)
- Comandos ON/OFF/EXIT vía IR (trabajo futuro)
- Eliminar `loadChannelPreset` del módulo (se deja como `@deprecated` para referencia)

## Capacidades

### Capacidades Modificadas
- `arranger-api-centralized`: el requirement `loadChannelPreset` se reemplaza por `sendChannelDigits` + `sendIrCommand`. El envío de canal deja de delegar en presets del Arranger y pasa a ser dígito por dígito vía IR.

## Enfoque
Envío secuencial dígito por dígito con `await delay(300)` entre cada uno. `sendChannelDigits` descompone el canal en dígitos, busca cada hex code en `IR_CODES`, y llama `sendIrCommand(deviceId, hex)`. Si un dígito no tiene código IR, lanza error. Solo opera sobre dispositivos con capability `channelControl` (DTV1-DTV6, ya filtrados por el dropdown actual).

## Áreas Afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `src/data/irCodes.js` | Nuevo | Lookup table estática de 10 dígitos IR en formato Pronto hex |
| `src/api/arrangerApi.js` | Modificado | +`sendIrCommand`, +`sendChannelDigits`, `loadChannelPreset` → `@deprecated` |
| `src/componentes/Canales.jsx` | Modificado | L23: import `sendChannelDigits`. L53-55: usa `selectedDeco` directo en vez de `decoNumber` |
| `src/api/arrangerApi.test.js` | Modificado | Nuevo describe block para `sendIrCommand` y `sendChannelDigits` |
| `src/componentes/Canales.test.jsx` | Modificado | Mock de `loadChannelPreset` → `sendChannelDigits` |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Falla de red a mitad de secuencia — deco queda en canal parcial (ej: "16" en vez de "1603") | Media | El usuario reintenta. El error se loguea con `console.error` por dígito fallido |
| Timing IR inexacto: `setTimeout` en JS no replica con precisión de microsegundos el `preset delay` del Arranger | Baja | 300ms es conservador y coincide con presets reales. Si falla, ajustar a 350-400ms |
| Modo `no-cors` impide verificar receipt del comando IR | Baja | Mismo problema que ya existe con `preset load`. No empeora la situación actual |

## Plan de Rollback
Revertir `Canales.jsx` al import y llamada de `loadChannelPreset`. La función se mantiene en `arrangerApi.js` marcada como `@deprecated` — no se elimina. Rollback es un cambio de 2 líneas en un solo archivo.

## Dependencias
- Los 10 códigos IR hex (0-9) ya están recolectados y disponibles
- No requiere cambios en el Arranger, infraestructura, ni dependencias npm

## Criterios de Éxito
- [ ] Cambiar canal en cualquier DTV1-DTV6 sin usar `preset load` (sin presets pre-grabados en el Arranger)
- [ ] Delay de 300ms entre cada dígito enviado
- [ ] Solo DTV1-DTV6 reciben comandos IR (dropdown ya filtra por `channelControl`)
- [ ] Tests unitarios de `sendIrCommand` y `sendChannelDigits` pasan (Vitest)
- [ ] Tests de componente Canales pasan con el nuevo mock
- [ ] Canales con todos los dígitos (0-9) funcionan sin errores de "código IR no encontrado"
