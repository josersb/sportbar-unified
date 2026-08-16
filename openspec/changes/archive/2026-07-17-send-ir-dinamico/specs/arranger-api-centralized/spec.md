# Delta for arranger-api-centralized

## ADDED Requirements

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

### Requirement: Channel preset — loadChannelPreset
`loadChannelPreset` is now `@deprecated`. Channel changes MUST use `sendChannelDigits(deviceId, channel)` which sends IR codes digit-by-digit instead of relying on pre-recorded Arranger presets. The legacy function remains callable for rollback.
(Previously: `loadChannelPreset(deco, channel)` was the primary channel-change mechanism, sending `preset load deco{deco}canal{channel}`)

#### Scenario: DTV1 tuned to channel 1603 (deprecated path)
- GIVEN `loadChannelPreset(1, 1603)` is called
- THEN command `preset load deco1canal1603` is sent (legacy, preserved for rollback)

### Requirement: Canales — submitCanal preset load
`submitCanal` MUST call `sendChannelDigits(selectedDeco, canal)` instead of `loadChannelPreset(decoNumber, canal)`. The dropdown continues to filter by `channelControl` capability (DTV1-DTV6 only).
(Previously: called `loadChannelPreset(decoNumber, canal)` with mapped numeric index)

#### Scenario: Channel assigned to any decoder
- GIVEN deco=`"DTV5"`, channel=1603
- WHEN `submitCanal` executes
- THEN `sendChannelDigits("DTV5", 1603)` called, sending digits 1, 6, 0, 3 with 300ms delays

#### Scenario: Dropdown excludes non-IR devices
- GIVEN device registry loaded
- WHEN Canales renders deco selector
- THEN only `channelControl` devices appear (DTV1-DTV6)
- AND DTV7 (encoder) and DTV8 (streaming) excluded
