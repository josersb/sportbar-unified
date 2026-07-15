# Delta for arranger-api-centralized

## ADDED Requirements

### Requirement: Centralized Arranger API module
`src/api/arrangerApi.js` MUST expose all Arranger commands as named functions. No component shall construct URLs or tokens.

| Export | Command | Purpose |
|--------|---------|---------|
| `sendArrangerCommand` | generic | Base HTTP GET sender |
| `assignSourceToDestination` | `join av` | Single TV assignment |
| `joinMultipleTVs` | `join av` batch | Array `{source,dest}` sequential |
| `sendSerialCommand` | `send serial` | Tesira audio with `\x0A` |
| `loadChannelPreset` | `preset load` | Decoder channel change |

#### Scenario: Component imports only functions
- GIVEN `arrangerApi.js` exports `joinMultipleTVs`
- WHEN `MatrizPreset.jsx` does `import { joinMultipleTVs } from "../api/arrangerApi"`
- THEN the function is callable — no inline URL, token, or `myInit` present

### Requirement: Environment-based configuration
`VITE_ARRANGER_API_BASE` and `VITE_ARRANGER_TOKEN` MUST be read from env with fallback to defaults (`http://192.168.2.254/api/command`, `TOKEN_REMOVED`).

#### Scenario: Custom env overrides default IP
- GIVEN `.env` defines `VITE_ARRANGER_API_BASE=http://10.0.0.50/api/command`
- WHEN `sendArrangerCommand("status")` is called
- THEN request targets `http://10.0.0.50/api/command/status/{token}`

### Requirement: Batch TV mapping — joinMultipleTVs
`joinMultipleTVs(mappings)` MUST accept `[{source, dest}]`, execute `join av` sequentially via `for...of` (preserving order), and log each command.

#### Scenario: 29 TVs assigned at once
- GIVEN 29 `{source, dest}` mappings from preset state
- WHEN `joinMultipleTVs(mappings)` is called
- THEN 29 `join av` commands are sent sequentially

#### Scenario: Empty array is no-op
- GIVEN `joinMultipleTVs([])` is called
- THEN zero commands sent, no error

### Requirement: Serial commands — sendSerialCommand
`sendSerialCommand(device, payload)` MUST URL-encode `payload` with `%5Cx0A` terminator appended.

#### Scenario: Tesira mute command sent
- GIVEN device=`"DTV1"`, payload=`"Mute1 set mute 1 true"`
- WHEN called → URL contains `send%20serial%20DTV1%20%22Mute1%20set%20mute%201%20true%5Cx0A%22`

### Requirement: Channel preset — loadChannelPreset
`loadChannelPreset(deco, channel)` MUST send `preset load deco{deco}canal{channel}`.

#### Scenario: DTV1 tuned to channel 1603
- GIVEN `loadChannelPreset(1, 1603)` is called
- THEN command `preset load deco1canal1603` is sent

### Requirement: Error handling with per-command logging
Every exported function MUST catch errors and `console.error` which command failed, with format `[ArrangerAPI] Error enviando comando "<command>"`.

#### Scenario: Network failure logs specific command
- GIVEN Arranger unreachable
- WHEN `assignSourceToDestination("DTV1","TV01")` fails
- THEN logs `[ArrangerAPI] Error enviando comando "join av DTV1 TV01"`

## MODIFIED Requirements

### Requirement: MatrizPreset — handleCargaMatriz
`handleCargaMatriz` MUST call `joinMultipleTVs(mappings)` where mappings are built from `estado.tvs` (VWN..TV26), replacing 29 inline `fetch()`.
(Previously: 29 sequential fetch calls with hardcoded URL and local `myInit`)

#### Scenario: Preset loaded triggers batch assignment
- GIVEN `handlePreset1` is triggered
- WHEN `handleCargaMatriz` executes
- THEN `joinMultipleTVs` called once with 29 entries — zero inline `fetch()`

### Requirement: MatrizVideo — onSubmit and DTV buttons
`onSubmit` MUST call `joinMultipleTVs` with computed TV assignments. `handleBtnDTV1..8` MUST call `assignSourceToDestination(DTVn, "TVRACK")`.
(Previously: 37 inline fetch calls with manual URL, plus inline `myInit`)

#### Scenario: Form submit sends all assignments
- GIVEN user selects `TvsBarraNorte=DTV1234` and submits
- WHEN `onSubmit` executes → `joinMultipleTVs` called with all 29 mappings

#### Scenario: DTV button sends single assignment
- GIVEN user clicks "DTV 3" button
- WHEN `handleBtnDTV3` executes → calls `assignSourceToDestination("DTV3","TVRACK")`

### Requirement: Audio — onSubmit serial commands
`onSubmit` MUST call `sendSerialCommand` for each Tesira zone (mute, level, source) instead of 9 inline fetch calls.
(Previously: 9 inline fetch with manual URL encoding of mute/level/source values)

#### Scenario: Audio zones updated
- GIVEN user sets muteNorte=true and submits
- WHEN `onSubmit` executes → calls `sendSerialCommand("DTV1","Mute1 set mute 1 true")`

### Requirement: Canales — submitCanal preset load
`submitCanal` MUST map selected deco to index and call `loadChannelPreset(index, channel)` instead of switch/case with 8 fetch branches.
(Previously: switch/case with 8 hardcoded preset-load URLs)

#### Scenario: Channel assigned to any decoder
- GIVEN deco=`"DTV5"`, channel=1603
- WHEN `submitCanal` executes → maps DTV5 → index 5 → calls `loadChannelPreset(5, 1603)`

## REMOVED Requirements

### Requirement: Inline myInit definitions
(Reason: Duplicated across 4 components — `arrangerApi.js` handles `method/mode/cache` internally)
(Migration: Delete `const myInit = {...}` from MatrizPreset line 19, MatrizVideo line 14, Audio line 50, Canales line 38)

### Requirement: Hardcoded IP `192.168.2.254` and token `TOKEN_REMOVED` in components
(Reason: Single source of truth now in `arrangerApi.js` env-config block)
(Migration: Components import functions instead of constructing URLs — no consumer action needed)
