# Design: Envío IR Dinámico para Cambio de Canales

## Technical Approach

Reemplazar `loadChannelPreset` (presets pre-grabados en el Arranger) por envío IR dígito a dígito usando `send ir <deviceId> <hexCode>`. Cada dígito se busca en una tabla de lookup estática `IR_CODES` y se envía secuencialmente con 300ms de delay entre cada uno. `loadChannelPreset` se conserva como `@deprecated`.

## Architecture Decisions

### Decision: Tabla de lookup estática vs aprendizaje dinámico

**Choice**: `IR_CODES` como `export const` en `src/data/irCodes.js`.
**Alternatives considered**: Aprendizaje desde control remoto (fuera de alcance), configuración por env vars (sobre-ingeniería para 10 valores).
**Rationale**: Los 10 dígitos son inmutables y ya están recolectados. Una constante ES module es cero-dependencia, tree-shakeable, y trivial de auditar.

### Decision: Envío secuencial con delay fijo de 300ms

**Choice**: `for...of` con `await delay(300)` entre cada `sendIrCommand`.
**Alternatives considered**: `Promise.all` paralelo (el deco no procesa IR concurrente), delay adaptativo (complejidad innecesaria).
**Rationale**: El decodificador DirecTV necesita tiempo entre dígitos IR. 300ms replica el `preset delay` real del Arranger y es conservador.

### Decision: Fail loud para dígitos sin código IR

**Choice**: `throw new Error(...)` si `IR_CODES[digit]` es `undefined`.
**Alternatives considered**: `console.warn` + skip (silencio peligroso), intentar enviar `undefined` (crash opaco en fetch).
**Rationale**: Un dígito faltante es un error de datos que debe ser visible. El try/catch en `Canales.jsx` ya captura errores y los loguea.

### Decision: Mantener `loadChannelPreset` como `@deprecated`

**Choice**: No eliminar, agregar `@deprecated` en JSDoc.
**Alternatives considered**: Eliminar inmediatamente (rompe rollback en 2 líneas).
**Rationale**: Rollback seguro — revertir Canales.jsx a la llamada original es trivial. La propuesta lo declara explícitamente.

## Data Flow

```
Canales.jsx (submitCanal)
    │
    │ selectedDeco = "DTV1", canal = "1603"
    ▼
sendChannelDigits("DTV1", 1603)
    │
    │ String(channel).split('') → ['1','6','0','3']
    │
    ▼
[loop for each digit]
    │ IR_CODES['1'] → '0000006c...'
    ▼
sendIrCommand("DTV1", '0000006c...')
    │
    │ buildArrangerCommand: "send ir DTV1 0000006c..."
    ▼
sendArrangerCommand("send ir DTV1 0000006c...")
    │
    │ GET http://192.168.2.254/api/command/send%20ir%20DTV1%200000006c.../token
    ▼
Arranger IPEX5000 → IR blaster → Deco DirecTV
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/data/irCodes.js` | Create | Lookup table `{ '0': 'hex', ..., '9': 'hex' }` con 10 códigos Pronto hex |
| `src/api/arrangerApi.js` | Modify | +`sendIrCommand`, +`sendChannelDigits`, `loadChannelPreset` → `@deprecated` |
| `src/componentes/Canales.jsx` | Modify | L23: import `sendChannelDigits`. L49-55: `selectedDeco` directo sin `parseInt` |
| `src/api/arrangerApi.test.js` | Modify | Nuevo describe block para `sendIrCommand` y `sendChannelDigits` con fake timers |
| `src/componentes/Canales.test.jsx` | Modify | Mock: `loadChannelPreset` → `sendChannelDigits`. Eliminar `parseInt` de aserciones |

## Interfaces / Contracts

```js
// src/data/irCodes.js
export const IR_CODES = {
  '0': '0000006c...0477',
  // ... '1'–'9'
};

// src/api/arrangerApi.js — nuevas funciones
export async function sendIrCommand(deviceId, hexCode) {
  return sendArrangerCommand(`send ir ${deviceId} ${hexCode}`);
}

export async function sendChannelDigits(deviceId, channel) {
  const digits = String(channel).split('');
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  for (const digit of digits) {
    const hex = IR_CODES[digit];
    if (!hex) throw new Error(`Código IR faltante para dígito: ${digit}`);
    await sendIrCommand(deviceId, hex);
    await delay(300);
  }
}
```

**Contract invariants**:
- `deviceId` debe ser DTV1-DTV6 (dropdown filtrado por `channelControl`)
- `channel` validado contra `favoritos` y rango 100-2000 en `Canales.jsx`
- `sendChannelDigits` lanza si algún dígito no está en `IR_CODES`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `sendIrCommand` construye URL con `send%20ir` | Mock `fetch`, assert URL contiene `send%20ir%20DTV1%20<hex>` |
| Unit | `sendChannelDigits` envía 4 dígitos secuenciales con 300ms delay | Mock `sendIrCommand`, `vi.useFakeTimers()`, assert 4 llamadas con 300ms entre cada una |
| Unit | `sendChannelDigits` lanza error para dígito sin código | Mock `IR_CODES` sin '5', assert `rejects.toThrow('Código IR faltante')` |
| Component | `Canales.jsx` llama `sendChannelDigits(selectedDeco, canal)` | Mock `sendChannelDigits`, assert llamado directo sin `parseInt` |
| Component | Error muestra placeholder | Mock `sendChannelDigits` rechazando, assert placeholder en input |

## Threat Matrix

N/A — no new routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. `sendIrCommand` reusa `sendArrangerCommand` que ya gestiona HTTP al Arranger. `deviceId` viene de dropdown filtrado, `hexCode` de tabla estática — sin superficie de inyección nueva.

## Migration / Rollout

No migration required. `loadChannelPreset` se conserva como `@deprecated`.

**Rollback**: Revertir `Canales.jsx` L23 (import) y L49-55 (llamada). 2 líneas, sin side effects.

## Open Questions

- None
