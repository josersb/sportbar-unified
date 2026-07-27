## Exploration: Zonas Fuera de Sportbar — Migración a botones independientes Video/Audio

### Current State

**Zonas Fuera de Sportbar** es un segmento dentro de `MatrizVideo.jsx` (líneas 602–640) que controla 10 dispositivos IPEX5002 ubicados en áreas auxiliares (VIP, Planta -1, +15, Rack VIP). Actualmente cada zona se renderiza como un `<select>` dropdown + label, y los cambios se aplican inmediatamente via `handleChangeEstadoVideo({...tvs, [key]: e.target.value})`. Las zonas comparten el objeto `estado.tvs` del estado global (Context API), y se envían al Arranger junto con todas las demás TVs cuando el usuario presiona el botón "Enviar" general (líneas 386–409), usando `assignSourceToDestination` (`join av` — video + audio unificados).

**10 zonas fuera de sportbar:**
| Key | Label | Ubicación |
|-----|-------|-----------|
| `aVip-Barra-Centro` | VIP Barra Centro | VIP |
| `aVip-Lobby-Batacazo` | VIP Lobby Batacazo | VIP |
| `aVip-Bar-Boveda` | VIP Bar Bóveda | VIP |
| `RACK-VIP-PANTALLABATACA` | Rack VIP Bataca | VIP |
| `aMas-15-Barra` | +15 Barra | +15 |
| `a-Menos1-Escenario` | Escenario -1 | Planta -1 |
| `a-Menos1-Escenario2` | Escenario -1 (2) | Planta -1 |
| `a-QMR75-Menos1-TV1` | QMR75 -1 TV1 | Planta -1 |
| `a-QMR75-Menos1-TV2` | QMR75 -1 TV2 | Planta -1 |
| `a-QMC65-Menos1-TV2` | QMC65 -1 TV2 | Planta -1 |

**Flujo actual:**
1. Usuario cambia un `<select>` → `handleChangeEstadoVideo({...tvs, [key]: e.target.value})` → actualiza `estado.tvs` en Context
2. Usuario presiona "Enviar" → se construyen 46 mappings (todas las TVs + zonas fuera) → se envían en batches de 8 via `assignSourceToDestination(source, dest)` → `join av`
3. Las zonas fuera usan sus keys como destination names (ej: `join av DTV1 aVip-Barra-Centro`)

**Problema:** No hay separación video/audio. Todo se envía como `join av`. El usuario no puede elegir fuente de video distinta de fuente de audio para una misma zona. Las 10 zonas son tratadas como una sola fila más en el Formik, sin capacidad de acción independiente.

### Affected Areas

- **`src/componentes/MatrizVideo.jsx`** — Zonas Fuera rendering (líneas 602–640), Formik initialValues (líneas 79–91 deben remover las 10 zonas), onSubmit mappings (líneas 386–409 deben excluir zonas), imports
- **`src/componentes/MatrizVideo.module.css`** — Nuevos estilos para botones independientes (reutilizar `.rackRow`, `.tvrackSubSection`, `.tvrackSubHeader`, `.tvrackActiveBadge`, `.tvrackLinkRow`, `.tvrackLinkLabel`; quitar `.zonasColumn`, `.zonasRow`, `.zonasLabel`, `.zonasSelect`)
- **`src/componentes/MatrizVideo.test.jsx`** — Tests de TVRACK existentes (lines 110–156) son el modelo; agregar tests para Zonas Fuera. Actualizar initialTvs para remover las 10 keys. Ajustar test de onSubmit (46 mappings → 36 mappings al excluir zonas fuera)
- **`src/App.jsx`** — Agregar `zonasFueraState` (useState), nuevos handlers, polling para sync multi-PC (línea 48 y líneas 162–184 como modelo)
- **`src/contexto/Contexto.jsx`** — Agregar `zonasFueraState` y `handleChangeZonasFuera` al context provider value
- **`src/api/arrangerApi.js`** — Agregar funciones `fetchZonasFueraState`, `setZonasFueraVideo(zoneId, deviceId)`, `setZonasFueraAudio(zoneId, deviceId)`, `setZonasFueraLink(zoneId, linked)`
- **`server/server.js`** — Agregar rutas `/api/zonas-fuera/state`, `/api/zonas-fuera/:id/video`, `/api/zonas-fuera/:id/audio`, `/api/zonas-fuera/:id/link` y entrada `zonasFuera` en lowdb (state.json)
- **`server/state.json`** — Nueva key `zonasFuera` con 10 objetos { video, audio, link, lastUpdated }

### Approaches

#### 1. Replicación exacta del patrón TVRACK por cada zona
Cada zona recibe su propio state object individual (`aVipBarraCentroState`, `aMas15BarraState`, etc.) con video, audio, link. Cada una tiene sus propios endpoints (`/api/zonas-fuera/aVipBarraCentro/video`, etc.). 10 × 3 endpoints = 30 rutas nuevas en el server. En App.jsx, 10 useState + 10 handlers + 10 polling intervals.
- **Pros:** Patrón probado y entendible, sin abstracción
- **Cons:** Explosión de código — ~500+ líneas de boilerplate, difícil de mantener, 30 endpoints en el server, 10 polling intervals
- **Effort:** Low (pero mucho volumen)

#### 2. Abstracción unificada con estado agrupado
Un solo state object `zonasFueraState = { [zoneId]: { video, audio, link } }` con handlers genéricos que reciben `zoneId`. Endpoints RESTful unificados: `/api/zonas-fuera/:id/video`, `/api/zonas-fuera/:id/audio`, `/api/zonas-fuera/:id/link`, `/api/zonas-fuera/state` (devuelve el objeto completo). Un solo polling interval para todo el estado de zonas fuera. UI generada iterando sobre `ZONAS_FUERA_IDS`.
- **Pros:** DRY, mantenible, escalable, 4 endpoints totales, un solo polling interval, ~150 líneas de código nuevo
- **Cons:** Requiere diseño cuidadoso de la abstracción, ligeramente más complejo de entender a primera vista
- **Effort:** Medium

#### 3. Mantener `estado.tvs` pero cambiar selects por botones
Las zonas fuera siguen en `estado.tvs` pero se renderizan con BrawlStarsButton en vez de `<select>`. Sin embargo, `estado.tvs` solo almacena UNA fuente por zona — no hay distinción video/audio, ni toggle de link.
- **Pros:** Cambio mínimo de state management
- **Cons:** NO cumple el requerimiento — sin video/audio independientes por zona, no hay beneficio real sobre el estado actual. No escala si en el futuro se necesitan más zonas con control separado.
- **Effort:** Low (pero incompleto — no resuelve el problema)

### Recommendation

**Approach 2 — Abstracción unificada con estado agrupado.** Es el punto justo entre replicación masiva (Approach 1) y minimalismo insuficiente (Approach 3). El patrón TVRACK existente ya demuestra el flujo completo; abstraerlo para N zonas es una refactorización natural. La estructura propuesta:

```
zonasFueraState = {
  "aVip-Barra-Centro":       { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  "aVip-Lobby-Batacazo":     { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  "aVip-Bar-Boveda":         { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  "RACK-VIP-PANTALLABATACA": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  "aMas-15-Barra":           { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  "a-Menos1-Escenario":      { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  "a-Menos1-Escenario2":     { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  "a-QMR75-Menos1-TV1":      { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  "a-QMR75-Menos1-TV2":      { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
  "a-QMC65-Menos1-TV2":      { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
}
```

**Server endpoints:** 4 rutas (state GET, video POST, audio POST, link POST) usando `:id` como path param.

**UI:** Mapear sobre `ZONAS_FUERA_IDS` y renderizar el mismo patrón TVRACK para cada una: header con icono + label + active badge, row de 8 BrawlStarsButton (video), link toggle, row de 8 BrawlStarsButton (audio).

**Importante:** Al migrar a botones independientes, las 10 zonas deben ser REMOVIDAS del Formik (initialValues y onSubmit mappings). El botón "Enviar" general ya no controlará estas zonas. Esto reduce mappings de 46 a 36.

### Risks

- ~~**Compatibilidad con Arranger:**~~ ✅ **VERIFICADO (27 jul 2026).** `join video` y `join audio` son comandos documentados de primera clase en la API del Arranger (Rev 210826 y V1.4.0.0). No hay restricciones por tipo de hardware (IPEX5001 vs IPEX5002). TVRACK ya usa estos comandos en producción sin problemas. Las funciones `assignVideoSource()` y `assignAudioSource()` ya existen en `arrangerApi.js`.
- ~~**State split / migración de presets:**~~ ✅ **VERIFICADO (27 jul 2026).** Las 10 zonas YA existen en `preset1` y `preset2` de `state.json` con fuentes reales (DTV1–DTV4). Estrategia de migración definida: híbrida server+client (extiende patrón v0→v1 existente), backup atómico (`state.json.bak-v1`), regla de mapeo `"DTV2"` → `{ video: "DTV2", audio: "DTV2", link: true }`, compatibilidad hacia atrás en `usePreset.load`. Las 7 keys de barra/escalera (`TvsBarra*`, `TvsEscalera*`) NO son parte de zonas fuera — se quedan en `tvs`.
- **Multi-PC sync:** El nuevo `zonasFueraState` debe tener su propio polling interval en App.jsx, igual que TVRACK. Si no se configura, cambios desde otro PC no se reflejarán.
- ~~**UI real estate:**~~ ✅ **RESUELTO (27 jul 2026).** Un bloque TVRACK completo ocupa ~300px (video row + audio row + link). Para 10 zonas, se usará el diseño **mini-card** (1 sola row de botones + toggle link = ~120px por zona) en **grid de 2 columnas** (5 filas × 120px = ~600px total). Cabe completo en 1080p sin scroll. La separación video/audio en 2 rows no es necesaria para estas zonas (actualmente solo tienen `<select>` de video). Si en el futuro se necesita audio independiente, se agrega segunda row condicional.
- ~~**Server state.json growth:**~~ ✅ **VERIFICADO (27 jul 2026).** El state.json actual pesa 14 KB (no 5 KB como se estimó). El crecimiento real es ~2.5 KB (+20%, de 14 KB a ~17 KB), proveniente de 10 zonas × 70 bytes extra × 3 snapshots. Impacto en polling LAN: +1.8 KB/s adicional (0.0014% de Gigabit). Impacto en escritura a disco: imperceptible (sub-ms). No se justifica delta/ETag.

### Ready for Proposal

**Sí.** El alcance está claro, el patrón a replicar (TVRACK) está implementado y funcionando, las APIs del Arranger (`join video`, `join audio`, `join av`) ya existen en `arrangerApi.js`. El principal riesgo a resolver en la propuesta es el **manejo de presets** y la **migración del estado existente**.
