# Proposal: Unified Button System

## Intent

Replace 9 ad-hoc button implementations (BrawlStarsButton, CSS Modules, inline styles, global CSS) with a single token-driven `Button` component designed via `impeccable-design`. Eliminate the deprecated `js-design`/BrawlStars cartoon aesthetic. Ship in 3 chained PRs.

## Scope

### In Scope
- Unified `Button` component: variants (primary, secondary, danger, ghost, outline), sizes (sm, md, lg), states (hover, focus-visible, active, disabled, loading), icon support, `as` prop (`button`|`input`)
- Design tokens: button-specific (`--btn-*`), semantic colors (`--color-error/success/info/warning`), font-weight scale, neutral shadow tokens, dark-mode overrides
- Migration: MatrizVideo (~140 buttons), MatrizPreset (15), DecosStatus (2), Canales (~23), Audio (1), CanalFavorito.css → CSS Modules
- BrawlStarsButton component deletion
- Accessibility: WCAG 2.2 AA — 44px touch targets, contrast ≥ 4.5:1, focus-visible on all

### Out of Scope
- ThemeToggle migration (remains independent)
- Layout redesign for MatrizVideo grid or MatrizPreset cards
- Figma design exploration — design tokens are code-first
- New BrawlStars-style decorative variant

## Capabilities

### New
- **button-system**: Unified `Button` component with variants, sizes, states, `as` prop, icon slots, and token-driven theming for light/dark

### Modified
- **design-tokens**: Add `--btn-*` scale, `--color-error/success/info/warning`, `--font-weight-*`, `--shadow-elevation-*`
- **a11y-basics**: Add 44px touch-target rule, button contrast requirements, aria-busy for loading state
- **css-modules-migration**: CanalFavorito global CSS → `.module.css`, delete `CanalFavorito.css`
- **dark-mode**: Button token overrides under `[data-theme="dark"]`

## Approach

1. **Token-first**: Define button tokens in `src/index.css` with `[data-theme="dark"]` overrides before any component code
2. **Component**: Extend existing dead `Button.jsx` architecture (variants via CSS Modules, cva-like class composition) — extend, don't replace
3. **Migration order**: PR #1 (tokens + Button core + MatrizVideo), PR #2 (mass migration), PR #3 (extended variants)
4. **Test safety**: `data-testid` preservation for MatrizVideo tests; role-based selectors already used in DecosStatus/Audio

## PR Slices

| PR | Scope | Est. Lines |
|----|-------|------------|
| #1 | Tokens + Button component + MatrizVideo (~140 buttons) + BrawlStarsButton deletion | ~500 |
| #2 | MatrizPreset (15), DecosStatus (2), Canales (~23), Audio (1), CanalFavorito CSS Modules | ~400 |
| #3 | Ghost/outline/icon-only variants, loading spinner, token refinements | ~300 |

## Risks

| Risk | Mitigation |
|------|------------|
| 96+ MatrizVideo test breakage from DOM change | Preserve `data-testid` attributes on Button output |
| Dark-mode MatrizPreset hardcoded colors in light mode | Token-driven both-theme colors, verify across themes |
| `<input type="submit">` in Canales | `as="input"` prop renders `<input>` with same styling |
| CanalFavorito global CSS removal breaks other pages | Audit global CSS consumers before deletion |

## Success Criteria

- [ ] No `BrawlStarsButton` imports remain; component file deleted
- [ ] All button styles reference design tokens (zero hardcoded colors/spacing)
- [ ] Touch targets ≥ 44px on all button variants
- [ ] `[data-theme="dark"]` overrides exist for every button token
- [ ] `data-testid` contract preserved for MatrizVideo (~96 test selectors)
- [ ] Zero visual regressions verified via screenshot comparison
- [ ] All 12 existing test suites pass without modification (or minimal `data-testid`-only updates)

## Proposal Question Round

1. **Visual aesthetic direction**: Without `js-design`, what aesthetic should the buttons follow? Minimal/material-flat, or retain some visual personality (e.g., subtle gradients, depth)? This shapes token values.
2. **Selected-state intensity**: For MatrizVideo DTV selection — should the selected state be a high-contrast color fill, a thick border, a glow, or a combination?
3. **Test update budget for PR #1**: If preserving `data-testid` isn't sufficient for all 96 MatrizVideo buttons, is limited test refactoring acceptable in PR #1, or should tests be treated as immutable?
