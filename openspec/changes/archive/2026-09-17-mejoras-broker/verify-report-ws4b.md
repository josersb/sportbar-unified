```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:a61e5ea9ca2dc6fa2aa7b4db0ee71528f963a9f0384b7f51f3462aa240ebf959
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 7/7
test_command: node server/broker/verify/verify-matrix-groups.cjs && pnpm test
test_exit_code: 0
test_output_hash: sha256:4ff196933b1217fe0080f4aafe56714e9946f0cf110f25604b7d88fd1c5932cf
build_command: node --check server/server.js server/broker/store.js server/broker/groups.js server/broker/matrixModel.js + 4 verify files
build_exit_code: 0
build_output_hash: sha256:4735b1302d102258912c3bdaef21b180d006c197996c8c0e51a87747572f582e
```
## Verification Report — WS4b (change `mejoras-broker`)

**Change**: mejoras-broker — Slice WS4b (dominio `matrixGroups` + endpoint + snapshot + preset server-side)
**Branch**: `feat/mejoras-broker-ws4b` (base `feat/mejoras-broker-ws4a` @ 72a2009; commits 470fa9d, 242254d, 4734190)
**Mode**: Standard
**Alcance**: MG-1..MG-6 (server-side). MG-7 es render de cliente → WS4d; los datos (`key: TvsBarraLibertador`, `dir: "Libertador"`) ya están en el modelo y verificados. WS4c/d/e, WS5, WS1 NO evaluados.

### Build & Tests Execution

**Build**: ✅ Passed — `node --check` OK sobre los 8 archivos tocados/verificados (`server/server.js`, `server/broker/store.js`, `server/broker/groups.js`, `server/broker/matrixModel.js`, `verify-matrix-groups.cjs`, `verify-store.cjs`, `verify-composition.cjs`, `run-all.cjs`).

**Tests**: ✅
- `node server/broker/verify/verify-matrix-groups.cjs` → **33/33 checks OK, exit 0** (A submit+expansión, B rechazos MG-5 sin mutar store, C snapshot matrixModel+versions, D broadcast bus, E preset mixed→null/uniforme/patrón/faltantes, F reload, G SSE snapshot).
- `pnpm test` → **196/196 tests, 15 archivos, exit 0** — sin regresiones.
- `node server/broker/verify/run-all.cjs` → 15 steps: 14 OK, 1 falla intermitente de timing en `verify-eventbus` (ver WARNING W-1; no es WS4b).
- `node server/broker/verify/verify-eventbus.cjs` aislado → corridas consecutivas: ✓, ✗, ✓ y luego ✓✓✓ (3/3) — flaky, no determinístico.

### Spec Compliance Matrix (MG-1..MG-6)

| Requirement | Escenario | Evidencia | Result |
|---|---|---|---|
| MG-1 | Cliente read-only / desired-only | `store.js:91-93` default `{desired, reported:null}`; `setMatrixGroups` solo mergea desired (`store.js:534-543`); `broadcastDomain("matrixGroups")` publica desired (`server.js:536-539`); reported null en snapshot `[C]` y tras preset load `[E]`; `git diff 72a2009..HEAD -- src/` VACÍO | ✅ COMPLIANT |
| MG-2 | Preset resuelve grupos en el server | `server.js:844-850` — derivación de `preset.tvs` con `collapseGroup` para los 10 subgrupos + `setMatrixGroups` + persist + broadcast; verify `[E]` y check de `verify-composition` | ✅ COMPLIANT |
| MG-3 | Los 10 subgrupos presentes | `matrixModel.js:33-71` — 3 zonas / 10 subgrupos `{key,dir,screens}` / 29 pantallas; snapshot `matrixModel` top-level: 3 zonas / 10 subgrupos / `combosBySize{3,4}` (`[C]`) | ✅ COMPLIANT |
| MG-4 | Expansión derivada del modelo | `groups.js:38-45` — `GROUP_DEFS`/`GROUP_PATTERNS` derivados de `matrixModel` (cero literales); `[A]` DTV123→TV01/TV02/TV03 en orden, DTV5→4 pantallas, VWN=DTV2 | ✅ COMPLIANT |
| MG-5 | Combo de tamaño incorrecto rechazado | `server.js:991-1009` — validación de CADA entrada contra `optionsFor(screens.length)` ANTES de tocar store/expandir; `[B]`: DTV9→400, combo 4-en-3→400, combo 3-en-4→400, key `TvsBarraLivertador`→400, sin `values`→400, `values` no-objeto→400; store sin mutar tras rechazos | ✅ COMPLIANT |
| MG-6 | Mixto no-predeterminado | `groups.js:104-116` — `collapseGroup`→null en mixto (nunca `values[0]`); `server.js:847` mapea `undefined` (pantallas faltantes)→null; `[E]` mixto DTV1/DTV4/DTV5→null, faltantes→null, 10 claves derivadas | ✅ COMPLIANT |
| MG-6 | Fuente única | `[E]` TvsBarraSur uniforme DTV2×4→"DTV2"; patrón DTV1-4→"DTV1234" | ✅ COMPLIANT |

**Compliance summary**: 7/7 escenarios compliant (6/6 requirements).

### Regresiones

- `confirmEncoder` (`server.js:259-286`) y `executeWrite` (`server.js:363-496`) INTACTOS: los hunks del diff `72a2009..HEAD` en `server.js` no tocan esa región; `verify-confirm-settling` VERDE en run-all (PR #13 preservado).
- Cliente sin tocar: `git diff 72a2009..HEAD -- src/` vacío; `eventBus.cjs` sin cambios en WS4b.
- Pseudo-canales `0000/0000A/0000B`: sin habilitar (src/ vacío en el diff).
- `pnpm test` 196/196 — sin regresiones.

### Issues Found

**CRITICAL**: None.

**WARNING**:
- **W-1 — `verify-eventbus` heartbeat es flaky de timing y hace `run-all.cjs` no-determinístico.** Evidencia: en la corrida con carga, `run-all.cjs` terminó `✗ 1 verificación(es) fallaron` por `verify-eventbus: ✗ heartbeat 50ms emite 2+ latidos`; re-ejecuciones aisladas pasan ✓✓✓ (3/3) y también falló 1 de 3 en un lote previo. WS4b NO tocó `eventBus.cjs` (diff vacío) — chequeo preexistente con ventana de 50ms sensible al scheduling del host. Impacto: el DoD "run-all.cjs verde" queda a merced del scheduling; los otros 14 steps son determinísticos y verdes. Recomendación: reemplazar el assert por espera condicional (poll hasta N latidos con deadline holgado, ej. 500-1000ms).

**SUGGESTION**:
- **S-1 — `buildBrokerSnapshot` sigue siendo código muerto.** `server.js:566-583` (actualizado con `versions.matrixGroups` + `matrixModel` por coherencia) no tiene ningún caller: `/api/broker/state` construye el body inline (`server.js:732-752`) y el bus usa `getSnapshot` inline (`server.js:125`). Riesgo de drift entre las 3 construcciones de snapshot. Recomendación: unificar o eliminar en un slice de limpieza.
- **S-2 — POST `/api/matrix-groups` con `values: {}` responde 200 noop en vez de 400.** `server.js:1010-1012`. Semántica razonable, pero inconsistente con "sin values"→400. Recomendación: definir en WS4e cuando exista cliente.

### Verdict

**PASS WITH WARNINGS** — MG-1..MG-6 server-side verificados de forma independiente (33 checks + 196/196 tests + build gate); única warning es un chequeo de timing flaky preexistente ajeno a la slice.
