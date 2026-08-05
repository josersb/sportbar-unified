# Design: buttons-redesign

## Technical Approach

Replace 9 ad-hoc button implementations with one token-driven `Button` component using CSS Modules. Component reads theme purely via `var(--btn-*)` CSS custom properties — zero JS theme dependency. BrawlStarsButton and js-design removed. CanalFavorito global CSS migrated to CSS Modules. Three chained PRs: tokens → component + BrawlStars removal → consumer migration.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Variant engine | CSS Modules class composition (`styles.btn + styles['btn--primary']`) | No runtime library dependency. Project already uses CSS Modules. cva/tailwind would need new build tooling. |
| Theme integration | CSS custom properties on `:root` / `[data-theme="dark"]`, zero JS | ThemeProvider already sets `data-theme` on `<html>`. Button reads tokens passively — no context subscription needed. |
| `as` prop | Factory function, not `forwardRef` polymorphism | Simpler for two-element surface (`button`, `input`). Avoids ref forwarding complexity the project doesn't use. |
| Width behavior | `width: 100%` in flex/grid parent via parent `display:flex` + Button gets `flex:1` or explicit `width` from CSS Module | MatrizPreset cards use flex — Button fills available. Standalone shrinks to content. |
| Loading state | Internal `<Spinner>` SVG + `aria-busy` + `disabled` prop gate | Prevents double-submit without external state management. MatrizVideo already tracks `loading` per button. |

## Component API

```jsx
// Props (all optional except children or aria-label for icon-only)
<Button
  variant="primary"     // 'primary'|'secondary'|'danger'|'ghost'|'outline'
  size="md"             // 'sm'|'md'|'lg'
  selected={false}      // fill + 3px border + glow
  loading={false}       // spinner + aria-busy + disabled
  disabled={false}      // aria-disabled + not-allowed cursor
  icon={<SomeIcon />}   // left-aligned, gap from --btn-gap
  as="button"           // 'button'|<button> | 'input'|<input type="submit">
  className=""          // merged with internal classes
  data-testid=""        // preserved as-is
/>
```

Factory pattern: `as="input"` renders `<input type="submit">` with identical CSS class composition. `as="button"` (default) renders `<button>`.

## Data Flow

```
tokens.css (:root / [data-theme="dark"])
  │ var(--btn-primary-bg), var(--btn-padding-x-md), ...
  ▼
Button.module.css (consumes tokens via var())
  │ .btn + .btn--primary + .btn--md + .btn--selected
  ▼
Button.jsx (reads props, composes classNames, renders <button> or <input>)
  │
  ▼
Consumer (MatrizVideo, MatrizPreset, Canales, CanalFavorito, etc.)
```

## Design Tokens to Add

**Spacing** (6 tokens): `--btn-padding-x-sm` (8px), `--btn-padding-x-md` (16px), `--btn-padding-x-lg` (24px), `--btn-padding-y-sm` (4px), `--btn-padding-y-md` (8px), `--btn-padding-y-lg` (12px).

**Colors** (25 tokens): 5 variants × 5 properties: `--btn-{variant}-{bg, hover-bg, active-bg, text, border}`.

**Layout**: `--btn-radius: var(--radius-md)` (8px), `--btn-font-weight: var(--font-weight-bold)`, `--btn-gap: var(--gap-sm)` (8px).

**Shadows**: `--shadow-xs: 0 1px 2px rgba(0,0,0,0.08)`, `--shadow-sm: 0 1px 3px rgba(0,0,0,0.12)`, `--btn-selected-glow: 0 0 8px var(--color-brand-primary)`.

**Typography**: `--font-weight-medium: 500`, `--font-weight-semibold: 600`.

All tokens have `[data-theme="dark"]` variants with lightness 20-40% for surfaces, adjusted glow (opacity ≤ 0.4), and ≥ 3:1 contrast.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/styles/tokens.css` | Modify | Add 36+ button tokens + dark overrides |
| `src/componentes/ui/Button.jsx` | Rewrite | Full component: 5 variants, 3 sizes, 6 states, loading, icon, `as` |
| `src/componentes/ui/Button.module.css` | Rewrite | Class composition: `.btn` + variant/size/state |
| `src/componentes/ui/Button.test.jsx` | Create | Token, variant, state, as-prop, icon, a11y tests |
| `src/componentes/ui/BrawlStarsButton.jsx` | Delete | Replaced by Button |
| `src/componentes/ui/BrawlStarsButton.module.css` | Delete | No longer needed |
| `src/componentes/MatrizVideo.jsx` | Modify | Replace BrawlStarsButton → Button (16 video + 16 audio + 80 zona = ~112 instances) |
| `src/componentes/MatrizVideo.test.jsx` | Modify | Update data-testid selectors only |
| `src/componentes/MatrizPreset.jsx` | Modify | Replace .btn/.btnLoad/.btnSave/.btnClear → Button |
| `src/componentes/MatrizPreset.module.css` | Modify | Remove .btn* classes, keep card layout |
| `src/elementos/CanalFavorito.jsx` | Modify | Import from `.module.css`, use `styles.*` |
| `src/elementos/CanalFavorito.css` | Delete | Migrated to `.module.css` |
| `src/elementos/CanalFavorito.module.css` | Create | Identical styles, module-scoped |
| `src/componentes/Canales.jsx` | Modify | Remove global CSS import, use module class |

## PR Boundaries

**PR #1 — Tokens**: `tokens.css` only. Adds all button tokens + dark overrides. Zero component changes. Safe to merge independently.

**PR #2 — Button Component + BrawlStars Removal**: `Button.jsx`, `Button.module.css`, `Button.test.jsx`. Deletes `BrawlStarsButton.*`. Updates `MatrizVideo.jsx` + test. Depends on PR #1 tokens.

**PR #3 — Consumer Migration**: `MatrizPreset.*`, `CanalFavorito.*`, `Canales.jsx`. Normalizes 3 consumers to Button. Depends on PR #2 component available.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit — Button | All variants, sizes, states, `as`, icon, loading guard | `@testing-library/react` + Vitest. `data-testid` preserved. |
| Integration — MatrizVideo | Button clicks fire API calls via data-testid | Existing tests updated: `screen.getByTestId('btn-video-DTV1')` still works. |
| A11y | `aria-busy`, `aria-disabled`, `aria-label`, focus-visible | Assert attributes present on render. |

MatrizVideo test update scope: BrawlStarsButton uses `dataTestId` prop → Button uses `data-testid`. Same selectors, same click behavior — test logic unchanged.

## Accessibility

- Focus-visible: 3px ring via `--focus-ring-color`, 2px offset, `:focus-visible` pseudo-class (no ring on mouse click).
- Loading: `aria-busy="true"` set synchronously. onClick gated by `disabled || loading`.
- Disabled: `aria-disabled="true"` + `cursor: not-allowed` + `opacity: 0.5`.
- Touch: `min-height: var(--touch-target-min)` (44px) on all sizes, including `sm`.
- Icon-only: requires `aria-label` per WCAG 2.2.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Open Questions

- None. All blocking decisions resolved per orchestrator binding guidance.
