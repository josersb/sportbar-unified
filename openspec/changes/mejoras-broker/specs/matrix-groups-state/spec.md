# matrix-groups-state Specification

## Purpose

Estado server-authoritative de los grupos de la matriz: `matrixGroups` vive solo en el servidor, se persiste y se difunde; los clientes lo consumen read-only y la carga de preset resuelve los valores de grupo exclusivamente en el servidor.

## Requirements

### Requirement: MG-1 — Grupos server-authoritative

`matrixGroups` MUST vivir solo en el servidor, persistirse en lowdb y difundirse vía SSE. Los clientes MUST NOT persistirlo ni decidir su valor; solo lo consumen read-only.

#### Scenario: Cliente read-only

- GIVEN un cliente operativo
- WHEN inspecciona o intenta persistir `matrixGroups`
- THEN no escribe ni decide el valor; solo refleja el del servidor

### Requirement: MG-2 — Resolución de preset server-side

La carga de un preset MUST resolver los valores de grupo exclusivamente en el servidor. El cliente MUST NOT calcular el valor de la lista de grupos.

#### Scenario: Preset resuelve grupos en el servidor

- GIVEN un preset guardado con grupos configurados
- WHEN se carga el preset
- THEN el servidor resuelve y difunde `matrixGroups` sin intervención del cliente

### Requirement: MG-3 — Cobertura de los 9 grupos

`matrixGroups` MUST cubrir los 9 grupos: Videos Wall Norte/Centro/Sur, Perímetro Norte/Centro/Sur y TVs Barra Norte/Libertador/Sur/Pista.

#### Scenario: Los 9 grupos presentes

- GIVEN el snapshot del servidor
- WHEN se inspecciona `matrixGroups`
- THEN están presentes los 9 grupos esperados
