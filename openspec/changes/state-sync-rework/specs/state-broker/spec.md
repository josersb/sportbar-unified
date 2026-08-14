# state-broker Specification

## Purpose

El server Express se convierte en el único dueño del estado de la matriz (State Broker). Ningún cliente llama al Arranger directamente; toda consulta y escritura pasa por el broker. Modelo `desired`/`reported`, versionado por dominio, escrituras serializadas por destino y flujo de comando con `await`.

## Requirements

### Requirement: Server como único dueño del estado

El server MUST mantener el estado canónico en lowdb. `desired` SHALL representar la intención del operador; `reported` SHALL representar la lectura confirmada del hardware. Ningún cliente MUST llamar al Arranger; toda consulta MUST pasar por el broker.

#### Scenario: Cliente escribe vía broker

- GIVEN un cliente cambia TV01 a DTV3
- WHEN envía la intención al broker
- THEN el broker actualiza `desired.TV01`, ejecuta `join av DTV3 TV01`, lee `get encoder TV01` y actualiza `reported.TV01`

#### Scenario: Cliente no toca el Arranger

- GIVEN el cliente operativo con SSE conectado
- WHEN se inspecciona el tráfico de red
- THEN no hay requests directos a `192.168.2.254` desde el navegador

### Requirement: Distinción estado de matriz vs estado app-only

El broker MUST distinguir dos clases de estado. Estado de matriz (TVs, TVRACK, zonas-fuera video/audio): el Arranger es la verdad, `reported` proviene de `get encoder`. Estado app-only (link, descripcionPreset, audio Tesira): el server es el dueño, sin arbitraje del Arranger.

#### Scenario: Estado de matriz arbitrado por Arranger

- GIVEN `reported` del Arranger difiere de `desired`
- WHEN la reconciliación auto-adopta
- THEN `desired` converge a `reported` confirmado

#### Scenario: Estado app-only sin arbitraje

- GIVEN un cambio de `link` de zona-fuera
- WHEN el broker persiste
- THEN no se consulta ni se pisa desde el Arranger

### Requirement: Escrituras serializadas por destino

El broker MUST serializar escrituras por destino: a lo sumo UN comando `join` al Arranger por destino a la vez. Escrituras a destinos distintos MAY correr en paralelo. Cada escritura MUST confirmar la lectura post-comando antes de marcar convergencia.

#### Scenario: Doble escritura al mismo destino encolada

- GIVEN dos clientes cambian TV01 casi simultáneamente (DTV3 y DTV4)
- WHEN el broker procesa
- THEN las escrituras de TV01 se ejecutan en serie, la última intención gana, sin comandos intercalados

### Requirement: Versionado por dominio

Cada dominio (`tvs`, `tvrack`, `zonasFuera`, `presets`) MUST llevar `version` y `lastUpdated` incrementales en cada escritura. El broker MUST incluir estos metadatos en el snapshot y en cada evento incremental.

#### Scenario: Evento incremental con versión

- GIVEN el dominio `tvs` está en versión 10
- WHEN se aplica una escritura
- THEN el evento SSE emite `{ domain: "tvs", version: 11, lastUpdated: ... }`

### Requirement: Flujo de comando con await

El flujo de escritura MUST seguir: validar → guardar intención (`desired`) → ejecutar comando Arranger → leer `get encoder` → actualizar `reported` → broadcast. El endpoint de escritura MUST responder con el estado confirmado, no fire-and-forget.

#### Scenario: Escritura confirmada

- GIVEN POST de cambio de TV válido
- WHEN el comando Arranger y la lectura confirman
- THEN el endpoint responde con `reported` actualizado y broadcast SSE

#### Scenario: Comando falla

- GIVEN el comando `join` falla o el Arranger no responde
- WHEN el flujo ejecuta
- THEN el endpoint responde error y no se emite convergencia

### Requirement: Arranque background + stale

Al iniciar, el broker MUST servir el estado persistido de inmediato marcado `stale` y lanzar un escaneo background del Arranger (~24s). Durante el escaneo el server MUST responder lecturas con el estado persistido.

#### Scenario: UI usable al instante

- GIVEN el broker arranca con `state.json` persistido
- WHEN el cliente consulta el snapshot inicial
- THEN recibe el estado persistido con estado sync `stale` en <1s
- AND el escaneo Arranger corre en background

### Requirement: Fresh start (reconstrucción desde Arranger)

Si `state.json` está envenenado/inválido para el estado de matriz, el broker MUST reconstruir el estado de matriz desde el Arranger físico vía `get encoder`. Los presets viejos MUST migrarse. El estado app-only MUST conservarse.

#### Scenario: state.json envenenado

- GIVEN `state.json` contiene defaults DTV1 incorrectos para la matriz
- WHEN el broker detecta estado de matriz no fiable
- THEN reconstruye `reported`/`desired` desde `get encoder` del Arranger
- AND conserva presets migrados y estado app-only

### Requirement: Rate limiter rediseñado

El presupuesto del rate limiter MUST rediseñarse para el nuevo patrón de tráfico: SSE (conexiones de larga duración, no contadas por evento) y menos GETs de polling. El limiter MUST aplicar por endpoint y no causar 429 en el camino crítico con 2+ clientes.

#### Scenario: 2 clientes SSE sin 429

- GIVEN 2 navegadores conectados vía SSE
- WHEN operan la matriz normalmente
- THEN no hay 429 por presupuesto agotado
