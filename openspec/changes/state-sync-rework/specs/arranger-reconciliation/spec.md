# Delta for arranger-reconciliation

## ADDED Requirements

### Requirement: Auto-Adopt server-side (Arranger gana)

El broker MUST adoptar `reported` sobre `desired` por destino SOLO cuando la lectura `get encoder` es confirmada y válida. Una lectura null, vacía o en error MUST NOT pisar el estado bueno existente.

#### Scenario: Adopción con lectura confirmada

- GIVEN reported de TV01 = DTV3 y desired = DTV1
- WHEN la lectura confirma DTV3
- THEN desired.TV01 se actualiza a DTV3

#### Scenario: Blip no pisa

- GIVEN una lectura transitoria retorna null/error para TV01
- WHEN el broker procesa la reconciliación
- THEN desired/reported de TV01 conservan el último valor bueno

### Requirement: Single-flight de reconciliación en server

Mientras un ciclo de reconciliación está en curso, el broker MUST ignorar solicitudes de nuevo ciclo (no-op). El ciclo SHALL ser cancelable y re-intentar con backoff si el Arranger no responde.

#### Scenario: Segundo ciclo ignorado

- GIVEN un ciclo de reconciliación en curso
- WHEN llega otra solicitud de reconciliar
- THEN no se lanza un ciclo paralelo

### Requirement: Eliminación de artefactos de sincronización cliente

El cliente MUST eliminar: `reconciledRef` (ventana 2s), POSTs fire-and-forget post-aplicación, los 3 polls separados (estado, zonasFuera, tvrack) y el 4º fetch de MatrizVideo. Toda la sincronización SHALL fluir por SSE con polling de respaldo versionado.

#### Scenario: Sin polls ni fire-and-forget

- GIVEN el cliente operativo vía SSE
- WHEN se inspecciona la red
- THEN no hay polling periódico de `/api/state` ni POSTs fire-and-forget de reconciliación

## MODIFIED Requirements

### Requirement: Unified Reconciliation Hook

La reconciliación de 5 dominios (TVs, TVRACK video, TVRACK audio, zonas-fuera video, zonas-fuera audio) MUST ejecutarse en el broker (server), no en el cliente. El cliente SHALL consumir `reported` vía SSE y no SHALL llamar `reconcile()` ni fetchear al Arranger. `buildDiffs` (5 dominios) SHALL conservarse server-side como primitiva de comparación desired↔reported.
(Previously: hook cliente `useArrangerReconciliation` fetcheaba el Arranger y comparaba contra estado app)

| Domain | Count | Arranger Query |
|--------|-------|---------------|
| TVs | ~29-40 | `get encoder {dest}` per destination |
| TVRACK video | 1 | `get encoder TVRACK` |
| TVRACK audio | 1 | `get encoder TVRACK` |
| Zonas-fuera video | ~3-6 | `get encoder {zoneId}` |
| Zonas-fuera audio | ~3-6 | `get encoder {zoneId}` |

#### Scenario: Reconciliación server-side

- GIVEN el broker corre un ciclo de reconciliación
- WHEN lee todos los `get encoder`
- THEN calcula buildDiffs desired↔reported y actualiza reported/desired sin intervención del cliente

#### Scenario: Cliente no fetchea Arranger

- GIVEN el cliente operativo
- WHEN se inspecciona el tráfico del navegador
- THEN no hay requests a `192.168.2.254` (solo al broker)

### Requirement: Non-Blocking Deferred Startup

El broker MUST servir el estado persistido de inmediato (marcado `stale`) y ejecutar el escaneo Arranger en background. El cliente MUST renderizar UI interactiva en <1s. No SHALL haber setEstadoApp parciales en el cliente (el snapshot llega completo vía SSE).
(Previously: el cliente llamaba `reconcile()` via `setTimeout(500)` y hacía `setEstadoApp` una vez)

#### Scenario: UI interactiva antes del escaneo

- GIVEN el broker arranca con estado persistido
- WHEN el cliente monta
- THEN la UI es interactiva en <1s con datos stale
- AND el escaneo Arranger (~24s) corre en background del server

#### Scenario: Snapshot único

- GIVEN el escaneo server completa con N diffs
- WHEN el broker emite el snapshot actualizado
- THEN el cliente recibe un único evento SSE con el estado completo

### Requirement: SyncPanel Drawer UI

SyncPanel.jsx MUST pasar de gate de aplicación de diffs a indicador de estado de sincronización. SHALL mostrar el estado sync global (`synced | stale | out_of_sync | offline`) y, cuando existan, los diffs reported≠desired de forma informativa. No SHALL ofrecer acciones Apply/Ignore por fila (la adopción es server-side).
(Previously: drawer con barra de progreso, tabs por dominio y acciones Apply/Ignore por fila)

#### Scenario: Indicador sin acciones

- GIVEN el estado sync es `synced`
- WHEN SyncPanel renderiza
- THEN muestra estado synced y NO muestra botones Apply/Ignore

#### Scenario: Diferencias informativas

- GIVEN el estado es `out_of_sync` con 3 diffs
- WHEN SyncPanel renderiza
- THEN lista los 3 diffs informativamente sin acción manual por fila

### Requirement: Persistent Tab Indicator

Header.jsx MUST mostrar un tab de sincronización con icono según el estado global: ✅ synced | ⏳ stale | ⚠️ out_of_sync | ❌ offline. El tab SHALL ser siempre visible y clickeable para abrir SyncPanel.
(Previously: iconos ✅ synced | ⚠️ N diffs | 🔄 fetching | ❌ error)

#### Scenario: Tab refleja estado offline

- GIVEN el Arranger es inalcanzable (estado offline)
- WHEN Header renderiza
- THEN el tab muestra ❌ offline

### Requirement: reconciliationStatus in Context

Contexto.jsx MUST exponer el estado de sincronización con `{ status, lastSync }` donde status ∈ `synced | stale | out_of_sync | offline`, alimentado por SSE. El valor SHALL ser estable (no un objeto nuevo por render).
(Previously: `{ status, progress, diffs, elapsedMs, lastSync }` con status idle/reconciling/synced/diffs/error)

#### Scenario: Aside lee estado sync

- GIVEN el broker emite estado `synced`
- WHEN un componente de sidebar lee el estado de sincronización
- THEN ve `{ status: "synced", lastSync: timestamp }`

### Requirement: Arranger Offline Resilience

Cuando el Arranger es inalcanzable, el broker MUST marcar estado `offline` y continuar sirviendo el último estado persistido (marcado stale). El cliente SHALL mostrar el estado persistido con indicador offline.
(Previously: `reconcile()` cliente retornaba error y mostraba resultado cacheado con timestamp)

#### Scenario: Offline sirve persistido

- GIVEN Arranger offline durante el escaneo
- WHEN el cliente consulta el broker
- THEN recibe el estado persistido y estado sync `offline`

### Requirement: Partial Timeout Handling

Si lecturas individuales de `get encoder` hacen timeout, el broker MUST continuar con los dominios restantes. La adopción por destino SHALL ocurrir SOLO con lectura confirmada válida; los destinos sin lectura confirmada SHALL conservar su estado previo.
(Previously: el hook cliente continuaba dominios restantes con resumen parcial por dominio)

#### Scenario: Lectura parcial no pisa

- GIVEN 3 de 40 lecturas de TV hacen timeout
- WHEN el ciclo de reconciliación completa
- THEN los 37 destinos confirmados se adoptan, los 3 sin lectura conservan su estado previo (sin pisar con null)

## REMOVED Requirements

### Requirement: Double-Call Prevention

(Reason: la reconciliación se mueve al server; el hook cliente `useArrangerReconciliation` y su AbortController desaparecen. El server aplica single-flight propio, cubierto en ADDED.)
(Migration: eliminar `useArrangerReconciliation` y sus guards; el server expone single-flight interno.)
