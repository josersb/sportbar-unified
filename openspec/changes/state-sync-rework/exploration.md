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

---

## Command Surface Gap (2026-08-16)

> Alcance: revisión del fix para `state-sync-rework` usando tres baselines divergentes. La fuente legacy es el working tree de `v2` (solo lectura); la implementación candidata y el artifact viven en este worktree.

### Baselines verificados

| Baseline | Evidencia | Uso en esta revisión |
|---|---|---|
| `v2` committed `f8ab1e5` | `git branch --show-current`, `git worktree list` | Base histórica del worktree de la feature |
| `v2` working tree | 156 entradas en `git status --short`; incluye fixes de producción y `assignVideoSource`/`assignAudioSource` | **Legacy truth**; no se modificó |
| `feat/state-sync-rework` `4a14961` | Worktree limpio `sportbar-unified-worktrees/state-sync-rework` | Broker nuevo y artifact del addendum |

### Inventario exhaustivo de la API legacy

| Función | Comando / camino que emite | Call sites de producción | Estado | Dominio |
|---|---|---|---|---|
| `sendArrangerCommand` (`:27`) | GET vía `/api/command/:command/:token` | Todos los wrappers directos | LIVE, base | proxy Arranger |
| `assignSourceToDestination` (`:75`) | `join av SOURCE DEST` | `MatrizVideo.jsx:434`, `App.jsx:517`, `joinMultipleTVs:204` | LIVE | TVs, TVRACK/zona vinculados |
| `assignVideoSource` (`:80`) | `join video SOURCE DEST` | `MatrizVideo.jsx:69`, `App.jsx:525`, `SyncPanel.jsx:215` | LIVE | TVRACK/zonas desvinculados; reconciliación legacy |
| `assignAudioSource` (`:85`) | `join audio SOURCE DEST` | `MatrizVideo.jsx:74`, `App.jsx:528`, `SyncPanel.jsx:216` | LIVE | TVRACK/zonas desvinculados; reconciliación legacy |
| `joinIr` (`:90`) | `join ir ENCODER DECODER` | Sin consumidor fuera de tests | DEAD | routing IR |
| `joinSerial` (`:95`) | `join serial ENCODER DECODER` | Sin consumidor fuera de tests | DEAD | routing serial |
| `getDevices` (`:100`) | `get devices [target]` | Sin consumidor fuera de tests | DEAD | discovery |
| `getEncoder` (`:117`) | `get encoder DECODER SUB` | `reconstructMatrixState`; helper de desarrollo en `main.jsx`, no flujo UI | DEV-ONLY / no producción | lectura de matriz |
| `reconstructMatrixState` (`:141`) | batches de `get encoder` | `main.jsx` expone helper de consola | DEV-ONLY | lectura de matriz |
| `getStatus` (`:171`) | `get status DEVICE [SUB]` | Sin consumidor; además FW-LOCKED | DEAD / FW-LOCKED | diagnóstico |
| `getMatrix` (`:176`) | `get matrix [SUB]` | Sin consumidor; FW-LOCKED | DEAD / FW-LOCKED | diagnóstico |
| `getJoins` (`:180`) | `get joins DECODER [SUB]` | Sin consumidor; FW-LOCKED | DEAD / FW-LOCKED | diagnóstico |
| `leaveAv` (`:185`) | `leave av DECODER` | Sin consumidor fuera de tests | DEAD | routing |
| `joinMultipleTVs` (`:195`) | varios `join av`, batches de 8 | `usePreset.js:66` | LIVE legacy; sustituido en PR3 | presets / TVs |
| `sendSerialCommand` (`:226`) | `send serial DTV1 "...\x0A"` vía proxy | `Audio.jsx:50-67` | LIVE, BYPASS-OK | Tesira / audio zonas |
| `loadChannelPreset` (`:238`) | `preset load decoNcanalCHANNEL` vía proxy | `sendChannelDigits:311` cuando el dígito es `2` | LIVE indirecto, BYPASS-OK | canales / decos |
| `loadMatrixPreset` (`:249`) | `preset load NAME` vía proxy | Sin consumidor fuera de tests | DEAD | preset hardware |
| `addPreset` (`:259`) | `preset add NAME COMMAND` vía proxy | Sin consumidor fuera de tests | DEAD | preset hardware |
| `deletePreset` (`:268`) | `preset delete NAME` vía proxy | Sin consumidor fuera de tests | DEAD | preset hardware |
| `getPresets` (`:276`) | `get presets` vía proxy | Sin consumidor fuera de tests | DEAD | preset hardware |
| `sendIrCommand` (`:286`) | `send ir DEVICE HEX` vía proxy | `sendChannelDigits:317` | LIVE indirecto, BYPASS-OK | IR / canales |
| `sendChannelDigits` (`:300`) | secuencia `send ir` + fallback `preset load` para `2` | `Canales.jsx:43` | LIVE, BYPASS-OK | canales / decos |
| `buildArrangerCommand` (`:332`) | helper de composición | wrappers legacy | LIVE interno | utilitario |
| `getDeviceStatus` (`:348`) | `/api/device/:id/status` → proxy `get status` | Sin consumidor | DEAD / FW-LOCKED | diagnóstico |
| `fetchTvrackState` (`:360`) | GET `/api/tvrack/state` | `MatrizVideo.jsx:44` | LIVE legacy; eliminado en PR3 | TVRACK |
| `setTvrackVideo` (`:366`) | POST `/api/tvrack/video` | `MatrizVideo`, batch de `App.jsx` | LIVE legacy; endpoint conservado en PR3 | TVRACK video |
| `setTvrackAudio` (`:376`) | POST `/api/tvrack/audio` | `MatrizVideo`, batch de `App.jsx` | LIVE legacy; endpoint conservado en PR3 | TVRACK audio |
| `setTvrackLink` (`:386`) | POST `/api/tvrack/link` | `MatrizVideo.jsx:91` | LIVE | política link |
| `fetchZonasFueraState` (`:404`) | GET `/api/zonas-fuera/state` | polling de `App.jsx:336` | LIVE legacy; eliminado en PR3 | zonas-fuera |
| `setZonasFueraVideo` (`:416`) | POST `/api/zonas-fuera/:id/video` | `App.jsx:519`, batch de reconciliación | LIVE | zonas video |
| `setZonasFueraAudio` (`:432`) | POST `/api/zonas-fuera/:id/audio` | `App.jsx:520`, batch de reconciliación | LIVE | zonas audio |
| `setZonasFueraLink` (`:448`) | POST `/api/zonas-fuera/:id/link` | `App.jsx:534` | LIVE | política link |
| `fetchMatrixState` (`:465`) | GET `/api/matrix/state?subscription=` | `useArrangerReconciliation.js:250-254` | LIVE legacy; eliminado en PR3 | reconciliación |

**Conclusión del inventario:** `join video` y `join audio` no son wrappers huérfanos ni una hipótesis documental: son caminos LIVE del working tree de producción. El nuevo cliente PR3 eliminó correctamente los joins del navegador, pero el reemplazo server-side no conservó todavía esa superficie.

### Semántica legacy por dominio

#### TVRACK

`MatrizVideo.jsx:54-85` implementa la política completa:

- `link=true`: tanto el botón de video como el de audio emite **un `join av SOURCE TVRACK`**. Luego solo persiste el campo que el usuario tocó (`setTvrackVideo` o `setTvrackAudio`); el hardware cambia ambos streams.
- `link=false` + video: emite `join video SOURCE TVRACK`.
- `link=false` + audio: emite `join audio SOURCE TVRACK`.
- Toggle en `handleLinkToggle` (`:87-95`) solo persiste `link`; **no hace re-join ni iguala video/audio inmediatamente**. El link cambia la semántica de las escrituras futuras.

El server legacy copia el campo opuesto en lowdb cuando `link=true` (`server/server.js:263-283`), pero esa copia de estado no sustituye al comando Arranger: el handler UI ya había emitido `join av`.

#### Zonas-fuera

`App.jsx:509-547` aplica exactamente la misma semántica por cada `zoneId`:

- `link=true`: `join av SOURCE zoneId`, después persiste solo video o audio según el control tocado.
- `link=false`: video usa `join video`; audio usa `join audio`.
- Toggle de link (`type === "link"`) solo hace POST de estado app-only; **no re-join**.

La lista de zonas es la de `destinations.js`: 10 destinos. El working tree de producción valida además que el endpoint actualice el campo opuesto cuando link está activo (`server/server.js:310-349`).

#### TVs principales y video walls

El submit de `MatrizVideo.jsx:420-444` del legacy construye mappings y manda `assignSourceToDestination` en lotes; cada destino real recibe `join av`. No hay semántica de audio independiente para estos destinos en la UI. El PR3 conserva esa intención mediante `POST /api/tvs/:id/source` (`state-sync-rework/src/componentes/MatrizVideo.jsx:412-423`) y el server debe seguir usando `join av` siempre para este dominio.

#### Presets

El legacy `usePreset.js:44-70` carga un snapshot de TVs y manda `joinMultipleTVs`, es decir, `join av` para cada TV. El PR3 reemplaza el batch cliente por `POST /api/presets/:n/load` (`server/server.js:360-400`) y agrega zonas/TVRACK. Esa ampliación es correcta en arquitectura, pero hoy el branch usa `executeWrite(..., "audio")` y luego `client.joinAv` sin importar `sub`; si `audio !== video`, el segundo `join av` vuelve a pisar el video.

#### Canales, IR y audio Tesira

- `Canales.jsx:27-54` usa `sendChannelDigits`, que manda IR por el proxy y usa `preset load decoNcanal0002` solo para el dígito `2`.
- `Audio.jsx:38-73` manda nueve `send serial` a `DTV1` para mute, volumen y selección de fuente de las tres zonas Tesira. Esto **no es routing de la matriz** y debe seguir fuera del broker de estado.
- En consecuencia, `send ir`, `send serial` y `preset load deco...` son **BYPASS-OK** por `/api/command`; no deben transformarse en `join` del broker.

### Superficie actual del broker nuevo

| Camino | Implementación actual | Resultado |
|---|---|---|
| `writeQueue.enqueue(dest, () => executeWrite(...))` | `server.js:340`, `:372-384`, `:413`, `:465` | Serializa por destino, pero `executeWrite` (`:188-227`) siempre llama `client.joinAv` (`:204`) e ignora el sub al seleccionar el comando |
| `arrangerClient.joinAv` | `arrangerClient.js:96-108` | Único write real del adapter; genera `join av SOURCE DEST` |
| `arrangerClient.getEncoder` | `arrangerClient.js:78-90` | Lectura post-write por `sub`; la lectura sí distingue video/audio |
| `mockArranger.joinAv` | `mockArranger.js:49-63` | `matrix[dest] = { video: source, audio: source }`; no existen joins independientes |
| `/api/tvs/:id/source` | `server.js:328-355` | Correcto conceptualmente: TV siempre AV; no es la regresión |
| `/api/tvrack/{video,audio}` | `server.js:407-431` | Lee link, pero primero siempre manda AV; con link además manda un segundo AV (`:417-419`). Con link false, el sub se ignora |
| `/api/zonas-fuera/:id/{video,audio}` | `server.js:457-477` | Misma falla: `sub` llega a `executeWrite`, pero termina en `joinAv`; con link se duplica el AV (`:468-470`) |
| `/api/presets/:n/load` | `server.js:360-400` | Manda AV para video y también AV para audio distinto; no puede restaurar video/audio independiente |
| `/api/command/:command/:token` | `server.js:536-550` | Proxy directo conservado para IR/serial/preset-deco; en mock solo simula explícitamente `join av` (`:265-283`) |

El bug es, por lo tanto, de dispatch de comando, no de `getEncoder`: el broker puede leer ambos streams, pero escribe solo el comando combinado.

### Sintaxis V210826 relevante

La wiki del working tree principal confirma para firmware v1.3.4/API V210826:

| Comando | Sintaxis usada | Efecto relevante |
|---|---|---|
| `join av` | `join av SOURCE DEST` | Cambia video + audio juntos (`wiki/API/JoinAv.md:5-9`) |
| `join video` | `join video SOURCE DEST` | Cambia solo video (`wiki/API/JoinVideo.md:5-9`) |
| `join audio` | `join audio SOURCE DEST` | Cambia solo audio (`wiki/API/JoinAudio.md:5-9`) |
| `leave av` | `leave av DEST` (`wiki/API/LeaveAv.md:5-9`) | Documentado pero no LIVE; el wrapper legacy es DEAD |
| `send ir` | `send ir DEVICE HEX` (`wiki/API/SendIr.md:7-9`) | Control IR; bypass aceptable |
| `send serial` | `send serial DEVICE "DATA"` (`wiki/API/SendSerial.md:7-9`) | RS-232/Tesira; bypass aceptable |
| `get encoder` | `get encoder DEST SUB` | Única lectura de routing disponible en v1.3.4; `get matrix`, `get joins` y `get status` quedan FW-LOCKED |

La documentación de `ArrangerApi.md:205-227` lista además comandos futuros (`mute audio`, `volume audio`, `leave video/audio`, etc.). No existe un consumidor LIVE ni wrapper operativo para esos comandos. El mute/volumen que sí usa la aplicación es serial Tesira, una capacidad distinta.

### Matriz de brechas A × B × C

| Capability | Legacy LIVE | Broker PR1-4 | Clasificación | Acción |
|---|---:|---:|---|---|
| TV principal/video wall → video+audio | Sí | `join av` | OK | Mantener `executeWrite` AV para dominio `tvs` |
| TVRACK link=false → solo video | Sí | `join av` | **REGRESIÓN** | Agregar `joinVideo` y dispatch por `sub` |
| TVRACK link=false → solo audio | Sí | `join av` | **REGRESIÓN** | Agregar `joinAudio` y dispatch por `sub` |
| TVRACK link=true → ambos | Sí | Dos `join av` | REGRESIÓN de eficiencia/semántica | Un solo `join av`; actualizar/confirmar ambos subs |
| Zona link=false → solo video | Sí | `join av` | **REGRESIÓN** | Dispatch `joinVideo` |
| Zona link=false → solo audio | Sí | `join av` | **REGRESIÓN** | Dispatch `joinAudio` |
| Zona link=true → ambos | Sí | Dos `join av` | REGRESIÓN de eficiencia/semántica | Un solo `join av`; confirmar ambos |
| Preset TV con `join av` | Sí | `join av` | OK | Mantener |
| Preset zona/TVRACK con `video !== audio` | Nueva capacidad PR3, requerida por snapshot | Dos AV que pisan video | **REGRESIÓN** | Cargar por sub independiente cuando link=false |
| Reconciliación de video/audio después de preset | Sí, como intención del diseño | Lecturas separadas, estado mock combinado | **REGRESIÓN derivada** | Mock independiente + verify de cero adopciones espurias |
| `send ir` / `sendChannelDigits` | Sí | Proxy directo | **BYPASS-OK** | No migrar al broker de routing |
| `send serial` Tesira mute/volume/source | Sí | Proxy directo | **BYPASS-OK** | No modelar como routing de matriz |
| `preset load deco...` para dígito 2 | Sí indirecto | Proxy directo | **BYPASS-OK** | Mantener |
| `joinIr`, `joinSerial` | No | No adapter broker | **DEAD** | No incluir en PR5 |
| `getDevices` | No | No adapter broker | **DEAD** | No incluir en PR5 |
| `getStatus`, `getMatrix`, `getJoins` | No; además FW-LOCKED | Getters FW-LOCKED conservados | **DEAD/FW-LOCKED** | No desbloquear |
| `leaveAv` | No; wrapper legacy sin consumidores | Ausente | **DEAD** | No incluir en PR5 |
| `addPreset`, `deletePreset`, `getPresets`, `loadMatrixPreset` | No | No broker | **DEAD** | No confundir con presets app del broker |
| `mute audio`, `unmute audio`, `volume audio` Arranger | No | No | **NUNCA-IMPLEMENTADO** | Futuro separado; la UI usa Tesira serial |
| `leave video/audio/all`, `join all/kvm/wall`, CEC/TCP/GC | No | No | **NUNCA-IMPLEMENTADO** | Futuro, fuera del fix |

### Decisión de diseño propuesta: dónde vive `link`

Se compararon dos opciones:

1. **Cliente manda el comando (`join av`/`join video`/`join audio`)**.
   - Pros: replica literalmente el legacy; server más simple.
   - Contras: contradice el objetivo PR3 de que el cliente no conozca ni arbitre el hardware; permite que un cliente viejo o malicioso ignore el `link` persistido; la decisión puede quedar obsoleta mientras la escritura espera en `writeQueue`.

2. **Server decide por destino + sub + link app-only, dentro de la cola** (**recomendada**).
   - Pros: el broker sigue siendo el único dueño; la decisión es atómica respecto de la escritura encolada; `link` permanece app-only y no se infiere desde una lectura del Arranger; el cliente solo expresa intención `video` o `audio`.
   - Contras: `executeWrite` debe actualizar dos sub-keys y hacer dos lecturas cuando link=true; los presets deben definir cómo transportar/restaurar la política link.

Contrato recomendado para `executeWrite(dest, source, sub)`:

- dominio `tvs`: siempre `joinAv`; actualiza/confirma solo el stream video del modelo de TVs.
- dominio `tvrack` o `zonasFuera`, `link=false`: `sub=video` → `joinVideo`; `sub=audio` → `joinAudio`; actualiza/confirma únicamente ese stream.
- dominio `tvrack` o `zonasFuera`, `link=true`: un único `joinAv`; actualiza `desired.video` y `desired.audio` al mismo source y confirma ambos con `getEncoder`.
- `link` se consulta **dentro de la función ejecutada por `writeQueue`**, no antes de encolar. El toggle no hace re-join; solo afecta la próxima escritura.

Para presets, el snapshot debe tratar `link` como política app-only. El caso verificable de PR5 es `link=false` + `video !== audio`, que debe preservar ambos streams. Si el snapshot trae `link=true`, debe exigir `video === audio` o devolver un error de validación; no se debe elegir silenciosamente un stream y generar una adopción falsa. Si se decide no ampliar el schema de presets en PR5, el endpoint debe documentar que usa el `link` app-only actual y agregar un guard explícito para snapshots incompatibles.

### Plan de fix ordenado

#### Fase 0 — Delta de contrato y trazabilidad

- Amend de `openspec/changes/state-sync-rework/specs/state-broker/spec.md`: dispatch por sub, semántica link server-side, un AV para link=true y no re-join al togglear.
- Amend de `specs/zonas-fuera-state/spec.md`: reemplazar la lectura implícita “POST video = join video” por la matriz link=false/link=true.
- Amend de `specs/preset-complete-snapshot/spec.md`: escenario `video !== audio` y preservación de ambos streams.
- Amend de `specs/arranger-reconciliation/spec.md`: después de preset load, lecturas video/audio separadas no producen adopciones espurias.
- Revisar `specs/arranger-api-centralized/spec.md` para declarar `joinVideo`/`joinAudio` como adapter server-side, no API de UI.

#### Fase 1 — Adapter Arranger y mock

- `server/broker/arrangerClient.js`: extraer helper de join y agregar `joinVideo(source, dest)` y `joinAudio(source, dest)`, con el mismo contrato `{ ok, text, status/error }` que `joinAv`.
- `server/broker/mockArranger.js`: conservar `matrix[dest] = {video, audio}`; `joinAv` actualiza ambos, `joinVideo` solo video y `joinAudio` solo audio. Mantener modos `normal`, `blip` y `offline`.
- `server/broker/verify/verify-arranger-client.cjs`: asserts de comando/resultado para ambos nuevos métodos.
- `server/broker/verify/verify-mock.cjs`: secuencia `joinAv(DTV2)`, `joinVideo(DTV3)`, `joinAudio(DTV4)` y asserts `video=DTV3`, `audio=DTV4`.

#### Fase 2 — Dispatch y política link en el broker

- `server/server.js`, principalmente `executeWrite`, `tvrackWrite` y `zonaFueraWrite`:
  - resolver dominio y link dentro de la operación serializada;
  - seleccionar `joinAv`/`joinVideo`/`joinAudio` según el contrato;
  - eliminar el segundo `executeWrite` AV de `:417-419` y `:468-470`;
  - cuando link=true, persistir/confirmar ambos streams sin duplicar comandos;
  - mantener TVs principales en AV siempre.
- Preservar respuestas compatibles `{ video, audio, link, lastUpdated }` para TVRACK y `{ zoneId, video, audio, link, lastUpdated }` para zonas.

#### Fase 3 — Preset load y reconciliación

- `server/server.js` `POST /api/presets/:n/load`: despachar video/audio según la política link; nunca usar `joinAv` para el segundo stream cuando están separados.
- Si se incluye `link` en snapshot: restaurar la política app-only antes de escribir y validar el invariante `link=true ⇒ video===audio`. Si no se incluye en PR5, usar la política app-only vigente y rechazar estados incompatibles de forma explícita.
- `server/broker/verify/verify-composition.cjs`: agregar preset con zona y/o TVRACK `video=DTV3`, `audio=DTV4`, `link=false`; verificar mock y `reported` separados.
- `server/broker/verify/verify-reconciler.cjs`: después del load, ejecutar `scanOnce()` y afirmar `desired===reported` por sub, `adopted===0` para el estado ya confirmado y ningún video adoptado desde audio.
- No modificar la lógica correcta de `reconciler.js` que ya llama `getEncoder(dest, "video")` y `getEncoder(dest, "audio")`; la prueba debe demostrar que el adapter/mock ahora le entregan una matriz coherente.

#### Fase 4 — Gates de verificación

- Ejecutar verificaciones node-based existentes: `node server/broker/verify/run-all.cjs`.
- Ejecutar los nuevos asserts de superficie de comandos y composición contra mock; no requiere test runner UI ni hardware real.
- Ejecutar `pnpm run sportbar:build` como gate de producción (según AGENTS), sin modificar configuración del worktree.
- Inspeccionar con `git grep` que ningún componente PR3 vuelva a importar `assignVideoSource`, `assignAudioSource` o `joinMultipleTVs`; el cliente debe seguir usando endpoints broker.

### Estimación y encaje en PR 5

Estimación orientativa, sin reescribir UI:

| Área | Líneas nuevas/modificadas |
|---|---:|
| Adapter + mock | 60–100 |
| `server.js` dispatch/endpoints/preset | 100–170 |
| Verificaciones node-based | 100–160 |
| Delta specs/tasks amendment | 60–100 |
| **Total** | **320–530** |

Cabe como **PR 5** si se mantiene acotado al adapter, broker, mock, verifies y delta specs, apuntando a ~350–400 líneas. Si además se cambia el schema de presets para capturar/restaurar `tvrack.link` y se agregan migraciones amplias, conviene dividir en PR5a (surface gap + dispatch) y PR5b (link dentro de snapshots), porque el total supera el límite de revisión del chain.

### Gaps encontrados

1. **Confirmado — `join video` ausente del broker**: todas las escrituras independientes terminan en `join av`.
2. **Confirmado — `join audio` ausente del broker**: el audio independiente pisa el video.
3. **Confirmado — mock falso para este caso**: modela solo `join av`, por lo que no puede detectar aislamiento de streams.
4. **Confirmado — link duplicado**: los endpoints write-through ejecutan dos `join av` cuando link=true, en lugar de un solo comando combinado.
5. **Confirmado — preset load incorrecto con `audio !== video`**: el segundo AV pisa el primer stream.
6. **Confirmado — cobertura de verify insuficiente**: las verificaciones actuales solo asertan `joinAv`; no existe un caso de video/audio independiente.
7. **No gap de routing — IR/serial/preset-deco**: siguen por proxy directo y son LIVE/BYPASS-OK.
8. **No gap LIVE — wrappers dead/FW-locked**: `joinIr`, `joinSerial`, `getDevices`, getters FW-LOCKED, `leaveAv` y CRUD de presets Arranger no deben entrar en este fix.

### Risks específicos

- Un cambio de link durante una escritura encolada puede producir decisiones stale si se lee antes de `writeQueue`; por eso la resolución debe vivir dentro de `executeWrite`.
- Un snapshot con `link=true` y fuentes distintas es semánticamente inconsistente; debe validarse, no resolverse con una elección silenciosa.
- El mock debe mantener el mismo conteo de llamadas que el hardware lógico; los modos blip/offline pueden hacer que una lectura post-write sea null y no deben convertir eso en adopción.
- La reconciliación ya adopta `reported` sobre `desired`; el verify post-preset es obligatorio para probar que la causa raíz no es un falso diff, no para cambiar la política Arranger-gana.
- La fuente legacy principal tiene 156 cambios sin commitear; cualquier implementación debe continuar aislada en este worktree y no usar `stash`, `checkout` ni escritura sobre `v2`.

### Recommendation

Avanzar con **PR 5 acotado al State Broker**: el server debe conservar la semántica de link y decidir el comando; `joinVideo`/`joinAudio` deben existir únicamente en el adapter interno; el mock y las verificaciones deben modelar streams independientes. El fix corrige una regresión real de producción sin reabrir el diseño de polling/SSE ni migrar IR/serial al broker. Tratar el link de snapshots como una decisión explícita en la propuesta/tareas; como mínimo, PR5 debe cubrir y verificar `link=false` con `video !== audio`.
