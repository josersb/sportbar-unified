# Delta for arranger-api-centralized

## ADDED Requirements

### Requirement: Preset creation — addPreset
`addPreset(name, command)` MUST send `preset add {name} {command}` to the Arranger via `sendArrangerCommand`. Both arguments SHALL be `encodeURIComponent`-escaped to handle spaces, quotes, and parentheses in multi-step preset commands.

| Export | Command | Arguments | Escaping |
|--------|---------|-----------|----------|
| `addPreset` | `preset add` | `(name, command)` | `encodeURIComponent` on both |

#### Scenario: Preset created with multi-word command
- GIVEN `addPreset("futbol-domingo", "join av DTV1 TV01\njoin av DTV2 TV02")` is called
- WHEN the URL is constructed
- THEN it matches `/api/command/preset%20add%20futbol-domingo%20join%20av%20DTV1%20TV01%0Ajoin%20av%20DTV2%20TV02/{token}`
- AND `sendArrangerCommand` is invoked once

#### Scenario: Error on Arranger rejection
- GIVEN Arranger responds with "Error: preset already exists"
- WHEN `addPreset` is called
- THEN `sendArrangerCommand` throws with message containing "Arranger rechazó el comando"

### Requirement: Preset deletion — deletePreset
`deletePreset(name)` MUST send `preset delete {name}` to the Arranger via `sendArrangerCommand`. The name argument SHALL be `encodeURIComponent`-escaped.

| Export | Command | Arguments | Escaping |
|--------|---------|-----------|----------|
| `deletePreset` | `preset delete` | `(name)` | `encodeURIComponent` on name |

#### Scenario: Existing preset deleted
- GIVEN `deletePreset("futbol-domingo")` is called
- WHEN the URL is constructed
- THEN it matches `/api/command/preset%20delete%20futbol-domingo/{token}`
- AND `sendArrangerCommand` is invoked once

#### Scenario: Deleting non-existent preset
- GIVEN Arranger responds with "not found"
- WHEN `deletePreset("inexistente")` is called
- THEN `sendArrangerCommand` throws with message containing "not found"

### Requirement: Preset listing — getPresets
`getPresets()` MUST send `get presets` (no arguments) to the Arranger via `sendArrangerCommand` and return the response. No argument escaping is needed.

| Export | Command | Arguments |
|--------|---------|-----------|
| `getPresets` | `get presets` | none |

#### Scenario: Presets retrieved successfully
- GIVEN Arranger has presets defined
- WHEN `getPresets()` is called
- THEN it sends `get presets` as the command string
- AND returns the fetch response

#### Scenario: Arranger unreachable
- GIVEN Arranger is offline
- WHEN `getPresets()` is called
- THEN `sendArrangerCommand` throws a timeout or network error

### Requirement: Preset management test coverage
`src/api/arrangerApi.test.js` MUST include test suites for all 3 new functions using `vi.fn()` mock on `globalThis.fetch`. Each suite SHALL cover URL construction, success response, and error response.

#### Scenario: addPreset URL is correctly constructed
- GIVEN mocked fetch resolves with "OK"
- WHEN `addPreset("test", "join av DTV1 TV01")` is called
- THEN fetch was called with URL matching `/api/command/preset%20add%20test%20join%20av%20DTV1%20TV01/{token}`

#### Scenario: getPresets returns response body
- GIVEN mocked fetch resolves with "Preset1\nPreset2"
- WHEN `getPresets()` is called and response text is read
- THEN the text equals "Preset1\nPreset2"
