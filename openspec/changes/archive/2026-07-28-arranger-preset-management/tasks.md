# Tasks: Arranger Preset Management API

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80 lines (20 API + 60 tests) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | Not needed — well under 400-line budget |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: API Implementation

- [x] 1.1 `addPreset(name, command)` — wrap `preset add {encodeURIComponent(name)} {encodeURIComponent(command)}` via `sendArrangerCommand` in `src/api/arrangerApi.js`, after line 174 (`loadMatrixPreset`)
- [x] 1.2 `deletePreset(name)` — wrap `preset delete {encodeURIComponent(name)}` via `sendArrangerCommand`, after `addPreset`
- [x] 1.3 `getPresets()` — wrap `get presets` (no args) via `sendArrangerCommand`, after `deletePreset`

## Phase 2: Tests

- [x] 2.1 `addPreset` suite — verify URL includes `preset%20add`, `encodeURIComponent` on name and multi-word command; verify error throws on "Error:" body; verify `sendArrangerCommand` called once (`src/api/arrangerApi.test.js`)
- [x] 2.2 `deletePreset` suite — verify URL includes `preset%20delete`, name encoded; verify error throws on "not found" body
- [x] 2.3 `getPresets` suite — verify URL ends with `get%20presets`, response passthrough; verify timeout error on AbortError

## Phase 3: Verification

- [x] 3.1 Run `pnpm test` — all new suites pass, no existing test regressions
- [ ] 3.2 Manual smoke: `addPreset("test", "join av DTV1 TV01")` → check Arranger UI for new preset (cleanup task — hardware-dependent, can't run in CI)
