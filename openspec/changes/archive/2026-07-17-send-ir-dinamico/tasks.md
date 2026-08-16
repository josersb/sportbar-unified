# Tasks: Envío IR Dinámico para Cambio de Canales

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100-130 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Foundation

- [x] 1.1 Create `src/data/irCodes.js` exporting `const IR_CODES` with hex codes for digits 0-9

## Phase 2: Core API

- [x] 2.1 Add `sendIrCommand(deviceId, hexCode)` to `src/api/arrangerApi.js` calling `sendArrangerCommand`
- [x] 2.2 Add `sendChannelDigits(deviceId, channel)` with 300ms delay loop, lookup in `IR_CODES`, and capability gate via `getDeviceList`
- [ ] 2.3 SKIPPED — `loadChannelPreset` kept as active backup per user request (NOT deprecated)

## Phase 3: Component Wiring

- [x] 3.1 Update `src/componentes/Canales.jsx` — import `sendChannelDigits`, replace `loadChannelPreset` call in `submitCanal`, pass `selectedDeco` directly (no `parseInt`)

## Phase 4: Testing

- [x] 4.1 Add tests to `src/api/arrangerApi.test.js`: `sendIrCommand` URL assertion, `sendChannelDigits` 4-call sequence with 300ms gaps (fake timers), missing digit throws
- [x] 4.2 Update `src/componentes/Canales.test.jsx`: mock `sendChannelDigits`, assert call with `(selectedDeco, canal)`, remove `parseInt` assertions, add error-placeholder test
