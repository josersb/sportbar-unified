# Exploration: `vwall-libertador` — modelar `aMas15-Vwall-Libertador` como zona fuera #11

**Fecha**: 2026-09-17
**Rama**: `feat/LedWallmas15` (desde `v2` @ 927a616)
**Método**: lectura read-only de código + `run-all.cjs` + `vitest MatrizVideo.test.jsx`. Sin acceso al Arranger (la evidencia del device ya está en `ws1-audit.md`).

## Current State

El modelo de "zonas fuera de sportbar" es **data-driven sobre una sola lista** (`ZONA_FUERA_IDS`). Todo lo demás deriva de ahí:

- **Server**: `destinations.js` exporta `ZONA_FUERA_IDS` → `MATRIX_DESTINATIONS` (40 = 26 TVs + 3 VW + TVRACK + 10 zonas). `store.js` (defaults `desired`/`appOnly`), `reconciler.js` (scan `get encoder`), `mockArranger.js` y `server.js` (validación `validateZonaFueraId`) consumen esa lista. **Ninguno tiene la lista duplicada.**
- **Cliente**: `MatrizVideo.jsx` tiene su **propia copia** de `ZONAS_FUERA_IDS` (`:26-31`) + un mapa `ZONE_LABELS` (`:13-24`). `ZonasFueraStatus.jsx` **no** tiene lista: itera `Object.entries(zonasFueraState)` y deriva el nombre del ID con `displayName()` (`:6-15`). `brokerClientCore.js:589-622` (`deriveUiState`) itera **`domains.zonasFuera.desired`** (no `reported`) y mergea reported + optimistic + `appOnly.link`.
- **Persistencia**: `server/state.json` (v3, **gitignored**) tiene `domains.zonasFuera.desired/reported` + `appOnly.zonasFuera[id].link`.
- **Baseline verificado hoy**: `node server/broker/verify/run-all.cjs` → **TODAS LAS VERIFICACIONES PASARON**; `vitest MatrizVideo.test.jsx` → **41/41**.

**Hallazgo clave #1 — self-healing del estado existente**: con un `state.json` v3 ya existente, `createStore` usa `seed = legacy` tal cual y `normalizeV3` solo backfillea `channelIntent`/`matrixGroups`. La zona #11 **no** aparece en `desired` hasta que el **reconciler** la adopta (`adoptDomain("zonasFuera", …)` sí crea la clave: `reconciler.js:143-156`). Es decir: tras el primer scan de arranque (~20-25s, requiere hardware vivo) la zona aparece sola; si el Arranger está offline, la card de MatrizVideo se renderiza con `—` pero la zona **no** aparece en el Aside.

**Hallazgo clave #2 — la lista de zonas está duplicada en 2 lugares del cliente y no hay labels en el server**. El label del Aside se **deriva** del ID: `aMas15-Vwall-Libertador` → `"Mas15 Vwall Libertador"`. Y ya existe una inconsistencia de labels entre componentes (`aMas-15-Barra` → Aside "Mas 15 Barra" vs MatrizVideo "+15 Barra"). Agregar la zona sin tocar `ZonasFueraStatus` **agrava** esa inconsistencia.

**Hallazgo clave #3 — el mock no necesita cambios**: `mockArranger.js:46` itera `MATRIX_DESTINATIONS`, así que la zona #11 entra sola en todos los verifies basados en mock.

## Affected Areas

### Producción (obligatorio)
| Archivo | Línea | Qué |
|---|---|---|
| `server/broker/destinations.js` | 26-37 | agregar `"aMas15-Vwall-Libertador"` a `ZONA_FUERA_IDS` |
| `server/broker/destinations.js` | 6-7, 39 | comentarios "40 destinos / 10 zonas fuera" → 41 / 11 |
| `src/componentes/MatrizVideo.jsx` | 26-31 | copia cliente de `ZONAS_FUERA_IDS` — agregar id |
| `src/componentes/MatrizVideo.jsx` | 13-24 | `ZONE_LABELS` — agregar label (decisión abierta #3) |
| `scripts/dump-arranger-state.cjs` | 38-52 | lista `DESTINATIONS` hardcodeada — agregar id |
| `server/server.js` | 1217 | comentario "10 zonas externas" → 11 |
| `server/broker/reconciler.js` | 11 | comentario "40 destinos" → 41 |

### Cliente — decisión de label (ver open_decisions)
| Archivo | Línea | Qué |
|---|---|---|
| `src/componentes/ZonasFueraStatus.jsx` | 6-15 | `displayName()` deriva del ID → "Mas15 Vwall Libertador". Opción A: no tocar. Opción B: mapa de labels compartido. |

### Tests / verifies que rompen o hay que actualizar
| Archivo | Línea | Qué | Rompe? |
|---|---|---|---|
| `server/broker/verify/verify-destinations.cjs` | 14 | `40 destinos` | **SÍ** |
| `server/broker/verify/verify-destinations.cjs` | 20 | `10 zonas fuera` | **SÍ** |
| `src/componentes/MatrizVideo.test.jsx` | 258 | `dashes.length).toBe(10)` | **SÍ** (→ 11) |
| `src/componentes/MatrizVideo.test.jsx` | 282 | `linkLabels.length).toBe(10)` | **SÍ** (→ 11) |
| `src/componentes/MatrizVideo.test.jsx` | 215, 216-227 | título "renders 10 zona cards" + fixture de 10 zonas | cosmético |
| `server/broker/verify/run-all.cjs` | 18 | label "destinos canónicos (40, …)" | cosmético |

**Sin impacto (verificado)**: `store.js`, `matrixModel.js`, `mockArranger.js`, `reconciler.js` (lógica), `src/data/tvGroups.js`, `src/contexto/dispositivos.js`, `src/hooks/brokerClientCore.js`, `src/api/arrangerApi.js`, `server/broker/verify/{verify-store,verify-reconciler,verify-composition,verify-groups,verify-matrix-groups,verify-mock}.cjs`, `src/hooks/verify/*.mjs`, `src/componentes/ShellRoutes.test.jsx`, `vite.config.js` (proxy por prefijo).

### Specs (deltas)
| Archivo | Línea | Qué |
|---|---|---|
| `openspec/specs/zonas-fuera-state/spec.md` | 4 | Purpose "10 zonas externas" → 11 |
| `openspec/specs/zonas-fuera-state/spec.md` | 11-22 | tabla de defaults — agregar fila |
| `openspec/specs/zonas-fuera-state/spec.md` | 27, 32 | "all 10 zones" → 11 |
| `openspec/specs/destinos-adicionales/spec.md` | 4 | "Registro de 10 decoders IPEX5002" → 11 |
| `openspec/specs/registro-dispositivos/spec.md` | 50 | "10 IPEX5002 destinations" → 11 |
| `openspec/specs/state-broker/spec.md` | 260-266 | requirement de auditoría del device — histórico, **no se toca** |

### Docs / Wiki (decisión abierta #4)
| Archivo | Línea | Qué |
|---|---|---|
| `wiki/Componentes/MatrizVideo.md` | 55 | "(10 destinos)" → 11 + agregar nombre |
| `wiki/log.md` | — | entrada de ingest |
| `Docs/referencia-instalacion.md` | 122-133 | tabla "Zonas Adicionales" — ya desactualizada (8 filas, nombres legacy, sin `aMas-15-Barra`) |
| `API commands/devices_all.txt` | 47 | captura feb-2026 (48 devices) — falta el device |
| `AGENTS.md` | — | **no** enumera zonas fuera → sin cambio |

## Approaches

### 1. Mínimo viable — extender las 2 listas duplicadas
Agregar el ID a `destinations.js` + `MatrizVideo.jsx`, label en `ZONE_LABELS`, actualizar los 4 checks rotos y los 3 spec deltas. El Aside muestra el nombre derivado "Mas15 Vwall Libertador".
- Pros: cambio más chico; cero refactor; sin riesgo de regresión estructural.
- Cons: consolida la duplicación existente; el label del Aside queda feo e inconsistente con MatrizVideo.
- Effort: **Low** (~35 líneas).

### 2. Mínimo + módulo cliente único de zonas fuera (recomendado)
Igual que 1, pero extrayendo `src/data/zonasFuera.js` (ES module puro) con `ZONAS_FUERA_IDS` + `ZONE_LABELS`, consumido por `MatrizVideo.jsx` **y** `ZonasFueraStatus.jsx`. Elimina la duplicación cliente y unifica el label en ambas vistas.
- Pros: mata una duplicación real (drift garantizado a futuro); label consistente; módulo puro = testeable sin DOM; alinea con el patrón ya usado en `tvGroups.js`.
- Cons: toca 3 archivos de cliente + sus tests; un poco más de superficie de revisión.
- Effort: **Medium** (~70 líneas).

### 3. Mínimo + backfill explícito en `normalizeV3`
Igual que 1 o 2, más extender `normalizeV3` (`store.js:120-130`) para rellenar las claves faltantes de `zonasFuera` (desired + appOnly) desde `ZONA_FUERA_IDS`. La zona #11 aparece en el Aside **inmediatamente** en un deploy existente, sin esperar el scan.
- Pros: UX determinista; no depende de que el hardware responda; mismo patrón idempotente que el backfill T-3.1 ya existente.
- Cons: genera un `desired=DTV1` transitorio vs `reported` real → `out_of_sync` hasta el primer scan que adopta (comportamiento honesto, pero visible).
- Effort: **Low-Medium** (~15 líneas + 1 check en `verify-store`).

## Recommendation

**Approach 2 + 3 combinados**, en un solo PR: es un cambio de ~85 líneas, muy por debajo del review policy de 400. Concretamente:

1. `destinations.js` — agregar el ID (fuente de verdad server).
2. `src/data/zonasFuera.js` — nuevo módulo cliente con IDs + labels; consumido por `MatrizVideo.jsx` y `ZonasFueraStatus.jsx`.
3. `store.js` — backfill idempotente de claves de zona faltantes en `normalizeV3`.
4. Actualizar 4 checks + 2 tests + 3 spec deltas.
5. `dump-arranger-state.cjs` + comentarios.

El backfill (3) es lo que evita el peor caso: que en producción el operador no vea la zona nueva en el Aside hasta que el scan corra, o nunca si el Arranger está offline.

**Slice alternativo** si el usuario quiere revisión más fina: slice A = functional + tests + specs (approaches 1+3), slice B = refactor de labels compartidos (approach 2). Auto-chain disponible.

## Open Decisions

### OD-1 — ¿Video+audio+link, o solo video? *(requiere respuesta del usuario)*
**Contexto**: el modelo de zonas fuera es uniforme `{video, audio, link}` y el Arranger registra el device como decoder IPEX5002 (misma familia MAC `6C:93:08:71:0C:xx` que las otras zonas → tiene HDMI OUT + Audio OUT). La card de MatrizVideo expone **solo botones de video + toggle link** (no hay botones de audio por zona); el audio se setea vía `join av` (link) o por preset/reconciler. El Aside muestra ambas columnas.
**Recomendación**: paridad total (video/audio/link). Es **cero código extra** y "solo video" exigiría un concepto nuevo de capability por zona (sin precedente en el modelo).
**Pregunta**: ¿el VWall del Libertador tiene audio operativo, o el audio se ignora?

### OD-2 — Nombre / label de display *(requiere respuesta del usuario)*
| Opción | Label | ID sugerido | Nota |
|---|---|---|---|
| A | `VWall Libertador` | `aMas15-Vwall-Libertador` | más fiel al nombre del hardware |
| B | `Led Wall +15` | `aMas15-Vwall-Libertador` | describe función + sector (el usuario pidió "LedWall") |
| C | `VWall +15 Libertador` | `aMas15-Vwall-Libertador` | explícito, más largo |
| D | (sin label) | `aMas15-Vwall-Libertador` | Aside muestra "Mas15 Vwall Libertador" |

**Recomendación**: ID `aMas15-Vwall-Libertador` (idéntico al Arranger → cero ambigüedad en `join` y en logs) + label **A** o **B** según lo que el usuario reconozca visualmente. El ID **no** es negociable en la práctica: debe coincidir con el nombre del device en el Arranger para que `join av DTVx aMas15-Vwall-Libertador` funcione.

### OD-3 — Backfill en `normalizeV3` (sí/no)
¿Aceptamos el `out_of_sync` transitorio a cambio de visibilidad inmediata en deploys existentes? Recomendación: **sí**.

### OD-4 — ¿Actualizar `Docs/referencia-instalacion.md` y `API commands/devices_all.txt`?
Ambos están ya desincronizados con el modelo (la tabla tiene 8 zonas con nombres legacy; el `devices_all.txt` es la captura de feb-2026 con 48 devices y el modelo ya tiene 10 zonas). Recomendación: **sí a `devices_all.txt`** (tenemos la salida cruda de 49 devices en `ws1-audit.md` — actualizarla es evidencia, no invento) y **wiki `MatrizVideo.md` + `log.md`**. `referencia-instalacion.md`: **diferir** a un change de saneamiento documental (mezcla MACs/nombres legacy y no tiene ni `aMas-15-Barra` ni `RACK-VIP-PANTALLABATACA`).

## Verify Impact

| Verify / test | Estado hoy | Impacto | Checks que rompen |
|---|---|---|---|
| `server/broker/verify/verify-destinations.cjs` | ✓ | **rompe** | 2 (`40 destinos`, `10 zonas fuera`) |
| `server/broker/verify/run-all.cjs` (18 steps) | ✓ TODAS | pasa | 0 (solo label cosmético) |
| `src/componentes/MatrizVideo.test.jsx` (41 tests) | ✓ 41/41 | **rompe** | 2 (`dashes` 10→11, `linkLabels` 10→11) |
| resto de verifies server (16 steps) | ✓ | pasa | 0 |
| `src/hooks/verify/*.mjs` | ✓ | pasa | 0 (usan IDs explícitos, sin counts) |
| `src/componentes/ShellRoutes.test.jsx` | ✓ | pasa | 0 |

**Total: 4 checks en 2 archivos** + 2 cosméticos. Si se agrega el backfill en `normalizeV3`: +1 check nuevo en `verify-store.cjs`. Si se agrega el módulo cliente compartido: +2 tests nuevos sugeridos (labels unificados).

## Size Estimate

| Bloque | Líneas |
|---|---|
| Producción server (destinations, store backfill, comentarios) | ~20 |
| Producción cliente (módulo nuevo + 2 consumidores) | ~40 |
| Scripts (`dump-arranger-state.cjs`) | ~1 |
| Tests + verifies | ~20 |
| Spec deltas (3 archivos) | ~12 |
| Docs / wiki | ~10 |
| Artefactos openspec del change | (aparte) |
| **Total código+docs** | **~100** |

→ **Un solo PR**. Muy por debajo del review policy de 400 líneas. Si se quiere separar: slice A (funcional + backfill + tests + specs) ≈ 65 líneas, slice B (labels compartidos) ≈ 35 líneas.

## Risks

1. **Visibilidad diferida en deploy existente** (si NO se hace OD-3): la zona #11 no aparece en el Aside hasta el primer scan del reconciler (~20-25s) y **nunca** si el Arranger está offline. Mitigación: backfill en `normalizeV3`.
2. **Nombre del device incorrecto** = `join` silenciosamente inefectivo. El ID debe ser **exacto** al del Arranger (`aMas15-Vwall-Libertador`, case-sensitive, sin el prefijo `a-`). Mitigación: el ID sale literal de `ws1-audit.md` línea 10.
3. **Drift de la lista duplicada**: si se elige approach 1, quedan 2 copias (server + MatrizVideo) + 1 derivación (ZonasFueraStatus). Riesgo de olvidar una en el próximo device.
4. **Inconsistencia de labels ya existente** (`+15 Barra` vs `Mas 15 Barra`) se agrava si no se unifica (OD-2/approach 2).
5. **Discrepancia pre-existente en el default de `link`**: la spec (`zonas-fuera-state/spec.md:11-22`) dice `link: true` para todas las zonas, pero `store.js:75` (`defaultAppOnly`) pone `false`. No es introducido por este change, pero al agregar la fila #11 hay que decidir cuál documentar. Recomendación: documentar el comportamiento real (`false`) y registrar la discrepancia como hallazgo aparte.
6. **Transitorio `out_of_sync`** por OD-3 (deseado `DTV1` vs reported real hasta el primer scan). Es honesto pero el operador puede ver el banner "⚠️ Sin sincronizar" unos segundos.

## Ready for Proposal

**Sí**, con 2 respuestas del usuario pendientes: **OD-1** (streams) y **OD-2** (label). OD-3 y OD-4 tienen recomendación y pueden resolverse por defecto si el usuario no objeta.
