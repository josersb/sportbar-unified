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
| `loadChannelPreset` | `preset load` | Decoder channel change (backup) |
| `sendIrCommand` | `send ir` | Send IR hex code to device |
| `sendChannelDigits` | `send ir` (multi) | Channel change via digit-by-digit IR |

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
`loadChannelPreset(deco, channel)` sends `preset load deco{deco}canal{channel}` and is kept as an active backup for rollback. Channel changes now primarily use `sendChannelDigits(deviceId, channel)` which sends IR codes digit-by-digit. The legacy function remains fully callable for fallback scenarios.
(Previously: `loadChannelPreset` was the sole channel-change mechanism)

#### Scenario: DTV1 tuned to channel 1603 (backup path)
- GIVEN `loadChannelPreset(1, 1603)` is called
- THEN command `preset load deco1canal1603` is sent (legacy, preserved for rollback)

#### Scenario: DTV1 tuned to channel 1603 (primary path)
- GIVEN `sendChannelDigits("DTV1", 1603)` is called
- THEN IR codes for digits 1, 6, 0, 3 are sent sequentially with 300ms delays

### Requirement: Error handling with per-command logging
Every exported function MUST catch errors and `console.error` which command failed, with format `[ArrangerAPI] Error enviando comando "<command>"`.

#### Scenario: Network failure logs specific command
- GIVEN Arranger unreachable
- WHEN `assignSourceToDestination("DTV1","TV01")` fails
- THEN logs `[ArrangerAPI] Error enviando comando "join av DTV1 TV01"`

### Requirement: getDeviceStatus — device capability detection
`arrangerApi.js` MUST export `getDeviceStatus(deviceId)` calling `get status {deviceId}` to parse active streams into capability flags.

#### Scenario: IR-capable device detected
- GIVEN Arranger responds with streams `VIDEO, IR` for DTV1
- WHEN `getDeviceStatus("DTV1")` called
- THEN returns `{videoSource:true, channelControl:true}`

#### Scenario: Encoder (no IR) detected
- GIVEN Arranger reports `VIDEO, AUDIO` only for DTV7
- WHEN `getDeviceStatus("DTV7")` called
- THEN returns `{videoSource:true, audioSource:true, channelControl:false}`

### Requirement: Test Coverage — capability-based model
All affected test files MUST reflect the capability-based device model and pass.

#### Scenario: Canales test uses filtered devices
- GIVEN test renders Canales
- WHEN deco dropdown queried → contains exactly 6 options (DTV1-DTV6)

#### Scenario: MatrizVideo test uses dynamic list
- GIVEN test renders MatrizVideo
- WHEN DTV source buttons queried → match dynamic list from `dispositivos.js`

### Requirement: IR Code Lookup Table
`src/data/irCodes.js` MUST export an immutable `IR_CODES` object mapping digits 0-9 to their Pronto hex code strings.

#### Scenario: All 10 digits have codes
- GIVEN the IR code lookup table is loaded
- WHEN any digit 0-9 is queried
- THEN a valid hex code string is returned

#### Scenario: Missing digit throws error
- GIVEN a digit has no IR code in the lookup table
- WHEN sendChannelDigits processes that digit
- THEN an error is thrown with message indicating which digit is missing

### Requirement: Dynamic IR Channel Change — sendChannelDigits
`sendChannelDigits(deviceId, channel)` MUST decompose the channel number into individual digits, look up each digit's hex code in `IR_CODES`, validate capability gating, and call `sendIrCommand` for each digit sequentially with a 300ms delay between calls.

#### Scenario: Four-digit channel (1603) sent correctly
- GIVEN deviceId="DTV5", channel=1603
- WHEN sendChannelDigits is called
- THEN sendIrCommand called 4 times for digits 1, 6, 0, 3 with 300ms delays

#### Scenario: Three-digit channel (100) sent correctly
- GIVEN deviceId="DTV1", channel=100
- WHEN sendChannelDigits is called
- THEN sendIrCommand called for digits 1, 0, 0 with 300ms delays

### Requirement: Dynamic IR Sending — sendIrCommand
`sendIrCommand(deviceId, hexCode)` MUST send a `send ir {deviceId} "{hexCode}"` command to the Arranger via `sendArrangerCommand`.

#### Scenario: IR command sent
- GIVEN deviceId="DTV5", hexCode="0000 006C ..."
- WHEN sendIrCommand is called
- THEN sends `send ir DTV5 "0000 006C ..."` to Arranger

### Requirement: Capability-Gated IR Validation
`sendChannelDigits` MUST validate that the target device has `channelControl` capability before sending any IR command. Devices without `channelControl` MUST be rejected with an error.

#### Scenario: DTV7 rejected (no channelControl)
- GIVEN DTV7 has channelControl: false
- WHEN sendChannelDigits("DTV7", 1603) is called
- THEN throws before sending any IR command

#### Scenario: DTV1 passes gate
- GIVEN DTV1 has channelControl: true
- WHEN sendChannelDigits("DTV1", 1603) is called
- THEN IR commands are sent normally

## MODIFIED Requirements

### Requirement: MatrizPreset — handleCargaMatriz
`handleCargaMatriz` MUST call `joinMultipleTVs(mappings)` where mappings are built from `estado.tvs` (VWN..TV26), replacing 29 inline `fetch()`.
(Previously: 29 sequential fetch calls with hardcoded URL and local `myInit`)

#### Scenario: Preset loaded triggers batch assignment
- GIVEN `handlePreset1` is triggered
- WHEN `handleCargaMatriz` executes
- THEN `joinMultipleTVs` called once with 29 entries — zero inline `fetch()`

### Requirement: MatrizVideo — onSubmit and DTV buttons
`onSubmit` MUST call `joinMultipleTVs` with computed TV assignments. DTV source buttons MUST be generated dynamically via `dispositivos.map()`, not 8 hardcoded `handleBtnDTV1..8` functions.
(Previously: 8 hardcoded handleBtnDTV1..8 functions + 37 inline fetch calls with manual URL)

#### Scenario: Form submit sends all assignments
- GIVEN user selects `TvsBarraNorte=DTV1234` and submits
- WHEN `onSubmit` executes → `joinMultipleTVs` called with all 29 mappings

#### Scenario: Source buttons generated dynamically
- GIVEN `dispositivos.js` defines 8 devices
- WHEN MatrizVideo renders → all 8 DTV buttons generated via `map()`
- AND each button label = device's `connected` equipment name

### Requirement: Audio — onSubmit serial commands
`onSubmit` MUST filter audio sources by `audioSource` capability and call `sendSerialCommand` for each Tesira zone (mute, level, source) instead of 9 inline fetch calls.
(Previously: all devices appeared as audio sources — no capability filter; 9 inline fetch calls)

#### Scenario: Audio zones updated
- GIVEN user sets muteNorte=true and submits
- WHEN `onSubmit` executes → calls `sendSerialCommand("DTV1","Mute1 set mute 1 true")`

#### Scenario: Audio sources filtered by capability
- GIVEN device registry loaded
- WHEN Audio renders source dropdown
- THEN only `audioSource`-capable devices appear

### Requirement: Canales — submitCanal channel change
`submitCanal` MUST build dropdown from `channelControl`-capable devices only (DTV1-DTV6), then call `sendChannelDigits(selectedDeco, canal)` with the selected device ID and channel number. `loadChannelPreset` remains importable as a backup.
(Previously: called `loadChannelPreset(decoNumber, canal)` with mapped numeric index via `parseInt`)

#### Scenario: Channel assigned to any decoder
- GIVEN deco=`"DTV5"`, channel=1603
- WHEN `submitCanal` executes
- THEN `sendChannelDigits("DTV5", 1603)` is called, sending digits 1, 6, 0, 3 with 300ms delays

#### Scenario: Dropdown excludes non-IR devices
- GIVEN device registry loaded
- WHEN Canales renders deco selector
- THEN only `channelControl` devices appear (DTV1-DTV6)
- AND DTV7 (encoder) and DTV8 (streaming) excluded

## REMOVED Requirements

### Requirement: Inline myInit definitions
(Reason: Duplicated across 4 components — `arrangerApi.js` handles `method/mode/cache` internally)
(Migration: Delete `const myInit = {...}` from MatrizPreset line 19, MatrizVideo line 14, Audio line 50, Canales line 38)

### Requirement: Hardcoded IP `192.168.2.254` and token `TOKEN_REMOVED` in components
(Reason: Single source of truth now in `arrangerApi.js` env-config block)
(Migration: Components import functions instead of constructing URLs — no consumer action needed)

## ADDED Requirements

### Requirement: Zonas Fuera API Functions
`src/api/arrangerApi.js` MUST export 4 functions for zone control. Video/audio functions SHALL use `join video`/`join audio` (existing TVRACK command pattern). All SHALL log errors per existing convention.

| Export | Endpoint | Arranger Command |
|--------|----------|-----------------|
| `fetchZonasFueraState()` | GET `/api/zonas-fuera/state` | — |
| `setZonasFueraVideo(id, source)` | POST `/api/zonas-fuera/:id/video` | `join video {source} {id}` |
| `setZonasFueraAudio(id, source)` | POST `/api/zonas-fuera/:id/audio` | `join audio {source} {id}` |
| `setZonasFueraLink(id, value)` | POST `/api/zonas-fuera/:id/link` | — |

#### Scenario: Set video triggers join video
- GIVEN `setZonasFueraVideo("aVip-Barra-Centro", "DTV3")` called
- WHEN server processes request
- THEN Arranger receives `join video DTV3 aVip-Barra-Centro`, updated state returned

#### Scenario: Set link updates state only
- GIVEN `setZonasFueraLink("aVip-Bar-Boveda", false)` called
- WHEN server processes request
- THEN link toggles to false in lowdb, NO Arranger command sent

#### Scenario: Error logs per convention
- GIVEN Arranger unreachable
- WHEN any function fails
- THEN logs `[ArrangerAPI] Error enviando comando "join video/audio ..."`
