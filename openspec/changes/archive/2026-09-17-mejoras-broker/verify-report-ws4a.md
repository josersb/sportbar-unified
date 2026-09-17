# Verify Report: WS4a revisado (modelo declarativo + groups derivado)

Change: `mejoras-broker` · Slice: WS4a (PR 3) · Rama: `feat/mejoras-broker-ws4a` (base `feat/mejoras-broker-ws3b`)
Fecha: 2026-09-15 · Verificación independiente (no se confió en el reporte del apply)

## Resultado: **PASS**

## Alcance verificado

Solo WS4a revisado: `server/broker/matrixModel.js`, `server/broker/groups.js`, `server/broker/verify/verify-groups.cjs` (+ label en `run-all.cjs`). NO evaluado: WS4b/c/d/e, WS5, WS1, T-4a.4 (pendiente, fuera del slice).

## Requirements verificados (5 de 7 del spec — MG-1/MG-2 requieren wiring server, son WS4b)

| Req | Criterio | Resultado | Evidencia |
|---|---|---|---|
| MG-3 | 3 zonas / 10 subgrupos `{key,dir,screens}` / 29 pantallas | PASS | matrixModel.js:33-71; verify-groups A1-A15 (60/60); pantallas coinciden con la tabla del spec (VWall 1 c/u; Perímetro TV15-26 4 c/u; Barra 4/3/4/3: TV01-03, TV04-07, TV08-10, TV11-14) |
| MG-4 | Modelo declarativo único, sin hardcodeo por subgrupo | PASS | groups.js:38-45 deriva `GROUP_DEFS`/`GROUP_PATTERNS` con `Object.fromEntries` desde `model.subgroups()`/`combosBySize`; cero literales duplicados (checks B6, C4, C5, D12); expansión sin switch por subgrupo (D1-D11) |
| MG-5 | `optionsFor(size)` = DTV1..DTV8 + combos del tamaño; combo de longitud incorrecta rechazado | PASS | matrixModel.js:98-101; optionsFor(3)/(4) exactos vs contrato del design (C1, C2); optionsFor(1) sin combos (C3); rechazo MG-5: clave omitida de tvs y matrixGroups (D9: combo de 4 en subgrupo de 3; D10: combo de 3 en subgrupo de 1) |
| MG-6 | Mixed → "Mixto / Personalizado", nunca `values[0]` | PASS | groups.js:104-116: `collapseGroup` retorna patrón → valor único → **`null`** en mixto (E6: TV15=DTV5, TV16-18=DTV2 → null); `undefined` reservado a entrada inválida/pantallas faltantes (E4, E8) |
| MG-7 | Key `TvsBarraLibertador` / label "Libertador" | PASS | matrixModel.js:55 (`key: "TvsBarraLibertador"`, `dir: "Libertador"`); grep de "Livertador" en `server/`: única coincidencia es matrixModel.js:31, comentario que dice "nunca 'Livertador'" |

## Checks adicionales del alcance

- **Round-trip expand↔collapse**: F1-F5 y G4 verdes (patrones, valor único y VWall de 1 pantalla). Round-trip total de 10 subgrupos → 29 pantallas → collapse sin nulls (G1-G4).
- **VWN/VWC/VWS incluidos** como subgrupos de 1 pantalla en `matrixGroups` (D7, D8, F5) — C8 invertido según tasks.md.
- **Claves de subgrupo no se cuelan en `tvs`**; destinos reales no-subgrupo (TVRACK) pasan directas (D12, D17).
- **Determinismo y entrada inválida**: D14 (misma entrada → mismo output), D15 (null/undefined omitido), D16 (no-objeto → patch vacío).
- **`server.js` NO modificado**: `git diff feat/mejoras-broker-ws3b --name-only` = solo `groups.js`, `matrixModel.js`, `run-all.cjs`, `verify-groups.cjs` + docs openspec (+ `server/pnpm-lock.yaml` drift de install, fuera de la slice). Sin wiring — correcto para WS4a.
- **`confirmEncoder`/`executeWrite` (PR #13) intactos**: `verify-confirm-settling` verde dentro de `run-all.cjs` (escenarios A/C/B/D/F/G/E, settling av/stream, no-op, unconfirmed, join-fail).
- **Pseudo-canales 0000/0000A/0000B**: sin cambios en `src/` en la slice → siguen no habilitados.

## Tests ejecutados

| Comando | Resultado | Exit code |
|---|---|---|
| `node server/broker/verify/verify-groups.cjs` | ✓ OK — **60/60 checks** (secciones A-G) | 0 |
| `node server/broker/verify/run-all.cjs` | ✓ **TODAS LAS VERIFICACIONES PASARON** (14 steps incl. confirm-settling, channel-intent, groups, composition) | 0 |
| `pnpm test` | ✓ **196/196 tests, 15 archivos** (sin regresión; la slice no toca frontend) | 0 |

## Findings

### CRITICAL
Ninguno.

### WARNING
1. **T-4a.4 pendiente**: `src/hooks/verify/verify-broker-core.mjs` aún no cubre los helpers de `matrixModel`. No es contradicción (tasks.md lo lista `[ ]` y apply-progress lo declara fuera del slice), pero el DoD global de WS4a del change incluye esa extensión. Resolver en re-apply o absorber en WS4c (T-4c.4 ya extiende ese verify).

### SUGGESTION
1. **`expandGroups` no valida membresía en `SOURCES` para valores únicos** (groups.js:75-88): un valor no-pattern cualquiera (p. ej. `"DTV9"` o `"mixto"`) se expande como valor único a todas las pantallas. Es diseño deliberado (WS4b valida contra `optionsFor(size)` antes de expandir, T-4b.3, nota 2 del apply) — el módulo puro solo rechaza combos de longitud incorrecta (MG-5). Dejar registrado para que WS4b no herede el bypass.
2. **Rechazo MG-5 silencioso** (clave omitida, sin canal de error): correcto para el módulo puro; la respuesta 400 la agrega WS4b. Ya documentado en apply-progress (desviación 2).

## Cobertura de escenarios del spec

| Escenario spec | Estado en WS4a |
|---|---|
| MG-3: Los 10 subgrupos presentes | Verificado (A2, A3, G3) |
| MG-4: Expansión derivada del modelo | Verificado (D1-D11) |
| MG-5: Combo de tamaño incorrecto rechazado | Verificado (D9, D10) — validación HTTP 400 en WS4b |
| MG-6: Mixto no-predeterminado / Fuente única | Verificado (E6 / E5, E7) — render "Mixto / Personalizado" en WS4d |
| MG-7: Etiqueta correcta | Verificado (key + dir en modelo; render UI en WS4d) |
| MG-1: Cliente read-only / MG-2: Preset server-side | **No evaluable en WS4a** — requieren dominio + endpoints (WS4b) |

## Conclusión

La slice WS4a revisada cumple MG-3/MG-4/MG-5/MG-6/MG-7 a nivel de módulos puros, con el modelo como única fuente, `collapseGroup` honesto (null en mixto), VWall incluido, naming correcto y el resto del broker intacto (PR #13 verde, server.js sin tocar). Siguiente fase recomendada: WS4b.
