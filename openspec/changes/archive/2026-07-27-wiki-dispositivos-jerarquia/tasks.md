# Tasks: Reorganizar Dispositivos — Jerarquía Fabricante → Categoría

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 400-550 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Script → PR 2: Execute + Verify |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Migration script | PR 1 | `node -c scripts/migrate-dispositivos-hierarchy.js` | N/A — syntax check only; dry-run inviable sin archivos destino | `git checkout HEAD -- scripts/` |
| 2 | Full migration | PR 2 | `grep -r "\\[\\[Dispositivos/[A-Z]" wiki/` → 0 | `node scripts/migrate-dispositivos-hierarchy.js` | `git checkout HEAD -- wiki/ AGENTS.md` |

## Phase 1: Infrastructure — Script (PR 1) ✅

- [x] 1.1 Crear `scripts/migrate-dispositivos-hierarchy.cjs` con PATH_MAP y mkdir recursivo para 7 fabricantes + 9 categorías
- [x] 1.2 Implementar merge-algorithm: seccionar ambos decoders por `##` headings, priorizar versión más detallada en overlap
- [x] 1.3 Implementar file-move + wikilink rewrite: aplicar mapping filename→newPath con ajuste de profundidad relativa
- [x] 1.4 Implementar placeholders idempotentes + reescritura de `wiki/index.md` y `AGENTS.md`
- [x] 1.5 Implementar post-flight verification: grep planos, ls raíz sin .md, wc placeholders >20

## Phase 2: Execution — Run & Verify (PR 2) ✅

- [x] 2.1 Pre-flight: `git status --porcelain wiki/` debe estar limpio; abortar si no
- [x] 2.2 Ejecutar: `node scripts/migrate-dispositivos-hierarchy.cjs`
- [x] 2.3 Verificar: grep planos → 0, `ls wiki/Dispositivos/*.md` → solo carpetas, 3 placeholders >20 bytes
- [x] 2.4 Revisar merge decodificadores: contenido de ambos originales presente sin duplicados

## Phase 3: Final Docs ✅

- [x] 3.1 Agregar entrada en `wiki/log.md` con fecha, archivos migrados, placeholders creados
- [x] 3.2 Confirmar que `AGENTS.md` refleja `{Fabricante}/{Categoria}/Dispositivo.md` en LLM Wiki Schema

## Phase 4: Post-fix — PR #3 (deduplication + depth-fixed wikilinks) ✅

- [x] 4.1 Deduplicar contenido de Decodificadores.md (single heading, single table, single DTV7/DTV8)
- [x] 4.2 Depth-fixed wikilinks en Decodificadores.md y archivos movidos
- [x] 4.3 Re-wire wikilinks externos en API/*, Componentes/*, Conceptos/* (28 files)
