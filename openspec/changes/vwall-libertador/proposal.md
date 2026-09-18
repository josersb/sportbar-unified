# Proposal: `vwall-libertador` — zona fuera #11 + reorden de zonas fuera

## Intent

El Arranger reporta `aMas15-Vwall-Libertador` (`6C9308710CD2`) como device real (`ws1-audit.md`), pero el modelo tiene 10 zonas fuera y el hardware 11: la zona es inoperable desde la app. Además, el orden y varios labels de las zonas fuera divergen entre MatrizVideo (hardcode) y el Aside (derivados por heurística). Este change incorpora la zona #11 y unifica orden + labels en una sola fuente.

## Scope

### In Scope
- Zona #11 `aMas15-Vwall-Libertador` en **paridad total** (video + audio + link), label UI "Led Wall +15".
- **Orden definitivo de las 11 zonas fuera**, idéntico en "ZONAS FUERA DE SPORTBAR" (MatrizVideo) y en "Estado de otras zonas" (Aside / `ZonasFueraStatus`):

| # | ID | Label |
|---|----|-------|
| 1 | `aVip-Lobby-Batacazo` | VIP Bar Lobby *(renombre)* |
| 2 | `aVip-Bar-Boveda` | VIP Bar Bóveda |
| 3 | `aVip-Barra-Centro` | VIP Barra Centro |
| 4 | `RACK-VIP-PANTALLABATACA` | Rack VIP Bataca |
| 5 | `aMas-15-Barra` | Barra Irineo +15 *(renombre)* |
| 6 | `aMas15-Vwall-Libertador` | Led Wall +15 *(nueva, MAC 6C9308710CD2)* |
| 7 | `a-QMR75-Menos1-TV1` | QMR75 -1 TV1 |
| 8 | `a-QMR75-Menos1-TV2` | QMR75 -1 TV2 |
| 9 | `a-QMC65-Menos1-TV2` | QMC65 -1 TV2 |
| 10 | `a-Menos1-Escenario` | Escenario -1 |
| 11 | `a-Menos1-Escenario2` | Escenario -1 (2) |

- Módulo cliente `src/data/zonasFuera.js`: IDs→label **en orden**, fuente única para ambas vistas.
- Backfill idempotente de claves de zona faltantes en `normalizeV3` (`store.js`).
- Constraints de API: solo comandos de V210826 (`get encoder <decoder> video|audio` SÍ; `get matrix`/`get joins` NO en firmware 1.3.4); patrón `verify-*.cjs` registrado en `run-all.cjs`; respetar `confirmEncoder`/settling (PR #13), dedupe WS5 y guard del reconciler (e97421d).
- Specs: 3 deltas. Tests/verifies: 4 checks rotos. Counts y comentarios (41 destinos / 11 zonas).
- Docs: `API commands/devices_all.txt` (evidencia real, 49 devices).

### Out of Scope
- Integración MagicINFO (dominio aparte, decisión de negocio pendiente).
- Quick wins QW-1/2/4 (`Docs/development/planning/arranger-api-quickwins.md`).
- Re-clasificación del catálogo API (documentación de otra sesión → change aparte).
- `Docs/referencia-instalacion.md` (ya desincronizado → change de saneamiento documental).
- Modelar un VW nuevo en la matriz de grupos.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `zonas-fuera-state`: tabla de defaults a 11 filas **en orden**; counts 10→11; scenario de backfill en `normalizeV3`; orden y labels canónicos (renames incluidos).
- `destinos-adicionales`: registro y count 10→11; label "Led Wall +15".
- `registro-dispositivos`: `Destination Registration` 10→11.

## Approach

Modelo data-driven sobre `ZONA_FUERA_IDS`; ningún consumidor server duplica la lista.

- **Cliente**: `src/data/zonasFuera.js` (ESM puro, patrón `tvGroups.js`) expone IDs→label en el orden definitivo. `MatrizVideo.jsx` y `ZonasFueraStatus.jsx` lo consumen. **Sin unificar, el reorder se rompe en una de las dos vistas** (hoy el Aside deriva el nombre con `displayName()` y no tiene lista).
- **Server**: +1 ID en `destinations.js`; backfill idempotente en `normalizeV3` (desired + `appOnly`, mismo patrón que T-3.1). `reconciler.js`, `mockArranger.js` y `server.js` derivan solos.
- **Scripts/docs**: `dump-arranger-state.cjs` + counts/comentarios. Diseño detallado → `sdd-design`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `server/broker/destinations.js` | Modified | +ID; counts 41/11 |
| `server/broker/store.js` | Modified | Backfill en `normalizeV3` |
| `src/data/zonasFuera.js` | New | IDs + labels en orden |
| `src/componentes/MatrizVideo.jsx` | Modified | Consume módulo; reorder + labels |
| `src/componentes/ZonasFueraStatus.jsx` | Modified | Consume módulo; reorder + labels |
| `scripts/dump-arranger-state.cjs` | Modified | +ID |
| tests/verifies (2 archivos) | Modified | 4 checks (10→11) |
| `openspec/specs/*` (3 specs) | Modified | Deltas |
| `API commands/devices_all.txt` | Modified | Evidencia 49 devices |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Zona invisible en deploy existente sin backfill | Med | Backfill en `normalizeV3` |
| ID inexacto → `join` silenciosamente inefectivo | Low | ID literal de `ws1-audit.md` (case-sensitive) |
| Orden/label divergente entre MatrizVideo y Aside | Med | Fuente única `zonasFuera.js` |
| Drift de listas cliente/server | Med | Una lista por lado; checklist al agregar devices |
| `out_of_sync` transitorio | Low | Honesto; se resuelve en el primer scan |
| Spec dice `link: true`, código `false` | Low | Documentar `false` (real); discrepancia registrada aparte |

## Rollback Plan

Revert del PR: el change es aditivo (~130 líneas); revertir `destinations.js` + `normalizeV3` + `zonasFuera.js` deja el estado funcional. El backfill no es destructivo e idempotente; `state.json` (gitignored) no requiere limpieza.

## Dependencies

- Ninguna externa. El device ya existe en el Arranger (verificado en `ws1-audit.md`).

## Success Criteria

- [ ] `MATRIX_DESTINATIONS` = 41 y `ZONA_FUERA_IDS` = 11.
- [ ] Las 11 zonas salen en el orden definido, idéntico en MatrizVideo y Aside.
- [ ] Labels "VIP Bar Lobby", "Barra Irineo +15", "Led Wall +15" visibles en ambas vistas.
- [ ] `state.json` v3 existente muestra la zona en el Aside sin esperar scan (backfill).
- [ ] `node server/broker/verify/run-all.cjs` → todas las verificaciones pasan.
- [ ] Suite `MatrizVideo.test.jsx` verde (41 existentes + 2 nuevos de labels).
- [ ] `join av DTVx aMas15-Vwall-Libertador` efectivo contra hardware (post-merge).

## Delivery

**Single PR**, ~130 líneas aditivas (incluye reorder + módulo de labels) — por debajo del review policy de 400. Sin chaining.
