```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:e418c24f9d8d70b77a5e660118edbcdd7184585ed969465023d7df36bccee459
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 4/4
scenarios: 5/5
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:e5cf64f098f2706adb8a5e3bb8c28760919a4f283b6276bba12a79ea85e3aded
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:03fa27e9b8e6509185c42e8244854571938f1fb3c7428c6c7c9f10db5ec82b2e
```

# Verify Report — WS2 (mejoras-broker)

Slice verificado: **WS2** (`feat/mejoras-broker-ws2`, commits `4f02c2e`, `e547425`, `7ab1956`; diff contra tracker `feat/mejoras-broker` — 216 insertions, 19 deletions, 9 archivos). Verificación ejecutada de forma independiente por el agente verify; no se confió en el reporte del apply.

## Resumen de ejecución

| Comando | Resultado |
|---|---|
| `pnpm test` (vitest run) | exit 0 — **192/192 tests, 15 archivos** (23 tests nuevos/extendidos de WS2 incluidos) |
| `node src/hooks/verify/verify-broker-core.mjs` | **80/80 verificaciones OK** (sección 12 nueva: allowlist CF-1/CF-3) |
| `pnpm run build` (vite build) | exit 0 — `✓ built in 6.40s` |

`evidence_revision` = sha256 del diff completo `git diff feat/mejoras-broker...HEAD` (src/ + openspec/).

## Requirements / Scenarios (alcance WS2: 4 req / 5 scenarios de 5 req / 10 scenarios totales del spec)

Los 5 requirements / 10 scenarios del change se desglosan por slice: los restantes (UXF-1 scenarios "ya sintonizado"/"cambio"/"fallo", UXF-2 completo) pertenecen a WS3 y WS5 según tasks.md y se verifican en sus propios reportes.

### canales-favoritos — 3/3 requirements, 4/4 scenarios ✅

- **CF-1 (allowlist única)** — VERIFICADO.
  - *Grilla y validación comparten allowlist*: `CANAL_ALLOWLIST = new Set(CANALES_FAVORITOS.map(ch => ch.canal))` en `src/data/canalesFavoritos.js:50`; grilla renderiza `CANALES_FAVORITOS` (`src/componentes/Canales.jsx:91`), validación consume `CANAL_ALLOWLIST.has(canal)` (`src/componentes/Canales.jsx:33`). Test: "accepts 1624 even when estado.favoritos drifted" (Canales.test.jsx) + `canalesFavoritos.test.js` "is a Set derived from CANALES_FAVORITOS". ✅
  - *Canal de la grilla siempre ejecuta*: verificado para los 18 canales numéricos (1624 incluido — test explícito del drift que lo rechazaba). ⚠️ Para los 3 pseudo-canales ver WARNING-1. ✅ (con advertencia)
- **CF-2 (rechazo explícito)** — VERIFICADO. Canal fuera de allowlist → `toast.warning("canal no válido")` (`src/componentes/Canales.jsx:45-49`); sin reset de input, sin placeholder mutado, sin llamada a `sendChannelDigits`/`handleChangeEstadoDecos`. Test: "invalid channel shows a warning toast without resetting the input" (assert `input.value` queda "9999") y "rejects 1614". ✅
- **CF-3 (reconciliación de drift)** — VERIFICADO. `reconcileFavoritos()` (`src/data/canalesFavoritos.js:57-60`) aplicado al hidratar desde localStorage (`src/App.jsx:39`) y en la migración localStorage→broker (`src/App.jsx:81`); default de `estado.favoritos` realineado en `src/contexto/Contexto.jsx` (fuera 1614/1625/1629, dentro 1624). Tests de drift en `canalesFavoritos.test.js` (remoción/conservación/comparación por string). ✅

### ux-feedback — 1/2 requirements en alcance WS2, 1/6 scenarios ✅ (5 restantes → WS3/WS5)

- **UXF-1 (toasts de intención y rechazo)** — VERIFICADO solo en su cláusula aplicable a WS2: *Canal inválido* → toast de advertencia (compartido con CF-2). Los scenarios "Canal ya sintonizado", "Cambio de canal", "Fallo del controlador" son T-3.8 (WS3) — el toast actual `Canal X enviado a Y` persiste hasta entonces; NO es defecto de WS2.
- **UXF-2 (no-op + forzar reenvío)** — NO aplica a WS2 (WS5, T-5.4). No evaluado.

## Anti-regresiones verificadas

- **Secuencia IR intacta**: `git diff feat/mejoras-broker...HEAD -- src/api/arrangerApi.js server/` = **0 líneas**. `sendChannelDigits` (`src/api/arrangerApi.js:310-329`) sin cambios, incluido el **fallback del dígito "2"** (línea 318: `digit === "2"` → `loadChannelPreset(decoNumber, "0002")`). ✅
- **`confirmEncoder` / PR #13 intactos**: ningún archivo de `server/` tocado por el slice (los 9 archivos del diff son `src/*` y `openspec/*`). ✅
- **`estado.favoritos` sin consumidores huérfanos**: grep de `estado.favoritos` en `src/` — solo queda el punto de reconciliación en `App.jsx:39`, comentarios y tests/verify. El único consumidor funcional previo (`Canales.jsx`) fue migrado a la allowlist; el campo se conserva por persistencia (decisión documentada en tasks.md). ✅
- **Cero tests en rojo**: 192/192; los warnings `act()` del suite (Audio/MatrizVideo) son preexistentes, no introducidos por WS2. ✅
- **Presupuesto de review**: 235 líneas cambiadas (216+ / 19−) < 400. ✅

## Findings

### WARNING

- **W-1 — Pseudo-canales 0000/0000A/0000B de la grilla no pueden ejecutarse (CF-1 parcialmente incumplido para 3/21 canales).** El input de canal es `type="number"` (`src/componentes/Canales.jsx:71`): al clickear el favorito de la grilla, `handleFavorito` asigna `inputRef.current.value` pero el sanitizado del navegador normaliza `"0000"`→`"0"` y `"0000A"/"0000B"`→`""`. Resultado: canal de la grilla → rechazado por la allowlist ("0" no está) o bloqueado por `required`. **No es regresión** (la validación vieja `canal >= 100` también los rechazaba; y no había camino de ejecución previo), y está documentado como desviación 2 en apply-progress.md. **Reclasificado (ver Addendum): NO requiere follow-up — los pseudo-canales son elementos UI/UX intencionales de referencia.**

### SUGGESTION

- **S-1 — Escenario CF-1 "Canal de la grilla siempre ejecuta" requiere 2 pasos**: `handleFavorito` solo llena el input (`Canales.jsx:22-24`); la ejecución demanda click en "Aplicar". Si el spec interpreta "selecciona" como un solo gesto, considerar auto-submit desde la grilla en un slice futuro.
- **S-2 — `reconcileFavoritos` con entrada no-array la devuelve tal cual** (`null`/`undefined` passthrough, cubierto por test). Comportamiento idéntico al spread previo de `estadoInicial`; sin impacto, pero un future caller podría esperar `[]` por contrato.
- **S-3 — Mensaje de éxito diverge del spec ux-feedback**: `toast.success("Canal X enviado a Y")` vs. "cambiando al canal X". Alineado con alcance: se corrige en WS3 (T-3.8). Solo evitar que quede como deuda invisible.

## No verificable sin hardware

- **Ejecución IR real contra el Arranger** (canal 1624 llegando físicamente al deco): el IR es one-way y no hay hardware en el entorno. Cobertura limitada a mocks de `sendChannelDigits` en vitest. Explícitamente fuera de verificación (regla: no golpear el Arranger real).
- **Comportamiento de sanitización en navegadores reales** de los pseudo-canales (W-1): deducido del estándar HTML (`type=number` value sanitization); no ejecutado en browser real.

## Conclusión

WS2 cumple sus acceptance criteria (CF-1/2/3 + cláusula de canal inválido de UXF-1) con test y build ejecutados de forma independiente y verdes, sin regresiones sobre PR #13 ni sobre la secuencia IR. `verdict: pass_with_warnings` — el único WARNING (W-1) fue **reclasificado como comportamiento intencional** por aclaración del usuario (ver Addendum); no queda deuda pendiente de este slice.

## Addendum (2026-09-14) — Aclaración del usuario: pseudo-canales intencionales

Los pseudo-canales `0000`, `0000A` y `0000B` (y sus botones en la grilla de "Canales") **NO son un defecto ni un follow-up**: son elementos visuales UI/UX de referencia, huérfanos de procesos/fases anteriores, que se conservan a propósito dentro del código y la UI como datos/elementos recuperables rápidamente para futuras mejoras o implementaciones.

Consecuencias sobre este reporte:

- **W-1 queda reclasificado como comportamiento intencional** (no es brecha de spec ni deuda técnica). No se corrigen el `input type=number` ni la ejecución de esos canales sin una decisión explícita del usuario.
- No deben registrarse como tarea del change ni como issue aparte.
- Cualquier futuro desarrollo que los reactive (input de texto + rama `preset load` en `sendChannelDigits`) debe tratarse como un change nuevo y explícito.
- Referencia persistida: Engram topic_key `sportbar/pseudo-canales-referencia`.
