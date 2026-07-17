# Tasks: Zonas Adicionales — 10 nuevos destinos IPEX5002

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100-130 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add 10 destination keys + UI + tests | PR 1 | `npx vitest run src/componentes/MatrizVideo.test.jsx` | N/A — no new API surface; `join av` infra reuse | Revert Contexto.jsx, MatrizVideo.jsx, MatrizVideo.test.jsx |

## Phase 1: Model — Add destinations to estado.tvs

- [ ] 1.1 Add 10 IPEX5002 destination keys (bracket notation) to `estado.tvs` in `src/contexto/Contexto.jsx`, each defaulting to `"DTV1"`

## Phase 2: UI — Render Zonas Adicionales section in MatrizVideo

- [ ] 2.1 Add `Zonas Adicionales — VIP, Planta -1, +15` section with a `select` per destination in `src/componentes/MatrizVideo.jsx` after TVRACK section
- [ ] 2.2 Wire each `select` `onChange` to `handleChangeEstadoVideo` with bracket notation

## Phase 3: Tests — Update MatrizVideo.test.jsx

- [ ] 3.1 Add 10 keys to `initialTvs` in `src/componentes/MatrizVideo.test.jsx`
- [ ] 3.2 Change `expect(mappings).toHaveLength(37)` → `47` in onSubmit test
