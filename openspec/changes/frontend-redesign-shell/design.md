# Design: Shell Frontend Redesign

## Technical Approach

Refactor the app shell applying impeccable-design (tokens → layout → components → audit). Four-phase pipeline resolving 6 BLOCKERs and 10 CRITICALs. Strategy: expand tokens first (additive, backward-compatible), then restructure Body grid mobile-first, then decompose Aside monolith, then normalize Header/Nav styles against new tokens.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Aside: monolithic vs 3 sub-components | Decomposition = more files but each <200 lines, independently testable per Component Forge spec | **DecosStatus + AudioStatus + VideoMatrix** — each consumes context directly |
| BrowserRouter: stay in Body vs move to App | Moving to App separates routing from layout; Body becomes pure layout | **Move to App.jsx** — Body wraps `<main>` with `<Routes>` children |
| CSS strategy: keep Modules vs migrate to styled-components | styled-components requires rewriting ALL styles; out of scope per proposal | **Keep CSS Modules** — replace element selectors with class selectors |
| Responsive strategy: max-width (desktop-first) vs min-width (mobile-first) | min-width means narrowest viewport is base state; fewer overrides per R-LA-001 | **min-width breakpoints (480px, 768px, 1024px)** |
| Aside TV grid adaptation: container queries vs media queries | Container queries adapt to aside width regardless of viewport | **Container query on `.aside`** for TV grid reflow |

## Data Flow

```
App.jsx
├── BrowserRouter
│   └── SkipToContent (first focusable, visually hidden, skiplink → #main-content)
│       └── Body
│           ├── Header (no context — pure presentational + ThemeToggle)
│           ├── Nav (no context — NavLink routing only)
│           ├── Aside (thin wrapper, grid-area: aside)
│           │   ├── DecosStatus ← useContext(ContextoUser) → estado.dispositivos
│           │   ├── AudioStatus ← useContext(ContextoUser) → estado.audio
│           │   └── VideoMatrix ← useContext(ContextoUser) → estado.tvs
│           └── <main id="main-content">
│               └── <Routes> (7 routes, unchanged)
```

Each Aside sub-component calls `useContext(ContextoUser)` independently — no prop-drilling from Aside. This avoids state sync bugs because each sub-component re-renders only when its specific slice of `estado` changes (React bails out if the same object reference).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/styles/tokens.css` | Modify | +18 tokens: border-radius, line-height, focus-ring, touch-target-44px, spacing-xs→2xl, container breakpoints, logical spacing vars |
| `src/componentes/SkipToContent.jsx` | Create | Visually hidden skiplink to `#main-content`, first focusable element in DOM |
| `src/componentes/DecosStatus.jsx` + `.module.css` | Create | Extracted from Aside — deco channel list with recargar button (fix: form outside h3) |
| `src/componentes/AudioStatus.jsx` + `.module.css` | Create | Extracted from Aside — 3-zone audio table |
| `src/componentes/VideoMatrix.jsx` + `.module.css` | Create | Extracted from Aside — TV grid with container-query reflow |
| `src/App.jsx` | Modify | Extract BrowserRouter from Body; add SkipToContent before Body; import relocated components |
| `src/componentes/Body.jsx` + `.module.css` | Modify | Mobile-first grid; `<main id="main-content">`; class selectors (.header, .nav, .aside, .main); replace `<div class=container>` with semantic grid |
| `src/componentes/Header.jsx` + `.module.css` | Modify | Token normalization; `:focus-visible` ring on ThemeToggle button; `role="banner"` |
| `src/componentes/Nav.jsx` + `.module.css` | Modify | 44px min-height per NavLink; token refactor; `role="navigation" aria-label="Principal"` |
| `src/componentes/Aside.jsx` + `.module.css` | Modify | Thin wrapper: renders DecosStatus, AudioStatus, VideoMatrix; preserves `grid-area: aside` |
| `src/componentes/BodyResponsive.test.jsx` | Modify | Update assertions: class selectors, `<main>` element, min-width breakpoints |

## Component Contracts

### DecosStatus
- **Responsibility**: Renders 8-deco channel list with recargar button
- **Props**: None (consumes `ContextoUser`)
- **States**: default (populated list), empty (estado.dispositivos is `{}`), loading (estadoLoaded=false → skeleton)
- **Dependencies**: `useContext(ContextoUser)`, `getAllDevices()` from `dispositivos.js`
- **A11y**: `<section aria-label="Estado de canales">`, `<h2>` instead of `<h3>`, button outside heading element

### AudioStatus
- **Responsibility**: Renders 3-zone audio table (zona, deco, vol, mute)
- **Props**: None (consumes `ContextoUser`)
- **States**: default (3 rows), loading
- **Dependencies**: `useContext(ContextoUser)`
- **A11y**: `<section aria-label="Estado del audio">`, `<table>` with `<thead>`/`<tbody>`

### VideoMatrix
- **Responsibility**: Renders TV assignment grid with color-coded backgrounds from CSS custom properties
- **Props**: None (consumes `ContextoUser`, computes cssColors via `useMemo`)
- **States**: default (grid populated), loading
- **Dependencies**: `useContext(ContextoUser)`
- **A11y**: `<section aria-label="Estado del video">`, TV grid items as list with `aria-label` per TV

### SkipToContent
- **Responsibility**: First focusable element; skips to `#main-content` on Enter
- **Props**: None
- **A11y**: `href="#main-content"`, visually hidden (`.sr-only` class), appears on `:focus-visible`

## Design Tokens (Additions to tokens.css)

```css
/* Spacing — revised scale */
--space-xs: 4px; --space-sm: 8px; --space-md: 12px; --space-lg: 16px;
--space-xl: 24px; --space-2xl: 32px; --space-3xl: 48px;

/* Typography — additions */
--line-height-tight: 1.25; --line-height-normal: 1.5; --line-height-relaxed: 1.75;

/* Borders + Radius */
--radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
--border-width-thin: 1px; --border-width-thick: 2px;

/* Focus ring */
--focus-ring-color: #2563eb; --focus-ring-width: 3px; --focus-ring-offset: 2px;

/* Touch targets */
--touch-target-min: 44px;

/* Layout */
--breakpoint-sm: 480px; --breakpoint-md: 768px; --breakpoint-lg: 1024px;
--content-max-width: 75ch; --aside-min-width: 280px;

/* Transitions */
--motion-duration-fast: 150ms; --motion-duration-normal: 300ms;
--motion-easing-default: ease;

/* Dark mode additions */
[data-theme="dark"] { --focus-ring-color: #60a5fa; }
```

## Layout Spec (Body.module.css)

- Grid on `.container` class: `grid-template-areas: "header" "nav" "aside" "main"` (mobile default)
- Breakpoints:
  - `@media (min-width: 480px)`: gap increases, padding grows
  - `@media (min-width: 768px)`: `grid-template-areas: "header header" "nav nav" "aside main"` with `grid-template-columns: minmax(280px, 30%) 1fr`
  - `@media (min-width: 1024px)`: `grid-template-columns: minmax(320px, 25%) 1fr`
- Class selectors replace element selectors: `.header { grid-area: header }` instead of `header { grid-area: header }`
- Container query on `.aside` for TV grid reflow: `@container (min-width: 320px)`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Aside sub-components render with context | Mock `ContextoUser.Provider` with vitest; assert headings and list items |
| Unit | SkipToContent renders and is hidden | Assert `.sr-only` class; assert `href="#main-content"` |
| CSS Assertion | Body.module.css breakpoints | Read CSS file, assert `min-width: 768px` and class selectors exist (same pattern as existing test) |
| CSS Assertion | tokens.css additions | Read file, assert `--touch-target-min: 44px` and `:focus-visible` tokens exist |
| Accessibility | Axe-core audit on shell components | Run `axe` in jsdom; assert 0 violations for landmark, contrast, touch-target rules |
| Responsive mock | jsdom + media query mock | Use `window.matchMedia` mock via vitest to simulate `min-width: 768px` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Pure frontend refactor of presentational layout.

## Migration / Rollout

No migration required. All changes are additive (new files) or refactor existing behavior. Tokens are backward-compatible (additions only). Each phase produces an independent commit — rollback via `git revert`.

## Open Questions

None.
