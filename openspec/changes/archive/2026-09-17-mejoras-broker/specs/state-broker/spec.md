# Delta for state-broker

## MODIFIED Requirements

### Requirement: Distinción estado de matriz vs estado app-only

El broker MUST distinguir dos clases de estado. Estado de matriz (TVs, TVRACK, zonas-fuera video/audio): el Arranger es la verdad, `reported` proviene de `get encoder`. Estado app-only (link, descripcionPreset, audio Tesira, intención de canal DTV `canalActual`, `matrixGroups`): el server es el dueño, sin arbitraje del Arranger. La intención de canal y `matrixGroups` MUST persistirse y difundirse como dominios app-only (ver `canales-dtv-intent` y `matrix-groups-state`).

(Previously: el estado app-only incluía solo link, descripcionPreset y audio Tesira.)

#### Scenario: Estado de matriz arbitrado por Arranger

- GIVEN `reported` del Arranger difiere de `desired`
- WHEN la reconciliación auto-adopta
- THEN `desired` converge a `reported` confirmado

#### Scenario: Estado app-only sin arbitraje

- GIVEN un cambio de `link` de zona-fuera
- WHEN el broker persiste
- THEN no se consulta ni se pisa desde el Arranger

#### Scenario: Intención de canal y grupos son app-only

- GIVEN un cambio de `canalActual` o de `matrixGroups`
- WHEN el broker persiste
- THEN no se consulta ni se pisa desde el Arranger

## ADDED Requirements

### Requirement: WS5-DEDUPE — Dedupe de escrituras no-op

`executeWrite` MUST descartar intenciones repetidas idénticas y no-ops reales contra el estado confirmado (`reported`), con guard `isBusy` y `lastBatch`, antes de emitir el comando al Arranger. La respuesta MUST ser idempotente/no-op. Un parámetro explícito `forzar` MUST permitir reenviar el comando saltando la dedupe. La ventana de settling de `confirm-settling-window` MUST NOT alterarse.

#### Scenario: No-op descartado contra reported

- GIVEN `reported[dest]` ya es la fuente pedida
- WHEN llega una escritura idéntica
- THEN no se emite comando y se responde no-op

#### Scenario: Intención repetida descartada

- GIVEN una intención idéntica a la pendiente en vuelo
- WHEN `isBusy` está activo
- THEN se descarta sin duplicar el comando

#### Scenario: Escape forzar reenvío

- GIVEN `forzar` en true
- WHEN llega la escritura aunque sea no-op
- THEN se emite el comando al Arranger

### Requirement: WS1-AUDIT — Auditoría read-only de identidad de dispositivo

El sistema MUST auditar, sin escribir, la identidad del dispositivo `aMas15-Vwall-Libertador` contra el Arranger real vía `get devices all`. Si la identidad no coincide con ningún dispositivo modelado, MUST registrar un hallazgo para un change aparte y MUST NOT modelar ni escribir aquí.

#### Scenario: Auditoría read-only

- GIVEN el Arranger real accesible
- WHEN se ejecuta `get devices all`
- THEN se compara `aMas15-Vwall-Libertador` con el registro modelado sin emitir writes

#### Scenario: Identidad no modelada

- GIVEN la identidad no coincide con ningún dispositivo modelado
- WHEN se documenta el hallazgo
- THEN se registra para un change aparte sin implementar modelado aquí
