# Proposal: Arranger Preset Management API

## Intent

Enable SportBar to create, delete, and list presets on the Arranger IPEXCB controller via the centralized API module. Currently, the project exposes `preset load` (two variants) but not the management commands (`preset add`, `preset delete`, `get presets`). Operators must SSH into the Arranger to manage presets — adding friction and requiring network-level access.

## Scope

### In Scope
- `addPreset(name, command)` — wraps `preset add <name> <command>` with URL-safe escaping for multi-word commands
- `deletePreset(name)` — wraps `preset delete <name>`
- `getPresets()` — wraps `get presets` (no arguments)
- Unit tests for all 3 functions (`src/api/arrangerApi.test.js`)

### Out of Scope
- UI for preset management (no React components)
- Integration with `MatrizPreset.jsx` or localStorage preset system
- Preset content validation or auditing
- Bulk preset operations

## Capabilities

### New Capabilities
None — this extends an existing module.

### Modified Capabilities
- `arranger-api-centralized`: 3 new exports added to `src/api/arrangerApi.js`:
  - `addPreset` — create a named preset with a multi-command body
  - `deletePreset` — remove a preset by name
  - `getPresets` — list all presets on the Arranger

## Approach

Follow the existing wrapper pattern: each function calls `sendArrangerCommand()` with the constructed command string. `preset add` requires `encodeURIComponent()` on the command argument (which may contain spaces, quotes, or parentheses). `get presets` and `preset delete` use plain string interpolation — no escaping needed.

Tests mock `globalThis.fetch` with `vi.fn()`, verifying:
- Correct URL construction (command path, token)
- Response handling (success body check, error detection)
- `preset add` properly encodes complex commands

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/api/arrangerApi.js` | Modified | 3 new exports added (bottom of file, before TVRACK section) |
| `src/api/arrangerApi.test.js` | Modified | 3 test suites: addPreset, deletePreset, getPresets |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `preset add` command escaping breaks on unicode/parens | Low | `encodeURIComponent` handles RFC 3986; test with multi-word, quoted, and parenthesized commands |
| Arranger rejects malformed preset names | Low | `encodeURIComponent(name)` on the name portion too; test with names containing spaces |
| Test mocks not aligned with isomorphic-fetch pattern | Low | Mirror existing test setup exactly — mock `fetch` from `isomorphic-fetch` |

## Rollback Plan

Delete the 3 exported functions from `arrangerApi.js` and their corresponding test blocks. No database, migration, or UI side effects — pure API additions. Revert commit.

## Dependencies

None. Uses existing `sendArrangerCommand()`, `ARRANGER_BASE_URL`, and `ARRANGER_TOKEN`.

## Success Criteria

- [ ] `addPreset("futbol", "join av DTV1 TV01")` constructs URL `/api/command/preset%20add%20futbol%20join%20av%20DTV1%20TV01/{token}`
- [ ] `deletePreset("futbol")` sends `preset delete futbol` and handles success/error
- [ ] `getPresets()` sends `get presets` and returns response
- [ ] All 3 test suites pass with proper mocking
