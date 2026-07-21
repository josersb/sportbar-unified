# Tasks: UI/UX Redesign — SportBar Unified

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800–1000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (UX) → PR 3 (Polish) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

### Suggested Work Units

| Unit | Goal | Likely PR | Test command | Runtime harness | Rollback |
|------|------|-----------|-------------|-----------------|----------|
| 1 | Foundation — tokens, CSS Modules (Header/Nav/Body), NavLink active, ThemeToggle infra | PR 1 | `pnpm run build` | `pnpm run dev` — verify tokens load, Nav active highlights | Revert tokens.css, reset.css, revert Header/Nav/Body to global CSS |
| 2 | UX — responsive breakpoints, Aside CSS + remove :root mutation, usePreset, toasts, Canales data, Button/PageContainer | PR 2 | `pnpm run build` | `pnpm run dev` — verify responsive collapse, presets load without reload | Revert Aside.module.css, usePreset.js, Canales data, MatrizPreset |
| 3 | Polish — dark mode enable, a11y, styled-components removal, delete old CSS, remaining CSS Modules | PR 3 | `pnpm run build` | `pnpm run dev` — verify dark mode toggle, keyboard focus, tab order | Revert dark mode tokens, restore styled-components, restore deleted CSS files |

## Phase 1: Foundation (PR #1)

- [x] 1.1 Create `src/styles/tokens.css` with `:root` design tokens (colors, spacing, typography, shadows, borders, transitions)
- [x] 1.2 Create `src/styles/reset.css`, modify `src/index.css` to `@import` both
- [x] 1.3 Modify `src/main.jsx` to import tokens.css first
- [x] 1.4 Create `src/componentes/Header.module.css`, migrate `Header.jsx` to CSS Modules
- [x] 1.5 Create `src/componentes/Nav.module.css`, migrate `Nav.jsx` + active NavLink styling
- [x] 1.6 Create `src/componentes/Body.module.css`, migrate `Body.jsx` to CSS Modules
- [x] 1.7 Create `src/componentes/ThemeToggle.jsx` + ThemeProvider in `App.jsx` (toggle hidden until PR #3)

## Phase 2: UX (PR #2)

- [x] 2.1 Add responsive breakpoints in Body.module.css (768px aside collapse, 1024px fluid, 600px form stack)
- [x] 2.2 Create `src/componentes/Aside.module.css`, migrate `Aside.jsx` + remove `:root` mutation
- [x] 2.3 Create `src/hooks/usePreset.js` — load/save/isLoaded for presets 1..5
- [x] 2.4 Refactor `MatrizPreset.jsx` to use `usePreset(n)`, remove `window.location.reload()`
- [x] 2.5 Add `info`/`warning` toast types to `Toast.jsx` + loading states on preset/form buttons
- [x] 2.6 Create `src/data/canalesFavoritos.js` with CANALES_FAVORITOS array, refactor `Canales.jsx`
- [x] 2.7 Create `src/componentes/ui/Button.jsx` and `PageContainer.jsx` shared components

## Phase 3: Polish (PR #3)

- [x] 3.1 Complete `[data-theme="dark"]` token overrides in tokens.css
- [x] 3.2 Enable ThemeToggle in Header — wire data-theme + localStorage persistence
- [x] 3.3 Delete old CSS files: Header.css, Nav.css, Body.css, Aside.css
- [x] 3.4 Remove `styled-components` from package.json, run `pnpm run build` to verify
- [x] 3.5 Migrate remaining components to CSS Modules: MatrizVideo, Audio, Canales, Arranger, Portada, Soporte
- [x] 3.6 Add `:focus-visible`, `aria-label`, and `aria-current="page"` to interactive elements
- [x] 3.7 Consolidate 7 duplicated `.page-container` blocks into one shared class
- [x] 3.8 Ensure form inputs have associated `<label>` with htmlFor/id

## Phase 4: Testing (cross-cutting)

- [x] 4.1 Write Vitest unit test for `usePreset(n)` — load, save, localStorage mock (10 tests: isLoaded x3, load x5, save x3)
- [x] 4.2 Write Vitest test for `CANALES_FAVORITOS` — verify 21 entries, structure, no duplicate canals, known channels
- [x] 4.3 Write integration test for dark mode toggle persistence (RTL + data-theme: 8 tests covering render, toggle, localStorage, restore, a11y)
- [x] 4.4 Verify responsive layout — CSS Module file parsing for 768px/1024px/600px breakpoints + component structure tests
