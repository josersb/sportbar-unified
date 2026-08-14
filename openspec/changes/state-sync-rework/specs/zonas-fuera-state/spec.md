# Delta for zonas-fuera-state

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: REST API Endpoints

Express MUST exponer endpoints write-through con `await`: el POST SHALL confirmar la escritura al Arranger (o persistir) y responder con el estado confirmado, no fire-and-forget.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/zonas-fuera/state` | Return full `zonasFueraState` |
| POST | `/api/zonas-fuera/:id/video` | Set video + `join video` (await, confirmado) |
| POST | `/api/zonas-fuera/:id/audio` | Set audio + `join audio` (await, confirmado) |
| POST | `/api/zonas-fuera/:id/link` | Toggle link (sin Arranger, persistido) |

(Previously: POSTs devolvían 200 sin confirmación de la escritura al Arranger)

#### Scenario: Set video confirmado

- GIVEN POST `/api/zonas-fuera/aVip-Barra-Centro/video` body `{ source: "DTV3" }`
- WHEN el server procesa
- THEN ejecuta `join video DTV3 aVip-Barra-Centro`, persiste y responde con el estado confirmado tras la lectura

#### Scenario: Zona inexistente 404

- GIVEN POST `/api/zonas-fuera/INEXISTENTE/video`
- WHEN el server procesa
- THEN responde 404 con mensaje de error

## REMOVED Requirements

### Requirement: Polling Synchronization

(Reason: el polling de 3s de `/api/zonas-fuera/state` se reemplaza por SSE con polling de respaldo versionado del broker.)
(Migration: eliminar el poll de `/api/zonas-fuera/state`; el cliente consume SSE.)
