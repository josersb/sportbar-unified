# Delta for migracion-localstorage

## ADDED Requirements

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
