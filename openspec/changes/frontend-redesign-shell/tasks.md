# Tasks: frontend-redesign-shell

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Tokens + Layout → PR 2: Components → PR 3: Tests |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|----|---------------------|-----------------|-------------------|
| 1 | Design Tokens + Shell Layout | PR 1 (base: feat/frontend-redesign) | `npx vitest src/componentes/BodyResponsive.test.jsx --run` | `pnpm run dev` → 6 routes render | revert PR 1 |
| 2 | Shell Components (Header, Nav, Aside decomposition) | PR 2 (base: PR 1 branch) | `npx vitest src/componentes/ --run` | `pnpm run dev` → Header/Nav/Aside sub-components render | revert PR 2 |
| 3 | Tests + WCAG Audit | PR 3 (base: PR 2 branch) | `npx vitest --run --coverage` | N/A (CI-only) | revert PR 3 |

## Phase 1: Design Tokens

- [ ] 1.1 Expand `src/styles/tokens.css`: +18 tokens (border-radius, line-height, focus-ring, touch-target, gap-scale, breakpoints, motion, dark variants)
- [ ] 1.2 Verify each new token has `[data-theme="dark"]` override; grep shell .module.css for hardcoded values

## Phase 2: Shell Layout

- [ ] 2.1 Rewrite `src/componentes/Body.module.css`: mobile-first grid (min-width 480/768/1024), class selectors, container query on .aside, `minmax()`, `1fr`
- [ ] 2.2 Refactor `src/componentes/Body.jsx`: extract BrowserRouter, add `<main id="main-content">` wrapping `<Routes>`, replace element selectors with classNames
- [ ] 2.3 Update `src/App.jsx`: move BrowserRouter from Body, render SkipToContent before Body, import DecosStatus/AudioStatus/VideoMatrix
- [ ] 2.4 Create `src/componentes/SkipToContent.jsx`: sr-only skiplink to #main-content, visible on `:focus-visible`

## Phase 3: Shell Components

- [ ] 3.1 Refactor `src/componentes/Header.jsx` + `Header.module.css`: token normalization, focus-ring on ThemeToggle, `clamp()` title, `role="banner"`
- [ ] 3.2 Refactor `src/componentes/Nav.jsx` + `Nav.module.css`: 44px min-height per link, token refactor, single `<ul>` with `aria-current="page"`
- [ ] 3.3 Create `src/componentes/DecosStatus.jsx` + `DecosStatus.module.css`: section aria-label, h2, button outside heading, loading/error/empty states
- [ ] 3.4 Create `src/componentes/AudioStatus.jsx` + `AudioStatus.module.css`: table with thead/tbody, loading/default states
- [ ] 3.5 Create `src/componentes/VideoMatrix.jsx` + `VideoMatrix.module.css`: container query reflow, color-coded TV grid, loading state
- [ ] 3.6 Refactor `src/componentes/Aside.jsx` + `Aside.module.css`: thin wrapper rendering 3 sub-components, grid-area: aside

## Phase 4: Testing & Audit

- [ ] 4.1 Update `BodyResponsive.test.jsx`: assert class selectors, `<main>`, min-width breakpoints, no max-width queries
- [ ] 4.2 Unit tests for `DecosStatus`, `AudioStatus`, `VideoMatrix`: loading, error, empty, default with ContextoUser mock
- [ ] 4.3 `SkipToContent` render test: sr-only class, href="#main-content", visible on focus
- [ ] 4.4 WCAG 2.2 AA audit per impeccable-design audit-checklist.md: contrast, keyboard nav, focus-visible, landmarks, touch targets
