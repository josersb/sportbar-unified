# Design: Centralizar API de Arranger

## Technical Approach

Extender `arrangerApi.js` con 4 funciones y migrar 4 componentes a imports en lugar de `fetch` inline. Se eliminan 83 llamadas `fetch()` + 4 `myInit`. `.env` ya contiene `VITE_ARRANGER_API_BASE` y `VITE_ARRANGER_TOKEN`. La migración es secuencial por componente, independiente cada una.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| `joinMultipleTVs` con `for...of` secuencial, no `Promise.all` | `Promise.all`: paralelo, más rápido pero desordena el hardware | La matriz Arranger procesa comandos en orden; ejecución secuencial preserva el comportamiento actual y evita race conditions |
| `sendSerialCommand` con encoding explícito de `\x0A` a `%5Cx0A` | URLSearchParams (encoding distinto) | El hardware espera el terminador literal `\x0A`. `encodeURIComponent` de `\x0A` produce `%5Cx0A`; no usar `\\x0A` crudo que escapa mal |
| `sendBatchCommands` con `Promise.allSettled` + reporte de fallos | `Promise.all` (fail-fast) | En operaciones batch, un fallo no debe bloquear el resto. `allSettled` permite reportar cuáles comandos fallaron |
| `loadChannelPreset` con mapeo numérico extraído del string DTV | Mapa de strings fijo (`DTV1→1`, ...) | Extraer el número del nombre del deco (`DTV5` → `5`) es más mantenible que 8 ramas de switch |

## Data Flow

```
Component (MatrizPreset)
  └─ joinMultipleTVs([{source, dest}])
       └─ for...of → assignSourceToDestination(source, dest)
            └─ buildArrangerCommand("join av", source, dest)
                 └─ sendArrangerCommand(command)
                      └─ fetch(ARRANGER_BASE_URL/command/TOKEN)
                           └─ Arranger IPEX5000 @ 192.168.2.254
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/api/arrangerApi.js` | Modify | +4 funciones: `joinMultipleTVs`, `sendSerialCommand`, `loadChannelPreset`, `sendBatchCommands` |
| `src/componentes/MatrizPreset.jsx` | Modify | `handleCargaMatriz`: reemplaza 29 fetch → `joinMultipleTVs`; elimina `myInit` |
| `src/componentes/MatrizVideo.jsx` | Modify | `onSubmit`: 29 fetch → `joinMultipleTVs`; `handleBtnDTV1..8`: 8 fetch → `assignSourceToDestination`; elimina `myInit` |
| `src/componentes/Audio.jsx` | Modify | `onSubmit`: 9 fetch → `sendSerialCommand` × 9; elimina `myInit` |
| `src/componentes/Canales.jsx` | Modify | `submitCanal`: switch/case 8 ramas → `loadChannelPreset`; elimina `myInit` |
| `src/api/arrangerApi.test.js` | Create | Tests unitarios de las 7 funciones exportadas |

## New Functions (arrangerApi.js)

### `joinMultipleTVs(mappings)`
```js
// @param {Array<{source: string, dest: string}>} mappings
// @returns {Promise<void>}
export async function joinMultipleTVs(mappings) {
  for (const { source, dest } of mappings) {
    await assignSourceToDestination(source, dest);
  }
}
```

### `sendSerialCommand(device, command)`
```js
// @param {string} device — ej: "DTV1"
// @param {string} command — ej: 'Mute1 set mute 1 true'
// @returns {Promise<Response>}
export async function sendSerialCommand(device, command) {
  const payload = `${command}\\x0A`;
  const urlCommand = `send serial ${device} "${payload}"`;
  return sendArrangerCommand(urlCommand);
}
```

### `loadChannelPreset(decoNumber, channel)`
```js
// @param {number} decoNumber — 1..8
// @param {number|string} channel — ej: 1603
// @returns {Promise<Response>}
export async function loadChannelPreset(decoNumber, channel) {
  return sendArrangerCommand(`preset load deco${decoNumber}canal${channel}`);
}
```

### `sendBatchCommands(commands)`
```js
// @param {string[]} commands
// @returns {Promise<{ok: string[], failed: string[]}>}
export async function sendBatchCommands(commands) {
  const results = await Promise.allSettled(
    commands.map(cmd => sendArrangerCommand(cmd))
  );
  // Agrega command string al reporte mediante closure
  const ok = [], failed = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") ok.push(commands[i]);
    else { failed.push(commands[i]); console.error(`[ArrangerAPI] Batch fail: ${commands[i]}`); }
  });
  return { ok, failed };
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `sendArrangerCommand` with mock fetch | `vi.fn()` mock de `global.fetch`, verificar URL construida |
| Unit | `assignSourceToDestination` | Mock de `sendArrangerCommand`, verificar comando `join av SRC DEST` |
| Unit | `joinMultipleTVs` (array vacío, 3 mappings, error propagation) | Mock de `assignSourceToDestination`, verificar llamadas secuenciales |
| Unit | `sendSerialCommand` — encoding de `\x0A` | Mock de `sendArrangerCommand`, verificar payload con `%5Cx0A` |
| Unit | `loadChannelPreset` — `deco5canal1603` | Mock de `sendArrangerCommand`, verificar comando construido |
| Unit | `sendBatchCommands` — 3 ok, 1 fail | Mock con fetch que falla en el 3er comando, verificar reporte |
| Integration | `MatrizPreset.handleCargaMatriz` con `joinMultipleTVs` mockeado | Render con Context mock, verificar 29 llamadas con destinos correctos |

**Config**: `vitest` + `jsdom` ya configurados. Mock de `fetch` con `vi.stubGlobal('fetch', ...)`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is affected. The design refactors existing HTTP GET calls into a centralized module; no new attack surface is introduced.

## Implementation Order

| Paso | Archivo | Líneas estimadas | Depende de |
|------|---------|-----------------|------------|
| 1 | `arrangerApi.js` | +45 | Ninguno |
| 2 | `arrangerApi.test.js` | +120 | Paso 1 |
| 3 | `MatrizPreset.jsx` | −120 / +15 | Paso 1 |
| 4 | `MatrizVideo.jsx` | −290 / +30 | Paso 1 |
| 5 | `Audio.jsx` + `Canales.jsx` | −85 / +20 | Paso 1 |

Cada paso de componente es independiente de los demás. El orden sugerido es menor a mayor riesgo. Rollback por archivo con `git checkout`.

## Open Questions

- [ ] ¿Se necesita `sendBatchCommands` o alcanza con que cada componente llame a sus funciones específicas? Propuesta actual: incluirla, es útil para operaciones futuras pero ningún componente la necesita hoy.
- [ ] Confirmar que `VITE_ARRANGER_API_BASE` en `.env` es `http://192.168.2.254/api/command` (sin trailing slash) — el código actual de `sendArrangerCommand` concatena con `/` entre base y comando.
