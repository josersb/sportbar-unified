# Exploration: state-sync-rework

> Worktree: `sportbar-unified-worktrees/state-sync-rework` (branch `feat/state-sync-rework`, desde v2 @ `f8ab1e5`).
> Puertos del worktree: Vite 5178 / Express 3106 (`worktree.config.json`).
> Todo el análisis se basa en el CÓDIGO REAL de este worktree; la memoria Engram se usó solo como contexto de partida y fue verificada (varias afirmaciones de la memoria NO coinciden con el código — ver sección 6).

---

## Current State

### 1. Las 3 fuentes de verdad y su jerarquía real

| Fuente | Dónde vive | Escritura | Lectura |
|---|---|---|---|
| **Server Express + lowdb** | `server/state.json` | POST fire-and-forget desde el cliente | Carga inicial (gana sobre localStorage) + 3 polls cada 5s |
| **localStorage del navegador** | `estadoApp`, `estadoApp_Preset1-5`, `arrangerSyncCache` | Efecto de persistencia (App.jsx:257-271) + usePreset | Solo fallback si el server devuelve `null` o falla (App.jsx:101-133) |
| **Arranger (hardware)** | Solo lectura vía `get encoder` | Nunca | Solo reconciliación (`/api/matrix/state`) |

**Hallazgo clave**: el server GANA sobre localStorage en la carga (App.jsx:87-94), pero el server puede estar "envenenado" con defaults DTV1 (state.json legado de la era lowdb #458, copiado al deploy #675). No existe ningún arbitraje de frescura/versión entre las tres fuentes.

### 2. Server: inventario completo de endpoints de estado (`server/server.js`)

**Inicialización lowdb** (líneas 94-140): `JSONFilePreset("state.json", {...})` en un IIFE async. Schema default: `{ state: null, tvrack: {video:"DTV1",audio:"DTV1",link:false}, presets: {preset1-5: null}, zonasFuera: {10 zonas DTV1} }`. Integrity check (116-136) repara keys faltantes. **Migration v2** (138-208): extrae las 10 zonas fuera de `state.tvs` y `preset*.tvs` → `zonasFuera`, hace backup a `state.backup.json`, setea `_version=2`.

| Endpoint | Método | Lee | Escribe | Rate limit |
|---|---|---|---|---|
| `/api/state` | GET (220-225) | `stateDb.data.state` | — | `stateLimiter` 500/15min |
| `/api/state` | POST (228-239) | — | `stateDb.data.state = state` (reemplazo total) | `stateLimiter` |
| `/api/tvrack/state` | GET (253-256) | `stateDb.data.tvrack` | — | **ninguno** |
| `/api/tvrack/video` (258-267) | POST | — | `tvrack.video` (+audio si link), `lastUpdated` | `stateLimiter` |
| `/api/tvrack/audio` (269-278) | POST | — | `tvrack.audio` (+video si link), `lastUpdated` | `stateLimiter` |
| `/api/tvrack/link` (280-287) | POST | — | `tvrack.link`, `lastUpdated` | `stateLimiter` |
| `/api/zonas-fuera/state` | GET (300-303) | `stateDb.data.zonasFuera` | — | **ninguno** |
| `/api/zonas-fuera/:id/video\|audio\|link` (305-345) | POST | — | campo por zona (valida contra `ZONAS_FUERA_IDS`) | `stateLimiter` |
| `/api/matrix/state` | GET (376-404) | Arranger `get encoder` × 40 destinos × subscription | — | **NINGUNO (sin rate limit)** |
| `/api/presets/:n` | GET/POST/DELETE (408-431) | `presets[n]` | `presets[n]` (POST guarda `req.body` sin validar) | `stateLimiter` (POST/DELETE) |
| `/api/device/:id/status` | GET (457-483) | proxy `get status {id}` | — | ninguno |
| `/api/command/:command/:token` | GET (489-502) | proxy genérico al Arranger | — | ninguno |

Detalles relevantes:
- `MATRIX_DESTINATIONS` (349-359): **40 destinos** = TV01-26 + VW-Norte/Centro/Sur + TVRACK + 10 zonasFuera. `BATCH = 4` (380): 10 batches secuenciales ≈ **12s por subscription**.
- `fetchEncoderFromArranger` (361-374) **no tiene retry** (a diferencia de `fetchWithRetry`, 437-453, usado solo en device-status y proxy genérico). Un blip de red marca destinos como `null`.
- `fetchWithRetry` (437-453) tiene un bug menor: devuelve el response en el 4xx sin reintentar (correcto), pero el branch `if` es inoperante — retorna lo mismo en ambos casos.
- Inconsistencia de env vars: línea 20 usa `VITE_ARRANGER_TOKEN`; línea 460 usa `process.env.ARRANGER_TOKEN || "TOKEN_REMOVED"` (probablemente no configurada → envía "TOKEN_REMOVED" al Arranger).
- `stateLimiter` (211-217): 500/15min COMPARTIDO entre GET `/api/state` (polling = 180/15min por browser; 2 browsers = 360) y TODOS los POSTs. Un batch-apply dispara ~23 POSTs (20 zonas + 2 tvrack + 1 estado). Margen fino; un 429 rompe la cadena de persistencia post-reconciliación (ver §8-a).

### 3. Ciclo de vida del estado en el cliente (`src/App.jsx`)

**Estado inicial** (58-60):
- `estado = estadoInicial` (Contexto.jsx:14-143): `tvs` con 26 TVs + VWN/VWC/VWS + `TVRACK: "DTV1"` + **keys legacy** `TvsBarra*`/`TvsEscalera*` con encoders falsos ("DTV542", "DTV1234") que se persisten pero NUNCA se reconcilian.
- `tvrackState = { video:"DTV1", audio:"DTV1", link:false }` **hardcodeado**, sin persistencia local.
- `zonasFueraState = {}` **vacío** — "Estado de otras zonas" arranca vacío hasta el primer poll (2s).

**Secuencia de carga** (81-148, effect con `[]`):
1. `GET /api/state` → si `state` no es null → `setEstado(state)` + `setEstadoLoaded(true)` + return.
2. Fallback `localStorage["estadoApp"]` (con migración v0→v1 `migrarEstado`, 21-55).
3. Fallback `estadoInicial` + `setErrorDecos(true)`.
   ⚠️ El paso 3 dispara el efecto de persistencia → **POSTea defaults DTV1 al server** si el server responde (persist effect corre en todo cambio de `estado` con `estadoLoaded=true`, 257-271).

**Effects en orden de declaración**:
| Líneas | Effect | Disparo |
|---|---|---|
| 81-148 | loadState | mount (una vez) |
| 151-155 | `setTimeout(() => reconcile(), 500)` | cuando `estadoLoaded` se pone true |
| 163-254 | **Batch apply de diffs** | `status==="done" && diffs.length>0` (con guard `appliedDiffsRef`) |
| 257-271 | **Persist**: localStorage + `POST /api/state` fire-and-forget | todo cambio de `estado` |
| 277-303 | Poll zonasFuera | 2s inicial + cada 5s |
| 306-328 | Poll estado | cada 5s desde mount |
| 331-354 | Poll tvrack | cada 5s desde mount |

Además: `MatrizVideo.jsx:43-49` hace un **4º fetch de tvrack** en mount (`.then(handleChangeTvrack)`), en competencia con el poll de App.jsx.

### 4. Los 3 efectos de polling (mecánica exacta)

**Poll zonasFuera** (277-303): primera llamada a los 2s (evita ECONNREFUSED), luego cada 5s. Guard `reconciledRef` ANTES del fetch. Comparación `JSON.stringify(prev) === JSON.stringify(data)` dentro del `setZonasFueraState` — si difiere, **reemplaza el objeto completo** con lo del server.

**Poll estado** (306-328): cada 5s desde mount (no espera `estadoLoaded`). Guard antes del fetch. Compara **solo `tvs`** con `JSON.stringify`; si difiere hace `return { ...serverState }` — **reemplaza TODO el estado** (también `dispositivos`, `audio`, `descripcionPreset`, `favoritos`), pisando cualquier cambio local no relacionado con tvs. Si `serverState.tvs` fuera `undefined`, `JSON.stringify(undefined)` === `undefined` ≠ string → pisaría con un estado sin `tvs` (crash en MatrizVideo `tvs.VWN`); hoy no ocurre por la migration v2.

**Poll tvrack** (331-354): cada 5s desde mount. Comparación campo a campo (`video/audio/link`).

**Interacción con `reconciledRef`** (b): el guard `if (reconciledRef.current) return;` está ANTES del fetch en los 3 polls (282, 309, 334). Es un check-then-act **no atómico**: un fetch lanzado justo antes de que el apply seteé el ref resuelve DURANTE la ventana de 2s y pisa sin volver a chequear el ref. Race TOCTOU confirmada.

### 5. Reconciliación (`src/hooks/useArrangerReconciliation.js`)

- Máquina `useReducer`: `idle → fetching → comparing → done | error` (28-91).
- Refs frescos `tvsRef/zonasRef/tvrackRef` (177-194) para que `reconcile` (useCallback estable, 218-278) no capture closures obsoletos; `statusRef` previene doble corrida (220).
- `AbortController` (223-226): aborta corrida previa al re-lanzar; abort en unmount (197-199).
- **Corrida**: `Promise.allSettled([fetchMatrixState("video", signal), fetchMatrixState("audio", signal)])` (237-246) — ambas subscriptions en paralelo, cada una ≈12s server-side. Ambas rechazadas → ERROR (retryCount+1). Una cumplida → COMPARING → `buildDiffs` → DONE + cache `arrangerSyncCache` en localStorage (271-276).
- **Cache en mount** (204-216): `arrangerSyncCache` < 24h → `CACHE_LOAD` (cachedDiffs + lastSync) para el badge stale.
- **buildDiffs** (100-143), 5 dominios:
  1. TVs: itera `videoData` (40 destinos Arranger), salta TVRACK, mapea `VW-Norte→VWN`; diff si `tvs[key] !== undefined && tvs[key] !== encoder` (con `encoder ?? null`).
  2. TVRACK video: `videoData.TVRACK ?? null` vs `tvrackState.video`.
  3. TVRACK audio: `audioData.TVRACK ?? null` vs `tvrackState.audio`.
  4. Zonas video: solo zonas presentes en `zonasFueraState`.
  5. Zonas audio: ídem sobre `audioData`.
- **Dato**: si una subscription falla por completo, su `data = {}` → dominio sin diffs (solo banner partial) — EXCEPTO tvrack-audio que con `{}` produce diff `arranger: null` (correcto: "sin respuesta").
- `buildPartial` (150-160): resumen `disconnected` por subscription para el banner.

**Batch apply en App.jsx** (163-254):
- Guard `appliedDiffsRef.current === diffs` por identidad de array (168-169).
- Salta diffs con `arranger == null` (182).
- Aplica por dominio: `setEstado(tvs)` / `setZonasFueraState` / `setTvrackState` (214-216).
- **Persistencia post-apply** (219-244): `POST /api/zonas-fuera/:id/video|audio` × 10 zonas + `POST /api/tvrack/video|audio` — todos **fire-and-forget con `.catch(()=>{})`** (parche a). El estado `tvs` se persiste indirectamente por el persist effect (POST `/api/state`).
- `reconciledRef.current = true` + `setTimeout(→false, 2000)` (246-247).
- Toast + `clearDiffs()` (250-253).

### 6. Inventario de parches (VERIFICADO contra código + git — la memoria NO coincide)

La memoria describe 5 parches "todos en el código". Realidad verificada con `git log -S` y grep:

| Parche (según memoria) | Estado real | Evidencia |
|---|---|---|
| (a) POST fire-and-forget tras batch apply | **PRESENTE** | App.jsx:219-244; commit `1e452de` |
| (b) `reconciledRef` bloqueando polling | **PRESENTE** (introducido con 6s en `25c85ba`, hoy 2s) | App.jsx:162, 246-247, 282, 309, 334 |
| (c) `pollingBlocked` suspendiendo intervalos completos | **NO EXISTE** — nunca estuvo en git (`git log -S pollingBlocked` vacío) | — |
| (d) `Promise.allSettled` de POSTs antes de arrancar polling | **NO EXISTE** — los POSTs son individuales fire-and-forget | App.jsx:219-244 |
| (e) localStorage extra de zonasFuera/tvrack | **NO EXISTE** (tvrack no tiene ninguna persistencia local; zonasFuera tampoco) | grep `localStorage` en src/ |
| (e-bis) toast con ref anti-duplicados | **PRESENTE** | `toastSuccessRef` App.jsx:161,164-165,251; `appliedDiffsRef` 160,168-169 |

**Interacciones entre parches reales**:
- (b) anula (a): la ventana de 2s ASUME que los POSTs de (a) completaron. Si un POST falla (429 del rate limiter, server reiniciándose), al expirar la ventana el poll lee el server viejo y pisa lo reconciliado. (b) es heurística temporal, no confirmación de escritura.
- (e-bis) `appliedDiffsRef` deduplica por identidad de array, no por contenido: dos corridas consecutivas con los mismos diffs re-aplican (arrays nuevos).
- La window de 2s es menor que el período de polling (5s): como mínimo UN poll cae fuera de la ventana con el server potencialmente desactualizado.

### 7. Contexto global y presets (`Contexto.jsx`, `usePreset.js`, `MatrizPreset.jsx`)

- `ProviderUser` expone `reconciliationStatus` como **objeto nuevo en cada render de App** (App.jsx:512) → re-render innecesario de SyncPanel/MatrizVideo en cada tick.
- Presets: `usePreset.load` (44-70) → server `/api/presets/:n` → fallback localStorage → `handleChangeEstadoVideo(data.tvs)` + `joinMultipleTVs(mappings)` (29 mappings, BATCH 8 cliente). `save` (72-89) → localStorage + POST del **`estado` completo**.
- **Bug de dominio**: los presets guardan/cargan SOLO `estado` (tvs, audio, etc.). `zonasFuera` y `tvrack` viven en endpoints aparte y **no se guardan ni se restauran con los presets**. El `tvs.TVRACK` guardado en presets es peso muerto: nada lo restaura a `tvrackState`.

### 8. arrangerApi.js: qué se usa en producción vs código muerto

| Función | Uso real | Nota |
|---|---|---|
| `sendArrangerCommand` (27-67) | Base de todo comando | Proxy Express `/api/command/*`, timeout 10s, detección de errores por texto del body |
| `getEncoder` (117-130) | Solo indirecto: lo usa el SERVER en `/api/matrix/state` | "get encoder success (.+)" |
| `fetchMatrixState` (465-469) | **Único camino de reconciliación** | `GET /api/matrix/state?subscription=` |
| `reconstructMatrixState` (141-163) | **Código muerto en producción** — solo dev helper `__dumpArrangerState` (main.jsx:10-23) | BATCH_SIZE=8 (¡35s!) vs BATCH=4 del server |
| `joinMultipleTVs` (195-214) | usePreset.load | BATCH 8 cliente |
| `getDeviceStatus` (348-354) | **Código muerto** — nadie lo llama | endpoint `/api/device/:id/status` sin consumidores |
| `getStatus`/`getMatrix`/`getJoins` (171-183) | **Código muerto FW-locked** — devuelven "invalid property" en v1.3.4 | confirmado: NO existe `get matrix`/`get joins` en firmware 1.3.4 |
| setters tvrack/zonasFuera (356-456) | MatrizVideo, App (batch apply), handleZonasFueraChange | fetch directo a endpoints Express |

**Restricción de firmware verificada**: la única lectura de ruteo disponible en v1.3.4 es `get encoder {decoder} {subscription}` por decoder. Los comandos `get matrix`, `get joins`, `get status` (de tabla) NO existen (arrangerApi.js:166-183 los marca FW-LOCKED).

---

## Affected Areas

- `server/server.js` — todo el almacén lowdb, 12+ endpoints de estado, `/api/matrix/state` (batch 4, sin rate limit, sin retry).
- `src/App.jsx` — ciclo de vida completo: carga, 3 polls, persist, batch apply, refs de parcheo (`reconciledRef`, `appliedDiffsRef`, `toastSuccessRef`).
- `src/hooks/useArrangerReconciliation.js` — máquina de estados, buildDiffs 5 dominios, cache `arrangerSyncCache`.
- `src/contexto/Contexto.jsx` — `estadoInicial` con keys legacy (`TvsBarra*`, `TvsEscalera*`, `tvs.TVRACK`), ProviderUser.
- `src/api/arrangerApi.js` — cliente proxy; código muerto (`reconstructMatrixState`, `getDeviceStatus`, comandos FW-locked).
- `src/hooks/usePreset.js` + `src/componentes/MatrizPreset.jsx` — presets que no cubren zonasFuera/tvrack.
- `src/componentes/MatrizVideo.jsx` — fetch extra de tvrack en mount, handler TVRACK (hardware→server→estado), submit de matriz (BATCH 8).
- `src/componentes/SyncPanel.jsx` — UI de reconciliación; `applyDiff` de tvrack **no persiste al server** (bug, ver §9-e).
- `src/componentes/ZonasFueraStatus.jsx` — render vacío hasta el primer poll.
- `vite.config.js` — proxy `/api/*` → Express (5178/3106); fallback `/api` → Arranger directo (solo dev).

---

## Mecanismos de fallo reconstruidos (con evidencia)

### (a) "Estado del Arranger cargado y luego pisado a defaults DTV1 AV" — REPRODUCIBLE
1. Producción carga `state.json` con defaults DTV1 (legado lowdb pre-multi-PC, deploy #675 copió ese archivo). El server GANA la carga (App.jsx:87-94).
2. `estadoLoaded` → `reconcile()` a los 500ms (151-155) → ~12-24s → DONE con diffs de todo el estado.
3. Batch apply setea tvs/zonas/tvrack con valores del Arranger (214-216), dispara POSTs fire-and-forget (219-244) y abre ventana `reconciledRef` de 2s (246-247).
4. **Camino A (TOCTOU)**: un poll con fetch ya en vuelo resuelve dentro de la ventana y pisa sin re-chequear el ref (guard pre-fetch, 282/309/334).
5. **Camino B (POST fallido/lento)**: si los POSTs no aterrizan en <2s (429 del rate limiter compartido, server bajo carga, blip), el primer poll post-ventana lee el server viejo, `JSON.stringify` difiere → pisa tvs (reemplazo total `{...serverState}`, 320), zonas (287) y tvrack (346).
6. **Amplificación**: el persist effect (257-271) re-POSTea los defaults pisados al server → el veneno se vuelve autoritativo → cada refresh reproduce el ciclo. Loop auto-sostenido.

### (b) "TVRACK se reinicia al refrescar" — REPRODUCIBLE
- `tvrackState` inicial hardcodeado DTV1 (App.jsx:59) y **sin persistencia local** (grep confirma que no hay localStorage para tvrack).
- En refresh: render DTV1 → primer dato real recién en el poll de 5s (331-354) o el fetch de mount de MatrizVideo (43-49, solo en ruta /matrizvideo) → y si el server tiene valor viejo (POST fallido previo), la reconciliación de ~12s lo corrige transitoriamente… hasta que el poll lo vuelve a pisar (mismo ciclo de (a)).
- El usuario percibe: TVRACK en DTV1 tras cada F5.

### (c) "Loops de re-sincronización infinitos" — SEMI-AUTOMÁTICO (no es un loop automático en código)
- No existe auto-retry de `reconcile()` (el effect 151-155 corre una vez por `estadoLoaded`; el botón Reintentar es manual, SyncPanel:397-401).
- El "loop" es el ciclo stomp→diff→aplicar→stomp: cada corrida produce los MISMOS diffs porque los POSTs fallan o el poll vuelve a pisar; el panel auto-abre con diffs (SyncPanel:139), el usuario pulsa Reintentar/Aplicar, y repite. Sin convergencia cuando la persistencia falla.
- Oscilación entre PCs: PC-A pisa por poll → persist effect POSTea → PC-B lo ve por poll → re-POSTea → churn cruzado constante.

### (d) "Estado de otras zonas no refleja estado" — REPRODUCIBLE
- `zonasFueraState` arranca `{}` (App.jsx:60); ZonasFueraStatus muestra "No hay zonas fuera configuradas" (ZonasFueraStatus.jsx:35-42) hasta el primer poll a los 2s. Si el server está caído o el poll fue pisado, queda vacío/stale indefinidamente.

### (e) Bug adicional encontrado: `SyncPanel.applyDiff` para TVRACK no persiste al server
- `SyncPanel.jsx:215-225`: para `tvrack-video`/`tvrack-audio` hace `assignVideoSource/assignAudioSource` (Arranger ✓) + `handleChangeTvrack` (estado local ✓), pero **NUNCA llama `setTvrackVideo/setTvrackAudio`** (a diferencia del path zonas, que usa `handleZonasFueraChange` el cual sí POSTea, y del path tv, cuyo persist effect sí escribe `/api/state`).
- Resultado: server mantiene tvrack viejo → el poll de 5s pisa → el diff **reaparece en la próxima corrida para siempre**.

### (f) "Reconciliación no se ejecuta sola / sin feedback"
- Si el server responde `{state:null}` y no hay localStorage → `estadoInicial` + `errorDecos` + `estadoLoaded=true` → la reconciliación SÍ corre; el feedback sin abrir el drawer es un tab flotante ("Sin sincronizar").
- Si `VITE_ARRANGER_TOKEN` no está en el server, `/api/matrix/state` responde 503 (server.js:377) → ambas subscriptions rechazadas → ERROR con `retryCount`, sin auto-retry.
- En dev, `import.meta.env.VITE_ARRANGER_TOKEN` ausente **lanza excepción en load del módulo** (arrangerApi.js:16) — rompe toda la app, no solo la reconciliación.

---

## Constraints (verificadas contra el código)

- **Firmware v1.3.4 / API V210826**: única lectura = `get encoder` por decoder (arrangerApi.js:117-130, server.js:361-374). `get matrix`/`get joins`/`get status` de tabla NO disponibles (arrangerApi.js:166-183). Confirmado.
- **Timing Arranger**: batch de 4 = ~12s para 40 destinos (server.js:380, archive 2026-08-08 design.md:26). Batch de 8 = ~35s (cliente `reconstructMatrixState`/`joinMultipleTVs` BATCH 8, hoy solo en preset load y dev helper). La reconciliación corre video+audio en paralelo → ~12-24s por corrida.
- **Multi-PC**: 2+ browsers contra el mismo Express deben verse entre sí → origen del polling de 5s. Rate limiter compartido 500/15min queda al límite con 2 browsers (360 GET + POSTs).
- **Zonas de audio Norte/Centro/Sur** = Tesira DSP vía RS-232 (send serial) — fuera del scope de la sincronización de estado (no tocar).
- **Red LAN aislada** 192.168.2.x sin internet; producción Docker `node:22-alpine` + coexistencia Windows; server sirve `dist/` y toda la API (SPA fallback server.js:505-507).
- **No hay test runner configurado** (openspec/config.yaml: testing.runner null) — cualquier rediseño debe incluir su propia estrategia de verificación (manual + `pnpm run sportbar:build`).
- Puertos por worktree vía `worktree.config.json` (5178/3106 aquí); `vite.config.js`/`server.js` genéricos (no versionar config).

---

## Qué eliminar vs qué conservar (inventario para el rediseño)

**ELIMINAR / reemplazar (complejidad accidental acumulada):**
1. `reconciledRef` + ventana 2s (App.jsx:162,246-247,282,309,334) — heurística temporal con race TOCTOU.
2. POSTs fire-and-forget post-apply con `.catch(()=>{})` (App.jsx:219-244) — sin confirmación ni reintento.
3. `toastSuccessRef` / `appliedDiffsRef` (App.jsx:160-169) — dedup frágil por identidad de array.
4. Los 3 efectos de polling separados (277-354) + el 4º fetch de tvrack en MatrizVideo (43-49) — deben unificarse o eliminarse en favor de un mecanismo único.
5. `reconstructMatrixState` (arrangerApi.js:141-163) y `getDeviceStatus` (348-354) — código muerto.
6. Keys legacy en `estadoInicial.tvs` (`TvsBarra*`, `TvsEscalera*`, `TVRACK` dentro de tvs) — peso muerto persistido a server+localStorage+presets (Contexto.jsx:95-104).
7. Persistencia de `estado` completo vía POST `/api/state` en cada cambio (App.jsx:264-270) — amplifica cualquier stomp y compite con el rate limiter.
8. Divergencia de nomenclatura VW (`VW-Norte` vs `VWN`) manejada en 3 lugares (hook VW_REVERSE, SyncPanel VW_FORWARD, MatrizVideo vwDestNames).

**CONSERVAR (valor real):**
1. Endpoint server-side `/api/matrix/state` con batch 4 y `Promise.allSettled` (server.js:376-404) — es el único lector eficiente del Arranger; conviene agregarle retry y rate limit propio.
2. `get encoder` como primitiva de lectura (server.js:361-374, arrangerApi.js:117-130) — única lectura disponible en v1.3.4.
3. Máquina de estados de la reconciliación + `buildDiffs` 5 dominios + partial summary (hook:28-160) — lógica correcta y testeable; se puede reutilizar con una capa de persistencia distinta.
4. `AbortController` + refs frescos (hook:177-226) — patrón correcto.
5. Cache `arrangerSyncCache` + badge stale (hook:201-216, SyncPanel cachedMode) — UX útil cuando el Arranger está offline.
6. Proxy Express `/api/command/*` como único camino al hardware (server.js:489-502, arrangerApi.js:14) — la decisión de no ir directo al Arranger desde el navegador es sólida.
7. `stateLimiter` como concepto (500/15min) — revisar el presupuesto, no eliminarlo.
8. Estructura de datos separada por dominio (state/tvrack/zonasFuera/presets) en lowdb — el problema es la orquestación de escrituras, no el schema.
9. Migration v2 + backup previo (server.js:143-208) — precedente correcto para migraciones de datos.

---

## Approaches (direcciones para el proposal — NO diseñadas aún)

1. **Único dueño del estado en el server con write-through síncrono** — eliminar los 3 polls y el fire-and-forget; cada mutación (TV, tvrack, zona, preset) se hace vía endpoint con await + actualización local desde la respuesta; el multi-PC se resuelve con un canal de broadcast (SSE/WebSocket) o polling ÚNICO con versionado (`lastUpdated`/rev) en vez de comparación por `JSON.stringify`. La reconciliación pasa a ser un proceso explícito con write confirmado.
   - Pros: elimina de raíz las races de los parches; un solo mecanismo reemplaza 3+1 fetchers.
   - Cons: requiere cambios en server (SSE o rev-counters) y en todos los handlers de UI; más superficie a testear manualmente (no hay test runner).
   - Effort: **High**.
2. **Versionado + comparación robusta sin tocar la topología** — agregar `rev`/`lastUpdated` por dominio en lowdb, guards de polling después del await (fix TOCTOU), y POSTs con await+retry en el batch apply. Reemplaza `reconciledRef` por comparación de timestamps.
   - Pros: cambio más acotado; preserva la arquitectura actual; corrige los 3 mecanismos de fallo identificados.
   - Cons: sigue habiendo N fuentes de verdad compitiendo; el polling sigue siendo polling; el rate limiter sigue apretado.
   - Effort: **Medium**.
3. **Estado derivado del Arranger con cache server-side** — el server mantiene una snapshot reconciliada del Arranger (refrescada bajo demanda + TTL) y la app lee SOLO de esa snapshot; el estado del cliente es proyección pura.
   - Pros: elimina la competencia app-vs-hardware por completo; una sola fuente.
   - Cons: 12-24s por refresh completo; latencia al abrir la app; hay que cachear y decidir política de refresco (¿quién dispara el scan?).
   - Effort: **High**.

## Recommendation

Exploración completa: el terreno está mapeado con precisión quirúrgica. Recomiendo avanzar a **sdd-propose** con una propuesta basada en el enfoque 2 como núcleo inmediato (versionado por dominio + guards post-await + write-through confirmado), evaluando el enfoque 1 para la fase de consolidación si el proposal valida eliminar el polling. La decisión entre 1 y 2 es un fork real de tradeoffs (superficie de cambio vs eliminación de raíz de las races) — llevarlo al usuario en el proposal. El bug (e) de SyncPanel tvrack es fix candidato a incluir en cualquier variante.

## Risks

- El rediseño toca el camino crítico de producción (multi-PC + Arranger); sin test runner, la verificación es manual contra hardware real o mock — riesgo de regresión alto.
- Cualquier cambio en los endpoints rompe la compatibilidad con la coexistencia Windows (otro browser contra el mismo server) si no se migra en conjunto.
- El rate limiter compartido (500/15min) debe rediseñarse junto con la estrategia de escrituras, o el nuevo diseño heredará el mismo 429 en el peor momento.
- El batch de 4 (12s) es un límite duro del hardware; un rediseño que aumente la frecuencia de reconciliación puede degradar el Arranger.
- `state.json` de producción ya está envenenado con defaults; cualquier diseño necesita una estrategia de migración/backfill del estado real (reconciliación inicial confirmada), no solo nuevo código.

## Ready for Proposal

**Sí.** La exploración responde las 8 preguntas del objetivo con evidencia de código (archivo + líneas) y reconstruye los 3 flujos de fallo reportados (a, b, c) más 3 hallazgos adicionales (d, e, f). El inventario "eliminar vs conservar" y los constraints están listos para alimentar sdd-propose. Recomendación de orquestador: lanzar `sdd-propose` para `state-sync-rework` y presentar al usuario el fork entre el enfoque 1 (un solo dueño del estado, más invasivo) y el 2 (versionado + guards, acotado).

---

## Addendum (2026-08-14): Análisis del mapa lógico State Broker (chat Qwen)

> **Source**: `C:\Users\joserafael\Documents\Chats-IA\Qwen\Qwen-Mapa-logico-sistema-Arranger-2026-08-14.md` (2363 líneas, conversación del mismo día).

### Intención del usuario (extraída textual)

> *"quiero establecer una base de datos principal que maneje el estado del servidor, que cada consulta de cualquier cliente pase por este para que el estado siempre esté sincronizado con todos los clientes en tiempo real. evitar que los clientes hagan llamadas directas al arranger consultando o cambiando el estado de este."*

**Impacto en el fork de enfoques**: el usuario ya eligió implícitamente el **Enfoque 1 (State Broker / único dueño del estado en el server)**. El fork 1-vs-2 de la sección "Approaches" se reduce a: cómo de invasiva es la migración, no qué arquitectura target.

### Insights ADOPTABLES (con mapeo a nuestros mecanismos de fallo)

| Insight Qwen | Aplicación en sportbar-unified |
|---|---|
| **Separación `desiredState` vs `reportedState`** | ⭐ Clave. Hoy existe UN estado que poll/reconcile/persist se pisan mutuamente. Con la separación: `desired` = intención de los operadores (autoritativa para comandos), `reported` = última lectura Arranger. Divergencia → advertencia + decisión explícita del operador (no auto-stomp). Mata estructuralmente el mecanismo (a) (pisado a defaults) y el (c) (loop re-sincronización sin convergencia). |
| **Escrituras serializadas** (cola de comandos o locks por recurso) | Mata el churn cruzado PC-A ↔ PC-B (mecanismo (c), oscilación entre PCs). |
| **Versionado de recursos** (`version` + `updatedAt`) | Converge con el Enfoque 2: reemplaza la comparación `JSON.stringify` y habilita detección de escrituras viejas / arbitraje de frescura entre fuentes. |
| **Eventos + reconciliación como respaldo — nunca eventos solos** | Aplica en ambos sentidos: Broker→Clientes (SSE con snapshot inicial + reconnect) y Arranger→Broker (polling como ÚNICA vía, ver descarte #3). |
| **Estado global de sync** (`synced / degraded / out_of_sync / offline` + `lastSyncAt`) | Reemplaza el badge stale actual por un modelo de estados coherente y observable desde la UI. |
| **Lista de 5 anti-patrones** (clientes directo al hardware; no versionar; asumir aplicación inmediata; solo eventos; guardar payload crudo sin normalizar) | Validación externa de nuestra autopsia: el `state.json` envenenado = anti-patrón #3; el POST fire-and-forget = #3; la ausencia de versionado = #2. |
| **Modelo canónico independiente del Arranger** (adapter pattern) | Formaliza lo que el proxy Express + `arrangerApi.js` ya hacen a medias: un solo módulo dueño de las llamadas al hardware. |
| **Flujo de comando en pasos** (valida → guarda intención → ejecuta → actualiza reported → broadcast) | Plantilla directa para los endpoints de escritura del broker: cada mutación cliente → server debe seguir esta secuencia con `await`, reemplazando el fire-and-forget. |

### Recomendaciones a DESCARTAR/ADAPTAR (Qwen no conocía nuestras restricciones verificadas)

1. **PostgreSQL + Redis** — ❌ Overkill: LAN aislada sin internet, Docker `node:22-alpine`, Proxmox 3.8GB RAM, 2-3 clientes, lowdb actual funciona. Escala correcta: **lowdb + SSE + event bus en memoria** (SQLite solo si lowdb demuestra ser cuello de botella).
2. **Schema normalizado completo** (tablas `encoders`, `encoder_inputs`, `decoder_outputs`, `connections`, `command_queue`, `arranger_sync_log`) — ❌ La topología del Arranger es **estática** (40 destinos fijos, 8 fuentes DTV fijas, zonas fijas): no hay discovery dinámico ni ciclo de vida de recursos que justifique ese modelo relacional. Una proyección plana por destino basta.
3. **"Eventos del Arranger (supongo que sí)"** — ❌ FALSO, verificado contra firmware: v1.3.4 / API V210826 **no expone eventos, webhooks ni suscripciones**; la única lectura es `get encoder` por decoder (12-24s full scan, batch 4). Los eventos solo existen en la capa Broker→Clientes (SSE/WebSocket).
4. **`Connection` como recurso de primera clase con ID propio** (`conn-123`) — ❌ El Arranger no expone conexiones como recursos; el ruteo es implícito (`join av SOURCE DEST`). La proyección canónica correcta ya existe en `buildDiffs`: **destino → {videoSource, audioSource}** (+ link para TVRACK/zonas).
5. **Cola de comandos persistente con `idempotency_key`** — ⚠️ Adaptar: serialización en memoria por destino (mutex/lock por resource key) es suficiente; la persistencia de cola agrega complejidad sin beneficio en un bar con 2-3 operadores.

### Síntesis para el proposal

El rediseño target = **Enfoque 1 (State Broker)** con estos elementos del Enfoque 2 absorbidos: versionado por dominio (`version`/`lastUpdated` en lowdb) y guards post-await donde haya asincronía residual. La reconciliación Arranger pasa de "auto-apply que pisa" a "actualiza `reportedState` + señala divergencia", con apply explícito del operador (o política configurable). El broadcast multi-PC via SSE con snapshot inicial + reconciliación periódica como respaldo.
