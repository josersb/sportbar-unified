# Proposal: Zonas Fuera de Sportbar — Botones Independientes Video/Audio

## Intent

Las 10 zonas auxiliares (VIP, +15, Escenarios, QMR/QMC) se controlan hoy con `<select>` dropdowns que envían `join av` junto con las 36 TVs principales. No hay separación video/audio, y cualquier cambio requiere el botón "Enviar" global. Este cambio les da independencia total: botones dedicados video/audio por zona, sin depender del `join av` batch de la matriz principal.

## Scope

### In Scope
- `zonasFueraState` en lowdb con `{ video, audio, link, lastUpdated }` por zona
- 4 endpoints REST: `/api/zonas-fuera/state`, `/api/zonas-fuera/:id/video`, `/api/zonas-fuera/:id/audio`, `/api/zonas-fuera/:id/link`
- Mini-cards con botones video/audio + toggle link en grid 2 columnas CSS
- Polling unificado en `App.jsx` para sync multi-PC
- Migración híbrida server+client de presets existentes (mapeo `"DTV2"` → `{ video: "DTV2", audio: "DTV2", link: true }`)
- Las 10 zonas ya NO participan en `estado.tvs` ni en el `join av` batch del botón Enviar

### Out of Scope
- Botón "Aplicar a todas" (atajo bulk)
- Mover TVRACK de su posición actual
- Audio independiente en UI (state store lo soporta, UI futura)
- Presets de zonas fuera (se guardan/cargan en siguiente issue)

## Capabilities

> Investigar `openspec/specs/` antes de escribir specs. Este es el contrato con sdd-spec.

### New Capabilities
- `zonas-fuera-state`: Estado independiente para 10 zonas externas con separación video/audio/link, persistido en lowdb, consumido vía polling en App.jsx. No comparte `estado.tvs` ni el ciclo del botón Enviar.

### Modified Capabilities
- `destinos-adicionales`: Las 10 zonas se REMUEVEN de `estado.tvs`. Dejan de renderizarse como `<select>` en `join av` batch. Pasan a mini-cards con botones independientes video/audio. El estado inicial se carga de lowdb (`zonasFueraState`), no del preset.
- `arranger-api-centralized`: Se AGREGAN `fetchZonasFueraState`, `setZonasFueraVideo`, `setZonasFueraAudio`, `setZonasFueraLink`. Usan `join video`/`join audio` (comandos ya existentes del patrón TVRACK).

## Approach

Abstracción unificada con `zonasFueraState` agrupado (Approach 2 de exploration). Un solo objeto en lowdb con 10 keys, 4 endpoints RESTful, un solo polling interval. UI itera sobre `ZONAS_FUERA_IDS` generando mini-cards con 1 fila de botones + toggle link (~120px por zona). Grid CSS `repeat(auto-fill, minmax(300px, 1fr))`, 2 columnas en 1080p. Migración de state.json existente: cada valor string (`"DTV2"`) → `{ video: "DTV2", audio: "DTV2", link: true, lastUpdated: now }`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/App.jsx` | Modified | + `zonasFueraState`, + handlers, + polling |
| `src/contexto/Contexto.jsx` | Modified | + `zonasFueraState` y handlers al provider |
| `src/componentes/MatrizVideo.jsx` | Modified | - 10 keys de `estado.tvs`, - `<select>` rendering, + mini-cards |
| `src/componentes/MatrizVideo.module.css` | Modified | - `.zonasColumn/.zonasRow/.zonasSelect`, + grid layout |
| `src/api/arrangerApi.js` | Modified | + 4 funciones para zonas fuera |
| `server/server.js` | Modified | + 4 endpoints REST |
| `server/state.json` | Modified | + key `zonasFuera` (10 objetos, +3KB) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Presets existentes pierden config de zonas fuera | Medium | Migración híbrida: server migra state.json al iniciar; cliente migra localStorage al cargar |
| `join video`/`join audio` no soportados por Arranger en estas keys | Low | TVRACK ya usa estos comandos en producción; las 10 keys están en preset1/preset2 de state.json |
| state.json crece +3KB (~20%) | Low | Impacto en polling y disco es despreciable; 17KB total |
| Regresión en `join av` batch al remover 10 zonas | Low | Tests existentes se actualizan: 46 mappings → 36 mappings |

## Rollback Plan

1. Revertir commit → `zonasFuera` en state.json queda pero es ignorado por el código anterior
2. `estado.tvs` vuelve a incluir las 10 keys → los `<select>` se restauran
3. Si state.json fue migrado, el backup atómico (`state.backup.json`) contiene el estado pre-migración

## Dependencies

- Ninguna externa. `assignVideoSource()`/`assignAudioSource()` de TVRACK ya existen en `arrangerApi.js`.

## Success Criteria

- [ ] Las 10 zonas se renderizan como mini-cards con botones video/audio independientes
- [ ] Cambiar video o audio de una zona envía `join video`/`join audio` al Arranger SIN tocar la matriz principal
- [ ] El botón "Enviar" de la matriz ya NO incluye las 10 zonas en `join av`
- [ ] El estado se sincroniza entre PCs vía polling de lowdb
- [ ] Presets existentes migran correctamente (las zonas mantienen su fuente asignada)
- [ ] Build pasa sin errores (`pnpm run build`)
