# destinos-adicionales Specification

## Purpose
Registro de 10 decoders IPEX5002 como destinos de video enrutable en `estado.tvs`, con nombres Arranger para comandos `join av` e integración en MatrizVideo.

## Requirements

### Requirement: Additional Destinations in Model
The system MUST include 10 IPEX5002 decoders as video destinations in `estado.tvs` with Arranger API names. Each destination MUST default to DTV1.

| Key (Arranger) | Display Label |
|---|---|
| `aVip-Barra-Centro` | VIP Barra Centro |
| `aVip-Lobby-Batacazo` | VIP Lobby Batacazo |
| `a-Menos1-Escenario` | Escenario -1 |
| `a-QMR75-Menos1-TV1` | QMR75 -1 TV1 |
| `aVip-Bar-Boveda` | VIP Bar Bóveda |
| `aMas-15-Barra` | +15 Barra |
| `a-QMR75-Menos1-TV2` | QMR75 -1 TV2 |
| `a-Menos1-Escenario2` | Escenario -1 (2) |
| `a-QMC65-Menos1-TV2` | QMC65 -1 TV2 |
| `RACK-VIP-PANTALLABATACA` | Rack VIP Bataca |

#### Scenario: New destinations appear in routing UI
- GIVEN the app loads with the updated device model
- WHEN MatrizVideo renders
- THEN all 10 new destinations appear with individual source selectors in section "Zonas Adicionales"

#### Scenario: join av uses correct Arranger name
- GIVEN user selects DTV1 as source for aVip-Barra-Centro
- WHEN Enviar is clicked
- THEN the command `join av DTV1 aVip-Barra-Centro` is sent to the Arranger

#### Scenario: Default source on clean state
- GIVEN estado.tvs initialized with new destinations
- WHEN no prior assignment exists
- THEN each new destination defaults to DTV1

#### Scenario: joinMultipleTVs automatically includes new destinations
- GIVEN estado.tvs has original + new keys
- WHEN joinMultipleTVs() iterates
- THEN new destinations are included without code changes

### Requirement: Build and Tests
Build MUST pass and all existing behavior MUST remain intact.

#### Scenario: Build succeeds
- GIVEN the changes are applied to Contexto.jsx and MatrizVideo.jsx
- WHEN pnpm run build is executed
- THEN it completes without errors
