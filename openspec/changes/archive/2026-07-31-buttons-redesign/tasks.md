# Tasks: Button System Redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,500 (PR1 ~100 / PR2 ~950 / PR3 ~460) |
| 400-line budget risk | High total; PR2 High, PR3 Medium, PR1 Low |
| Chained PRs recommended | Yes |
| Chain strategy | stacked-to-main |
| Delivery strategy | force-chained |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Work Units

| Unit | PR | Focused test | Runtime harness | Rollback |
|------|----|--------------|-----------------|----------|
| 1 | PR1 | `pnpm run build` | dev (localhost:5176), MatrizVideo token styling | Revert tokens.css block |
| 2 | PR2 | `pnpm test src/componentes/ui/Button.test.jsx src/componentes/MatrizVideo.test.jsx` | dev, MatrizVideo render/click/loading/selected | Revert Button.*, restore BrawlStarsButton.* |
| 3 | PR3 | `pnpm test` | dev, MatrizPreset/Canales/Audio/DecosStatus screens | Revert consumer files |

## Phase 1 — PR1: Tokens (tokens.css only)

- [x] 1.1 `--btn-padding-{x,y}-{sm,md,lg}` spacing (DTK-04, BTN-02) — 12 lines
- [x] 1.2 25 `--btn-{variant}-{bg,hover-bg,active-bg,text,border}` colors, 5 variants (DTK-05, BTN-01) — 25 lines
- [x] 1.3 Layout+shadow: `--btn-radius/font-weight/gap`, `--font-weight-*`, `--shadow-xs/sm`, `--btn-selected-glow` (DTK-06..09, BTN-04) — 15 lines
- [x] 1.4 `[data-theme="dark"]` overrides for all `--btn-*` (DMK-04..07, BTN-09, A11Y-06): L 20-40%, glow ≤0.4, spread ≤4px, contrast ≥3:1 — 40 lines
- [x] 1.5 `pnpm run build` passes; no bare var() fallback leaks (DTK edge) — 0 lines

## Phase 2 — PR2: Button + BrawlStars Removal + MatrizVideo

- [x] 2.1 Create `Button.test.jsx`: variants/sizes/states/selected/as/icon/loading-guard (BTN-01..10), 44px touch (A11Y-05), aria-busy/aria-disabled/aria-label (A11Y-07..09), focus ring (A11Y-10) — 220 lines
- [x] 2.2 Rewrite `Button.module.css`: `.btn` base (btn tokens, 44px min, focus ring, 150ms) + variant/size/selected/loading/disabled classes — 170 lines
- [x] 2.3 Rewrite `Button.jsx`: `as` factory (button/input submit), variant/size/selected/loading/disabled/icon, SVG Spinner, aria-busy gating, data-testid passthrough — 150 lines
- [x] 2.4 Delete `BrawlStarsButton.jsx` + `.module.css` (js-design deprecated) — -120 lines
- [x] 2.5 Migrate `MatrizVideo.jsx` ~112 instances (dataTestId→data-testid, isActive→selected, variant/loading); update test selectors — 300 lines
- [x] 2.6 Green: Button + MatrizVideo tests pass (BTN-10: 3 clicks → 0 calls) — 0 lines

## Phase 3 — PR3: Consumer Migration

- [x] 3.1 `MatrizPreset.jsx` `.btn/.btnLoad/.btnSave/.btnClear` → Button; strip `.btn*` from `MatrizPreset.module.css` (BTN-07) — 180 lines
- [x] 3.2 `DecosStatus.jsx` + `.module.css` → Button — 60 lines
- [x] 3.3 `Audio.jsx` + `.module.css` → Button — 80 lines
- [x] 3.4 `Canales.jsx`: drop global CSS import, `styles.CanalFavorito` (CSM-05) — 10 lines
- [x] 3.5 `CanalFavorito`: create `.module.css`, update jsx, delete `.css` (CSM-04/06) — 100 lines
- [x] 3.6 Update 4 consumer tests; grep: zero stray `.btn`/`.CanalFavorito` (CSM-06) — 80 lines

## Phase 4 — Per-PR Merge Gates

- [ ] 4.1 `pnpm test` passes
- [ ] 4.2 `pnpm run lint` + `pnpm run format:check`
- [ ] 4.3 Visual/a11y audit both themes: focus, aria, contrast ≥3:1, touch ≥44px
- [ ] 4.4 Merge PR1→PR2→PR3; child diffs clean (stacked-to-main)

## Dependencies

PR2 → PR1; PR3 → PR2. In PR2: 2.1 ∥ 1.4; 2.5 independent once API frozen. PR3 3.2/3.3 parallel. `strict_tdd: false` — tests inside units.
