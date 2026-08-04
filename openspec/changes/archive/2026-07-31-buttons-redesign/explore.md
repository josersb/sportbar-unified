# Exploration: buttons-redesign — SportBar Unified

## Executive Summary

The SportBar Unified codebase has **9 distinct button implementations** across 7 components, with zero shared abstraction beyond the dead `Button` component. The `BrawlStarsButton` (used 96+ times) is scaled at ~50% of the `js-design` spec. There are no button-specific design tokens, no consistent sizing, and no accessibility standard beyond isolated focus-visible styles. A unified button system is needed to eliminate duplication, align with the js-design spec, and establish a token-driven foundation.

**Key finding**: The existing `Button.jsx` (dead code — never imported) already has the right architecture (variants via CSS Modules, token usage, states: focus-visible, hover, active, disabled). It needs extension, not replacement.

---

## 1. Button Inventory

### 1.1 Shared Components

| Component | File | Status | Variants | States | Consumers |
|-----------|------|--------|----------|--------|-----------|
| **Button** | `src/componentes/ui/Button.jsx` | **DEAD CODE** | primary, secondary, danger | default, hover, active, disabled, focus-visible | **NONE** — never imported |
| **BrawlStarsButton** | `src/componentes/ui/BrawlStarsButton.jsx` | ACTIVE | default, selected | default, hover, selected, loading(disabled) | MatrizVideo.jsx (96+ instances) |

### 1.2 Raw Button Instances (by component)

#### MatrizPreset (`src/componentes/MatrizPreset.jsx`) — 15 buttons
| Label | CSS Class | Style | Disabled? | Dark Mode |
|-------|-----------|-------|-----------|-----------|
| Cargar | `btn btnLoad` | Green bg (#238636), white text | Yes (when preset empty) | Hardcoded dark |
| Guardar | `btn btnSave` | Blue bg (#1f6feb), white text | Never | Hardcoded dark |
| Limpiar | `btn btnClear` | Transparent, red outline (#f85149) | Yes (when preset empty) | Hardcoded dark |

- **CSS Module**: `MatrizPreset.module.css` (152 lines)
- **Pattern**: `className={styles.btn} ${styles.btnLoad}` (composable)
- **Tests**: `MatrizPreset.test.jsx` (114 lines) — uses `getAllByText("Cargar")`, `toBeDisabled()`

#### DecosStatus (`src/componentes/DecosStatus.jsx`) — 2 buttons
| Label | CSS Class | Style | A11y |
|-------|-----------|-------|------|
| Recargar | `reloadBtn` | Outlined border, small text (0.75rem), always visible | `aria-label="Recargar estado de canales"` |
| Reintentar | `retryBtn` | Red outlined, bold, only in error state | `aria-label="Reintentar cargar estado"` |

- **CSS Module**: `DecosStatus.module.css` (119 lines)
- **Token usage**: Yes — `var(--border-width-thin)`, `var(--radius-sm)`, `var(--focus-ring-color)`
- **Tests**: `DecosStatus.test.jsx` (238 lines) — uses `getByRole("button", { name: ... })`

#### Canales (`src/componentes/Canales.jsx`) — 1 submit + ~22 channel buttons
| Element | Type | CSS | Pattern |
|---------|------|-----|---------|
| Aplicar | `<input type="submit">` | CSS Module (`formSubmit`) | Same as Audio/MatrizVideo submit |
| Canales favoritos | `<button>` × 22 | **Global CSS** class `CanalFavorito` | Card-style with `<img>` + `<h3>`, data-canal attribute |

- **⚠️ CRITICAL**: Submit button is `<input type="submit">`, NOT `<button>`. A unified `<Button>` component rendering `<button>` cannot replace it without element-type change.
- **⚠️ CRITICAL**: Channel buttons use **global CSS** (not CSS Module). Any migration requires dealing with the global `.CanalFavorito` class.
- **Tests**: `Canales.test.jsx`

#### Audio (`src/componentes/Audio.jsx`) — 1 submit button
| Label | Type | CSS Class |
|-------|------|-----------|
| Enviar | `<button type="submit">` | CSS Module (`formSubmit`) |

- Inside Formik `<Form>`, disabled during submission
- CSS pattern identical to Canales and MatrizVideo submits

#### MatrizVideo (`src/componentes/MatrizVideo.jsx`) — 1 submit + 96 BrawlStarsButtons
| Label | Type | CSS |
|-------|------|-----|
| Enviar | `<button type="submit">` | CSS Module (`formSubmit`) |
| DTV1–DTV8 (Video) | BrawlStarsButton × 8 | CSS Module |
| DTV1–DTV8 (Audio) | BrawlStarsButton × 8 | CSS Module |
| Zonas Fuera | BrawlStarsButton × 80 (10 zones × 8 decos) | CSS Module |

- Dark mode overrides in `MatrizVideo.module.css` for `.formSubmit`
- Tests: `MatrizVideo.test.jsx` (304 lines) — heavy use of `getByTestId("btn-video-DTV1")`

#### ThemeToggle (`src/componentes/ThemeToggle.jsx`) — 1 button
- **No CSS Module** — inline styles only
- Circular (36×36px), border-radius 50%, icon-only
- `aria-label` dynamically updates (light ↔ dark)
- **Tests**: `ThemeToggle.test.jsx` (138 lines) — uses `getByRole("button")`

#### CanalFavorito (`src/elementos/CanalFavorito.jsx`) — standalone component
- Global CSS (NOT CSS Module)
- Card pattern: `<img>` + `<h3>` inside `<button>`
- Used in Canales.jsx in a `<ul>` grid
- No test file found

---

## 2. BrawlStarsButton: Spec vs Implementation Discrepancies

The `js-design` spec (backed by `brawl-stars-button.html` reference file) defines exact pixel values. The current implementation is approximately **50% scale** of the spec — likely to fit the 4-column grid layout (`grid-template-columns: repeat(4, 1fr)` with `gap: 4px`).

| Property | js-design Spec | Current Implementation | Delta |
|----------|---------------|----------------------|-------|
| **Width** | 260px (fixed) | 100% (fluid) | Structural difference |
| **Height** | 76px (fixed) | 38px | **50%** |
| **Font size** | 34px | 17px | **50%** |
| **Border radius** | 11.5px | 6px | 48% |
| **Text stroke (default)** | 1.39px | 0.7px | **50%** |
| **Text stroke (hover)** | 1.32px | 0.66px | **50%** |
| **Text shadow (default)** | 0 2.8px | 0 1.4px | **50%** |
| **Text shadow (hover)** | 0 2.6px | 0 1.3px | **50%** |
| **Box shadow inset** | 0 0 0 1.39px #000 | 0 0 0 0.7px #000 | **50%** |
| **Box shadow solid** | 0 1.4px 0 0 #000 | 0 0.7px 0 0 #000 | **50%** |
| **Box shadow blur** | 0 4.9px 1.4px 0 rgba(0,0,0,0.25) | 0 2.5px 0.7px 0 rgba(0,0,0,0.25) | **~50%** |
| **Highlight size** | 17×17px | 8×8px | **53%** |
| **Capy icon size** | 32×32px | 16×16px | **50%** |
| **Selected glow 1** | 0 0 16px 4px rgba(120,255,48,0.6) | 0 0 8px 2px rgba(120,255,48,0.6) | **50%** |
| **Selected glow 2** | 0 0 40px 8px rgba(120,255,48,0.25) | 0 0 20px 4px rgba(120,255,48,0.25) | **50%** |
| **Selected glow pulse peak 1** | 0 0 24px 6px rgba(120,255,48,0.8) | 0 0 12px 3px rgba(120,255,48,0.8) | **50%** |
| **Selected glow pulse peak 2** | 0 0 56px 12px rgba(120,255,48,0.35) | 0 0 28px 6px rgba(120,255,48,0.35) | **50%** |
| **Selected border** | -3px inset, 3px solid, radius 14px | -1.5px inset, 1.5px solid, radius 7px | **50%** |
| **Selected text padding-left** | 20px | 10px | **50%** |
| **Hover background** | Same as default (#f3bc00) | #ffd43b (golden) | **EXTRA — not in spec** |
| **Hover golden glow** | None | 0 0 12px 2px rgba(243,188,0,0.4) | **EXTRA — not in spec** |

### Root Cause Analysis

The scaling is systematic (~50% on every dimension). The BrawlStarsButton is rendered inside `.rackRow` which uses `grid-template-columns: repeat(4, 1fr)` with `gap: 4px`. At 260px × 76px per button, the spec-sized button would overflow any reasonable viewport in a 4-column grid. The scaling was a pragmatic compromise to make the buttons fit the grid.

**Decision needed**: Should the BrawlStarsButton match the spec at full size (requiring a different grid layout), or should a smaller "compact" variant be defined that intentionally deviates from the spec?

---

## 3. Design Token Gaps for a Button System

### 3.1 Existing tokens that buttons can leverage

| Category | Tokens Available | Adequate? |
|----------|-----------------|-----------|
| Colors (brand) | `--color-brand-primary`, `--color-brand-secondary` | ✅ |
| Colors (surface) | `--color-surface`, `--color-surface-secondary` | ✅ |
| Colors (text) | `--color-text-primary`, `--color-text-secondary`, `--color-text-inverse` | ✅ |
| Spacing | `--space-xs` through `--space-xl` (4/8/16/20/32) | ⚠️ Partial (see gaps) |
| Typography | `--font-family-primary`, `--font-size-sm/md/lg/xl`, `--font-weight-bold` | ⚠️ Missing weight scale |
| Shadows | `--shadow-sm`, `--shadow-md` | ❌ Brand-colored, not suitable for buttons |
| Radius | `--radius-sm/md/lg` (4/8/12) | ✅ |
| Focus ring | `--focus-ring-color`, `--focus-ring-width`, `--focus-ring-offset` | ✅ |
| Touch target | `--touch-target-min` (44px) | ✅ |
| Gap | `--gap-xs` through `--gap-xl` | ⚠️ Not used by button containers |
| Motion | `--motion-duration-fast/normal`, `--motion-easing-default` | ✅ |

### 3.2 Missing tokens

#### Button-specific tokens (NEW)
```
--btn-padding-x-sm: 8px;
--btn-padding-y-sm: 4px;
--btn-padding-x-md: 16px;
--btn-padding-y-md: 8px;
--btn-padding-x-lg: 24px;
--btn-padding-y-lg: 12px;
--btn-font-size-sm: var(--font-size-xs);   /* 12px */
--btn-font-size-md: var(--font-size-sm);   /* 14px */
--btn-font-size-lg: var(--font-size-md);   /* 16px */
--btn-font-weight: var(--font-weight-bold);
--btn-radius: var(--radius-sm);            /* 4px */
--btn-border-width: var(--border-width-thick);  /* 2px */
--btn-gap: var(--gap-xs);                  /* icon+text spacing */
--btn-min-height: var(--touch-target-min); /* 44px */
--btn-transition-duration: var(--motion-duration-fast);
```

#### Color tokens missing (CRITICAL)
```
--color-error: #dc2626;        /* Used by DecosStatus but NOT defined in tokens! */
--color-success: #238636;      /* Used by MatrizPreset btnLoad (hardcoded) */
--color-warning: #f59e0b;      /* Not used yet but needed for completeness */
--color-info: #1f6feb;         /* Used by MatrizPreset btnSave (hardcoded) */
```

#### Typography tokens missing
```
--font-weight-normal: 400;     /* EXISTS but not used consistently */
--font-weight-semibold: 600;   /* Missing — used by MatrizPreset buttons */
--font-weight-medium: 500;     /* Missing */
```

#### Shadow tokens (needs redesign)
Current shadows are brand-colored: `--shadow-sm: 1px 1px 0px #ff3900;`. Buttons need neutral shadows:
```
--shadow-elevation-1: 0 1px 2px rgba(0,0,0,0.12);
--shadow-elevation-2: 0 2px 4px rgba(0,0,0,0.16);
--shadow-elevation-3: 0 4px 8px rgba(0,0,0,0.20);
```

### 3.3 Tokens that exist but are NOT used by buttons (migration gap)

| Token | Defined? | Used by buttons? |
|-------|----------|-----------------|
| `--transition-fast` (150ms) | ✅ | ❌ Hardcoded `0.4s` in Button.module.css, `0.15s` in MatrizPreset |
| `--transition-normal` (300ms) | ✅ | ❌ — All transitions are hardcoded |
| `--touch-target-min` (44px) | ✅ | ❌ — Many buttons are below 44px height (30px, 38px) |
| `--space-*` scale | ✅ | ✅ Partially used (Button.module.css) |
| `--font-weight-bold` | ✅ | ✅ Used (Button.module.css, formSubmit) |
| `--font-weight-normal` | ✅ | ❌ — DecosStatus uses it, others hardcode |
| `--radius-sm/md` | ✅ | ⚠️ MatrizPreset hardcodes 6/8px, ignoring tokens |

---

## 4. Migration Complexity Assessment

### Component-by-component analysis

| # | Component | Button Count | Element Type | CSS Type | Test Impact | Complexity | Risk |
|---|-----------|-------------|-------------|----------|-------------|------------|------|
| 1 | **MatrizPreset** | 15 | `<button>` | CSS Module | Text-based selectors → LOW impact | **MEDIUM** | Hardcoded dark colors |
| 2 | **DecosStatus** | 2 | `<button>` | CSS Module | Role-based selectors → NO impact | **LOW** | Minimal |
| 3 | **Canales (submit)** | 1 | `<input type="submit">` | CSS Module | N/A | **HIGH** | Element type mismatch |
| 4 | **Canales (channels)** | ~22 | `<button>` | **Global CSS** | N/A | **HIGH** | Global class, img+text pattern |
| 5 | **Audio** | 1 | `<button type="submit">` | CSS Module | None | **LOW** | Inside Formik |
| 6 | **MatrizVideo (submit)** | 1 | `<button type="submit">` | CSS Module | N/A | **LOW** | Dark mode overrides needed |
| 7 | **MatrizVideo (BrawlStars)** | 96 | `<BrawlStarsButton>` | CSS Module | data-testid → HIGH impact | **HIGH** | 96 instances, complex tests |
| 8 | **ThemeToggle** | 1 | `<button>` | Inline styles | Role-based selectors → NO impact | **LOW** | Unique circular variant |
| 9 | **CanalFavorito** | 1 component | `<button>` | Global CSS | None | **LOW** | Small standalone |

### Complexity by category

| Category | Components | Buttons | Complexity |
|----------|-----------|---------|------------|
| **Submit buttons** | Audio, MatrizVideo, Canales | 3 | LOW — identical CSS pattern, easy unification |
| **Action buttons** | MatrizPreset, DecosStatus | 17 | MEDIUM — distinct styles, hardcoded colors |
| **BrawlStarsButton** | MatrizVideo | 96 | HIGH — spec discrepancies, grid dependency |
| **Special buttons** | ThemeToggle, CanalFavorito, Canales channels | ~24 | HIGH — non-standard patterns, global CSS |

---

## 5. Reference Worktree Analysis

Checked `C:\Users\joserafael\Proyectos\proyectos hip\sportbar-unified-worktrees\frontend-redesign`:

- **Button.jsx and BrawlStarsButton.jsx**: Identical to current worktree (same dead code, same 50% scale)
- **openspec/specs/design-tokens/spec.md**: Defines token requirements (semantic naming, spacing scale, transition tokens) that apply to this redesign
- **openspec/changes/archive/**: Contains prior SDD changes including `zonas-fuera-botones-independientes` (the zones fuera section was recently extracted)
- **No Figma files or additional button designs found**

---

## 6. Accessibility Audit Summary

### Current state (by WCAG 2.2 AA criteria)

| Criterion | Status | Details |
|-----------|--------|---------|
| **Focus visible** (2.4.7) | ⚠️ Partial | Button.module.css, Canales.module.css, Audio.module.css, DecosStatus.module.css, MatrizPreset.module.css all have focus-visible. MatrizVideo.module.css has it. ThemeToggle has NO focus-visible style. |
| **Touch target** (2.5.8) | ❌ FAIL | Many buttons < 44px height: Audio/Canales/MatrizVideo submits (30px), BrawlStarsButton (38px), MatrizPreset buttons (padding: 6px 16px ≈ ~30px). Only ThemeToggle (36px) approaches 44px but still fails. Token `--touch-target-min: 44px` exists but is ignored. |
| **Color contrast** (1.4.3) | ⚠️ Unknown | MatrizPreset uses hardcoded dark colors — green-on-dark (#238636 on #161b22) appears adequate but not verified. BrawlStarsButton white (#fefdfb) on yellow (#f3bc00) may fail contrast ratio. |
| **Non-text contrast** (1.4.11) | ⚠️ Partial | DecosStatus borders are thin (1px) and may fail 3:1 ratio against background. MatrizPreset clear button border (#f85149) needs verification. |
| **Name, Role, Value** (4.1.2) | ✅ Good | DecosStatus uses aria-label, ThemeToggle uses aria-label. BrawlStarsButton and MatrizPreset buttons lack aria-labels (rely on visible text). |
| **Motion** (2.3.3) | ⚠️ Partial | `prefers-reduced-motion` media query exists in tokens.css and disables all transitions/animations, but BrawlStarsButton's `glow-pulse` and `capy-pop` animations would be disabled — acceptable. |
| **Target spacing** (2.5.8 AAA) | ❌ FAIL | rackRow grid has gap: 4px between 38px BrawlStarsButtons. MatrizPreset cardActions gap: 8px between small buttons. |

### Redesign priorities for a11y:
1. **BLOCKER**: Touch target minimum 44px for all buttons
2. **CRITICAL**: Ensure focus-visible on ALL buttons (add to ThemeToggle)
3. **CRITICAL**: Verify color contrast for brand-on-surface combinations
4. **WARNING**: Add aria-labels to BrawlStarsButtons and MatrizPreset buttons where text alone isn't descriptive enough

---

## 7. Risks and Unknowns

### Technical Risks
1. **BrawlStarsButton grid dependency**: The 50% scale exists because full-size buttons (260×76px) won't fit a 4-column grid. Changing grid layout breaks the TVRACK and Zonas Fuera UX design.
2. **`<input type="submit">` incompatibility**: Canales uses `<input type="submit">` which can't be replaced by a `<button>` component without changing the element. Either the Button component must render `<input>` when `as="input"`, or Canales must migrate to `<button>`.
3. **Global CSS entanglement**: `CanalFavorito.css` is global (not CSS Module). Any migration must handle the global class or risk breaking other pages.
4. **Test fragility**: 12 test files exist. `MatrizVideo.test.jsx` (304 lines) depends heavily on `getByTestId("btn-video-DTV1")` patterns. Any className or DOM structure change breaks tests.
5. **Dark mode inconsistency**: MatrizPreset uses hardcoded dark colors (#161b22, #30363d) — these will NOT work in light mode. The component appears to be designed for dark-only. If the app is used in light mode, these buttons will look broken.
6. **js-design spec contradiction**: The spec says "aplicar EXACTAMENTE como está especificado" but the spec-sized button doesn't fit the current layout. A decision is needed.

### Unknowns
1. Was the 50% BrawlStarsButton scaling an intentional design decision or an implementation compromise?
2. Is the app ever used in light mode? (It may be a kiosk app always in dark mode)
3. Are there additional design mocks or Figma files for the button system that weren't found?
4. What is the user's priority: BrawlStarsButton spec fidelity, or layout compatibility first?

---

## 8. Recommended Approach

### Phase 1: Design Token Foundation
- Add missing tokens: `--color-error`, `--color-success`, `--color-info`, `--color-warning`
- Add button-specific tokens: `--btn-padding-*`, `--btn-font-size-*`, `--btn-radius`, `--btn-gap`, `--btn-min-height`, `--btn-transition-duration`
- Add neutral shadow tokens
- Add font-weight scale (`--font-weight-semibold`, `--font-weight-medium`)

### Phase 2: Revive and Extend Button
- Extend `Button.jsx` with variants: `primary`, `secondary`, `danger`, `success`, `ghost`, `outline`
- Add size variants: `sm`, `md`, `lg`
- Add `as` prop for `<input type="submit">` compatibility (render `<input>` when needed)
- Add `leftIcon`/`rightIcon` props
- Ensure all states: hover, active, focus-visible, disabled, loading
- Minimum 44px touch target on all variants
- Write `Button.test.jsx`

### Phase 3: BrawlStarsButton Spec Alignment
- **Decision gate**: User must decide — full spec fidelity (260×76px) requiring grid layout changes, OR a documented "compact" variant at 50% scale
- If compact: define variant as intentional deviation with rationale
- If full: redesign rackRow grid layout (2 columns, scrollable, or wrap)
- Align all token values: font-size, text-stroke, shadows, highlight size, capy icon, glow animation

### Phase 4: Migrate Raw Buttons (in priority order)
1. **Audio + MatrizVideo submits** (LOW complexity, 2 buttons)
2. **DecosStatus** (LOW complexity, 2 buttons, role-based tests safe)
3. **MatrizPreset** (MEDIUM complexity, 15 buttons, text-based tests safe)
4. **Canales submit** (HIGH complexity, needs `as="input"` or element migration)
5. **ThemeToggle** (LOW complexity, unique circular variant needed)
6. **Canales channels** (HIGH complexity, global CSS, needs CSS Module migration)
7. **CanalFavorito** (LOW complexity, standalone)

### Phase 5: Accessibility Audit
- Run full WCAG 2.2 AA audit on all migrated buttons
- Verify touch targets, contrast ratios, focus indicators
- Test with screen readers

### Estimated Effort
| Phase | Effort | T-Shirt |
|-------|--------|---------|
| Phase 1: Tokens | Low | S |
| Phase 2: Button core | Medium | M |
| Phase 3: BrawlStars | Medium-High | M-L |
| Phase 4: Migration | High | L |
| Phase 5: Audit | Medium | M |
| **Total** | | **XL** (but parallelizable) |

---

## 9. Open Questions for the User

1. **BrawlStarsButton scale**: Keep 50% compact or go full 260×76px? Layout changes needed for full size.
2. **Light mode**: Does the app ever run in light mode, or is it always dark? (Affects MatrizPreset migration)
3. **`<input type="submit">`**: For Canales, add `as="input"` support or migrate to `<button type="submit">`?
4. **Scope**: Is this redesign targeting ALL buttons including CanalFavorito and ThemeToggle, or just the main action/submit buttons?
5. **Priority**: Which variant should we implement FIRST? (suggest: start with primary/secondary/danger for MatrizPreset migration)

---

## Skill Resolution

- **Skill Resolution**: `paths-injected` — 2 skills (impeccable-design, js-design) loaded from exact paths provided by orchestrator
- `impeccable-design`: `C:\Users\joserafael\.config\opencode\skills\impeccable-design\SKILL.md`
- `js-design`: `C:\Users\joserafael\.config\opencode\skills\js-design\SKILL.md`
