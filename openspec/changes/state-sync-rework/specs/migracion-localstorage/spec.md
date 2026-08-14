# Delta for migracion-localstorage

## ADDED Requirements

### Requirement: Migración de formato de preset

Los presets viejos (solo `tvs`) MUST migrarse al formato snapshot completo. `zonasFuera` y `tvrack` SHALL rellenarse con defaults seguros, conservando `tvs`.

#### Scenario: Preset legacy migrado

- GIVEN un preset legacy con solo `tvs`
- WHEN se carga
- THEN `tvs` se conserva y `zonasFuera`/`tvrack` se inicializan con defaults

### Requirement: Política fresh-start

Si el estado de matriz persistido (`state.json`) está envenenado/inválido, el broker MUST reconstruir el estado de matriz desde el Arranger físico. Los presets viejos MUST migrarse; el estado app-only MUST conservarse. No SHALL migrarse un estado de matriz envenenado.

#### Scenario: state.json envenenado reconstruido

- GIVEN `state.json` con defaults DTV1 incorrectos
- WHEN el broker arranca
- THEN reconstruye la matriz desde `get encoder`, migra presets y conserva app-only

#### Scenario: Preset sobrevive fresh-start

- GIVEN presets viejos en localStorage/server
- WHEN ocurre fresh-start
- THEN los presets migran y siguen funcionando
