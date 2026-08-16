# destinos-adicionales Specification

## Purpose
Registro de 10 decoders IPEX5002 como destinos de video enrutable en `estado.tvs`, con nombres Arranger para comandos `join av` e integración en MatrizVideo.

## Requirements

### Requirement: Build and Tests
Build MUST pass with zones removed from `estado.tvs` and mini-cards rendering independently. All 36-TV matrix behavior MUST remain intact.

(Previously: Build MUST pass with zones added to `estado.tvs`.)

#### Scenario: Build succeeds after zone migration
- GIVEN zones removed from `estado.tvs`, mini-cards added
- WHEN `pnpm run build` is executed
- THEN completes without errors, 36-TV matrix routing unchanged

#### Scenario: Matriz Preset load excludes zones
- GIVEN a preset is loaded with TV assignments
- WHEN `joinMultipleTVs` iterates `estado.tvs`
- THEN the 10 zone keys are NOT included in the batch command
