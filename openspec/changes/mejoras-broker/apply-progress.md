# Apply Progress: mejoras-broker

## WS2 — canales-favoritos (PR 1) ✅ COMPLETADO

Branch: `feat/mejoras-broker-ws2` (desde tracker `feat/mejoras-broker`). Fecha: 2026-09-14.

### Tasks

- [x] **T-2.1** `CANAL_ALLOWLIST` exportado en `src/data/canalesFavoritos.js` (Set de `ch.canal`, 21 entradas, incluye 1624). Además `reconcileFavoritos()` (helper CF-3). Test en `src/hooks/verify/verify-broker-core.mjs` sección 12 (contrato por parsing del source — canalesFavoritos.js importa imágenes que Node puro no resuelve).
- [x] **T-2.2** `submitCanal` en `src/componentes/Canales.jsx` valida contra `CANAL_ALLOWLIST.has(canal)`. Reemplaza el doble check viejo (`canal >= 100 && canal <= 2000` + `estado.favoritos`). `estado.favoritos` ya no se lee en el componente (único consumidor eliminado, campo conservado por persistencia).
- [x] **T-2.3** Rechazo explícito: `toast.warning("canal no válido")`, sin reset del input ni mutación del placeholder (CF-2).
- [x] **T-2.4** Drift reconciliado: default de `estado.favoritos` en `Contexto.jsx` realineado con la grilla (fuera 1614/1625/1629, dentro 1624); `App.jsx` reconcilia con `reconcileFavoritos` al hidratar desde localStorage Y en la migración localStorage→broker (no propaga drift al server) (CF-3).
- [x] **T-2.5** Tests: `Canales.test.jsx` (9 tests: +1624 con favoritos en drift, +9999 inválido toastea sin reset, +1614 obsoleto rechazado), `canalesFavoritos.test.js` (14 tests: +allowlist CF-1, +reconcile CF-3).

### Commits (work-unit)

| Hash | Mensaje |
|---|---|
| `4f02c2e` | feat(canales): validar canales contra CANAL_ALLOWLIST unica con rechazo por toast |
| `e547425` | fix(canales): reconciliar drift de estado.favoritos contra la allowlist al hidratar |

### Verificación (sin hardware)

- `pnpm test` → **192/192 tests pasando, 15 archivos** (incluye los 23 tests nuevos/extendidos de WS2).
- `node src/hooks/verify/verify-broker-core.mjs` → **80/80 verificaciones OK** (sección 12 nueva: allowlist).
- `npx eslint` sobre archivos tocados → único error es **preexistente** (`App.jsx:56` react-hooks/set-state-in-effect, código no tocado por WS2).

### Cambios acumulados

~165 líneas (149+16 insertions, 14 deletions) — dentro del presupuesto de 400.

### Desviaciones / notas

1. **verify-broker-core.mjs por parsing, no por import**: `canalesFavoritos.js` importa `svg/png` que Node puro no resuelve; el contrato de la allowlist se verifica leyendo el source con regex (misma cobertura, sin loader custom).
2. **Pseudo-canales 0000/0000A/0000B**: están en la allowlist (validación pasa), PERO el input es `type=number` (limitación preexistente desde v1) → "0000" se normaliza a "0" y "0000A/B" no se pueden ingresar. Su ejecución requeriría input de texto + rama `preset load` en `sendChannelDigits` — toca la secuencia IR, fuera del alcance WS2 ("no romper la secuencia IR"). **Follow-up sugerido** para un slice futuro.
3. **Advertencia act() en tests**: warnings preexistentes del suite (MatrizVideo/Canales), no introducidos por WS2.

### Rollback boundary

`git revert 4f02c2e e547425` — restaura la validación vieja (con drift). No toca `server/`, ni `confirmEncoder`, ni la secuencia IR (`sendChannelDigits` sin cambios).

## WS3 — canales-dtv-intent (PR 2) ⬜ pendiente
## WS4a — port groups (PR 3) ⬜ pendiente
## WS4b — matrix-groups write-through (PR 4) ⬜ pendiente
## WS5 — dedupe (PR 5) ⬜ pendiente
## WS1 — auditoría read-only (PR 6) ⬜ pendiente
