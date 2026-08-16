# Tasks: Modelo de Dispositivos por Capacidades

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~485 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Core) → PR 3 (Tests) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units (feature-branch-chain)

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Registry + API proxy | PR 1 → feature/tracker | `node -e "require('./src/contexto/dispositivos.js')"` sin errores | `pnpm run dev:full` — verificar que endpoint /api/device/:id responda | Revertir commit PR 1 sobre tracker |
| 2 | State migration + 6 componentes | PR 2 → PR 1 | Navegación completa de la UI | `pnpm run dev:full` — probar carga con localStorage v0 real, presets, dropdowns, botones DTV | Revertir PR 2; PR 1 + tracker intactos |
| 3 | Tests (4 archivos) | PR 3 → PR 2 | `pnpm test` o runner configurado | N/A — solo tests automatizados | Revertir PR 3; PR 2 y PR 1 intactos |

## Foundation

- [x] **T1** Crear `src/contexto/dispositivos.js` — registry con 8 IPEX5001 (id, hardware, mac, connected, color, capabilities, defaultChannel) + helpers `getByCapability()`, `detectCapabilities()`. Deps: —. Verif: import sin errores, `getByCapability('channelControl')` retorna 6 devices.
- [x] **T2** Agregar `getDeviceStatus(deviceId)` en `src/api/arrangerApi.js` — GET a Express proxy `/api/device/:id/status`, parsea streams → capabilities. Deps: T3. Verif: mock/test con retorno esperado.
- [x] **T3** Agregar `GET /api/device/:deviceId/status` en `server/server.js` — relay HTTP a Arranger `get status`, parsea respuesta HTML/text a JSON. Deps: —. Verif: `curl http://localhost:3000/api/device/DTV1/status` retorna JSON.

## State Migration

- [x] **T4** Actualizar `src/contexto/Contexto.jsx` — agregar `estadoInicial.dispositivos: {}`, campo `_version: 1`, mantener `decos[]` legacy para bridge. Deps: T1. Verif: estado inicial contiene `dispositivos` y `_version`.
- [x] **T5** Actualizar `src/App.jsx` — implementar `migrarEstado()` (v0→v1: decos[] → dispositivos{}), ejecutar al cargar si version < 1, llamar `detectCapabilities()`, exponer `handleChangeEstadoDispositivos`. Deps: T4. Verif: localStorage con formato v0 se migra correctamente al cargar.

## Componentes

- [x] **T6** Refactor `src/componentes/Canales.jsx` — dropdown dinámico con `getByCapability('channelControl')`, 8 hardcoded `<option>` → `.map()`. Deps: T5. Verif: dropdown muestra solo DTV1-DTV6 (6 opciones).
- [x] **T7** Refactor `src/componentes/MatrizVideo.jsx` — botones DTVRACK via `.map()` sobre `getByCapability('videoSource')`, 8 handlers → factory `handleBtn(id)`. Deps: T5. Verif: 8 botones renderizados con label = `connected`.
- [x] **T8** Refactor `src/componentes/MatrizPreset.jsx` — leer `dispositivos` del preset guardado, mantener lectura de `tvs`. Deps: T5. Verif: presets guardados se cargan sin pérdida de datos.
- [x] **T9** Refactor `src/componentes/Aside.jsx` + `Aside.css` — iterar `Object.values(dispositivos)` en lugar de `decos[i]`, color dinámico desde registry. Deps: T5. Verif: panel lateral muestra dispositivos con sus colores.
- [x] **T10** Refactor `src/componentes/Audio.jsx` — filtrar fuentes por `audioSource` capability, dropdown dinámico. Deps: T5. Verif: solo DTV1-DTV8 con audioSource aparecen.

## Tests

- [x] **T11** Actualizar 4 archivos de test — mocks de contexto incluyen `dispositivos`, verificar: Canales dropdown 6 opciones, MatrizVideo botones dinámicos, Audio filtrado, migración v0→v1. Deps: T6-T10. Verif: todos los tests existentes pasan con el nuevo modelo.
