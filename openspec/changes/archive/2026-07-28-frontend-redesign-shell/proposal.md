# Proposal: Shell Frontend Redesign

## Intent

Redesign the app shell (layout base) applying `impeccable-design` methodology to resolve 6 BLOCKERS and 10 CRITICALS identified in shell analysis (#600). Fix missing `<main>` landmark, invalid HTML nesting, fixed widths, sub-WCAG touch targets, CSS Module element selectors, and missing focus-visible. Scope: Header, Nav, Body/Aside, tokens.css, entry points.

## Scope

### In Scope
- **tokens.css**: 12+ new tokens (border-radius, line-height, focus-ring, touch-target-44px, spacing scale revision)
- **Body**: mobile-first layout with semantic `<main>`, container queries replacing hardcoded media queries
- **Header**: `:focus-visible` styles, token normalization (hardcoded → tokens)
- **Nav**: 44px minimum touch targets, token refactor, `aria-current="page"` on active link
- **Aside**: decompose 134-line monolith into 3 sub-components (AsideToggle, AsideNav, AsideContainer)
- **Entry points**: remove desktop-first assumptions from App.jsx, layout boundary in main.jsx
- **Testing**: visual regression tests for new shell components, WCAG 2.2 AA audit pass

### Out of Scope
- Redesign of individual pages (MatrizVideo, Canales, Audio, Arranger, Soporte)
- Migration to Tailwind CSS
- Arranger API or backend changes
- Dark mode theme revision (tokens extend existing theme)

## Capabilities

### New Capabilities
- `shell-layout`: responsive app shell with mobile-first grid, `<main>` landmark, and container queries

### Modified Capabilities
- `design-tokens`: ADD border-radius, line-height, focus-ring, touch-target tokens; expand spacing scale
- `responsive-layout`: MODIFY shell components to mandate mobile-first approach and container queries over media queries
- `a11y-basics`: MODIFY to require 44px minimum touch targets, semantic landmarks (`<main>`, `<nav>`), and `:focus-visible` on Header

## Approach

4-phase impeccable-design pipeline (Tokens → Layout Architect → Component Forge → Auditoría):

| Phase | Pipeline Stage | Deliverable |
|-------|---------------|-------------|
| 1 | Design Tokens | 12+ new CSS custom properties in tokens.css |
| 2 | Layout Architect | Body mobile-first grid + `<main>` element |
| 3 | Component Forge | Header, Nav refactor, Aside decomposition (3 sub-components) |
| 4 | Auditoría | WCAG 2.2 AA audit, visual regression tests, 104-test suite pass |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/styles/tokens.css` | Modified | 12+ new tokens, spacing scale revision |
| `src/componentes/Body.jsx` + `.module.css` | Modified | Mobile-first grid, `<main>` element |
| `src/componentes/Header.jsx` + `.module.css` | Modified | focus-visible, token normalization |
| `src/componentes/Nav.jsx` + `.module.css` | Modified | 44px targets, aria-current, tokens |
| `src/componentes/Aside.jsx` + `.module.css` | Decomposed | 3 sub-components (AsideToggle, AsideNav, AsideContainer) |
| `src/App.jsx` | Modified | Remove desktop-first assumptions |
| `src/main.jsx` | Modified | Layout boundary setup |
| `__tests__/BodyResponsive.test.jsx` | Modified | Updated for new layout behavior |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Layout breaking changes affect page components | Med | Visual test each page after Body changes; revert individual pages if needed |
| Aside decomposition introduces state sync bugs | Med | Extract with prop contracts first, verify all 5 presets load correctly |
| Dark mode regressions from token expansion | Low | All new tokens define `:root` and `[data-theme="dark"]` values in same commit |
| BodyResponsive test failures | Low | Update assertions to match new mobile-first behavior before merging |

## Rollback Plan

`git revert` on `feat/frontend-redesign`. Each phase produces independent commits — rollback individual phases without losing others. Token changes are additive and backward-compatible.

## Dependencies

None external. Pure frontend only. App must continue working against Arranger (`192.168.2.254:80`) without changes.

## Success Criteria

- [ ] 6 BLOCKERS resolved: `<main>` exists, no `<form>` inside `<h3>`, no fixed 300px widths, Nav targets ≥44px, no element selectors in CSS Modules, focus-visible on Header
- [ ] All pages render correctly at 320px, 768px, 1024px, 1440px without horizontal scroll
- [ ] All interactive shell elements pass 44px touch target check
- [ ] 104-test suite passes without regression
- [ ] WCAG 2.2 AA audit: 0 BLOCKERS, 0 CRITICALS on shell components
- [ ] Aside renders all 5 presets correctly after decomposition
