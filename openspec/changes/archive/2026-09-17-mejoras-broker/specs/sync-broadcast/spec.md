# Delta for sync-broadcast

## ADDED Requirements

### Requirement: Broadcast de dominios app-only nuevos

El broker MUST incluir los dominios app-only nuevos (`canalActual` y `matrixGroups`) en el snapshot inicial y MUST emitirlos como eventos incrementales SSE a los clientes read-only.

#### Scenario: Intención de canal se difunde

- GIVEN un cliente conectado vía SSE
- WHEN cambia la intención de canal DTV
- THEN el cliente recibe el evento incremental con `canalActual`

#### Scenario: Grupos se difunden

- GIVEN un cliente conectado vía SSE
- WHEN cambia `matrixGroups` en el servidor
- THEN el cliente recibe el evento incremental con `matrixGroups`
