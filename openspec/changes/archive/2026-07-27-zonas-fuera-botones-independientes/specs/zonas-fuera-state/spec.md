# zonas-fuera-state Specification

## Purpose
Estado independiente para 10 zonas externas con separación video/audio/link, persistido en lowdb y sincronizado vía polling. No comparte `estado.tvs` ni el ciclo del botón Enviar.

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

### Requirement: REST API Endpoints
Express MUST expose:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/zonas-fuera/state` | Return full `zonasFueraState` |
| POST | `/api/zonas-fuera/:id/video` | Set video source + send `join video` |
| POST | `/api/zonas-fuera/:id/audio` | Set audio source + send `join audio` |
| POST | `/api/zonas-fuera/:id/link` | Toggle link (NO Arranger command) |

#### Scenario: Set video sends join video
- GIVEN `POST /api/zonas-fuera/aVip-Barra-Centro/video` body `{ source: "DTV3" }`
- WHEN called
- THEN Arranger receives `join video DTV3 aVip-Barra-Centro`, lowdb updates, returns 200

#### Scenario: Invalid zone returns 404
- GIVEN `POST /api/zonas-fuera/INEXISTENTE/video`
- WHEN called
- THEN returns 404 with error message

### Requirement: Polling Synchronization
App.jsx MUST poll `GET /api/zonas-fuera/state` every 3s and update Context on change.

#### Scenario: Cross-PC sync detected
- GIVEN App.jsx polling at 3s
- WHEN another PC changes a zone
- THEN local `zonasFueraState` updates within one poll cycle

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
