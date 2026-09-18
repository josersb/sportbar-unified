# zonas-fuera-state Specification

## Purpose
Estado independiente para 11 zonas externas con separación video/audio/link, persistido en lowdb y sincronizado vía SSE (broker) con escrituras write-through confirmadas. No comparte `estado.tvs` ni el ciclo del botón Enviar.

## Requirements

### Requirement: Zone State Structure
The system MUST maintain `zonasFueraState` keyed by Arranger zone name. Each entry SHALL have `{ video, audio, link, lastUpdated }`. Video and audio MUST accept DTV source strings. Link MUST be boolean. The canonical set is 11 zones.

| # | Key | Default Video | Default Audio | Default Link |
|---|-----|---------------|---------------|-------------|
| 1 | aVip-Lobby-Batacazo | DTV1 | DTV1 | true |
| 2 | aVip-Bar-Boveda | DTV1 | DTV1 | true |
| 3 | aVip-Barra-Centro | DTV1 | DTV1 | true |
| 4 | RACK-VIP-PANTALLABATACA | DTV1 | DTV1 | true |
| 5 | aMas-15-Barra | DTV1 | DTV1 | true |
| 6 | aMas15-Vwall-Libertador | DTV1 | DTV1 | true |
| 7 | a-QMR75-Menos1-TV1 | DTV1 | DTV1 | true |
| 8 | a-QMR75-Menos1-TV2 | DTV1 | DTV1 | true |
| 9 | a-QMC65-Menos1-TV2 | DTV1 | DTV1 | true |
| 10 | a-Menos1-Escenario | DTV1 | DTV1 | true |
| 11 | a-Menos1-Escenario2 | DTV1 | DTV1 | true |

(Previously: 10 zones in a non-canonical order, without `aMas15-Vwall-Libertador`.)

#### Scenario: State loaded from lowdb
- GIVEN `state.json` has `zonasFuera` key
- WHEN Express server starts
- THEN all 11 zones loaded with video/audio/link/lastUpdated

#### Scenario: Default on missing key
- GIVEN `zonasFuera` absent from `state.json`
- WHEN server starts
- THEN all 11 zones default to `{ video: "DTV1", audio: "DTV1", link: true, lastUpdated: now }`

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
### Requirement: Dedupe de escrituras de zona

Las escrituras de `zonasFuera` MUST descartar no-ops reales contra el `reported` confirmado antes de emitir `join` al Arranger. La respuesta MUST ser idempotente/no-op. Un parámetro `forzar` MUST permitir el reenvío.

#### Scenario: Zona no-op descartada

- GIVEN una zona ya reporta la fuente pedida
- WHEN llega una escritura idéntica
- THEN no se emite `join` y se responde no-op

#### Scenario: Escape forzar en zona

- GIVEN `forzar` en true
- WHEN llega una escritura de zona no-op
- THEN se emite el `join` al Arranger
### Requirement: Canonical Zone Order and Labels
The system MUST define a single source of truth for the 11 out-of-sportbar zones — order and display label — consumed by both "ZONAS FUERA DE SPORTBAR" (MatrizVideo) and "Estado de otras zonas" (Aside / ZonasFueraStatus). The list SHALL be, in this exact order:

| # | ID | Label |
|---|----|-------|
| 1 | aVip-Lobby-Batacazo | VIP Bar Lobby |
| 2 | aVip-Bar-Boveda | VIP Bar Bóveda |
| 3 | aVip-Barra-Centro | VIP Barra Centro |
| 4 | RACK-VIP-PANTALLABATACA | Rack VIP Bataca |
| 5 | aMas-15-Barra | Barra Irineo +15 |
| 6 | aMas15-Vwall-Libertador | Led Wall +15 |
| 7 | a-QMR75-Menos1-TV1 | QMR75 -1 TV1 |
| 8 | a-QMR75-Menos1-TV2 | QMR75 -1 TV2 |
| 9 | a-QMC65-Menos1-TV2 | QMC65 -1 TV2 |
| 10 | a-Menos1-Escenario | Escenario -1 |
| 11 | a-Menos1-Escenario2 | Escenario -1 (2) |

#### Scenario: Order parity across views
- GIVEN the app renders both MatrizVideo and the Aside
- WHEN zones are listed
- THEN both views show the 11 zones in the same canonical order

#### Scenario: Renamed labels resolved
- GIVEN the canonical label map is loaded
- WHEN MatrizVideo or the Aside renders `aVip-Lobby-Batacazo` and `aMas-15-Barra`
- THEN they display "VIP Bar Lobby" and "Barra Irineo +15" (never "VIP Lobby Batacazo", "+15 Barra", or "Mas 15 Barra")

#### Scenario: New zone parity
- GIVEN zone `aMas15-Vwall-Libertador` is registered
- WHEN a component renders it
- THEN it exposes video, audio, and link controls identical to the other 10 zones

### Requirement: Zone Key Backfill in normalizeV3
On startup, `normalizeV3` MUST idempotently backfill missing zone keys (desired + appOnly) for any `ZONA_FUERA_IDS` entry absent from an existing v3 `state.json`, so the new zone is visible without waiting for the reconciler scan.

#### Scenario: Backfill missing zone in existing v3 state
- GIVEN an existing `state.json` v3 whose `domains.zonasFuera.desired` has 10 zones (missing `aMas15-Vwall-Libertador`)
- WHEN the server starts and `normalizeV3` runs
- THEN `aMas15-Vwall-Libertador` is added to `desired` (default DTV1) and to `appOnly` (link), so it is visible in the Aside immediately

#### Scenario: Backfill is idempotent
- GIVEN the zone key already exists in `desired` and `appOnly`
- WHEN `normalizeV3` runs again
- THEN existing keys are not overwritten and no error or duplicate is produced

#### Scenario: Existing zones preserved
- GIVEN an existing v3 state where the 10 existing zones carry reported values
- WHEN `normalizeV3` runs
- THEN those 10 zones retain their video/audio/link values unchanged
