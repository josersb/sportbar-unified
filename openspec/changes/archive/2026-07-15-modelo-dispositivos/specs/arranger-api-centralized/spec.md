# Delta for arranger-api-centralized

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Canales — submitCanal preset load
`submitCanal` MUST build dropdown from `channelControl`-capable devices only (DTV1-DTV6), then map selection to index for `loadChannelPreset(index, channel)`.
(Previously: dropdown showed all 8 decos — no capability filter)

#### Scenario: Channel assigned to any decoder
- GIVEN deco=`"DTV5"`, channel=1603
- WHEN `submitCanal` executes → maps DTV5 → index 5 → calls `loadChannelPreset(5, 1603)`

#### Scenario: Dropdown excludes non-IR devices
- GIVEN device registry loaded
- WHEN Canales renders deco selector
- THEN only `channelControl` devices appear (DTV1-DTV6)
- AND DTV7 (encoder) and DTV8 (streaming) excluded

### Requirement: MatrizVideo — onSubmit and DTV buttons
`onSubmit` MUST call `joinMultipleTVs` with computed TV assignments. DTV source buttons MUST be generated dynamically via `dispositivos.map()`, not 8 hardcoded `handleBtnDTV1..8` functions.
(Previously: 8 hardcoded handleBtnDTV1..8 functions)

#### Scenario: Form submit sends all assignments
- GIVEN user selects TV assignments and submits
- WHEN `onSubmit` executes → `joinMultipleTVs` called with all mappings

#### Scenario: Source buttons generated dynamically
- GIVEN `dispositivos.js` defines 8 devices
- WHEN MatrizVideo renders → all 8 DTV buttons generated via `map()`
- AND each button label = device's `connected` equipment name

### Requirement: Audio — onSubmit serial commands
`onSubmit` MUST filter audio sources by `audioSource` capability and call `sendSerialCommand` per Tesira zone.
(Previously: all devices appeared as audio sources — no capability filter)

#### Scenario: Audio zones updated
- GIVEN user sets muteNorte=true and submits
- WHEN `onSubmit` executes → calls `sendSerialCommand("DTV1","Mute1 set mute 1 true")`

#### Scenario: Audio sources filtered by capability
- GIVEN device registry loaded
- WHEN Audio renders source dropdown
- THEN only `audioSource`-capable devices appear

### Requirement: Test Coverage — 4 files updated
All 4 affected test files MUST reflect capability-based device model and pass.

#### Scenario: Canales test uses filtered devices
- GIVEN test renders Canales
- WHEN deco dropdown queried → contains exactly 6 options (DTV1-DTV6)

#### Scenario: MatrizVideo test uses dynamic list
- GIVEN test renders MatrizVideo
- WHEN DTV source buttons queried → match dynamic list from `dispositivos.js`
