# Proposal: Centralizar API de Arranger

## Intent

Eliminar 83 llamadas `fetch()` duplicadas y 4 redefiniciones de `myInit` en
`MatrizVideo`, `MatrizPreset`, `Audio` y `Canales`, centralizando toda
comunicación con la matriz Arranger en `arrangerApi.js` — que ya existe con
`sendArrangerCommand` y `assignSourceToDestination` pero ningún componente lo
importa.

## Scope

### In Scope

- Extender `arrangerApi.js` con `sendSerialCommand`, `loadChannelPreset`,
  `joinMultipleTVs`
- Migrar **MatrizPreset.jsx** (29 fetch → `assignSourceToDestination` en loop)
- Migrar **MatrizVideo.jsx** (37 fetch → `assignSourceToDestination`,
  `joinMultipleTVs`)
- Migrar **Audio.jsx** (9 fetch → `sendSerialCommand`)
- Migrar **Canales.jsx** (8 fetch → `loadChannelPreset`)
- Eliminar `myInit` de los 4 componentes (usa config interna de `arrangerApi`)
- Verificar que `.env` ya contiene `VITE_ARRANGER_API_BASE` y
  `VITE_ARRANGER_TOKEN` (confirmado: líneas 16-17 del `.env` existente)

### Out of Scope

- Agregar reintentos o throttling de requests
- Migrar `Arranger.jsx` (usa patrón de endpoint distinto)
- Agregar tests (no hay runner configurado)
- Cambiar la interfaz de usuario o flujo de negocio

## Capabilities

### New Capabilities

- `arranger-api-centralized`: Toda comunicación con hardware Arranger IPEX5000
  se canaliza exclusivamente por `src/api/arrangerApi.js`. Los componentes
  importan funciones nombradas, no construyen URLs ni tokens.

### Modified Capabilities

None — es un refactor interno. El comportamiento observable de cada componente
no cambia.

## Approach

Migración gradual, un componente por vez, en orden de menor a mayor riesgo:

| Paso | Componente | Riesgo | Rollback |
|------|-----------|--------|----------|
| 1 | `arrangerApi.js` | Bajo | Revertir nuevas funciones |
| 2 | `MatrizPreset.jsx` | Bajo | `window.location.reload()` al final |
| 3 | `MatrizVideo.jsx` | Medio | Estado React + Formik, restaurar fetch |
| 4 | `Audio.jsx` | Bajo | 9 fetch lineales |
| 5 | `Canales.jsx` | Bajo | 8 fetch en switch/case |

`arrangerApi.js` ya usa `process.env.VITE_ARRANGER_*` con fallback a los valores
hardcodeados. El `.env` del proyecto ya define ambas variables. No se requiere
crear archivos nuevos de configuración.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/api/arrangerApi.js` | Modified | +3 funciones: `sendSerialCommand`, `loadChannelPreset`, `joinMultipleTVs` |
| `src/componentes/MatrizPreset.jsx` | Modified | Reemplaza 29 fetch + myInit por imports |
| `src/componentes/MatrizVideo.jsx` | Modified | Reemplaza 37 fetch + myInit por imports |
| `src/componentes/Audio.jsx` | Modified | Reemplaza 9 fetch + myInit por imports |
| `src/componentes/Canales.jsx` | Modified | Reemplaza 8 fetch + myInit por imports |
| `.env` | Unchanged | Ya contiene las variables necesarias |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cambio de timing: los fetch actuales son secuenciales; `joinMultipleTVs` con `Promise.all` cambia el orden de envío | Low | Usar `for...of` secuencial, no `Promise.all`, para preservar el orden exacto |
| Regresión silenciosa en Audio por escape de comillas seriales | Low | `encodeURIComponent` ya aplicado en `sendArrangerCommand`; verificar con logs de dev |
| Rotura de import paths en componentes | Low | Paths relativos consistentes (`../api/arrangerApi`) |

## Rollback Plan

Revertir por archivo con `git checkout`: si un componente migrado falla en
producción, se revierte ese único archivo sin afectar los demás. Cada paso de
migración es independiente.

## Dependencies

- `.env` con `VITE_ARRANGER_API_BASE` y `VITE_ARRANGER_TOKEN` (ya existe)
- `arrangerApi.js` existente (ya implementado, 92 líneas)

## Success Criteria

- [ ] Cero llamadas `fetch()` directas a `192.168.2.254` fuera de `arrangerApi.js`
- [ ] Cero definiciones de `myInit` en componentes
- [ ] Los 4 componentes compilan sin errores y responden igual que antes
- [ ] `arrangerApi.js` contiene todas las funciones de dominio (`sendSerialCommand`,
  `loadChannelPreset`, `joinMultipleTVs`)
