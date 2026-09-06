# Archive Report: state-sync-rework

- **Date archived**: 2026-08-29
- **Branch**: feat/state-sync-rework (worktree `sportbar-unified-worktrees/state-sync-rework`)
- **HEAD**: `576ad95` (fix(dev): proxy /api/tvrack in vite dev server)
- **Artifact store**: hybrid (engram + openspec)
- **Strict TDD**: false (#343)
- **Review gate**: `disabled/unmanaged` — ver sección Review Gate

## Final State (per Final-State Authority)

**Verdict**: PASS — 0 blockers, 0 critical findings. Envelope `gentle-ai.verify-result/v1` (observation #901, validado):
`verdict: pass` · `requirements: 43/43` · `scenarios: 60/60` · `test_exit_code: 0` (179 tests, 15 files) · `build_exit_code: 0` (244 modules) · `evidence_revision: sha256:ef7d6e05...`.

Implementación completa en `feat/state-sync-rework` (PR 1–5 + fix A/B), confirmada vía `git log` en el worktree:
- PR 1: `5fec39e`, `7d06238`, `17c64a5`, `7f4682f`, `641fce0`, `65bf419` — broker foundation
- PR 2: `d4d0f85`, `609fc27`, `6ca7a67` — composition
- PR 3: `e6ed29f`, `e0b1a21` — broker client
- PR 4: `3af002f` — cleanup + E2E
- PR 5: `6150016`, `bde109b`, `91d72bf`, `8955f01` — command-surface fix
- Fix A/B: `ecceec6`, `576ad95` — proxy vite `/api/tvrack` + link SSE

E2E visual multi-PC (observation #900, `e2e-complete`): F1–F5 PASS. Fix PR 5 (observation #761, `e2e-fix-pr5-f1`): defectos A y B corregidos en `ecceec6`/`576ad95`, cubiertos por `verify-vite-proxy.cjs` y `verify-composition.cjs`.

## Corrección de conteo de tasks (reconciliación al archivar)

**Problema**: el `verify-report` (observation #901) declaraba "Tasks total 28" y Fase 3 como "3.1–3.7". La historia real de apply (commit `6783378`, PR 3, y apply-progress #734) registra Fase 3 como **3.1–3.11 (11 tasks)**. El commit `8955f01` (docs PR 5) **condensó** la Fase 3 de 3.1–3.11 a 3.1–3.7, bajando el total visible de 32 a 28.

**Conteo real verificado** (git history + apply-progress): Fase 1 (1.1–1.6) + Fase 2 (2.1–2.4) + Fase 3 (3.1–3.11) + Fase 4 (4.1–4.4) + Fase 5 (5.1–5.7) = **32 tasks**.

**Correcciones aplicadas**:
1. `openspec/changes/state-sync-rework/tasks.md` — Fase 3 restaurada a su numeración original 3.1–3.11 (descripciones del commit `6783378`), todas `[x]`. Total: 32/32 completas, 0 unchecked.
2. `verify-report.md` — sección Completeness corregida a 32 (y nota de reconciliación agregada). El envelope YAML `gentle-ai.verify-result/v1` NO fue modificado (verdict, requirements, scenarios, hashes de evidencia intactos).

Nota de traceability: el observation Engram `sdd/state-sync-rework/tasks` (#729, escrito 2026-08-16) conserva la numeración condensada de la sesión PR 5; la fuente autoritativa de completitud es el `tasks.md` corregido archivado con este report (32/32).

## Review Gate

- `gentle-ai review status --cwd <worktree>` → `{"status": "clean", "complete": true, "authoritative": true, "entries": [], "locks": [], "diagnostics": []}` (exit 0).
- No existen artifacts de review: sin `openspec/changes/state-sync-rework/reviews/`, sin topics Engram `sdd/state-sync-rework/review/*`.
- Memoria #664 (session summary 2026-08-08): **"Review mode disabled para permitir archive sin formal review"** — kill switch off.
- Precedente del proyecto: archive `reconciliation-sync-panel` (#662) documentó `reviewGate.delivery: disabled/unmanaged` con el mismo fundamento.

**Conclusión**: `reviewGate.delivery: disabled/unmanaged`. NO se inventó un approval; el gate nativo (`review status` clean + kill switch off) es el que relaja la demanda de receipt terminal. Un `review start` forzado con el kill switch off no puede producir receipt — exigirlo sería un deadlock.

**Discrepancia registrada (no resuelta silenciosamente)**: el dispatcher nativo `gentle-ai sdd-status` reporta `nextRecommended: resolve-review` con blockedReasons: (a) "terminal review receipt is missing" — cubierto por `disabled/unmanaged` arriba; (b) "verify result total 43 does not match actual requirement count 46". El validador cuenta 46 headers `### Requirement:` en los 8 delta specs, incluyendo los 3 REMOVED (Double-Call Prevention, getDeviceStatus, Polling Synchronization); el verify-report #901 fue validado con 43 requirements activos. 46 − 3 REMOVED = 43 activos, consistente con el envelope. Discrepancia de método de conteo del dispatcher (headers crudos vs requirements netos), no un defecto de evidencia.

## Divergencias design → decisión final (documentadas)

| Decisión de diseño (#726) | Decisión final (verify #901 + código) |
|---|---|
| Reconciler interval: startup + **60s** (open question #1) | Intervalo **configurable, default 300000ms (5 min)** (`RECONCILER_INTERVAL_MS`); open question cerrada |
| Getters FW-LOCKED: "¿eliminar ya?" (open question #2) | **Conservados server-side con banner FW-LOCKED** en `arrangerClient.js:134-152`, no expuestos al cliente |
| Command surface: solo `joinAv` en el adapter | Regresión E2E detectada (writes solo-video/solo-audio pisaban el stream opuesto) → **fix PR 5**: `joinVideo`/`joinAudio` + spec amendment WR-1..WR-9 |
| Schema v3 del store: `desired`/`reported` por dominio | **`appState` añadido al store** como extensión del schema v3 (estado app-only con `link`, `descripcionPreset`, audio Tesira) |

## Spec Deltas Synced

| Domain | Action | Details |
|--------|--------|---------|
| `state-broker` | **Created** (NEW) | 15 requirements (8 base + WR-2…WR-7, WR-9) copiado completo a `openspec/specs/state-broker/spec.md` |
| `sync-broadcast` | **Created** (NEW) | 5 requirements copiado completo a `openspec/specs/sync-broadcast/spec.md` |
| `preset-complete-snapshot` | **Created** (NEW) | 3 requirements copiado completo a `openspec/specs/preset-complete-snapshot/spec.md` |
| `arranger-api-centralized` | Updated | +2 ADDED (Proxy único camino, WR-1 Joins independientes) · 1 MODIFIED (Capability-Gated IR Validation → manual-only) · 1 REMOVED (getDeviceStatus, con Reason/Migration) |
| `arranger-reconciliation` | Updated | +4 ADDED (Auto-Adopt server-side, Single-flight, Eliminación artefactos cliente, WR-8) · 7 MODIFIED (Unified Hook, Deferred Startup, SyncPanel, Tab Indicator, Context status, Offline Resilience, Partial Timeout) · 1 REMOVED (Double-Call Prevention, con Reason/Migration) |
| `migracion-localstorage` | Updated | +2 ADDED (Migración formato preset, Política fresh-start) |
| `registro-dispositivos` | Updated | 1 MODIFIED (Hybrid Capability Detection → manual-only) |
| `zonas-fuera-state` | Updated | +2 ADDED (vía SSE, en presets) · 1 MODIFIED (REST Endpoints write-through con await + política link) · 1 REMOVED (Polling Synchronization, con Reason/Migration) |

No hubo merges destructivos. Los 3 REMOVED incluyen Reason + Migration en los deltas y quedan registrados en las secciones REMOVED de los specs base (delta-acumulados) y en los deltas archivados.

## Engram Observation IDs (traceability)

| Artifact | Engram ID | Topic Key |
|----------|-----------|-----------|
| Exploration | #701 | `sdd/state-sync-rework/explore` |
| Exploration addendum (Qwen) | #713 | (discovery) |
| Command-surface gap | #747 | `sdd/state-sync-rework/explore-command-surface` |
| Proposal | #717 | `sdd/state-sync-rework/proposal` |
| Spec | #721 | `sdd/state-sync-rework/spec` |
| Spec amendment (WR-1..WR-9) | #751 | `sdd/state-sync-rework/spec-command-surface` |
| Design | #726 | `sdd/state-sync-rework/design` |
| Tasks | #729 | `sdd/state-sync-rework/tasks` |
| Apply progress | #734 | `sdd/state-sync-rework/apply-progress` |
| Verify report | #901 | `sdd/state-sync-rework/verify-report` |
| E2E completo (F1–F5) | #900 | `sdd/state-sync-rework/e2e-complete` |
| E2E fix PR5 F1 (defectos A/B) | #761 | `sdd/state-sync-rework/e2e-fix-pr5-f1` |
| SDD Init (strict TDD false, stack) | #343 | `sdd-init/sportbar-unified` |
| Kill switch review (session) | #664 | (session_summary) |
| Review | — | none (disabled/unmanaged) |
| Archive report | this topic | `sdd/state-sync-rework/archive-report` |

## Archive Contents

- exploration.md ✅
- proposal.md ✅
- specs/ (8 delta specs) ✅
- design.md ✅
- tasks.md ✅ (32/32 complete)
- verify-report.md ✅
- archive-report.md ✅

## Pending Real-Hardware Verification (follow-up, NO blocker)

Los checks 6–10 originales (offline, blip, fresh-start y escaneo de arranque ~24s con el Arranger FÍSICO) quedan pendientes hasta que el bar esté disponible. Cubiertos por verifies automatizados con mock (PASS): `verify-reconciler`, `verify-mock`, `verify-store`, `verify-composition`. Registrados en verify-report #901, sección "Pending Real-Hardware Verification". **Follow-up**: ejecutar checklist E2E contra hardware real antes del deploy a producción.

## Known Warnings Carried Forward (non-blocking)

- WARNING: pending real-hardware verification (aceptado, no blocker) — ver arriba.
- SUGGESTION (cosmético, E2E #900): "adoptado X: A → A" debería loguearse "confirmado" en `reconciler.js`.
- SUGGESTION: React `act(...)` warnings en `pnpm test` (Canales/MatrizVideo/Audio/Formik) — pre-existentes, no afectan resultado (179/179 PASS).
- SUGGESTION (minor, #761): coalescing del doble `joinAv` con `link=true` a nivel de request cliente — fuera de scope; WR-3 (UN join av) garantizado solo server-side.
- Discrepancia de conteo del dispatcher nativo (43 vs 46) — documentada en Review Gate, método de conteo, no defecto de evidencia.

## Rollback

Revertir commits de `feat/state-sync-rework` en orden inverso (576ad95 → 5fec39e); `state.backup.json` previo a migración v3; presets viejos en localStorage. Los specs base syncados se revierten con el mismo revert de la rama.

## SDD Cycle Complete

Change fully planned, implemented (PR 1–5 + fix A/B, 25 commits), verified (PASS, 43/43 requirements, 60/60 scenarios, 179 tests, build OK), and archived. Ready for merge to v2.
