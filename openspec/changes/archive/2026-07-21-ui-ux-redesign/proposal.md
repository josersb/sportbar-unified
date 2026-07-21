# Proposal: UI/UX Redesign — SportBar Unified

## Intent

Transformar el panel utilitario (7 bloques CSS duplicados, 0 responsive, 0 accesibilidad, `window.location.reload()` en presets) en una app pulida, responsiva, con feedback y dark mode. Sin tocar Arranger API ni state management.

## Scope

### In Scope

- Tokens `:root` (colores, espaciado, tipografía, sombras, transiciones)
- CSS Modules — 14 archivos CSS → `.module.css` por componente
- Eliminar `styled-components` (dead dependency)
- `.page-container` unificada (elimina 7 duplicados)
- `.active` en NavLink, `:focus-visible` global, aria-labels
- Loading states + toasts de éxito (hook ya existe)
- Responsive: aside colapsable, flex-wrap, media queries
- Dark mode: `[data-theme="dark"]` + toggle
- Canales data-driven (fuera de JSX)
- Presets: state update en vez de `reload()`
- Botones: 1 base + modificadores (4 variantes actuales)
- MatrizPreset: `usePreset(n)` genérico (elimina 5 load + 5 save duplicados)

### Out of Scope

Arranger API, Context/state management, MatrizVideo business logic, nuevas features, PWA, WebSocket.

## Capabilities

### New Capabilities

- `design-tokens`: Sistema de tokens CSS custom properties en `:root`
- `css-modules-migration`: Migración CSS plano → CSS Modules
- `responsive-layout`: Aside colapsable, flex-wrap, media queries mobile/tablet/desktop
- `dark-mode`: Toggle + `[data-theme="dark"]` vía CSS variables
- `ux-feedback`: Loading states, success toasts, nav activa, focus styles
- `a11y-basics`: aria-labels, roles, focus management, `:focus-visible`

### Modified Capabilities

None — ningún spec existente cambia a nivel de requerimientos.

## Approach

| Fase | Entregables | PR |
|------|------------|-----|
| 1 — Fundación | Tokens `:root`, CSS Modules (1 componente prueba), `.page-container`, `.active` nav, `:focus-visible` | PR #1 (~250 líneas) |
| 2 — UX | Loading states, success toasts, responsive (media queries + aside toggle), canales data-driven, presets fix | PR #2 (~300 líneas) |
| 3 — Pulido | Dark mode, unificar botones, a11y, componentizar MatrizPreset, CSS Modules restantes | PR #3 (~250 líneas) |

## Affected Areas

| Area | Impact |
|------|--------|
| `src/index.css` | Tokens `:root`, eliminar duplicación |
| `src/componentes/*.css` (14) | Reemplazados por `.module.css` |
| `src/componentes/*.jsx` (10+) | Adaptar classNames, loading, toasts |
| `src/componentes/MatrizPreset.jsx` | `usePreset(n)`, eliminar reload |
| `src/componentes/Canales.jsx` | Array de datos en vez de JSX |
| `src/contexto/Contexto.jsx` | Función update para presets |
| `package.json` | Remover `styled-components` |

## Risks

| Risk | Mitigation |
|------|------------|
| CSS Modules rompen estilos | Migrar 1 componente por vez, verificar visualmente |
| `:root` mutation de Aside no migra limpio | Extraer lógica de colores a Context + CSS vars dinámicas |
| Presets sin reload causan estado inconsistente | Context ya tiene `setEstadoApp` — verificar flujo |

## Rollback Plan

Revertir merge del PR. Cada fase es independiente — fallo en fase N no afecta fases 1..N-1.

## Dependencies

Ninguna externa. Solo CSS, JSX y eliminación de `styled-components`.

## Success Criteria

- [ ] 0 bloques CSS duplicados (7→0), 14 CSS migrados a módulos
- [ ] `styled-components` removido de `package.json`
- [ ] Todas las páginas consistentes en light + dark mode
- [ ] Aside colapsa en viewport < 768px
- [ ] NavLink muestra `.active`, formularios con loading + toast éxito
- [ ] Presets cargan sin `window.location.reload()`
- [ ] 0 errores de consola en todas las rutas
- [ ] `:focus-visible` funcional en Tab navigation
