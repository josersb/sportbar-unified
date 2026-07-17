# Design: Zonas Adicionales — 10 nuevos destinos IPEX5002

## Technical Approach

Agregar 10 decoders IPEX5002 como destinos en `estado.tvs` (mismo objeto que las 37 entradas existentes) y exponerlos en MatrizVideo como selects individuales en una nueva sección "Zonas Adicionales". El comando `join av` ya itera todas las keys de `estado.tvs` vía `Object.entries` — sin cambios en la API. Cada destino usa su nombre Arranger como key del objeto y se mapea 1:1 en `vwDestNames` (sin traducción necesaria).

## Architecture Decisions

### Decision: Agregar destinos a `estado.tvs` existente (no sección separada)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| A: `estado.tvs` (mismo objeto) | Simple, `joinMultipleTVs` y `handleChangeEstadoVideo` funcionan sin cambios. Los destinos nuevos son indistinguibles de TVs existentes en el mapping loop. | **Elegida** |
| B: `estado.destinos` (nuevo objeto) | Separación limpia pero requiere modificar `joinMultipleTVs`, `handleChangeEstadoVideo`, `Contexto.jsx`, `App.jsx`, localStorage migration, y presets. | Rechazada — overhead desproporcionado para ~10 líneas de diff |

### Decision: Nombre Arranger como key de objeto (con guiones)

**Choice**: Usar el nombre exacto del Arranger como key, con bracket notation donde sea necesario.
**Rationale**: `joinMultipleTVs` usa la key como `dest` en el comando `join av`. Si la key coincide con el nombre Arranger, el comando funciona sin traducción adicional. Las keys con guiones funcionan como propiedades de objeto JS usando bracket notation (`estado.tvs["aVip-Barra-Centro"]`).

### Decision: Sin cambios en `dispositivos.js`

**Choice**: No agregar entradas en `DISPOSITIVOS`. Los destinos IPEX5002 no son fuentes de video (no producen contenido), solo destinos (consumen). `dispositivos.js` modela exclusivamente fuentes (encoders IPEX5001).

## Data Flow

```
Usuario selecciona fuente en <Select> de "Zonas Adicionales"
    → Formik onSubmit mata todas las keys de estado.tvs
    → joinMultipleTVs(mappings) itera mappings array con 47 entradas (37 + 10)
    → assignSourceToDestination(source, dest) envía "join av {source} {dest}" al Arranger
    → handleChangeEstadoVideo(tvs) persiste en localStorage
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/contexto/Contexto.jsx` | Modify | +10 keys en `estado.tvs` (línea 57-95), default "DTV1" |
| `src/componentes/MatrizVideo.jsx` | Modify | Nueva sección `<div className="matriz-select-zona">` con título "Zonas Adicionales" + 10 `<Select>` individuales (mismo patrón VWs). Agregar 10 campos a `initialValues` y `onSubmit` de Formik. |
| `src/componentes/MatrizVideo.test.jsx` | Modify | Actualizar `initialTvs` con 10 nuevas keys. Cambiar `expect(mappings).toHaveLength(37)` → `47`. Agregar assertions para las 10 nuevas entradas en el mappings array. |

## Interfaces / Contracts

Nuevas keys en `estado.tvs`:

```javascript
'aVip-Barra-Centro': 'DTV1',
'aVip-Lobby-Batacazo': 'DTV1',
'a-Menos1-Escenario': 'DTV1',
'a-QMR75-Menos1-TV1': 'DTV1',
'aVip-Bar-Boveda': 'DTV1',
'aMas-15-Barra': 'DTV1',
'a-QMR75-Menos1-TV2': 'DTV1',
'a-Menos1-Escenario2': 'DTV1',
'a-QMC65-Menos1-TV2': 'DTV1',
'RACK-VIP-PANTALLABATACA': 'DTV1',
```

En `onSubmit`, las nuevas keys se asignan directamente desde `values` (sin switch/case — son destinos individuales, no grupos):

```javascript
tvs['aVip-Barra-Centro'] = values['aVip-Barra-Centro'];
// ... etc
```

En `vwDestNames` se agregan entradas 1:1 — mismo nombre Arranger:

```javascript
const vwDestNames = {
  // existing VWN, VWC, VWS...
  'aVip-Barra-Centro': 'aVip-Barra-Centro',
  // ... etc
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `joinMultipleTVs` recibe 47 mappings (no 37) | Actualizar `MatrizVideo.test.jsx`: agregar 10 keys a `initialTvs`, ajustar length assertion, verificar nuevas entradas en mappings array |
| Unit | Cada `<Select>` renderiza y cambia valor | Test de renderizado: verificar que existen 10 nuevos `<Select>` con labels correctos |
| Integration | Presets existentes cargan sin romperse | `estado.tvs` con keys faltantes → spread preserva defaults "DTV1". Test: cargar estado sin nuevas keys, verificar que `Object.entries` no produce undefined |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. El comando `join av` usa la infraestructura existente de `sendArrangerCommand`.

## Migration / Rollout

- localStorage: keys nuevas en `estado.tvs` persisten automáticamente vía spread en `handleChangeEstadoVideo`. Al cargar un preset viejo (sin las 10 keys), `Object.entries` simplemente no las incluye — las keys faltantes no rompen nada porque Formik usa `initialValues` con defaults "DTV1".
- Rollback: revertir Contexto.jsx y MatrizVideo.jsx. Las keys extras en localStorage son inofensivas (nadie las lee).
- Sin migración de datos requerida.

## Open Questions

- [ ] Confirmar nombres Arranger exactos para comandos `join av` (especialmente `RACK-VIP-PANTALLABATACA` — posible truncado a 19 chars)
- [ ] Confirmar display labels visibles en UI para cada destino
