# sync-broadcast Specification

## Purpose

Canal SSE broker→clientes: snapshot inicial, eventos incrementales, reconexión y polling de respaldo. Reemplaza los 3 polls (estado, zonasFuera, tvrack) y el 4º fetch de MatrizVideo. Estado de sincronización global `synced | stale | out_of_sync | offline`.

## Requirements

### Requirement: SSE snapshot inicial

Al conectar, el broker MUST enviar un snapshot completo del estado (todos los dominios) al cliente en un único evento inicial.

#### Scenario: Cliente recibe snapshot

- GIVEN un cliente abre la conexión SSE
- WHEN la conexión se establece
- THEN recibe snapshot completo con versiones por dominio y estado sync actual

### Requirement: SSE eventos incrementales

Tras el snapshot, el broker MUST emitir eventos incrementales por dominio cuando cambia el estado, con `{ domain, payload, version }`. El cliente SHALL aplicar el delta sin re-fetch completo.

#### Scenario: Cambio propagado <1s

- GIVEN el PC-A cambia TV01 vía broker
- WHEN el broker confirma la escritura
- THEN el PC-B recibe el evento incremental y actualiza TV01 en <1s sin polling

### Requirement: Reconexión SSE

Ante desconexión, el cliente MUST reconectarse automáticamente. Al reconectar, el broker MUST re-enviar el snapshot inicial (o el delta desde la última versión recibida) para cerrar el gap.

#### Scenario: Reconexión sin pérdida

- GIVEN la conexión SSE cae y se restablece
- WHEN el cliente reconecta
- THEN recibe snapshot actualizado y converge sin estado obsoleto persistente

### Requirement: Polling de respaldo

Si SSE no está disponible, el cliente SHOULD degradar a polling de respaldo contra el broker (no contra el Arranger). El polling MUST usar versiones por dominio para traer solo lo cambiado.

#### Scenario: Degradación a polling

- GIVEN SSE falla o no está soportado
- WHEN el cliente detecta la caída
- THEN degrada a polling del broker con versionado, sin llamar al Arranger

### Requirement: Estado de sincronización

El broker MUST exponer y emitir el estado sync global: `synced` (reported≈desired), `stale` (persistido sin escaneo), `out_of_sync` (reported≠desired tras escaneo), `offline` (Arranger inalcanzable). El cliente SHALL reflejar este estado en UI.

#### Scenario: Transición stale→synced

- GIVEN arranque con estado persistido (stale)
- WHEN el escaneo Arranger completa sin diffs
- THEN el estado emitido pasa a `synced`

#### Scenario: Arranger caído → offline

- GIVEN el Arranger deja de responder durante el escaneo
- WHEN el broker no puede leer `get encoder`
- THEN el estado emitido es `offline` y el cliente lo muestra
