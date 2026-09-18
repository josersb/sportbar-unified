# Apply Progress: `vwall-libertador`

Branch: `feat/LedWallmas15` (desde `v2` @ 927a616) · Worktree: `mejoras-broker` · Fecha: 2026-09-17

## Estado: COMPLETADO — T1–T16 implementados y verificados

## Resumen por fase

### Fase 1 — Cliente (T1–T5) ✅
- `src/data/zonasFuera.js` (nuevo): `ZONAS_FUERA` (11 canónicas en orden), `ZONA_FUERA_IDS` derivado, `zonaFueraLabel(id)` (canónico ?? fallback derivado del id), `orderedZonaFueraIds(state)` (canónicas presentes + desconocidas al final). Comentario de sync con `server/broker/destinations.js` (patrón `tvGroups.js`).
- `src/data/zonasFuera.test.js` (nuevo): 11 tests — orden, labels renombrados (`VIP Bar Lobby`, `Barra Irineo +15`), label nueva (`Led Wall +15`), fallback, `orderedZonaFueraIds` con faltante/extra/estado vacío.
- `src/componentes/MatrizVideo.jsx`: borrados `ZONE_LABELS` y `ZONAS_FUERA_IDS` hardcode; itera `ZONAS_FUERA` y usa `zone.label` / `zone.id`.
- `src/componentes/ZonasFueraStatus.jsx`: borrado `displayName`; itera `orderedZonaFueraIds(zonasFueraState)` y muestra `zonaFueraLabel(id)`.
- `src/componentes/MatrizVideo.test.jsx`: fixture a 11 zonas, labels nuevos, counts 10→11 (dashes y link labels), `checkboxes[1]` → `aVip-Lobby-Batacazo` (el reorder cambia la 1ª zona porque MatrizVideo renderiza cards por lista canónica, no por claves del estado).

### Fase 2 — Server (T6–T10) ✅
- `server/broker/destinations.js`: `ZONA_FUERA_IDS` reordenado al canónico de 11 (+`aMas15-Vwall-Libertador` #6); comentarios 40→41 / 10→11.
- `server/broker/store.js` `normalizeV3`: backfill idempotente — `desired[zoneId] ??= {video: DTV1, audio: DTV1}` y `appOnly.zonasFuera[zoneId] ??= {link: false}` para toda zona canónica ausente. Sin backup, sin rescan, sin bump. Patrón T-3.1.
- `server/broker/verify/verify-store.cjs`: bloque T7 nuevo — v3 en memoria con 10 zonas → #11 aparece con defaults, 10 previas intactas, sin bump; re-run idempotente; en disco carga sin backup.
- `server/broker/verify/verify-destinations.cjs`: 40→41, 10→11, +2 checks (id #11 y orden canónico literal).
- `server/broker/verify/run-all.cjs`: label 40→41.

### Fase 3 — Scripts/comentarios/evidencia (T11–T13) ✅
- `scripts/dump-arranger-state.cjs`: `DESTINATIONS` con las 11 zonas en orden canónico (+`aMas15-Vwall-Libertador`).
- `server/server.js`: comentario 10→11 zonas. `server/broker/reconciler.js`: comentario 40→41 destinos.
- `API commands/devices_all.txt`: +1 línea `aMas15-Vwall-Libertador-6C9308710CD2` (49 devices); fecha de actualización 17-09-2026. `wiki/**` NO tocado.

### Fase 4 — Verificación (T14–T16) ✅
- `node server/broker/verify/run-all.cjs` → **TODAS LAS VERIFICACIONES PASARON** (17 steps, exit 0). Broadcasts confirman las 11 zonas con `aMas15-Vwall-Libertador`.
- `pnpm test` → **220 tests / 16 archivos** verdes (incluye 11 de `zonasFuera.test.js` y 41 de `MatrizVideo.test.jsx`).
- Runtime mock (T16): spawn breve de `node server/server.js` con `VITE_MOCK_ARRANGER=1` (patrón de los verify scripts; nada quedó corriendo) → `GET /api/broker/state`: `ZONAS_FUERA_COUNT=11`, `HAS_LEDWALL=true` (desired DTV1/DTV1), `appOnly.zonasFuera` = 11 claves. Nota: assertion de libuv al cerrar el child en Windows (teardown artifact), sin impacto en el resultado.

## Commits (work-unit, PR único)
1. `feat(zonas-fuera): single source of order and labels for 11 zonas fuera` → T1–T5.
2. `feat(broker): register aMas15-Vwall-Libertador with idempotent v3 backfill` → T6–T10.
3. `docs(arranger): Led Wall +15 in dump script, comments and devices evidence` → T11–T13 + artefactos openspec del change.

## Pendientes (post-merge, NO bloquean)
- `join av DTVx aMas15-Vwall-Libertador` contra hardware real (DoD del proposal).
- Confirmación visual del Aside en 5178 (la API expone 11 claves; labels cubiertos por tests unitarios/componente).
- Drift `link` (spec `true` / código `false`) registrado aparte (D5) — NO corregido aquí, según scope.
- `state.json` del worktree (gitignored) se creó fresh en el harness T16 — sin limpieza requerida.
