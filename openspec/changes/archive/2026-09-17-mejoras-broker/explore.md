# Exploration: mejoras-broker

Change: `mejoras-broker` · Worktree `sportbar-unified-worktrees/mejoras-broker` · Branch `feat/mejoras-broker` (derivada de `v2` @ `2e751ac`).
Store mode: hybrid (Engram + OpenSpec).
Alcance: SOLO exploración, read-only sobre código de producción, sin tocar hardware.

---

## Current State (arquitectura relevante)

- **State Broker**: `server/server.js` es el único dueño del estado. Modelo `desired`/`reported` por dominio (`tvs`, `tvrack`, `zonasFuera`, `presets`), versionado, SSE (`/api/stream`), snapshot versionado (`/api/broker/state`).
- **Serialización**: `writeQueue` (`server/broker/writeQueue.js`) encadena FIFO por destino (`isBusy(key)` disponible). Por debajo, un semáforo global (`server/broker/arrangerClient.js`, `maxConcurrent=1`) serializa TODO comando al Arranger (dispositivo serial).
- **Confirmación**: PR #13 (`confirm-settling-window`, mergeado en `v2 @ 2e751ac`) parametrizó `confirmEncoder` por tipo de comando (`join av` 3700 ms / stream 2700 ms, primer read 200 ms) y agregó re-reads postergados 3 s/9 s con `SKIP setReported` cuando no confirma. **No romper**: `executeWrite` y `confirmEncoder` en `server/server.js:246-483`.
- **Reconciler** (`server/broker/reconciler.js`): cada 5 min lee `get encoder` de los 40 destinos (video+audio ≈ 80 lecturas) y auto-adopta `desired ← reported` ("Arranger gana"). Compite por turnos del semáforo con los batches de escritura.
- **Estado app-only**: `appOnly` (link de tvrack/zonasFuera) + `appOnly.appState` (decos, dispositivos, favoritos, audio, descripcionPreset). El cliente lo mantiene en memoria/localStorage y lo persiste con `POST /api/app-state` (merge parcial).
- **Testing**: SÍ está configurado (contrario a `AGENTS.md`/`openspec/config.yaml`, que están desactualizados): `vitest 3.2.6` + jsdom + Testing Library (`vitest.config.js`), 13 verifies server en `server/broker/verify/*.cjs`, verifies cliente en `src/hooks/verify/*.mjs` y `src/componentes/MatrizVideo.test.jsx`.

---

## Workstream 1 — Identidad del dispositivo "aMas15-Vwall-Libertador"

### Problema
El usuario pide una mejora sobre un dispositivo llamado "aMas15-Vwall-Libertador". Ese nombre **no existe** en ninguna fuente.

### Estado actual (file:line)
- `API commands/devices_all.txt:47` → `aMas-15-Barra-6C9308710CC6` es una **zona-fuera real** (decoder IPEX5002), no un video wall.
- `API commands/devices_all.txt:5-7` → los únicos VW son `VW-Sur`, `VW-Norte`, `VW-Centro`.
- `server/broker/destinations.js:26-37` (ZONA_FUERA_IDS) y `src/componentes/MatrizVideo.jsx:19` (`'aMas-15-Barra': '+15 Barra'`), `src/componentes/ZonasFueraStatus.jsx:6-15` (display "Mas 15 Barra").
- `src/data/tvGroups.js:24` y `src/hooks/brokerClientCore.js:664` → `barra-libertador` / `TvsBarraLivertador` = `TV01, TV02, TV03` (con typo "Livertador" en UI: `MatrizVideo.jsx:580,595`).
- `Docs/referencia-instalacion.md:126-133` usa nombres viejos para las **mismas MACs** que `devices_all.txt`: `aVip-BarraJoven2-TV08` (= `aVip-Barra-Centro`), `aVip-BarraJoven2-TV10` (= `aVip-Lobby-Batacazo`), `aVip-BarraJoven1-TV03` (= `aVip-Bar-Boveda`), `a-QMC75-Menos1-TV1/TV2` (= `a-QMR75-...`), `a-QMC65-Menos1-TV1` (= `a-Menos1-Escenario2`). La MAC `6C:93:08:71:0C:C6` de `aMas-15-Barra` **no aparece** en `referencia-instalacion.md`.

### Causa raíz
Deriva de nomenclatura entre el inventario real (`get devices` → `devices_all.txt`) y la documentación de instalación (`referencia-instalacion.md`). El nombre que usó el usuario es una combinación de "+15" (`aMas-15-Barra`) con "Vwall"/"Libertador" (grupo de barras TV01-03). No es un dispositivo único.

### Approach propuesto
**BLOQUEADO por decisión de producto.** No se puede diseñar hasta saber cuál es el dispositivo real. El approach técnico (una vez clarificado) depende de la respuesta:
- Si es `aMas-15-Barra` → ya está en `ZONA_FUERA_IDS`; la mejora es sobre el flujo de zonas-fuera.
- Si es `barra-libertador` (TV01-03) → la mejora es sobre el grupo del form de MatrizVideo (cruza con WS4/WS5).
- Si es un VW nuevo no documentado → verificar en el Arranger con `get devices` (read-only) y agregar al mapa canónico.

### Requisitos candidatos
Ninguno hasta resolver la identidad. Candidato transversal: **una única fuente de verdad de nombres** (canonizar `devices_all.txt` como fuente y marcar `referencia-instalacion.md` como histórico).

### Riesgos
- Implementar sobre el dispositivo equivocado (retrabajo + posible write al hardware incorrecto).
- Confundir el typo `Livertador`/`Libertador` (existe en UI y en grupos) con una entidad nueva.

### Dependencias
Ninguna. Es la puerta de entrada; **bloquea** a cualquier workstream que toque ese destino.

### Tamaño relativo
0 líneas (solo clarificación) hasta ~40-80 si resulta ser un VW nuevo.

---

## Workstream 2 — Bug canal 1624 (ESPN 4)

### Problema
El canal 1624 aparece en la grilla de favoritos pero al enviarlo no pasa nada (ni error ni toast).

### Estado actual (file:line)
- `src/componentes/Canales.jsx:32-33` valida `favoritos.filter((x) => x == canal).length` contra `estado.favoritos`.
- `src/contexto/Contexto.jsx:60-63` → `favoritos` = `[1603, 1604, 1605, 1608, 1609, 1610, 1612, 1613, 1614, 1620, 1621, 1622, 1623, 1625, 1628, 1629, 1631, 1639, 1644, 1677]` — **salta de 1623 a 1625** (no está 1624).
- `src/data/canalesFavoritos.js:32` → `{ canal: "1624", nombre: "ESPN 4" }` **sí existe** (es la fuente de la grilla, `Canales.jsx:90`).
- `Canales.jsx:45-48` → el `else` limpia el input y pone placeholder "numero canal no valido", **sin toast**.

### Causa raíz
Doble fuente de verdad para "canales favoritos": la grilla se renderiza desde `CANALES_FAVORITOS` (data estática) pero la validación del submit usa `estado.favoritos` (array numérico persistido, desactualizado). Drift → 1624 es visible pero rechazado en silencio. **No es un problema de IR.** Nota aparte: el dígito `"2"` no se envía por IR sino con fallback `loadChannelPreset` (`src/api/arrangerApi.js:317-326`).

### Approach propuesto
Unificar la fuente de verdad: derivar la allowlist de `CANALES_FAVORITOS` (p. ej. `Set` de `ch.canal`) y validar contra eso, no contra `estado.favoritos`. Agregar toast de error en el camino de rechazo (evitar reset silencioso). Evaluar si `estado.favoritos` sigue siendo necesario o se elimina/depreca.

### Requisitos candidatos
- Un canal es válido si está presente en `CANALES_FAVORITOS`.
- Canal inválido → feedback visible (toast), sin reset silencioso.
- La grilla y la validación comparten la misma fuente.

### Riesgos
- `estado.favoritos` puede usarse en otros componentes (verificar antes de eliminar).
- Estado persistido viejo (localStorage/appState) que no incluya 1624.

### Dependencias
Ninguna. Quick win de bajo riesgo.

### Tamaño relativo
~15-30 líneas.

---

## Workstream 3 — Estado de canales DTV en el server (write-only)

### Problema
El server guarda `canalActual` de cada deco, pero el cliente nunca lo rehidrata. Además, no hay forma de confirmar el canal contra el hardware.

### Estado actual (file:line)
- `src/App.jsx:28-36` inicializa `estado` desde `localStorage`; el `appState` del server **solo** se usa para migración inicial (`App.jsx:65-84`) y nunca para hidratar. El snapshot (`snapshot.appOnly.appState`) se ignora para `estado`.
- Escritura: `Canales.jsx:36-42` → `handleUpdateDispositivo`/`handleChangeEstadoDecos` → `persistAppState` → `POST /api/app-state` (`server/server.js:730-739`). Es write-only de facto.
- IR: `sendChannelDigits` (`src/api/arrangerApi.js:310-329`) usa `send ir` (dígitos) + `loadChannelPreset` para el dígito `"2"`.
- **Feedback del hardware (API V210826)**: `send ir` solo devuelve `send ir success` / errores del controlador (`Docs/manuals arranger/markdown/210826 Arranger DigiIP 5000 API Guide.md:2146-2150`) — es ACK del controlador, **no del deco**. `get encoder` (línea 1489-1514) devuelve el encoder suscripto (fuente de video), **no el canal**. No existe comando para leer el canal actual. El chat Qwen confirma que los modos `Reply`/`Contains`/`Equals` aplican solo a `send serial`/`send tcp`, **no a `send ir`**.

### Causa raíz
1. El cliente nunca mergea el `appState` del server → el dato persistido es inútil entre sesiones/dispositivos.
2. El canal es intrínsecamente **intención del operador** (desired), no un valor leído del hardware: la API V210826 no expone lectura del canal. Tratarlo como "reported" sería una falsa confirmación.

### Approach propuesto
Modelar el canal como **estado app-only write-through con intención explícita**: persistir `{ canalActual, lastSentAt, ack }` por deco, broadcast por SSE/appState, y **rehidratar** `estado.dispositivos` desde `snapshot.appOnly` al boot (merge, con precedencia server). Etiquetar la UI como "último canal enviado" (no "canal actual confirmado"). NO intentar confirmar contra el deco.

### Requisitos candidatos
- El canal enviado se persiste en el server y sobrevive reload / otro cliente (rehidratación).
- El ACK refleja que el controlador aceptó el comando, no que el deco cambió.
- La UI distingue intención de confirmación (semántica/copy).

### Riesgos
- Falsa sensación de confirmación si se muestra igual que el estado de matriz.
- Concurrencia de dos clientes (last-write-wins) y compatibilidad con el `estado` local preexistente.
- No golpear el Arranger real al probar (usar mock / solo POST app-state).

### Dependencias
Comparte el patrón app-only con WS4 (ambos persisten en `appOnly`). Ninguna dependencia dura.

### Tamaño relativo
~80-150 líneas (server + cliente + tests).

---

## Workstream 4 — Listas desplegables (grupos) no persisten la intención

### Problema
Las listas de grupos de MatrizVideo (Videos Wall N/C/S, Perímetro N/C/S, TVs Barra Norte/Libertador/Sur/Pista) son estado local de Formik. Si el grupo no coincide con un patrón, se pierde la intención.

### Estado actual (file:line)
- `MatrizVideo.jsx:119-130` → `initialValues` derivan de `collapseGroup(tvs, GROUP_DEFS.*)`.
- `src/hooks/brokerClientCore.js:697-708` → `collapseGroup` devuelve `values[0]` en grupos mixtos no predeterminados (pérdida de intención).
- `MatrizVideo.jsx:145-433` → el submit expande cada grupo a TVs individuales (switches por patrón).
- `appOnly` (`server/broker/store.js:61-64`) solo tiene `tvrack.link` y `zonasFuera[id].link`. **No existe** `appOnly.matrixGroups`.

### Causa raíz
El estado de selección de grupo no vive en el server ni en el estado app-only; solo existe en Formik durante el render. El colapso `reported → grupo` es lossy para combinaciones mixtas.

### Approach propuesto
Persistir `appOnly.matrixGroups` (patrón elegido por grupo), rehidratar `initialValues` desde ahí, y expandir en submit. `collapseGroup` queda como fallback cuando no hay intención guardada (p. ej. primera carga o cambio externo). Definir precedencia grupo guardado vs `reported`/preset.

### Requisitos candidatos
- La selección de grupo persiste por dominio app-only y sobrevive reload / otro cliente.
- Grupos mixtos no pierden la intención del operador.
- Un cambio externo (preset/reconciler) no genera inconsistencia silenciosa.

### Riesgos
- Presets guardan TVs individuales, no grupos → al cargar un preset, ¿qué gana el grupo guardado? (decisión abierta).
- El reconciler puede cambiar `reported` y hacer que el grupo guardado quede stale.

### Dependencias
Toca `MatrizVideo.jsx` y `store.js` (comparte archivos con WS5). Cruza con WS1 si el "dispositivo" resulta ser un grupo.

### Tamaño relativo
~80-120 líneas.

---

## Workstream 5 — Dedupe del batch "Enviar"

### Problema
El submit de "Enviar" arma **siempre** los 29 destinos y emite `join` aunque el destino ya esté en la fuente pedida (no-op).

### Estado actual (file:line)
- `MatrizVideo.jsx:450` → `sortTvsByGroup(DESTINOS_TV).map((tv) => ({ dest: tv, source: newTvs[tv] }))` — 29 mappings, sin filtro.
- `MatrizVideo.jsx:465-475` → batching cliente de 8 `Promise.allSettled(setTvSource(...))`.
- `server/server.js:350-483` (`executeWrite`) → hace `join` **siempre**, sin comparar contra `reported`/`desired`.
- `server/broker/writeQueue.js:69-71` → `isBusy(key)` disponible (guard para intención repetida en vuelo).
- `server/broker/arrangerClient.js` → semáforo global `maxConcurrent=1` (cada join cuesta un turno).
- `server/broker/reconciler.js:174-194` → cada 5 min ≈ 80 lecturas compiten por el semáforo.
- `server/server.js:801-862` (`POST /api/presets/:n/load`) → encola writes de preset sin dedupe (solo omite `audio===video`).
- **No existe** `lastBatch` en el store (verificado).

### Causa raíz
No hay comparación pre-join contra el estado confirmado (`reported`) ni guard de intención en vuelo (`isBusy`). El cliente no conoce qué TVs ya están en la fuente pedida; el server no descarta no-ops.

### Approach propuesto
Dedupe en capas, respetando PR #13:
1. **Cliente (pre-POST)**: filtrar mappings donde `tvs[dest] === source` (snapshot = reported) → no POST.
2. **Server (`executeWrite` / handler)**: si `writeQueue.isBusy(dest)` y `desired === source` → no-op (intención repetida); si `reported === source` confirmado y `desired === source` → no-op (no-op real).
3. **Preset load**: aplicar el mismo filtro.
Regla clave: deduplicar **solo contra `reported` confirmado** + guard de versión; nunca contra un `reported` potencialmente stale (one-join-lag) para no omitir un cambio real.

### Requisitos candidatos
- Un submit no emite `join` para destinos ya en la fuente confirmada.
- Una intención repetida mientras hay un write en vuelo no re-emite.
- El conteo de no-ops se refleja en el feedback (toast) sin alterar el estado.

### Riesgos
- **No-op falso por `reported` stale** (one-join-lag) → el cambio real no se aplica. Mitigación: dedupe contra confirmado + opción "forzar re-join".
- El reconciler puede auto-adoptar y enmascarar diffs.
- Toca `executeWrite` (mismo código que PR #13) → coordinar y no romper la ventana de settling.

### Dependencias
Depende conceptualmente de WS4 (qué TVs cambian). Comparte `MatrizVideo.jsx` y `server.js` con WS4/WS3.

### Tamaño relativo
~60-120 líneas.

---

## Dependencias entre workstreams

```
WS1 (identidad) ──bloquea──► WS4 / WS5 (si el destino es un grupo/zona)
WS2 ── independiente (quick win)
WS3 ── app-only ── comparte patrón con ──► WS4
WS4 ── MatrizVideo + store ── cruza ──► WS5
WS5 ── server.js executeWrite ── coordinar con PR #13 (confirm-settling-window)
```

---

## Recomendación de estructura del change

**Un solo change `mejoras-broker` con slices/PRs encadenados** (no varios changes). Justificación:
- Los 5 workstreams atacan el mismo subsistema (broker + MatrizVideo + app-only) y comparten archivos (`MatrizVideo.jsx`, `server.js`, `store.js`). Varios changes paralelos generarían conflictos de merge y duplicarían el contexto del broker.
- El repo ya usa el patrón "change único con PRs encadenados" (`confirm-settling-window`, `state-sync-rework`).
- Permite resolver WS1 en paralelo a los demás sin bloquear los quick wins.

**Orden sugerido**: WS2 (quick win, aislado) → WS3 → WS4 → WS5 → WS1 (al clarificarse).
**Excepción**: si la respuesta de WS1 es "es un VW nuevo no documentado", sacar WS1 a su propio change (alcance y riesgo distintos: tocaría `destinations.js`, `tvGroups.js`, `GROUP_DEFS` y verifies espejo).

---

## Decisiones de producto abiertas (requieren respuesta del usuario — NO resolver)

1. **WS1 (principal)**: ¿Cuál es el dispositivo real detrás de "aMas15-Vwall-Libertador"?
   (a) zona-fuera `aMas-15-Barra` (+15 Barra), (b) grupo `barra-libertador` (TV01-03), (c) un VW nuevo no documentado. Sin esto, WS1 no puede diseñarse.
2. **WS3**: ¿Se acepta que el canal sea "intención" (sin confirmación del deco, imposible en V210826) y se muestre como tal, o se prefiere no persistirlo hasta tener hardware con feedback?
3. **WS4**: Al cargar un preset, ¿gana el grupo guardado por el operador o la expansión del preset?
4. **WS5**: ¿Se acepta el riesgo de no-op falso por `reported` stale, o se agrega un modo "forzar re-join"?

---

## Estimación relativa (forecast de review)

| Workstream | Líneas aprox. | Riesgo de presupuesto 400 |
|---|---|---|
| WS1 | 0 (o 40-80 si VW nuevo) | Bajo |
| WS2 | 15-30 | Bajo |
| WS3 | 80-150 | Medio |
| WS4 | 80-120 | Medio |
| WS5 | 60-120 | Medio |
| **Total** | **~235-420 (WS1=0)** | **Medio** → PRs encadenados |

---

## Riesgos globales

- **Hardware real**: el bar puede estar abierto. Todo verify debe correr con `VITE_MOCK_ARRANGER=1`; WS2/WS4 no requieren hardware, WS3 solo POST app-state, WS5 toca joins → obligatorio mock.
- **Regresión PR #13**: WS5 toca `executeWrite`; no alterar `confirmEncoder`/ventana de settling.
- **Doble fuente de verdad**: favoritos (WS2), grupos (WS4), canal (WS3) — riesgo transversal.
- **Docs/config desactualizados**: `AGENTS.md` y `openspec/config.yaml` dicen "no testing" pero hay vitest + verifies. No basar decisiones de test en esos archivos.

---

## Ready for Proposal

**Sí, condicionado**: avanzar a `sdd-propose` para WS2-WS5; **WS1 queda bloqueado** hasta la decisión de producto #1.

---

## Affected Areas

- `src/componentes/Canales.jsx` — WS2 (validación de canal)
- `src/contexto/Contexto.jsx` — WS2 (`estado.favoritos`)
- `src/data/canalesFavoritos.js` — WS2 (fuente de verdad)
- `src/api/arrangerApi.js` — WS3 (sendChannelDigits / loadChannelPreset)
- `src/App.jsx` — WS3 (rehidratación de appState)
- `src/contexto/dispositivos.js` — WS3 (canalActual por deco)
- `server/server.js` — WS3/WS5 (app-state, executeWrite, preset load)
- `server/broker/store.js` — WS3/WS4/WS5 (appOnly, appState)
- `src/componentes/MatrizVideo.jsx` — WS4/WS5 (initialValues, submit, batch)
- `src/hooks/brokerClientCore.js` — WS4 (`collapseGroup`, `GROUP_DEFS`)
- `src/data/tvGroups.js` / `server/broker/destinations.js` — WS1/WS4/WS5 (mapas espejo)
- `src/componentes/ZonasFueraStatus.jsx` — WS1 (label +15 Barra)
- `Docs/referencia-instalacion.md` / `API commands/devices_all.txt` — WS1 (deriva de nombres)
