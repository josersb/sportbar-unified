# Design: Zonas Fuera — Botones Independientes

## Technical Approach

Refactor 10 zonas auxiliares de `<select>` acoplados a `join av` batch → mini-cards con botones BrawlStarsButton independientes video/audio, siguiendo el patrón TVRACK existente. Estado persistido en lowdb como key raíz `zonasFuera`, 4 endpoints REST, polling unificado en App.jsx. Este modelo ya está probado en producción con TVRACK — replicamos su arquitectura para las 10 zonas.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| 10 endpoints individuales (`/api/zonas-fuera/{id}`) vs 4 endpoints parametrizados | 10 endpoints → 10 veces código duplicado. 4 endpoints → código DRY, `:id` validado contra whitelist | **4 endpoints parametrizados**: GET `/state`, POST `/:id/video`, `/:id/audio`, `/:id/link`. Server valida `id` con `ZONAS_FUERA_IDS`. |
| `zonasFuera` dentro de `state` vs key raíz en lowdb | Dentro de `state` → se pisaría con `POST /api/state` del cliente y crecería el payload de polling de la matriz principal | **Key raíz en lowdb** (`stateDb.data.zonasFuera`), mismo nivel que `tvrack` y `presets`. Aislado del ciclo `POST /api/state`. |
| 10 handlers vs handler genérico con zoneId | 10 handlers → 10x surface de bugs. Genérico → 1 handler, `zoneId` como `:id` en la ruta + closure sobre tipo (video/audio/link) | **Handlers genéricos**: `setZonasFueraVideo(zoneId, deviceId)` → `POST /api/zonas-fuera/${zoneId}/video`. Una sola función en arrangerApi.js, una sola ruta en server. |
| Mini-cards horizontales (scroll) vs grid vertical | Horizontal → problemático en pantallas chicas, scroll horizontal no deseado. Grid → responsive natural | **Grid CSS**: `repeat(auto-fill, minmax(300px, 1fr))`. 2 columnas en 1080p, 1 en tablet. |
| BrawlStarsButton en 2 filas (video + audio) vs 1 fila con toggle link | 2 filas → 16 botones por zona, demasiado denso. 1 fila + toggle → 8 botones, patrón TVRACK replicado | **1 fila de 8 botones + toggle link**: misma UX que TVRACK. El toggle `link` unifica video/audio en un solo botón. |

## Data Flow

```
User click (btn DTV3, zone=aVip-Barra-Centro, type=video)
  │
  ├─► MatrizVideo handler → setZonasFueraVideo("aVip-Barra-Centro", "DTV3")
  │     │
  │     ├─► arrangerApi.js: POST /api/zonas-fuera/aVip-Barra-Centro/video { deviceId: "DTV3" }
  │     │     │
  │     │     └─► server.js Express:
  │     │           1. valida zoneId ∈ ZONAS_FUERA_IDS
  │     │           2. stateDb.data.zonasFuera[zoneId].video = "DTV3"
  │     │           3. if (link) → audio = "DTV3"
  │     │           4. stateDb.write()
  │     │           5. res.json({ zoneId, video, audio, link, lastUpdated })
  │     │
  │     ├─► assignVideoSource("DTV3", zoneId) → Arranger "join video DTV3 aVip-Barra-Centro"
  │     │     │
  │     │     └─► fetch /api/command/join%20video%20DTV3%20aVip-Barra-Centro/{token}
  │     │
  │     └─► setZonasFueraState({ ...prev, [zoneId]: response }) → re-render mini-card
  │
  └─► Polling (5s) → GET /api/zonas-fuera/state → sync entre PCs
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `server/server.js` | Modify | `+ZONAS_FUERA_IDS` constant, `+zonasFuera` en lowdb init, `+4` endpoints REST, `+migración` startup |
| `server/state.json` | Auto-migrated | `+zonasFuera` key raíz con 10 objetos (migración automática al iniciar) |
| `src/api/arrangerApi.js` | Modify | `+ZONAS_FUERA_BASE_URL="/api/zonas-fuera"`, `+fetchZonasFueraState()`, `+setZonasFuera{Video,Audio,Link}()` |
| `src/App.jsx` | Modify | `+zonasFueraState` useState, `+handleZonasFueraChange`, `+polling useEffect`, `+provider value` |
| `src/contexto/Contexto.jsx` | Modify | `-10` keys de `estadoInicial.tvs`, `+zonasFueraState` y handlers en ProviderUser |
| `src/componentes/MatrizVideo.jsx` | Modify | `-10` keys de initialValues Formik, `-<select>` section, `+ZonasFueraSection` con 10 mini-cards |
| `src/componentes/MatrizVideo.module.css` | Modify | `-.zonasColumn/.zonasRow/.zonasLabel/.zonasSelect`, `+.zonasFueraGrid`, `+.zonaCard` |
| `src/componentes/MatrizVideo.test.jsx` | Modify | `-10` zona keys en mockState, `+zonasFueraState` mock |

## APIs / Contracts

### GET /api/zonas-fuera/state
```
Response 200:
{
  "aVip-Barra-Centro": { "video": "DTV2", "audio": "DTV2", "link": true, "lastUpdated": "2026-07-27T..." },
  ...
}
Response 503: { "error": "Database not ready" }
```

### POST /api/zonas-fuera/:id/video
```
Request:  { "deviceId": "DTV3" }
Response 200: { "zoneId": "aVip-Barra-Centro", "video": "DTV3", "audio": "DTV3", "link": true, "lastUpdated": "..." }
Error 400:  { "error": "deviceId required" } | { "error": "Unknown zone" }
Error 503:  { "error": "Database not ready" }
```

### POST /api/zonas-fuera/:id/audio
```
Request:  { "deviceId": "DTV3" }
Response: misma forma que /video, con audio modificado
```

### POST /api/zonas-fuera/:id/link
```
Request:  { "linked": true }
Response: { "zoneId": "...", "video": "...", "audio": "...", "link": true, "lastUpdated": "..." }
Error 400:  { "error": "linked required (boolean)" }
```

## State Shape

```typescript
// En lowdb (server/state.json, key raíz)
interface StateDb {
  state: AppState | null;
  tvrack: TvrackState;
  presets: Presets;
  zonasFuera: ZonasFueraState;  // ← NUEVO
}

interface ZonasFueraState {
  [zoneId: string]: ZonaFueraEntry;
}

interface ZonaFueraEntry {
  video: string;         // deviceId (ej: "DTV1")
  audio: string;         // deviceId
  link: boolean;         // true → video=audio sync
  lastUpdated: string;   // ISO 8601 timestamp
}

// En el cliente (App.jsx)
const [zonasFueraState, setZonasFueraState] = useState<ZonasFueraState>({});
```

## CSS Architecture

```css
/* Grid: 2 columnas en 1080p, 1 en tablet */
.zonasFueraGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

/* Mini-card — replica estructura TVRACK simplificada */
.zonaCard {
  background: var(--color-surface, #0d1117);
  border: 1px solid var(--color-border, #30363d);
  border-radius: 8px;
  padding: 10px;
}

.zonaCardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #8b949e;
}

.zonaCardTitle {
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.zonaCardBadge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #161b22;
  border: 1px solid #30363d;
}

.zonaCardButtons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.zonaCardLinkRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 0;
  margin: 6px 0 0;
  border-top: 1px dashed #30363d;
  font-size: 11px;
  color: #8b949e;
}
```

## Migration Flow

### Server startup (server.js)

1. lowdb inicializa `stateDb` con default `{ state: null, tvrack, presets, zonasFuera: {} }`
2. Si `stateDb.data.state?.tvs` existe Y `stateDb.data.zonasFuera` está vacío (Object.keys length 0):
   a. Extraer 10 keys de `stateDb.data.state.tvs` usando whitelist `ZONAS_FUERA_IDS`
   b. Para cada key, si el valor es string ("DTV2") → `{ video: "DTV2", audio: "DTV2", link: true, lastUpdated: nowISO }`
   c. Guardar `stateDb.data.zonasFuera = mappedState`
   d. `fs.copyFileSync(state.json, state.backup.json)` — backup atómico pre-migración
   e. `stateDb.write()`
3. Si ya tiene datos → no migrar (idempotente)

### Client load (App.jsx useEffect)

1. `GET /api/state` → si response incluye `zonasFuera` en el objeto raíz (no dentro de `state.tvs`):
   - `setZonasFueraState(serverState.zonasFuera)`
   - Las 10 keys ya NO están en `estado.tvs`
2. Polling de `GET /api/zonas-fuera/state` cada 5s sincroniza entre PCs
3. localStorage: al guardar `estado`, las 10 zona keys YA NO se incluyen en `estado.tvs` (se removieron del estado inicial y del Formik)

### Rollback

Si se hace rollback:
- `state.backup.json` contiene el estado completo pre-migración
- El código anterior ignora la key `zonasFuera` en lowdb
- Las 10 keys vuelven a `estado.tvs` y los `<select>` se restauran

## Error Handling

| Escenario | Comportamiento |
|-----------|---------------|
| Arranger unreachable | `assignVideoSource`/`assignAudioSource` lanza → catch en handler muestra toast de error. **Estado lowdb YA se actualizó** (optimistic write en server). Próximo polling sincroniza. |
| Zone ID inválido | Server responde 400 `{ error: "Unknown zone" }`. Cliente catch → toast error. No modifica estado local. |
| lowdb no inicializado | Server responde 503. Cliente catch silencioso (polling reintenta en 5s). |
| POST sin deviceId | Server 400. Toast error. |
| Colisión multi-PC | Último write gana (lowdb). Polling 5s reconcilia divergencias. Modelo eventual-consistency ya probado con TVRACK. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Se agregan endpoints REST estándar con el mismo rate limiter y validación del patrón TVRACK existente.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (server) | Endpoints retornan 400/503 correctamente, migración idempotente | Jest: mock `stateDb`, testear cada endpoint con datos válidos/inválidos |
| Unit (client) | `setZonasFueraVideo` llama POST correcto, polling detecta cambios | Vitest + React Testing Library: mock fetch |
| Integration | Click en botón → POST → Arranger command → re-render con nuevo estado | Playwright: simular click, verificar toast y badge |
| E2E | Polling sincroniza entre 2 pestañas, build pasa | Manual: abrir 2 pestañas, cambiar video en una, verificar sync en 5s |

## Open Questions

- [ ] ¿El toggle `link` es por zona o un toggle global? — Diseño asume por zona (independencia total), pero podría simplificarse a global si el usuario lo prefiere.
- [ ] ¿Los presets deben incluir `zonasFuera`? — Out of scope en este issue (dice "Presets de zonas fuera se guardan/cargan en siguiente issue"), confirmar que no se rompen al remover las 10 keys de `estado.tvs`.
