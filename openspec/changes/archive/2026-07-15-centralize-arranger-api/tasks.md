# Tasks: Centralizar API de Arranger

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~680–720 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (API+tests) → PR 2 (MatrizPreset) → PR 3 (MatrizVideo) → PR 4 (Audio+Canales) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Extend `arrangerApi.js` + unit tests | PR 1 (base=tracker) | `pnpm vitest run src/api/arrangerApi.test.js` | N/A — pure API + tests, no UI | Revert `arrangerApi.js` + `arrangerApi.test.js` |
| 2 | Migrate `MatrizPreset.jsx` | PR 2 (base=PR#1) | `pnpm vitest run src/api/arrangerApi.test.js` | `pnpm dev` → cargar preset en /matrizvideo | Revert `MatrizPreset.jsx` only |
| 3 | Migrate `MatrizVideo.jsx` | PR 3 (base=PR#2) | `pnpm vitest run src/api/arrangerApi.test.js` | `pnpm dev` → enviar form en /matrizvideo | Revert `MatrizVideo.jsx` only |
| 4 | Migrate `Audio.jsx` + `Canales.jsx` | PR 4 (base=PR#3) | `pnpm vitest run src/api/arrangerApi.test.js` | `pnpm dev` → probar audio y canales | Revert `Audio.jsx` + `Canales.jsx` |

## Phase 1: RED Tests — `src/api/arrangerApi.test.js`

- [x] 1.1 Write failing test for `joinMultipleTVs` — 0 mappings (no-op), 3 sequential mappings, error propagation
- [x] 1.2 Write failing test for `sendSerialCommand` — verificar payload con `%5cx0a` lowercase
- [x] 1.3 Write failing test for `loadChannelPreset` — verificar comando `preset load deco5canal1603`
- [x] 1.4 Write failing test for error logging — mock fetch failure, verificar `[ArrangerAPI] Error` en console.error

## Phase 2: GREEN Implementation — `src/api/arrangerApi.js`

- [x] 2.1 Implement `joinMultipleTVs(mappings)` — `for...of` secuencial, llama `assignSourceToDestination`, catch + console.error por ítem
- [x] 2.2 Implement `sendSerialCommand(device, payload)` — payload con `\\x0a` lowercase, encodeURIComponent, delega a `sendArrangerCommand`
- [x] 2.3 Implement `loadChannelPreset(decoNumber, channel)` — comando `preset load decoNcanalCH`, delega a `sendArrangerCommand`

## Phase 3: Migrate `MatrizPreset.jsx`

- [x] 3.1 Import `joinMultipleTVs` de `../api/arrangerApi`; reemplazar 29 fetch + `myInit` en `handleCargaMatriz` con `joinMultipleTVs(mappings)`
- [x] 3.2 Eliminar `const myInit`, hardcoded URL/token; verificar cero `fetch()` directos remanentes

## Phase 4: Migrate `MatrizVideo.jsx`

- [x] 4.1 Import `joinMultipleTVs` y `assignSourceToDestination`; reemplazar 29 fetch en `onSubmit` con `joinMultipleTVs(tvAssignments)`
- [x] 4.2 Reemplazar 8 fetch en `handleBtnDTV1..8` con `assignSourceToDestination(DTVn, "TVRACK")`
- [x] 4.3 Eliminar `const myInit`, hardcoded URL/token; cero `fetch()` directos

## Phase 5: Migrate `Audio.jsx` + `Canales.jsx`

- [x] 5.1 Audio: import `sendSerialCommand`; reemplazar 9 fetch en `onSubmit` con `sendSerialCommand(zone, value)` × 9; eliminar `myInit`
- [x] 5.2 Canales: import `loadChannelPreset`; reemplazar switch/case 8 ramas en `submitCanal` con `loadChannelPreset(index, channel)`; eliminar `myInit`
