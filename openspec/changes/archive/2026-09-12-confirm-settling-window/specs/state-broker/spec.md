# Delta for state-broker

## MODIFIED Requirements

### Requirement: Flujo de comando con await

El flujo de escritura MUST seguir: validar → guardar intención (`desired`) → ejecutar comando Arranger → leer `get encoder` dentro de la **ventana de confirmación por tipo de comando** → actualizar `reported` solo si la lectura confirma → broadcast. El endpoint MUST responder con el estado confirmado y MUST NOT ser fire-and-forget; si la ventana se agota sin confirmar, MUST responder `confirmed=false` sin pisar `reported` y sin envenenar el estado, delegando la convergencia al re-read postergado/reconciler.

(Previously: el flujo leía `get encoder` con una ventana fija de ~1,5 s y no explicitaba el desenlace no confirmado.)

#### Scenario: Escritura confirmada

- GIVEN POST de cambio de TV válido
- WHEN el comando Arranger y la lectura confirman
- THEN el endpoint responde con `reported` actualizado y broadcast SSE

#### Scenario: Comando falla

- GIVEN el comando `join` falla o el Arranger no responde
- WHEN el flujo ejecuta
- THEN el endpoint responde error y no se emite convergencia

#### Scenario: Ventana agotada sin confirmar

- GIVEN un write con comando `join` exitoso a un destino aislado (TVRACK o zona-fuera)
- WHEN las lecturas `get encoder` no reflejan el join antes de agotar la ventana
- THEN el endpoint responde `confirmed=false`
- AND `reported` no se sobrescribe con un valor stale
- AND la convergencia queda delegada al re-read postergado/reconciler

## ADDED Requirements

### Requirement: Ventana de confirmación por tipo de comando

La confirmación post-join (`get encoder` → `reported`) MUST usar una ventana acotada según el comando emitido: mayor para `join av` que para `join video`/`join audio`, ambas con margen sobre el settling medido del firmware v1.3.4. El primer read MUST ser inmediato para resolver el caso no-op/ya-settleado sin esperar la ventana completa. La ventana MUST NOT alterar el contrato de serialización vigente: todo comando al Arranger MUST seguir pasando por el semáforo global (a lo sumo 1 in-flight). El primer read MAY retrasarse por congestión de ese semáforo sin invalidar la confirmación.

#### Scenario: `join av` a destino aislado confirma en ventana

- GIVEN un write con `join av` a TVRACK o zona-fuera (destino aislado, sin congestión de TVs)
- WHEN el firmware refleja el join dentro del settling medido (~3,3 s)
- THEN la lectura confirma dentro de la ventana
- AND no se emite `SKIP setReported ... unconfirmed`

#### Scenario: `join video`/`join audio` confirma en ventana

- GIVEN un write single-stream con `join video` o `join audio`
- WHEN el firmware refleja el join dentro del settling medido (~2,3 s)
- THEN la lectura confirma dentro de la ventana
- AND `reported` se actualiza con el valor confirmado

#### Scenario: No-op confirma con el primer read

- GIVEN un write cuyo `join` apunta a la misma fuente ya reportada
- WHEN el broker ejecuta el primer read rápido
- THEN confirma sin esperar la ventana completa
- AND `reported` permanece igual y la UI no lagea

#### Scenario: Primer read retrasado por congestión

- GIVEN el semáforo global tiene un comando in-flight de otro destino
- WHEN el primer read de la confirmación espera su turno
- THEN la confirmación se resuelve dentro de la ventana o cae en el desenlace no confirmado
- AND el retraso por congestión no se interpreta como fallo ni envenena `reported`
