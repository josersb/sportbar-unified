# Proposal: Reconciliation & Sync Panel

## Intent

Resolver dos problemas relacionados con la sincronización Arranger: (1) reconciliación de startup bloqueante que tarda 12–24s y causa re-renders parciales, y (2) panel de sincronización manual pobre en UX con lógica duplicada entre `App.jsx` y `MatrizVideo.jsx`. Los Aside muestran estado potencialmente stale hasta completar reconciliación.

## Scope

### In Scope
- Hook `useArrangerReconciliation` unificado con 5 dominios (TVs, TVRACK video, TVRACK audio, zonas-fuera video, zonas-fuera audio)
- Reconciliación no bloqueante diferida 500ms post-render con batch único de `setEstado`
- `SyncPanel.jsx` — drawer derecho colapsable con progress bar, tabs por dominio, acciones apply/ignore por fila
- Pestaña indicadora permanente: ✅ synced | ⚠️ N diffs | 🔄 fetching | ❌ error
- `reconciliationStatus` en ContextoUser para observabilidad global
- Edge cases: Arranger offline → resultado cacheado, timeout parcial → resultados parciales, double-call prevention, AbortController, localStorage persistence

### Out of Scope
- Reconciliación de zonas de audio (Norte/Centro/Sur) — controladas por Tesira DSP vía RS-232, no por matriz Arranger
- Reescritura del motor de comunicación Arranger (`arrangerApi.js`)
- Testing automatizado (proyecto sin test runner configurado)

## Capabilities

### New Capabilities
- `arranger-reconciliation`: Motor de reconciliación (hook `useArrangerReconciliation`), panel SyncPanel (drawer + pestaña + tabs + diff table), arranque no bloqueante, cobertura 5 dominios, edge cases offline/timeout/double-call

### Modified Capabilities
- `ux-feedback`: Extiende con progress bar durante fetch, diff tables con tabs por dominio, pestaña indicadora persistente, auto-apertura al detectar diferencias
- `responsive-layout`: Drawer derecho debe colapsar en viewports <768px, pestaña visible siempre

## Approach

**Fase 1** — Extraer `src/hooks/useArrangerReconciliation.js`: unifica comparación de estado app vs Arranger real usando `getDeviceStatus` (API V210826) con BATCH_SIZE=4 para 12s óptimo. Retorna `{ progress, diffs, status, elapsedMs, lastSync, reconcile }`.

**Fase 2** — `App.jsx` llama `reconcile()` vía `setTimeout(500)` post-mount. El hook aplica TODOS los `setEstado` en un solo batch al finalizar — sin re-renders parciales.

**Fase 3** — `SyncPanel.jsx` como drawer derecho en `Body.jsx`, reemplaza tabla inline en `MatrizVideo.jsx`. Pestaña en `Header.jsx` siempre visible.

**Fase 4** — Edge cases: offline muestra último resultado cacheado, timeout parcial muestra resultados incompletos con advertencia, AbortController en cleanup, `isReconciling` previene double-call.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/hooks/useArrangerReconciliation.js` | New | Hook unificado de reconciliación |
| `src/componentes/SyncPanel.jsx` | New | Panel drawer con tabs y diff table |
| `src/componentes/SyncPanel.module.css` | New | Estilos del SyncPanel |
| `src/App.jsx` | Refactor | Reemplaza reconciliación inline por hook |
| `src/contexto/Contexto.jsx` | Modified | Agrega `reconciliationStatus` al contexto |
| `src/componentes/Body.jsx` | Modified | Layout: main + SyncPanel drawer |
| `src/componentes/Header.jsx` | Modified | Pestaña indicadora de estado sync |
| `src/componentes/MatrizVideo.jsx` | Cleanup | Elimina reconciliación duplicada y tabla inline |
| `src/componentes/MatrizVideo.module.css` | Cleanup | Elimina estilos de tabla diff obsoleta |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `get encoder` individual para 40 destinos puede degradar si el Arranger está bajo carga | Low | BATCH_SIZE=4 ya validado como óptimo (12s). AbortController permite cancelar. |
| Drawer derecho compite por espacio con contenido principal | Med | Layout usa CSS Grid existente; en mobile <768px colapsa a bottom sheet |
| Regresión en Aside que dependen de estado sync | Low | `reconciliationStatus` en contexto permite que Aside consulten sin depender de timing |

## Rollback Plan

Revertir commit. El estado en localStorage no se modifica. Los Aside siguen funcionando con estado app (comportamiento actual). Cero migración de datos.

## Dependencies

- `src/api/arrangerApi.js` (existente — se usa `getDeviceStatus`, `sendArrangerCommand`)
- `src/contexto/Contexto.jsx` (existente — `estado`, `setEstadoApp`)
- Arranger firmware v1.3.4 / API V210826 (sin cambios)

## Success Criteria

- [ ] Startup: reconciliación no bloquea primer render, UI interactiva en <1s
- [ ] Batch único: cero re-renders parciales durante reconciliación
- [ ] SyncPanel muestra progreso, tabs por dominio, y permite aplicar/ignorar diffs
- [ ] Pestaña indicadora refleja estado real: ✅ sin diffs, ⚠️ N con diffs, 🔄 durante fetch
- [ ] Arranger offline → panel muestra último resultado cacheado con timestamp
- [ ] Código duplicado eliminado de App.jsx y MatrizVideo.jsx (~120 líneas netas removidas)
