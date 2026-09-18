# Tasks: `vwall-libertador`

## Review Workload Forecast

Estimated ~130–180 changed lines · delivery `auto-chain` · single PR (sin cadena).

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback |
|------|------|----|--------------|-----------------|----------|
| 1 | Change completo (T1–T16) | PR 1 | `node server/broker/verify/run-all.cjs` + `pnpm vitest run src/data/zonasFuera.test.js src/componentes/MatrizVideo.test.jsx` | `node server/server.js` (3106) → `GET /api/broker/state` = 11 claves; Aside 5178 muestra "Led Wall +15" | revert T1–T13 (aditivo, sin migración) |

## Phase 1 — Cliente (D1)

- [x] 1.1 (T1) Crear `src/data/zonasFuera.js`: `ZONAS_FUERA` (11 canónicas), `ZONA_FUERA_IDS`, `zonaFueraLabel(id)` (canónico ?? fallback), `orderedZonaFueraIds(state)` (canónicas + desconocidas al final); comentario de sync (`tvGroups.js:9-15`).
- [x] 1.2 (T2) Crear `src/data/zonasFuera.test.js`: orden de 11 ids, labels `VIP Bar Lobby`/`Barra Irineo +15`/`Led Wall +15`, fallback y `orderedZonaFueraIds` con faltante/extra. Falla antes de T1.
- [x] 1.3 (T3) `src/componentes/MatrizVideo.jsx`: borrar `ZONE_LABELS` (:13-24) y `ZONAS_FUERA_IDS` (:26-31); importar módulo; `:397` iterar `ZONAS_FUERA`; `:402` usar `label`.
- [x] 1.4 (T4) `src/componentes/ZonasFueraStatus.jsx`: borrar `displayName` (:6-15); `:32` → `orderedZonaFueraIds(zonasFueraState)`; `:56` → `zonaFueraLabel(id)`.
- [x] 1.5 (T5) `src/componentes/MatrizVideo.test.jsx`: título+fixture (:215) a 11; `:232`/`:235` → labels nuevos; +`Led Wall +15`; `:258`/`:282` 10→11; `:298` `checkboxes[1]` → `aVip-Lobby-Batacazo`.

## Phase 2 — Server (D2, D3, D4)

- [x] 2.1 (T6) `server/broker/destinations.js`: reordenar `ZONA_FUERA_IDS` (:26-37) al canónico de 11 (+`aMas15-Vwall-Libertador` #6); comentarios `:6-7`,`:39` 40→41 y 10→11.
- [x] 2.2 (T7) `server/broker/store.js` `normalizeV3` (:120-130): `desired[id] ??= {video,audio}` + `appOnly[id] ??= {link:false}` por zona; sin bump ni pisar.
- [x] 2.3 (T8) `server/broker/verify/verify-store.cjs` (T7): v3 con 10 zonas → aparece la #11; re-run idempotente (no duplica ni pisa); `schemaVersion` intacto; caso sin backup.
- [x] 2.4 (T9) `server/broker/verify/verify-destinations.cjs`: `:14` 40→41, `:20` 10→11; +2 checks: id #11 y orden canónico.
- [x] 2.5 (T10) `server/broker/verify/run-all.cjs:18`: label 40→41.

## Phase 3 — Scripts/comentarios/evidencia

- [x] 3.1 (T11) `scripts/dump-arranger-state.cjs` (:48-51): +`aMas15-Vwall-Libertador`.
- [x] 3.2 (T12) `server/server.js` (~:1215) 10→11 zonas; `server/broker/reconciler.js:11` 40→41.
- [x] 3.3 (T13) `API commands/devices_all.txt`: +1 línea `aMas15-Vwall-Libertador-6C9308710CD2`; no tocar `wiki/**`.

## Phase 4 — Verificación

- [x] 4.1 (T14) `node server/broker/verify/run-all.cjs` → 0 fallos (re-corre `verify-reconciler` G y `verify-composition:323`).
- [x] 4.2 (T15) `pnpm vitest run src/data/zonasFuera.test.js src/componentes/MatrizVideo.test.jsx` → verde.
- [x] 4.3 (T16) Runtime mock: `node server/server.js` (3106) + `Invoke-RestMethod /api/broker/state` → 11 claves con la #11; Aside (5178) "Led Wall +15".

## DoD

- [x] 41 destinos / 11 zonas fuera (T6, T9).
- [x] Orden canónico idéntico en MatrizVideo y Aside (T1, T3, T4, T9).
- [x] Labels nuevos visibles en ambas vistas (T1, T5).
- [x] v3 existente muestra la zona sin scan (T7, T8).
- [x] `run-all.cjs` verde (T14); `MatrizVideo.test.jsx` 41 + 2 nuevos verdes (T15).
- [ ] `join av DTVx aMas15-Vwall-Libertador` hardware: post-merge, NO bloquea.
- [ ] Drift `link` (spec `true`/código `false`) documentado aparte (D5).

## Commits work-unit (mismo PR)

1. `feat(zonas-fuera): fuente única de orden y labels` → T1–T5.
2. `feat(broker): registrar Led Wall +15 con backfill` → T6–T10.
3. `docs(arranger): Led Wall +15 en dump y evidencia devices` → T11–T13.
