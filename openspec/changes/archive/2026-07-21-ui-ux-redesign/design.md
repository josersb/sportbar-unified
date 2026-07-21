# Design: UI/UX Redesign — SportBar Unified

## Technical Approach

CSS custom properties system (design tokens) + CSS Modules replacing global CSS. Incremental migration per component, starting with simplest (Soporte, Arranger, Portada) → structural (Body, Nav, Header) → complex (MatrizVideo, Canales, Aside). Dark mode via `data-theme` attribute. Responsive via CSS-only (no JS breakpoints). Three PRs: Phase 1 (tokens + proof), Phase 2 (responsive + presets + toasts), Phase 3 (dark mode + a11y + cleanup).

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Token location | `src/styles/tokens.css` imported in `main.jsx` | Inline in `index.css`, per-component files | Single source of truth, discoverable, no CSS-before-tokens bug |
| Naming convention | `--{category}-{name}[-{variant}]` (e.g. `--color-primary-500`) | BEM-like or flat names | Standard design token convention, tool-friendly |
| Aside collapse | CSS-only `@media (max-width: 768px)` changing `flex-direction` and `max-width` | JS toggle with state | No JS bundle cost, works without hydration, simpler |
| Dark mode toggle | `data-theme="dark|light"` on `<html>`, persisted `localStorage("sportbar-theme")` | CSS `prefers-color-scheme` only, class-based | Explicit user control, session-surviving preference, easy SSR |
| `:root` mutation removal | Replace `document.querySelector(":root").style.setProperty()` in Aside with Context-driven CSS Modules | Keep JS mutation, move to tokens file | React owns the DOM; direct DOM manipulation violates React's programming model |
| styled-components removal | Remove from `dependencies`, audit `pnpm-lock.yaml`, verify build | Keep as unused dep | Zero imports across codebase; react-select 5.8.0 uses `@emotion` not styled-components |
| Preset hook | `usePreset(n)` taking preset number, returning `{load, save, isLoaded}` | Keep 5x duplicated functions | Eliminates 5× duplicated localStorage + `window.location.reload` blocks |

## Data Flow

```
main.jsx
  ├─ import tokens.css          ← :root tokens loaded first
  ├─ import index.css            ← reset / base
  └─ App.jsx
       ├─ ThemeProvider (new)    ← reads localStorage("sportbar-theme"), sets <html data-theme>
       ├─ ProviderUser           ← unchanged
       │    └─ ToastProvider
       │         └─ Body
       │              ├─ Header  ← dark mode toggle lives here
       │              ├─ Nav     ← .module.css with active NavLink
       │              ├─ Aside   ← reads Context, no DOM mutation
       │              └─ Routes → MatrizVideo, Canales, Audio, etc.
       └─ usePreset(n)           ← replaced in MatrizPreset
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/styles/tokens.css` | Create | All `:root` + `[data-theme="dark"]` design tokens |
| `src/styles/reset.css` | Create | Extract reset from `index.css` |
| `src/componentes/Header.module.css` | Create | CSS Modules for Header |
| `src/componentes/Nav.module.css` | Create | CSS Modules for Nav with active state |
| `src/componentes/Body.module.css` | Create | CSS Modules for layout grid + responsive breakpoints |
| `src/componentes/ui/Button.jsx` | Create | Shared button component |
| `src/componentes/ui/PageContainer.jsx` | Create | Shared page wrapper |
| `src/hooks/usePreset.js` | Create | Generic preset load/save hook replacing 5x duplication |
| `src/data/canalesFavoritos.js` | Create | Extracted channel data array from Canales.jsx JSX |
| `src/componentes/ThemeToggle.jsx` | Create | Dark/light toggle button for Header |
| `src/index.css` | Modify | Become `@import "./styles/tokens.css"` + `@import "./styles/reset.css"` |
| `src/main.jsx` | Modify | Import tokens.css first |
| `src/App.jsx` | Modify | Add ThemeProvider wrapper |
| `src/componentes/Header.jsx` | Modify | Add ThemeToggle, switch to CSS Modules |
| `src/componentes/Nav.jsx` | Modify | Switch to CSS Modules, active NavLink styling |
| `src/componentes/Body.jsx` | Modify | Switch to CSS Modules |
| `src/componentes/Aside.jsx` | Modify | Remove `document.querySelector(":root")` mutation, use CSS Modules |
| `src/componentes/MatrizPreset.jsx` | Modify | Replace 5x duplicated handlers with `usePreset(n)` |
| `src/componentes/Canales.jsx` | Modify | Import `canalesFavoritos` from data file |
| `src/componentes/Toast.jsx` | Modify | Add `info` and `warning` toast types |
| `src/componentes/Header.css` | Delete | Replaced by `.module.css` |
| `src/componentes/Nav.css` | Delete | Replaced by `.module.css` |
| `src/componentes/Body.css` | Delete | Replaced by `.module.css` |
| `src/componentes/Aside.css` | Delete | Replaced by `.module.css` |
| `package.json` | Modify | Remove `styled-components` from dependencies |

## Interfaces / Contracts

**usePreset(n)**:
```js
// n: 1..5
// Returns: { load: () => void, save: (desc: string) => void, isLoaded: boolean }
function usePreset(n) {
  const key = `estadoApp_Preset${n}`;
  const load = () => { /* localStorage get → handleChangeEstadoVideo → handleCargaMatriz */ };
  const save = (desc) => { /* localStorage set + handleChangeEstadoPreset */ };
  return { load, save, isLoaded };
}
```

**canalesFavoritos array**:
```js
export const CANALES_FAVORITOS = [
  { canal: 1603, img: img_tnt_sports, alt: "TNT Sports" },
  // ... 19 entries
];
```

**ThemeToggle props**: none — self-contained, reads/writes localStorage.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `usePreset(n)` hook — load, save, localStorage integration | Vitest + `jsdom` localStorage mock |
| Unit | `CANALES_FAVORITOS` renders correctly from data | RTL render Canales, verify 20 buttons |
| Integration | Dark mode toggle persists across reload | RTL + `data-theme` attribute assertion |
| Integration | Responsive layout at 375px / 768px / 1440px | Vitest + CSS media query simulation or Playwright |
| E2E | Preset load → matrix updates without page reload | Playwright → verify no `window.location.reload` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

Three chained PRs, each autonomous:

**PR #1 (Foundation)** → target `main`
- tokens.css + reset.css creation
- Header, Nav, Body to CSS Modules
- NavLink active state
- ThemeToggle component (dark mode infrastructure, toggle hidden until PR #3)

**PR #2 (UX)** → target `main` after PR #1 merges
- Responsive breakpoints in Body.module.css
- Aside CSS Modules (remove `:root` mutation)
- `usePreset(n)` hook + MatrizPreset refactor
- Toast: add `info`, `warning` types
- Canales data extraction
- Shared Button, PageContainer

**PR #3 (Polish)** → target `main` after PR #2 merges
- Dark mode: enable ThemeToggle, complete `[data-theme="dark"]` token overrides
- a11y: `aria-label`, focus-visible, contrast ratios
- Remove `styled-components` from package.json
- Delete old `.css` files (Header.css, Nav.css, Body.css, Aside.css)
- Remaining components to CSS Modules (MatrizVideo, Audio, Canales, Arranger, Portada, Soporte)

## Open Questions

- [ ] Confirm `react-select` CSS doesn't break with CSS Modules — react-select injects its own styles via emotion, so no conflict expected. Verify in PR #1.
- [ ] Tamaño de `tokens.css` — ¿excede 200 líneas? Si es muy grande, considerar split `color-tokens.css` + `spacing-tokens.css`. Evaluar en PR #1.
