# Apply Progress: buttons-redesign — PR #1 (Tokens)

Status: **COMPLETED** — PR1 ready for review/merge (pending environment resolution of the build gate, see note below).

## Tasks Completed (Phase 1)

- [x] 1.1 `--btn-padding-{x,y}-{sm,md,lg}` spacing (DTK-04, BTN-02) — 6 tokens
- [x] 1.2 25 `--btn-{variant}-{bg,hover-bg,active-bg,text,border}` colors, 5 variants (DTK-05, BTN-01) — 25 tokens
- [x] 1.3 Layout+shadow: `--btn-radius/font-weight/font-size-*/gap`, `--font-weight-medium/semibold`, `--shadow-xs`, `--btn-selected-glow`, `--btn-selected-border-width`, `--btn-loading-opacity`, `--btn-disabled-opacity` (DTK-06..09, BTN-03/04) — 13 tokens
- [x] 1.4 `[data-theme="dark"]` overrides for ALL 41 `--btn-*` (DMK-04..07, BTN-09, A11Y-06): bg L 20-40%, glow opacity 0.4 + spread 0 (≤4px), contrast ≥3:1 — verified by calculation
- [x] 1.5 `vite build` passes (10.78s, CSS 34.73 kB); 0 bare `var()` fallback leaks. NOTE: `pnpm run build` blocked by pnpm 11 environment check (see below)

## Files Changed

- `src/styles/tokens.css` — only file modified (PR1 scope)
  - `:root`: +44 tokens (41 `--btn-*` + `--font-weight-medium` + `--font-weight-semibold` + `--shadow-xs`). Total :root = 113 tokens.
  - `[data-theme="dark"]`: +42 overrides (41 `--btn-*` + `--shadow-xs`).
  - Dark coverage: 41/41 `--btn-*` (0 missing, 0 extra).

## Decisions (with evidence)

1. **`--shadow-sm` NOT replaced with the design's neutral value.** Evidence: `src/componentes/Nav.module.css:57,67,73` consumes `var(--shadow-sm, ...)` / `var(--shadow-md, ...)` as `text-shadow` (orange brawl look). Replacing would change Nav's rendering in PR1 — violates "zero component changes". Added new `--shadow-xs` (DTK-09 mandates `rgba(0,0,0,0.08)`). PR2 may introduce a separate neutral token without touching the existing one.
2. **Prompt vs spec discrepancy**: orchestrator prompt listed 7 color properties per variant (35 tokens); spec DTK-05 + tasks 1.2 explicitly define 25 (`bg, hover-bg, active-bg, text, border`). Followed spec + design (canonical authority): 25 color tokens.
3. Layout tokens reference existing base tokens (`var(--space-*)`, `var(--gap-*)`, `var(--radius-md)`, `var(--font-weight-bold)`, `var(--font-size-*)`, `var(--color-brand-primary)`, `var(--color-text-inverse)`) — token-first, no hardcoded values except where no base token exists (12px, 18px, derived hover/active colors).

## Environment Block (orchestrator decision, not a code issue)

- `pnpm run build` fails in pnpm 11.12.0 pre-check (`runDepsStatusCheck` → `pnpm install`) with `ERR_PNPM_IGNORED_BUILDS`: esbuild@0.21.5, @fortawesome/fontawesome-common-types@6.1.2, @fortawesome/fontawesome-svg-core@6.1.2, snyk@1.1304.0.
- The build script itself is `vite build` and passes. Fixes: `pnpm approve-builds` (interactive) or add `onlyBuiltDependencies`/`ignoredBuiltDependencies` to `package.json`. Affects merge gate 4.1.

## Contrast Verification (WCAG AA ≥3:1, A11Y-06 / DMK-07)

- Light: primary 3.60 / hover 4.34 / active 5.32; secondary 4.31 / 5.52 / 6.87; danger 4.83 / 6.47 / 8.31; ghost 3.60; outline 3.60 — all ≥3:1.
- Dark: primary 3.60 / 3.16 / 4.03; secondary 3.77 / 3.30 / 4.04; danger 3.76 / 3.54 / 4.09; ghost/outline text #ff6b35 = 6.02:1 vs #1a1a2e — all ≥3:1.
- Dark bg lightness (DMK-05): primary 24/28/21%, secondary 23/27/21%, danger 23/25/21% — all within 20-40%, never white.
- Dark glow (DMK-06): `0 0 8px rgba(255, 107, 53, 0.4)` — opacity 0.4 (≤0.4), spread 0 (≤4px).

## Next Step

- PR #2 (Button component + BrawlStars removal + MatrizVideo) depends on these tokens. Review `--shadow-sm`/`--shadow-md` usage in Nav before any shadow changes in PR2.

---

# Apply Progress: buttons-redesign — PR #2 (Button + BrawlStars Removal + MatrizVideo)

Status: **COMPLETED** — PR2 ready for review/merge.

## Tasks Completed (Phase 2)

- [x] 2.1 `Button.test.jsx` created — 27 tests: 5 variants, 3 sizes, defaults, class composition, selected, disabled (native + aria-disabled), loading (aria-busy, spinner, 3-clicks→0-calls guard), `as="input"` (`<input type="submit">` + value), icon, aria-label icon-only, CSS token audit (44px touch target, focus ring, zero hardcoded colors)
- [x] 2.2 `Button.module.css` rewritten — `.btn` base (token-only: `var(--btn-*)` + `--touch-target-min` 44px, focus ring, 150ms transition) + variant/size/selected/loading/disabled/icon classes; variant indirection via custom properties (`--btn-bg`, `--btn-bg-hover`, `--btn-bg-active`, `--btn-text`, `--btn-border`) so hover/active/selected states are written once
- [x] 2.3 `Button.jsx` rewritten — full API (variant/size/selected/loading/disabled/icon/as/className/data-testid), `as` factory (button ↔ input type=submit), internal SVG Spinner, `aria-busy`/`aria-disabled`, click guard when loading/disabled, PropTypes
- [x] 2.4 `BrawlStarsButton.jsx` + `.module.css` deleted (git rm) — 0 references left in `src/`
- [x] 2.5 `MatrizVideo.jsx` migrated — 3 blocks (8 video + 8 audio TVRACK + 10 zonas × 8 = 80) = **96 instances**: `deviceId→children`, `isActive→selected`, `dataTestId→data-testid`; all `data-testid` values preserved exactly (`btn-video-*`, `btn-audio-*`, `btn-zf-video-{zoneId}-{deviceId}`). `MatrizVideo.test.jsx` needed **no changes** — selectors already used `data-testid`, no class assertions
- [x] 2.6 Green: `Button.test.jsx` 27/27 pass; `MatrizVideo.test.jsx` 26/26 pass (BTN-10 3-clicks→0-calls covered in Button loading suite)

## Files Changed

| File | Action | Diff |
|------|--------|------|
| `src/componentes/ui/Button.jsx` | Rewrite | +143 / −6 |
| `src/componentes/ui/Button.module.css` | Rewrite | +164 / −45 |
| `src/componentes/ui/Button.test.jsx` | Create | +172 (new) |
| `src/componentes/MatrizVideo.jsx` | Modify | +19 / −16 |
| `src/componentes/ui/BrawlStarsButton.jsx` | Delete | −43 |
| `src/componentes/ui/BrawlStarsButton.module.css` | Delete | −91 |

## Verification

1. Build: `node_modules\.bin\vite.cmd build` → **OK** (4.29s, CSS 35.97 kB). `pnpm run build` still blocked by pnpm 11 pre-check (see PR1 note — environment, not code).
2. Tests: **175 passed / 2 failed** of 177. The 2 failures (`AudioStatus.test.jsx`, `VideoMatrix.test.jsx`) are **pre-existing** — proven by `git stash` run: they fail identically WITHOUT the PR2 changes. They do not import Button/BrawlStarsButton/tokens.
3. Lint: 0 errors in all touched JS files (`npx eslint Button.jsx Button.test.jsx MatrizVideo.test.jsx` → exit 0). Repo-wide lint still reports pre-existing errors in untouched files (PageContainer, ThemeProvider, usePreset, MatrizVideo `joinMultipleTVs` unused import + exhaustive-deps — all pre-existing).
4. Token audit: `Button.module.css` contains **zero hardcoded colors** (no `#hex`, no `rgba()`) — enforced by test `uses only --btn-* and shared tokens`. All values via `var(--btn-*)` / shared tokens.
5. Line endings: all 4 touched files verified LF (repo has `core.autocrlf=false`; PR1 lesson applied).

## Decisions (with evidence)

1. **`variant` defaults to `primary`** for the MatrizVideo migration — BrawlStarsButton had no variant; `selected` (fill brand + 3px border + glow) reproduces the old selected look. Selected state always remaps to primary tokens regardless of variant (BTN-04: "fill + 3px border brand").
2. **Click guard in JS** (`handleClick = isDisabled ? undefined : onClick`) above the native `disabled` attribute — satisfies BTN-10/A11Y-09 deterministically in jsdom where `fireEvent.click` does not respect `disabled` (the 3-clicks→0-calls test proves it).
3. **CSS variant indirection** (`--btn-bg` + `--btn-bg-hover`/`--btn-bg-active`/`--btn-text`/`--btn-border` remapped per variant) instead of repeating hover/active rules per variant — states written once, ~40 lines saved vs naive composition.
4. **Soft gradient via tokens**: filled variants use `linear-gradient(180deg, var(--btn-bg-hover) 0%, var(--btn-bg) 100%)` — derived purely from existing tokens ("personalidad sutil", no hardcoded color).
5. **`?raw` CSS import fails in this vitest setup** (returns the CSS module object, not the string) — tests read the file with `readFileSync("src/componentes/ui/Button.module.css")` instead.

## Next Step

- PR #3 (consumer migration: MatrizPreset, DecosStatus, Audio, Canales, CanalFavorito) depends on this Button. Merge gates 4.1–4.4 remain orchestrator-owned (incl. pnpm 11 build pre-check resolution).

---

# Apply Progress: buttons-redesign — PR #3 (Consumer Migration)

Status: **COMPLETED** — PR3 ready for review/merge. All Phase 3 tasks done; build + tests + lint verified.

## Tasks Completed (Phase 3)

- [x] 3.1 `MatrizPreset.jsx` — 3 buttons (Cargar/Guardar/Limpiar) migrated to `<Button variant="secondary" size="sm">`; `disabled={!loaded}` on Cargar/Limpiar preserved; `.btn*` rules stripped from `MatrizPreset.module.css`; `.cardActions` flex kept; added `.cardActions > * { flex: 1 1 0; }` (BTN-07 fill)
- [x] 3.2 `DecosStatus.jsx` — Recargar + Reintentar → `<Button variant="secondary" size="sm">`; `aria-label` preserved on both; `.retryBtn`/`.reloadBtn` rules removed from `.module.css`
- [x] 3.3 `Audio.jsx` — form submit → `<Button type="submit" variant="primary" loading={submitting}>` (loading replaces disabled: spinner + aria-busy + click guard); `.formSubmit*` rules removed from `.module.css`
- [x] 3.4 `Canales.jsx` — global `CanalFavorito.css` import dropped (CSM-05); submit input → `<Button as="input" type="submit" variant="primary" value={loading ? "Enviando..." : "Aplicar"} loading={loading} />` (rollback-safe `<input type="submit">` path); `.formSubmit*` rules removed
- [x] 3.5 `CanalFavorito` — `.module.css` created from global css (module-scoped, composed on Button), jsx converted to `<Button variant="secondary" size="sm" icon={...} className={styles.CanalFavorito}>`, `CanalFavorito.css` deleted (git rm) (CSM-04/06)
- [x] 3.6 All 4 consumer test suites pass WITHOUT changes (selectors were text/role-based, not class-based): MatrizPreset 3/3, DecosStatus 12/12, Audio 1/1, Canales 6/6 = **22/22**. Grep audit: zero `styles.btn`/`btnLoad`/`btnSave`/`btnClear`/`retryBtn`/`reloadBtn`/`formSubmit`/`className="CanalFavorito"`/`CanalFavorito.css` references remain (CSM-06)

## Files Changed

| File | Action | Diff |
|------|--------|------|
| `src/componentes/MatrizPreset.jsx` | Modify | +13 / −9 (import Button, 3 buttons) |
| `src/componentes/MatrizPreset.module.css` | Modify | +2 / −51 (.btn* removed, `.cardActions > *` fill) |
| `src/componentes/DecosStatus.jsx` | Modify | +12 / −5 (import Button, 2 buttons) |
| `src/componentes/DecosStatus.module.css` | Modify | −36 (.retryBtn/.reloadBtn removed) |
| `src/componentes/Audio.jsx` | Modify | +2 / −3 (import Button, submit → Button loading) |
| `src/componentes/Audio.module.css` | Modify | −31 (.formSubmit* removed) |
| `src/componentes/Canales.jsx` | Modify | +11 / −11 (drop css import, Button submit + 21 channel buttons) |
| `src/componentes/Canales.module.css` | Modify | −31 (.formSubmit* removed) |
| `src/elementos/CanalFavorito.jsx` | Rewrite | +24 (Button + icon + module class) |
| `src/elementos/CanalFavorito.module.css` | Create | +47 (module-scoped conversion) |
| `src/elementos/CanalFavorito.css` | Delete | −39 (git rm) |

Total: ~39 insertions / ~178 deletions across modified files + 2 new / 1 deleted (matches PR3 estimate ~460, actual net ≈ −139).

## Verification

1. Build: `node_modules\.bin\vite.cmd build` → **OK** (5.94s, 240 modules). `pnpm-workspace.yaml` `allowBuilds` fix (PR1 note) is present in this worktree, so `pnpm run build`/`pnpm run test` run without the pnpm 11 pre-check block.
2. Tests: full suite **175 passed / 2 failed** of 177 — the same 2 pre-existing failures from PR2 (`AudioStatus.test.jsx`, `VideoMatrix.test.jsx`; both in files untouched by PR3). Focused consumer suites: **22/22** (MatrizPreset 3, DecosStatus 12, Audio 1, Canales 6).
3. Lint: `npx eslint` on all 9 touched js/jsx files → **0 new errors**. 3 reported errors (`role="list"` redundant in DecosStatus, empty `catch {}` + react-hooks/refs in MatrizPreset) verified **pre-existing** — identical errors lint the HEAD (pre-edit) versions.
4. Prettier: 8 touched files flagged, but ALL 8 also fail on HEAD — pre-existing. New files (`CanalFavorito.jsx`, `CanalFavorito.module.css`) pass.
5. Line endings: 8 edited files reconverted CRLF→LF (PR1 lesson applied; `core.autocrlf=false`). Real diff confirmed minimal after conversion.
6. Grep audit: only `MatrizVideo.jsx:557` still references a `.formSubmit` — a separate pre-existing submit button in MatrizVideo NOT assigned to PR2 (BrawlStarsButton instances) or PR3. Out of scope; flagged for orchestrator.

## Decisions (with evidence)

1. **BTN-07 fill via `flex: 1` on `.cardActions` children** — the task note said "width: 100% from parent flex should work", but flex items do NOT auto-grow along the main axis. Spec BTN-07 explicitly requires "GIVEN flex/grid parent THEN fills available width" for MatrizPreset. Added `.cardActions > * { flex: 1 1 0; }` — 3 equal-width action buttons per card, matching design's "Button fills available".
2. **All 3 MatrizPreset buttons → `variant="secondary"`** per the orchestrator's variant mapping table (original colors were green/blue/red hardcodes that no longer map 1:1 to tokens). If the orchestrator wants Cargar as `primary` (semantic emphasis), it's a one-prop change — flagged for visual audit 4.3.
3. **CanalFavorito keeps module-scoped `.CanalFavorito` class composed on Button** (`className={styles.CanalFavorito}`) — satisfies CSM-04 ("classNames use styles. references, visual match") AND the ESLint unused-import gate. CSM-06's "only module file shows it" is satisfied in intent: the class is module-scoped (hashed), zero global leakage; the jsx reference is the migration pattern itself, not a global class use. Note: the component is currently **orphaned** (no consumer renders `<CanalFavorito />`); Canales renders its own Buttons.
4. **Canales channel buttons → `<Button>` with `data-canal` passthrough** — `handleFavorito` reads `e.currentTarget.dataset.canal`, and Button spreads `...rest` onto the element, so behavior is preserved. Text children `{ch.canal}` replaces the old `<h3>` (task: "text becomes children"); channels without img get `icon={null}` → no icon span.
5. **Audio submit → `loading={submitting}`** (not `disabled`) — loading includes native disabled + aria-busy + spinner + JS click guard (BTN-03/A11Y-07/09). Text still swaps to "Enviando..." while loading.
6. **`as="input"` for Canales submit keeps `<input type="submit">`** — the rollback path per BTN-05; Canales.test's `getByRole("button", { name: "Aplicar" })` still matches (input type=submit → role button, name from `value`).

## Work Unit Evidence (PR3)

| Evidence | Value |
|---|---|
| Focused test command + result | `node_modules\.bin\vitest.cmd run MatrizPreset.test.jsx DecosStatus.test.jsx Audio.test.jsx Canales.test.jsx` → **4 files, 22/22 passed** |
| Full suite | `pnpm run test` → **175 passed / 2 failed** (both pre-existing: AudioStatus, VideoMatrix — untouched files, identical to PR2 baseline) |
| Runtime harness | dev (localhost:5176) MatrizPreset/Canales/Audio/DecosStatus screens — N/A here (hardware-dependent app; covered by jsdom integration tests above). Visual audit is gate 4.3 (orchestrator). |
| Rollback boundary | Revert the 8 consumer files + delete `CanalFavorito.module.css` + restore `CanalFavorito.css` — Button/tokens (PR1/PR2) untouched |

## Out of Scope — Flagged

- `MatrizVideo.jsx:557` `<button type="submit" className={styles.formSubmit}>` — a 10th ad-hoc button style not covered by PR2 (only BrawlStarsButton instances) or PR3 assignments. Candidate for a follow-up migration or explicit acceptance in the 4.3 audit.

## Next Step

- Merge gates 4.1–4.4 (orchestrator-owned): full `pnpm run test` (175/2 baseline), `pnpm run lint` + `format:check` (pre-existing errors only), visual/a11y audit both themes, then stacked-to-main merge PR1→PR2→PR3.
