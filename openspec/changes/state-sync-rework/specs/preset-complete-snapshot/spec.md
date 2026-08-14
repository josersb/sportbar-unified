# preset-complete-snapshot Specification

## Purpose

Los presets dejan de guardar solo `tvs` y pasan a ser snapshot completo del estado: `tvs` + `zonasFuera` + `tvrack`, con migración del formato viejo y restauración integral.

## Requirements

### Requirement: Snapshot completo

Cada preset MUST persistir `{ tvs, zonasFuera, tvrack }` como snapshot completo. La restauración MUST reconstruir los tres dominios.

#### Scenario: Preset guarda los 3 dominios

- GIVEN el usuario guarda Preset 1 con cambios en tvs, zonasFuera y tvrack
- WHEN se lee el preset
- THEN contiene los 3 dominios con sus valores

#### Scenario: Preset restaura los 3 dominios

- GIVEN un preset con tvs+zonasFuera+tvrack guardados
- WHEN se aplica el preset
- THEN tvs, zonasFuera y tvrack se restauran al estado guardado

### Requirement: Migración de formato viejo

Los presets viejos (solo `tvs`) MUST migrarse al cargar: `zonasFuera` y `tvrack` se rellenan con defaults seguros sin perder `tvs`.

#### Scenario: Preset viejo migrado

- GIVEN un preset legacy con solo `tvs`
- WHEN se carga
- THEN `tvs` se conserva y `zonasFuera`/`tvrack` se inicializan con defaults

### Requirement: TVRACK incluido en snapshot

El dominio `tvrack` MUST incluirse en el snapshot y persistir sus cambios al server (fix bug (e)). Un cambio de tvrack MUST no reaparecer como diff.

#### Scenario: Cambio de tvrack no reaparece

- GIVEN el usuario cambia video de TVRACK
- WHEN el broker persiste el cambio
- THEN una reconciliación posterior no reporta el mismo diff de tvrack
