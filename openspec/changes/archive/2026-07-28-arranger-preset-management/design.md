# Design: Arranger Preset Management API

## Technical Approach

Add three thin wrappers to `src/api/arrangerApi.js` following the existing `sendArrangerCommand()` pattern used by `loadMatrixPreset`, `loadChannelPreset`, and `getDevices`. Each function constructs a command string and delegates transport entirely to `sendArrangerCommand()`. No new dependencies, no new files, no data structures.

## Architecture Decisions

| Decision | Option | Tradeoff | Verdict |
|----------|--------|----------|---------|
| Escaping strategy for `preset add` | `encodeURIComponent` on full command arg | vs manual regex: simpler, RFC 3986 compliant, handles all edge cases (parens, quotes, newlines) | `encodeURIComponent` |
| Name escaping for `deletePreset` | `encodeURIComponent` on name | vs plain interpolation: name may contain spaces (`"futbol domingo"`) | `encodeURIComponent(name)` |
| `getPresets` signature | zero-arg `() => Promise<Response>` | vs `() => Promise<string[]>` parse: keep raw response — parsing is caller's concern | raw `Promise<Response>` |
| Insertion point in file | Before TVRACK section (line 253) | After existing Arranger commands (line 234), near `loadMatrixPreset` (line 172) | Bottom of Arranger block |

## Data Flow

```
addPreset(name, cmd)  →  "preset add {name} {encodeURIComponent(cmd)}"
deletePreset(name)    →  "preset delete {encodeURIComponent(name)}"
getPresets()          →  "get presets"
                              │
                              ▼
                    sendArrangerCommand(command)
                              │
                              ▼
                 GET /api/command/{encoded}/{token}
                              │
                              ▼
                        Arranger IPEXCB
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/api/arrangerApi.js` | Modify | Add 3 exports after `loadMatrixPreset` (line 174), before TVRACK section: `addPreset`, `deletePreset`, `getPresets`. ~20 lines. |
| `src/api/arrangerApi.test.js` | Modify | Add 3 `describe` blocks with ~8 `it` cases total. Mock `globalThis.fetch` via `vi.fn()`. ~60 lines. |

## Implementation — Pseudocode

```js
// addPreset — encodeURIComponent on BOTH args to handle spaces/quotes/newlines
export async function addPreset(name, command) {
  return sendArrangerCommand(
    `preset add ${encodeURIComponent(name)} ${encodeURIComponent(command)}`
  );
}

// deletePreset — only name needs encoding (no command body)
export async function deletePreset(name) {
  return sendArrangerCommand(
    `preset delete ${encodeURIComponent(name)}`
  );
}

// getPresets — no args, simplest wrapper
export async function getPresets() {
  return sendArrangerCommand("get presets");
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | URL construction per function | Mock `fetch`, inspect called URL via `fetch.mock.calls[0][0]` |
| Unit | Success response passthrough | Mock `fetch` resolves with "OK", verify returned response |
| Unit | Error propagation | Mock `fetch` resolves with "Error: ..." body, expect throw |
| Unit | `preset add` escaping | Verify newlines, quotes, parens are percent-encoded in URL |

Mock setup matches existing test pattern: `import { vi } from "vitest"`, mock `globalThis.fetch`, import `isomorphic-fetch`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Three new exports — zero callers at ship time. Existing exports unchanged.

## Open Questions

None.
