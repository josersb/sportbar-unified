# Delta for arranger-api-centralized

## ADDED Requirements

### Requirement: Zonas Fuera API Functions
`src/api/arrangerApi.js` MUST export 4 functions for zone control. Video/audio functions SHALL use `join video`/`join audio` (existing TVRACK command pattern). All SHALL log errors per existing convention.

| Export | Endpoint | Arranger Command |
|--------|----------|-----------------|
| `fetchZonasFueraState()` | GET `/api/zonas-fuera/state` | — |
| `setZonasFueraVideo(id, source)` | POST `/api/zonas-fuera/:id/video` | `join video {source} {id}` |
| `setZonasFueraAudio(id, source)` | POST `/api/zonas-fuera/:id/audio` | `join audio {source} {id}` |
| `setZonasFueraLink(id, value)` | POST `/api/zonas-fuera/:id/link` | — |

#### Scenario: Set video triggers join video
- GIVEN `setZonasFueraVideo("aVip-Barra-Centro", "DTV3")` called
- WHEN server processes request
- THEN Arranger receives `join video DTV3 aVip-Barra-Centro`, updated state returned

#### Scenario: Set link updates state only
- GIVEN `setZonasFueraLink("aVip-Bar-Boveda", false)` called
- WHEN server processes request
- THEN link toggles to false in lowdb, NO Arranger command sent

#### Scenario: Error logs per convention
- GIVEN Arranger unreachable
- WHEN any function fails
- THEN logs `[ArrangerAPI] Error enviando comando "join video/audio ..."`
