# zonas-fuera-state Specification

## Purpose
Estado independiente para 10 zonas externas con separación video/audio/link, persistido en lowdb y sincronizado vía SSE (broker) con escrituras write-through confirmadas. No comparte `estado.tvs` ni el ciclo del botón Enviar.

## Requirements

### Requirement: Zone State Structure
The system MUST maintain `zonasFueraState` keyed by Arranger zone name. Each entry SHALL have `{ video, audio, link, lastUpdated }`. Video and audio MUST accept DTV source strings. Link MUST be boolean.

| Key | Default Video | Default Audio | Default Link |
|-----|---------------|---------------|-------------|
| aVip-Barra-Centro | DTV1 | DTV1 | true |
| aVip-Lobby-Batacazo | DTV1 | DTV1 | true |
| aVip-Bar-Boveda | DTV1 | DTV1 | true |
| RACK-VIP-PANTALLABATACA | DTV1 | DTV1 | true |
| aMas-15-Barra | DTV1 | DTV1 | true |
| a-Menos1-Escenario | DTV1 | DTV1 | true |
| a-Menos1-Escenario2 | DTV1 | DTV1 | true |
| a-QMR75-Menos1-TV1 | DTV1 | DTV1 | true |
| a-QMR75-Menos1-TV2 | DTV1 | DTV1 | true |
| a-QMC65-Menos1-TV2 | DTV1 | DTV1 | true |

#### Scenario: State loaded from lowdb
- GIVEN `state.json` has `zonasFuera` key
- WHEN Express server starts
- THEN all 10 zones loaded with video/audio/link/lastUpdated

#### Scenario: Default on missing key
- GIVEN `zonasFuera` absent from `state.json`
- WHEN server starts
- THEN all 10 zones default to `{ video: "DTV1", audio: "DTV1", link: true, lastUpdated: now }`

### Requirement: LowDB Persistence
`zonasFueraState` MUST persist to lowdb `state.json` under key `zonasFuera` and survive server restarts.

#### Scenario: State survives restart
- GIVEN zone video set to "DTV3"
- WHEN Express restarts
- THEN GET `/api/zonas-fuera/state` returns `{ video: "DTV3" }` for that zone

### Requirement: Zonas-fuera vía SSE

Los cambios en `zonasFuera` MUST emitirse como eventos incrementales SSE. El snapshot inicial SHALL incluir `zonasFuera`.

#### Scenario: Cambio propagado por SSE

- GIVEN PC-A cambia una zona-fuera
- WHEN el broker confirma la escritura
- THEN PC-B recibe el evento SSE y actualiza la zona sin polling

### Requirement: Zonas-fuera en presets

`zonasFuera` MUST incluirse en el snapshot de presets (ver `preset-complete-snapshot`). La restauración de un preset SHALL restaurar también las zonas-fuera.

#### Scenario: Preset restaura zonas-fuera

- GIVEN un preset guardado con zonasFuera configuradas
- WHEN se aplica el preset
- THEN las zonas-fuera se restauran al estado guardado

### Requirement: REST API Endpoints

Express MUST exponer endpoints write-through con `await`: el POST SHALL confirmar la escritura al Arranger (o persistir) y responder con el estado confirmado, no fire-and-forget. Para `link=false`, video y audio MUST usar su join independiente; para `link=true`, cualquiera de los dos MUST usar un único `join av` y confirmar ambos streams. El toggle de link MUST no hacer re-join.
(Previously: los endpoints documentaban `join video`/`join audio` sin expresar la política link ni la confirmación combinada.)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/zonas-fuera/state` | Return full `zonasFueraState` |
| POST | `/api/zonas-fuera/:id/video` | Set video: `join video` o un `join av` según link |
| POST | `/api/zonas-fuera/:id/audio` | Set audio: `join audio` o un `join av` según link |
| POST | `/api/zonas-fuera/:id/link` | Toggle link (sin Arranger, persistido) |

(Previously: POSTs devolvían 200 sin confirmación de la escritura al Arranger)

#### Scenario: Set video confirmado

- GIVEN POST `/api/zonas-fuera/aVip-Barra-Centro/video` body `{ source: "DTV3" }`
- WHEN el server procesa
- THEN con `link=false` ejecuta `join video DTV3 aVip-Barra-Centro`, no modifica audio y responde con el estado confirmado

#### Scenario: Zona vinculada

- GIVEN POST `/api/zonas-fuera/aVip-Barra-Centro/audio` con `{ source: "DTV3" }` y `link=true`
- WHEN el server procesa
- THEN ejecuta un único `join av`, confirma video y audio, y responde ambos valores reportados

#### Scenario: Zona inexistente 404

- GIVEN POST `/api/zonas-fuera/INEXISTENTE/video`
- WHEN el server procesa
- THEN responde 404 con mensaje de error

### Requirement: Independence from Matriz State
Zones MUST NOT appear in `estado.tvs`. Zone changes MUST NOT trigger `join av` batch. Enviar button MUST exclude these zones.

#### Scenario: Zone change excludes matriz
- GIVEN user changes zone video to "DTV3"
- WHEN video POST completes
- THEN `estado.tvs` unchanged, `joinMultipleTVs` not called, Enviar unaffected

### Requirement: Migration from Existing Presets
Server startup MUST detect legacy string values and migrate: `"DTV2"` → `{ video: "DTV2", audio: "DTV2", link: true, lastUpdated: now }`.

#### Scenario: Legacy string migrated on startup
- GIVEN `state.json` has `zonasFuera: { "aVip-Barra-Centro": "DTV2" }`
- WHEN server starts
- THEN key becomes `{ video: "DTV2", audio: "DTV2", link: true, lastUpdated: ... }`
