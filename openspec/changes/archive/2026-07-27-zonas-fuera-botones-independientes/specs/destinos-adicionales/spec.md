# Delta for destinos-adicionales

## REMOVED Requirements

### Requirement: Additional Destinations in Model
(Reason: 10 IPEX5002 zones removed from `estado.tvs` and `<select>` rendering. Replaced by `zonas-fuera-state` full spec with independent mini-cards.)
(Migration: Delete 10 zone keys from `estado.tvs` in `Contexto.jsx`. Remove `<select>` rendering from MatrizVideo Zonas Adicionales section. Zones now loaded from lowdb via `zonasFueraState`.)

## MODIFIED Requirements

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
