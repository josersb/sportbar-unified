# Archive Report: mejoras-broker

- **Date archived**: 2026-09-17
- **Branch (archive worktree)**: `feat/mejoras-broker-ws1` (worktree `sportbar-unified-worktrees/mejoras-broker`)
- **Change tracker base**: `feat/mejoras-broker`
- **PRs**: #14..#24 (per orchestrator launch prompt — stacked auto-chain slices WS2→WS3→WS4a→WS4e→WS5→WS1 plus tracker)
- **Artifact store**: hybrid (OpenSpec + Engram)
- **Strict TDD**: false

## Final State (per Final-State Authority)

**Verdict**: PASS WITH WARNINGS — 0 blockers, 0 critical findings. Consolidated envelope `gentle-ai.verify-result/v1` (Engram #994):
`verdict: pass_with_warnings` · `requirements: 22/22` · `scenarios: 36/36` · `test_exit_code: 0` · `build_exit_code: 0` · `evidence_revision: sha256:8aeac4e9b8e16856e59c5dc06a2687aa550790be8592518783af8ac3782df72c`.

Final-state facts (orchestrator launch prompt — outranks intermediate snapshots): the change is **implemented, verified (consolidated verify `pass_with_warnings`, 22/22 req, 36/36 scenarios, 0 CRITICAL), `archive_ready: YES`**. Independent re-execution evidence at verification time:
- `pnpm test` → **209/209 tests, 15 files** (two green runs)
- `node server/broker/verify/run-all.cjs` → **all 17 steps green** (two runs)
- `node src/hooks/verify/verify-broker-core.mjs` → **140/140 OK**
- `pnpm run build` → exit 0 (`built in 10.55s` / `6.28s`)

**Task completion** (persisted `tasks.md` — highest-ranked source for completion visibility): **43/43 checked, 0 unchecked** (WS2 T-2.x, WS3 T-3.x, WS4a–e T-4x.x, WS5 T-5.x, WS1 T-1.x).

> **Snapshot note (not a contradiction)**: `apply-progress.md` WS1 section header carries a stale "pendiente" marker from when it was written (rank-3 intermediate snapshot). The persisted `tasks.md` (rank 1) shows T-1.1–T-1.3 all checked, `ws1-audit.md` exists with complete read-only evidence, and the consolidated `verify-report` marks both WS1-AUDIT scenarios VERIFIED. Final state reported from the higher-ranked sources: WS1 complete.

## Workstream Summary

| WS | Capability | Done |
|----|-----------|------|
| WS2 | `canales-favoritos` — single allowlist (`CANAL_ALLOWLIST`) + toast rejection + drift reconcile | ✅ T-2.1–T-2.5 |
| WS3 | `canales-dtv-intent` — server-side channel intent (`canalActual`/`lastSentAt`/`ack`) + ACK + rehydration + toasts | ✅ T-3.1–T-3.10 |
| WS4a | `matrix-groups-state` — declarative `matrixModel` (3 zones / 10 subgroups / 29 screens) + derived `groups` | ✅ T-4a.1–T-4a.3 (+T-4a.4 absorbed in WS4c) |
| WS4b | `matrixGroups` domain + endpoint + snapshot + server-side preset resolution | ✅ T-4b.1–T-4b.5 |
| WS4c | Client plumbing (`matrixModel`/`matrixGroups` survive snapshot/poll) | ✅ T-4c.1–T-4c.4 |
| WS4d | `MatrizVideo` renders from served model + Mixto + `Libertador` rename | ✅ T-4d.1–T-4d.4 |
| WS4e | Server-side submit (`POST /api/matrix-groups`), single POST, optimistic + `enableReinitialize` | ✅ T-4e.1–T-4e.2 |
| WS5 | Pre-join dedupe guard in `executeWrite` + in-memory `lastBatch` + `force` escape + client pre-filter | ✅ T-5.1–T-5.6 |
| WS1 | Read-only identity audit (`get devices all`, 49 devices, zero writes) | ✅ T-1.1–T-1.3 |

Non-regression holds at close: `confirmEncoder`/`executeWrite` join→confirm→reported flow intact (PR #13 `verify-confirm-settling` green), IR sequence untouched, pseudo-channels 0000/0000A/0000B intentionally disabled (user-reclassified as reference), TVRACK/Zonas Fuera operational.

## Spec Deltas Synced

| Domain | Action | Details |
|--------|--------|---------|
| `canales-favoritos` | **Created** | Full spec copied mechanically (3 requirements). NEW capability (WS2). |
| `canales-dtv-intent` | **Created** | Full spec copied mechanically (5 requirements). NEW capability (WS3). |
| `matrix-groups-state` | **Created** | Full spec copied mechanically (7 requirements). NEW capability (WS4). |
| `state-broker` | **Updated** | 1 **MODIFIED** + 2 **ADDED**. Canonical: **16 → 18 requirements**, 0 lost. |
| `sync-broadcast` | **Updated** | 1 **ADDED**. Canonical: **5 → 6 requirements**, 0 lost. |
| `zonas-fuera-state` | **Updated** | 1 **ADDED**. Canonical: **7 → 8 requirements**, 0 lost. |
| `ux-feedback` | **Updated** | 2 **ADDED**. Canonical: **8 → 10 requirements**, 0 lost. |

Totals: **21 requirements added, 1 modified, 0 removed, 0 renamed** across 7 domains. No destructive merges.

- Composition ran through the native command (mandate #4119), one invocation per existing domain, each **exit 0**:
  - `gentle-ai sdd-archive-compose --canonical "openspec/specs/state-broker/spec.md" --delta "openspec/changes/mejoras-broker/specs/state-broker/spec.md" --output "openspec/specs/state-broker/spec.md.compose-tmp"`
  - `gentle-ai sdd-archive-compose --canonical "openspec/specs/sync-broadcast/spec.md" --delta "openspec/changes/mejoras-broker/specs/sync-broadcast/spec.md" --output "openspec/specs/sync-broadcast/spec.md.compose-tmp"`
  - `gentle-ai sdd-archive-compose --canonical "openspec/specs/zonas-fuera-state/spec.md" --delta "openspec/changes/mejoras-broker/specs/zonas-fuera-state/spec.md" --output "openspec/specs/zonas-fuera-state/spec.md.compose-tmp"`
  - `gentle-ai sdd-archive-compose --canonical "openspec/specs/ux-feedback/spec.md" --delta "openspec/changes/mejoras-broker/specs/ux-feedback/spec.md" --output "openspec/specs/ux-feedback/spec.md.compose-tmp"`
  followed by atomic `Move-Item -Force` of each `.compose-tmp` over its canonical. Net diff on canonicals: `119 insertions(+), 1 deletion(-)` — purely additive.
- The 3 NEW specs were copied mechanically (`Copy-Item` delta → temp → `diff -r` → `Move-Item` over final): all 6 `diff -r` readbacks empty (exit 0). No file content passed through the model Read/Write path.

## Conditions Registered (orchestrator requirements — none blocking)

### C1 — Residual WARNING W-1: `verify-eventbus` heartbeat flaky
Pre-existing timing flake (50 ms window sensitive to host scheduling; fails ~1 in several runs under load). NOT introduced by this change (WS4b never touched `eventBus.cjs`); green in both consolidated-verify runs. Impact: `run-all.cjs` may end red from scheduling, not from a code defect. **Recommendation: poll with a relaxed deadline (500–1000 ms) in a cleanup slice.**

### C2 — 8 open SUGGESTIONS → backlog (none spec-breaking)
1. `buildBrokerSnapshot` is dead code (`server/server.js:632`; no callers) — unify or remove; drift risk between the 3 snapshot constructions.
2. `sortTvsByGroup` dead for the app (`src/data/tvGroups.js:38`; only the `verify-broker-core.mjs` harness consumes it) — consider removal with `TV_GROUPS`/`GROUP_ORDER`.
3. `ZONE_TITLES` duplicates model labels as client literals (`MatrizVideo.jsx:35-39`, display-only) — consider a per-zone `title` field in `matrixModel`.
4. No punctual SSE test for `channelIntent` (generic coverage via verify-eventbus/composition only) — low risk, same code path as proven domains.
5. Duplicate broadcast on bg no-op (`server.js:455` + `writeInBackground`) — idempotent SSE noise, no functional impact.
6. `lastBatch` key without `sub` — affects only the `reason` label, never the skip decision.
7. Client mirror of server helpers (`expandFromModel`/`collapseGroup` duplicate `expandGroups`/`collapseGroup` contract) — mitigated by round-trip verify importing the real module; evaluate a shared dual ESM/CJS module if it grows.
8. `POST /api/matrix-groups` with `values:{}` answers 200 noop (minor inconsistency vs "no values" → 400; client pre-filter already stops empty intents).

### C3 — Follow-up OUT OF SCOPE: device `aMas15-Vwall-Libertador` (MAC `…0CD2`) → SEPARATE change
Real, physically present device, absent from the fuera-model (10 modeled vs 11 real); added to the Arranger after the Feb-2026 capture. Full evidence in `ws1-audit.md`. Follow-up: add as zona-fuera destination (`destinations.js` / store / `zonas-fuera-state` spec / `ZonasFueraStatus.jsx` / `MatrizVideo.jsx`) and confirm the exact display label with the user. Side note from the audit: `Docs/referencia-instalacion.md` uses different names for some MACs — the live Arranger matches `devices_all.txt`.

## Engram Observation IDs (traceability)

Full artifact content was read from the `openspec/` files (hybrid file locators); Engram observations below were located via `mem_search` (previews) for lineage:

| Artifact | Engram ID | Topic Key |
|----------|-----------|-----------|
| Explore | #958 | `sdd/mejoras-broker/explore` |
| Proposal | #960 | `sdd/mejoras-broker/proposal` |
| Spec (7 capabilities) | #962 | `sdd/mejoras-broker/spec` |
| Design | #961 | `sdd/mejoras-broker/design` |
| Tasks | #963 | `sdd/mejoras-broker/tasks` |
| Verify consolidado | #994 | (title `Verify consolidado mejoras-broker: pass_with_warnings, archive-ready`) |
| Slice verifies | #966 (WS2), #968 (WS3), #971 (WS4a), #984 (WS4b), #990 (WS4c), #991 (WS4d), #992 (WS4e), #993 (WS5) | various titles |
| Change tracker | #959 | (title `Change mejoras-broker completo: 10 PRs (WS1-WS5)`) |
| Archive report | this save | `sdd/mejoras-broker/archive-report` |

## Mechanical Move Evidence

- Pre-move recursive snapshot of `openspec/changes/mejoras-broker/` → temp dir; `git mv` to `openspec/changes/archive/2026-09-17-mejoras-broker/`; post-move `diff -r snapshot archived` → **empty, exit 0** (verbatim output in phase result). Source path confirmed absent after the move.
- Additive-only exclusion: this `archive-report.md` did not exist in the source snapshot and is excluded from the comparison.
- Archived contents: `proposal.md`, `design.md`, `tasks.md` (43/43), `explore.md`, `apply-progress.md`, `ws1-audit.md`, `specs/` (7 domains), `verify-report.md` (consolidated) + 8 slice reports (`ws2`, `ws3`, `ws4a`–`ws4e`, `ws5`).

## SDD Cycle Complete

The change was fully planned, implemented, verified, and archived. Source of truth now lives in `openspec/specs/{canales-favoritos,canales-dtv-intent,matrix-groups-state,state-broker,sync-broadcast,zonas-fuera-state,ux-feedback}/spec.md`. Ready for the next change.
