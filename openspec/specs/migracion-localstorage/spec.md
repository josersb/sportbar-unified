# migracion-localstorage Specification

## Purpose
Versioned localStorage with automatic migration from old `estado.decos[]` array format to new device registry model, preserving all user data (channels, presets, audio, TV mappings).

## Requirements

### Requirement: Versioned Migration v0→v1
`App.jsx` MUST run `migrarEstado()` when `estadoApp_version` is missing or `0`, converting `estado.decos[]` to `estado.dispositivos{}` registry format. Migration MUST set `estadoApp_version: 1`.

#### Scenario: First load with old format (v0)
- GIVEN localStorage has `estadoApp` with `decos[]` and no `estadoApp_version`
- WHEN app loads → `migrarEstado()` converts to new format
- AND sets `estadoApp_version: 1`
- AND preserves channel assignments, TV mappings, audio, presets

#### Scenario: Current format — no migration
- GIVEN localStorage has `estadoApp_version: 1`
- WHEN app loads → no migration, state loads normally

#### Scenario: Migration failure — graceful degradation
- GIVEN localStorage data corrupted
- WHEN migration fails → falls back to `estadoInicial` defaults
- AND logs warning to console (no crash)

### Requirement: Preset Backward Compatibility
All 5 saved presets (`estadoApp_Preset1..5`) MUST continue working after migration without user reconfiguration.

#### Scenario: Preset 1 survives migration
- GIVEN user saved Preset 1 with TV-to-deco assignments
- WHEN migration runs → Preset 1 preserves TV mappings, volumes, mute states
- AND only `decos` portion restructured to new `dispositivos` format

### Requirement: Preset Compatibility with New Destinations
Existing presets and localStorage data MUST continue to work after adding new destination keys. Presets saved before this change SHALL load without breaking.

#### Scenario: Old preset loads without new destinations
- GIVEN a preset saved before this change (estado.tvs without new IPEX5002 keys)
- WHEN the preset is loaded
- THEN existing TV/VW/Audio assignments are preserved
- AND new destination keys default to DTV1

#### Scenario: New preset roundtrips correctly
- GIVEN user assigns DTV3 to a-QMR75-Menos1-TV1 and saves a preset
- WHEN the preset is loaded
- THEN a-QMR75-Menos1-TV1 is restored to DTV3
