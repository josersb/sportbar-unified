# Design: `vwall-libertador`

## Technical Approach

Aditivo y data-driven. El cliente gana UNA fuente de orden+labels (`src/data/zonasFuera.js`, ESM puro, patrón `tvGroups.js`); el server mantiene UNA lista de ids (`ZONA_FUERA_IDS`). Un backfill idempotente en `normalizeV3` (`store.js:120-130`) hace visible la #11 con `state.json` v3 existente, sin tocar writeQueue, dedupe WS5 ni el guard e97421d.

## Architecture Decisions

| # | Decisión | Opciones | Elección |
|---|---|---|---|
| D1 | Forma del módulo cliente | array `[{id,label}]` / dos exports / mapa | **array**: orden explícito en el source y `ZONA_FUERA_IDS` derivado; patrón de `tvGroups.js`. |
| D2 | Orden de la lista server | insertar al final / reordenar | **reordenar** al canónico: el bloque se reescribe igual y queda UN orden en el repo. Nada assertea ese orden. |
| D3 | Backfill | sí / no | **sí**: con v3 existente `createStore` usa `seed = legacy` tal cual (`store.js:375-376`) y `normalizeV3` solo rellena `channelIntent`/`matrixGroups`; la #11 no entra a `desired` hasta la adopción del reconciler (`reconciler.js:143-156`) → ~20-25 s de scan vivo, **nunca** offline. Y `deriveUiState` itera `desired` (`brokerClientCore.js:614`). |
| D4 | Verify del backfill | archivo nuevo / extender `verify-store` | **extender `verify-store.cjs`** (T7): ya cubre los backfills T-3.1/T-4b.1; un archivo nuevo fragmenta el concern y suma un step a `run-all`. |
| D5 | `link` default | `true` (spec) / `false` (código) | **documentar `false`**: `store.js:75,156,286` usan `false`; cambiar el default altera las 11 zonas → fuera de scope. |

## Data Flow

```
destinations.js ─→ defaultMatrix/defaultAppOnly ─→ state.json (11 claves)
                ├─→ normalizeV3 backfill ─→ reconciler scan ─→ reported
                └─→ zonasFuera.js ─→ MatrizVideo.jsx + ZonasFueraStatus.jsx (11, canónico)
```

El Aside **no** ordena por `Object.entries(zonasFueraState)` (el insertion-order de un `state.json` viejo deja la #11 al final): usa `orderedZonaFueraIds()`.

## Interfaces / Contracts

```js
// src/data/zonasFuera.js — ESM puro (patrón tvGroups.js). Orden y labels = tabla del proposal.
export const ZONAS_FUERA = [{ id, label }, /* …11 */];
export const ZONA_FUERA_IDS = ZONAS_FUERA.map((z) => z.id);
export const zonaFueraLabel = (id) => /* canónico ?? derivado del id */;
export const orderedZonaFueraIds = (state = {}) => /* canónicas presentes + desconocidas al final */;
```

`zonaFueraLabel` conserva `displayName()` (`ZonasFueraStatus.jsx:6-15`) como fallback: ninguna zona server-only queda invisible.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/data/zonasFuera.js` | Create | Los 4 exports + comentario de sync (`tvGroups.js:9-15`). |
| `src/componentes/MatrizVideo.jsx` | Modify | Borra `ZONE_LABELS` (`:13-24`) y `ZONAS_FUERA_IDS` (`:26-31`); `:397` itera `ZONAS_FUERA`, `:402` usa `label`. |
| `src/componentes/ZonasFueraStatus.jsx` | Modify | Borra `displayName` (`:6-15`); `:32` → `orderedZonaFueraIds`; `:56` → `zonaFueraLabel`. |
| `src/data/zonasFuera.test.js` | Create | Vitest puro: orden, labels, fallback, `orderedZonaFueraIds`. |
| `server/broker/destinations.js` | Modify | `ZONA_FUERA_IDS` → 11 canónico (`:26-37`); comentarios `:6-7,39` 40→41 / 10→11. |
| `server/broker/store.js` | Modify | `normalizeV3` (`:120-130`): crea los sub-dominios si faltan; `desired[id] ??= {video,audio}`, `appOnly[id] ??= {link:false}`. Sin bump. |
| `server/broker/verify/verify-destinations.cjs` | Modify | `:14` 40→41, `:20` 10→11; +2 checks: id #11 y orden canónico. |
| `server/broker/verify/verify-store.cjs` | Modify | T7: agrega la #11, idempotente, no pisa, no bumpea; caso en disco sin backup. |
| `server/broker/verify/run-all.cjs` | Modify | `:18` label 40→41. |
| `src/componentes/MatrizVideo.test.jsx` | Modify | `:258`,`:282` 10→11; `:215` título + fixture; `:232`/`:235` labels nuevos; +"Led Wall +15"; `:298` `checkboxes[1]` → `aVip-Lobby-Batacazo` (el reorder cambia la 1ª zona). |
| `scripts/dump-arranger-state.cjs` | Modify | `:49` + el id. |
| `server/server.js`, `server/broker/reconciler.js` | Modify | Comentarios `:1217` 10→11; `:11` 40→41. |
| `API commands/devices_all.txt` | Modify | +1 línea con el id (49 devices). |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit server | Backfill + 41/11 + orden | `verify-store` T7, `verify-destinations`; `run-all.cjs` |
| Unit client (puro) | Orden, labels, fallback | `vitest src/data/zonasFuera.test.js` |
| Component jsdom | 11 cards, labels, counts | `vitest MatrizVideo.test.jsx` |
| Integración (mock) | v3 con 10 zonas → 11 sin scan ni cambios en el mock | `verify-store` T7 + re-run `verify-reconciler` G y `verify-composition:323` (assertean diffs de `zonasFuera`) |

## Threat Matrix

N/A — sin routing, shell, subprocesos, VCS/PR ni integración de procesos.

## Migration / Rollout

No migration required: backfill idempotente y no destructivo, `state.json` (gitignored) sin limpieza. Trade-off (OD-3): la #11 arranca `desired={DTV1,DTV1}`/`reported={}` → `out_of_sync` transitorio hasta el primer scan (~20-25 s). Rollback: revert del PR (aditivo, ~150 líneas).

## Open Questions

- [ ] **Drift `link` de toda la tabla** (`zonas-fuera-state/spec.md:11-22,32` dice `true`; el código `false`): el delta documenta `false` para la #11; las 10 filas previas quedan inconsistentes. ¿Corregir la columna entera acá o registrarlo aparte?
- [ ] **OD-1 (audio)**: el proposal asume paridad video+audio+link; si el VWall no tiene audio operativo se necesita capability por zona (sin precedente). Confirmar antes de apply.
