# Exploration: send-ir-dinamico — Reemplazar preset load con send ir dinámico

## Current State

### loadChannelPreset — ubicación y funcionamiento

**Archivo**: `src/api/arrangerApi.js:88-90`

```js
export async function loadChannelPreset(decoNumber, channel) {
  return sendArrangerCommand(`preset load deco${decoNumber}canal${channel}`);
}
```

Construye un comando `preset load deco{N}canal{XXXX}` y lo envía vía `sendArrangerCommand`. Esta función delega completamente en el Arranger, que ejecuta un preset pre-grabado. El preset contiene comandos `send ir DTV1 [hex]` dígito por dígito con `preset delay 100` entre cada uno.

**URL generada**: `${baseUrl}/${encodeURIComponent(command)}/${token}`  
Ejemplo: `http://192.168.2.254/api/command/preset%20load%20deco1canal1603/TOKEN_REMOVED`

### loadChannelPreset — callers

| File | Line | Context |
|------|------|---------|
| `src/componentes/Canales.jsx` | 23, 55 | `submitCanal()` — ÚNICO caller productivo |
| `src/api/arrangerApi.test.js` | 3, 93-114 | Tests unitarios (loadChannelPreset describe) |
| `src/componentes/Canales.test.jsx` | 7-12, 54, 71 | Tests de componente: mock de loadChannelPreset |

**No hay otros callers en producción.** Solo Canales.jsx usa `loadChannelPreset`.

### What would break

- **Canales.jsx:55** — `await loadChannelPreset(decoNumber, canal)` — cambiar firma rompe este import.
- **Canales.test.jsx** — mock de `loadChannelPreset`, usa firma `(number, string)`. Refactor necesario.
- **arrangerApi.test.js** — describe block de `loadChannelPreset`. Tests deben reescribirse para las nuevas funciones.
- **Wiki**: `wiki/API/ArrangerApi.md` — documenta `loadChannelPreset`. Debe actualizarse al archivar.
- **OpenSpec specs**: `openspec/specs/arranger-api-centralized/spec.md` — REQUIREMENT documenta `loadChannelPreset`. Debe modificarse.

---

## Current Flow (Canales.jsx)

### submitCanal — paso a paso

```
1. Usuario selecciona un deco del dropdown (ej: "DTV5")
   → dropdown poblado con getByCapability('channelControl') → DTV1..DTV6

2. Usuario ingresa canal en input (ej: "1603") o clickea favorito
   → inputRef.current.value = "1603"

3. Usuario presiona "Aplicar" → onSubmit → submitCanal(e)

4. Validación: canal entre 100 y 2000 && es favorito
   → filtro sobre estado.favoritos (array de numbers)

5. selectRef.current.value → "DTV5"
   → handleUpdateDispositivo("DTV5", { canalActual: "1603" })  // actualiza estado.dispositivos

6. decoNumber = parseInt("DTV5".replace("DTV", ""), 10) → 5
   → decos[4].canalDeco = "1603"  // legacy sync

7. await loadChannelPreset(5, "1603")  // → Arranger: "preset load deco5canal1603"
   → el Arranger ejecuta el preset pre-grabado que envía IR dígito por dígito

8. handleChangeEstadoDecos(decos)  // sincroniza estado legacy (fuera del try/catch)
```

### Datos disponibles en submitCanal

- `selectRef.current.value` → string tipo `"DTV5"` (deviceId completo)
- `inputRef.current.value` → string tipo `"1603"` (canal como string)
- `favoritos` → array de números (validación)
- `handleUpdateDispositivo(deviceId, { canalActual })` → actualiza el modelo de dispositivos

---

## Proposed IR Flow

### Envío dígito por dígito — reemplazo de preset load

```
1. submitCanal recibe deviceId="DTV5", canal="1603"

2. sendChannelDigits("DTV5", "1603"):
   a. Descompone "1603" → ['1', '6', '0', '3']
   b. Por cada dígito:
      - Busca hex code en IR_CODES[digit]
      - sendIrCommand(deviceId, hexCode)
      - Espera 100ms (delay)
   c. Secuencia completa: send ir DTV5 [hex1] → 100ms → send ir DTV5 [hex6] → 100ms → ...

3. Esto replica EXACTAMENTE lo que el Arranger hace con un preset de:
   send ir DTV1 [hex-1]
   preset delay 100
   send ir DTV1 [hex-6]
   preset delay 100
   send ir DTV1 [hex-0]
   preset delay 100
   send ir DTV1 [hex-3]
   preset delay 100
```

### Mecanismo de delay

```js
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendChannelDigits(deviceId, channel) {
  const digits = String(channel).split('');
  for (const digit of digits) {
    const hex = IR_CODES[digit];
    if (!hex) throw new Error(`IR code missing for digit: ${digit}`);
    await sendIrCommand(deviceId, hex);
    await delay(100); // replica preset delay 100 del Arranger
  }
}
```

### URL encoding del comando send ir

El comando `send ir DTV1 [hex-code]` tiene espacios. `sendArrangerCommand` ya usa `encodeURIComponent(command)`, así que:

```
"send ir DTV1 0000006c..." → "send%20ir%20DTV1%200000006c..."
```

Esto funciona sin cambios en `sendArrangerCommand`. El hex code no contiene caracteres especiales problemáticos (solo `0-9a-f`), así que no requiere escaping adicional.

---

## IR Code Table Structure

### Propuesta de archivo: `src/data/irCodes.js`

```js
/**
 * IR hex codes for DirecTV remote digit keys (Pronto IR format).
 * Learned via iTach IP2IR on DTV1.
 */
export const IR_CODES = {
  '0': '0000006c000a000a00e5002d002d002d00160016001600160016002d001600160016002d0016002d002d0016001604770072002d002d002d00160016001600160016002d001600160016002d0016002d002d001600160477',
  '1': '0000006c000a000a00e5002e002e002e001600160016001600160016001600160016002e001600160016002e001604770072002e002e002e001600160016001600160016001600160016002e001600160016002e00160477',
  '2': null, // FALTA — extraer de preset decoXcanal1O2 o similar
  '3': '0000006c000a000a00e5002d002d002d00160016001600160016001600160016002d002d00160016002d002d001604770072002d002d002d00160016001600160016001600160016002d002d00160016002d002d00160477',
  '4': null, // FALTA
  '5': null, // FALTA
  '6': '0000006c000a000a00e5002d002d002d0016001600160016001600160016002d002d00160016002d0016002d001604770072002d002d002d0016001600160016001600160016002d002d00160016002d0016002d00160477',
  '7': null, // FALTA
  '8': null, // FALTA
  '9': null, // FALTA
};
```

### Estado actual de códigos IR

| Dígito | Estado | Fuente |
|--------|--------|--------|
| 0 | ✅ Disponible | deco1canal1603 (último dígito) |
| 1 | ✅ Disponible | deco1canal1603 (primer dígito) |
| 2 | ❌ Faltante | — |
| 3 | ✅ Disponible | deco1canal1603 (cuarto dígito) |
| 4 | ❌ Faltante | — |
| 5 | ❌ Faltante | — |
| 6 | ✅ Disponible | deco1canal1603 (segundo dígito) |
| 7 | ❌ Faltante | — |
| 8 | ❌ Faltante | — |
| 9 | ❌ Faltante | — |

**Tenemos 4 de 10 dígitos.** Los 6 restantes (2, 4, 5, 7, 8, 9) deben extraerse de presets que contengan esos dígitos. Ejemplos: `deco1canal1624` (2,4), `deco5canal1621` (2,1), `deco3canal1644` (4,4), etc.

### Análisis de los códigos IR (Pronto IR format)

Los códigos recibidos siguen estructura Pronto IR:
- Header: `0000006c000a000a00e5` (aprendido, 108 bytes)
- Burst pairs: secuencias `002e` (ON largo), `002d` (ON medio), `0016` (OFF corto)
- Repeat marker: `04770072` (aparece 2 veces, parte del repeat burst)
- La variación entre dígitos está en los burst pairs — mismo header, distinta secuencia de pares

---

## sendIrCommand Design

### Función a agregar en arrangerApi.js

```js
/**
 * Envía un código IR a un dispositivo.
 * @param {string} deviceId - ID del dispositivo (ej: 'DTV1')
 * @param {string} hexCode - Código IR en formato Pronto hex
 * @returns {Promise<Response>}
 */
export async function sendIrCommand(deviceId, hexCode) {
  return sendArrangerCommand(`send ir ${deviceId} ${hexCode}`);
}

/**
 * Envía dígitos de canal uno por uno vía IR con delay de 100ms.
 * Replica el comportamiento de los presets del Arranger.
 * @param {string} deviceId - ID del dispositivo (ej: 'DTV5')
 * @param {number|string} channel - Número de canal (ej: 1603)
 * @returns {Promise<void>}
 */
export async function sendChannelDigits(deviceId, channel) {
  const digits = String(channel).split('');
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (const digit of digits) {
    const hex = IR_CODES[digit];
    if (!hex) {
      throw new Error(`Código IR no encontrado para el dígito: ${digit}`);
    }
    await sendIrCommand(deviceId, hex);
    await delay(100);
  }
}
```

### URL que se generaría

```
// Un dígito (digit 1 → DTV5)
http://192.168.2.254/api/command/
  send%20ir%20DTV5%200000006c000a000a00e5002e002e002e0016...0477
  /TOKEN_REMOVED
```

---

## Files to Change

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `src/data/irCodes.js` | **NUEVO** | Lookup table `{ digit: hexCode }` para dígitos 0-9 |
| `src/api/arrangerApi.js` | MODIFICAR | Agregar `sendIrCommand(deviceId, hex)` y `sendChannelDigits(deviceId, channel)`. Mantener `loadChannelPreset` como deprecated o eliminarlo. |
| `src/componentes/Canales.jsx` | MODIFICAR | Línea 23: cambiar import a `sendChannelDigits`. Línea 55: reemplazar `loadChannelPreset(decoNumber, canal)` con `sendChannelDigits(selectedDeco, canal)`. Ya no necesita `parseInt` ni `replace`. |
| `src/api/arrangerApi.test.js` | MODIFICAR | Reemplazar describe `loadChannelPreset` con tests para `sendIrCommand` y `sendChannelDigits` |
| `src/componentes/Canales.test.jsx` | MODIFICAR | Actualizar mock: `loadChannelPreset` → `sendChannelDigits`. Verificar que recibe deviceId (string "DTV5") en vez de index (number 5). |
| `wiki/API/ArrangerApi.md` | MODIFICAR | Documentar nuevas funciones, marcar `loadChannelPreset` como deprecated |
| `openspec/specs/arranger-api-centralized/spec.md` | MODIFICAR | Actualizar requirement a `sendChannelDigits` |

### Canales.jsx — cambio concreto

```diff
- import { loadChannelPreset } from "../api/arrangerApi";
+ import { sendChannelDigits } from "../api/arrangerApi";

  // En submitCanal:
- const decoNumber = parseInt(selectedDeco.replace("DTV", ""), 10);
- decos[decoNumber - 1].canalDeco = canal;
- await loadChannelPreset(decoNumber, canal);
+ decos[parseInt(selectedDeco.replace("DTV", ""), 10) - 1].canalDeco = canal;
+ await sendChannelDigits(selectedDeco, canal);
```

La variable `selectedDeco` ya contiene el deviceId completo (`"DTV5"`) desde `selectRef.current.value`, así que no se necesita extraer el número.

### Impacto en handleUpdateDispositivo — NINGUNO

`handleUpdateDispositivo(selectedDeco, { canalActual: canal })` ya usa deviceId como string (`"DTV5"`) — esto no cambia.

---

## Dispositivos que reciben IR

| DeviceId | channelControl | Recibe IR |
|----------|:---:|:---:|
| DTV1 | ✅ | ✅ |
| DTV2 | ✅ | ✅ |
| DTV3 | ✅ | ✅ |
| DTV4 | ✅ | ✅ |
| DTV5 | ✅ | ✅ |
| DTV6 | ✅ | ✅ |
| DTV7 | ❌ | ❌ |
| DTV8 | ❌ | ❌ |

`getByCapability('channelControl')` ya filtra correctamente a DTV1-DTV6. El dropdown de Canales.jsx solo muestra estos 6.

---

## Missing Data

### Códigos IR pendientes: 6 dígitos (2, 4, 5, 7, 8, 9)

Para extraerlos del Arranger, necesitamos presets que contengan esos dígitos. Los presets del Arranger son accesibles vía `get presets` o desde la interfaz web del Arranger.

**Canales favoritos que contienen dígitos faltantes:**

| Canal | Dígitos requeridos | Dígitos faltantes que cubre |
|-------|-------------------|---------------------------|
| 1622 | 1,6,2,2 | 2 |
| 1624 | 1,6,2,4 | 2, 4 |
| 1625 | 1,6,2,5 | 2, 5 |
| 1628 | 1,6,2,8 | 2, 8 |
| 1629 | 1,6,2,9 | 2, 9 |
| 1644 | 1,6,4,4 | 4 |
| 1677 | 1,6,7,7 | 7 |
| 1620 | 1,6,2,0 | — (0, 1, 6 ya los tenemos) |

**Recomendación**: Solicitar al usuario que exporte los presets `decoXcanal1622`, `decoXcanal1624`, `decoXcanal1625`, `decoXcanal1629`, `decoXcanal1677` desde el Arranger. Con esos 5 presets cubrimos todos los dígitos faltantes.

Cada preset contiene 4 comandos `send ir` con los hex codes de sus dígitos. Ejemplo para `deco1canal1622`:
```
send ir DTV1 [hex-1]
send ir DTV1 [hex-6]
send ir DTV1 [hex-2]  ← el que necesitamos
send ir DTV1 [hex-2]  ← el que necesitamos
```

---

## Risks

1. **Falla de red durante envío de dígitos**: Si la conexión al Arranger falla en el 3er dígito de 4, el deco queda sintonizado parcialmente (ej: canal 16 en vez de 1603). Mitigación: el usuario puede reintentar.
2. **Timing de IR**: El delay de 100ms replicado con `setTimeout` en JS puede no ser exactamente igual al `preset delay 100` del Arranger por latencia de red. Si falla, ajustar a 150-200ms.
3. **Códigos IR incompletos**: Si no se obtienen todos los dígitos, el sistema solo funciona para canales cuyos dígitos están todos disponibles. Bloqueante para el deploy.
4. **Modo no-cors**: No podemos verificar si el Arranger aceptó el comando IR. Solo podemos asumir que llegó (mismo problema que ya existe con `preset load`).
5. **DTV1 tiene `serialGateway` además de `channelControl`**: DTV1 se usa también para comandos seriales del Tesira. El envío de IR no interfiere — son canales de control distintos.

## Recommendation

**Proceder con el approach de `sendChannelDigits`.** Los cambios son acotados (3 archivos productivos + tests), el riesgo es bajo, y elimina la dependencia de presets pre-grabados en el Arranger. La única condición bloqueante es obtener los 6 dígitos IR faltantes del usuario.

## Ready for Proposal

**No** — primero necesitamos los códigos IR faltantes (dígitos 2, 4, 5, 7, 8, 9). Pedir al usuario que exporte los presets del Arranger que contengan esos dígitos. Una vez tengamos los 10 dígitos, se puede proceder con la propuesta.
