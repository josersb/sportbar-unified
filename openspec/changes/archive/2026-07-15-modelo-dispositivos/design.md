# Design: Modelo de Dispositivos por Capacidades

## Technical Approach

Replace the flat `estado.decos[]` array with a typed device registry (`dispositivos.js`) where each IPEX5001 declares its connected equipment and capabilities. Components render dynamically by querying `getByCapability('channelControl')` instead of hardcoding DTV1-DTV8. localStorage v0→v1 migration preserves existing presets.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Auto-detection: Express proxy** | Needs server change, works in prod + dev | **Accepted**: add `/api/device/:id/status` Express relay. `getDeviceStatus()` calls it |
| **Manual-only capabilities** | Simpler, no Arranger dependency | **Rejected**: architecture should support future auto-detection |
| **TCP port 6980** | Requires raw socket from browser | **Rejected**: impractical from React frontend |
| **Object registry vs array** | Array breaks on reorder; object has O(1) lookup | **Object `{ DTV1: {...}, ... }`** |
| **CSS: type-based vs device-based** | Type-based groups similar hardware visually | **Device-based colors** (moved to registry `color` field). Each device keeps its visual identity |

**Rationale for Express proxy**: `mode: "no-cors"` prevents browser-side response parsing for ALL Arranger calls. The Express server (already in the project) can make unrestricted server-to-server HTTP requests. Adding a proxy endpoint there unblocks auto-detection without changing the Arranger API contract.

## Data Flow

```
App.jsx mount
  │
  ├─► 1. migrarEstado() — si localStorage es v0, convierte decos[] → dispositivos
  │
  ├─► 2. detectCapabilities() por cada dispositivo (async, non-blocking)
  │     └─► getDeviceStatus('DTV1') → GET /api/device/DTV1/status → Express → Arranger
  │         └─► parse: VIDEO stream → videoSource, IR stream → channelControl, etc.
  │     └─► fallback: DISPOSITIVOS[id].capabilities (manual)
  │
  └─► 3. Render — componentes leen estado.dispositivos, no estado.decos
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/contexto/dispositivos.js` | **Create** | Registry: 8 devices with `id`, `hardware`, `capabilities`, `connected`, `color`. Helpers: `getByCapability()`, `detectCapabilities()` |
| `src/api/arrangerApi.js` | Modify | Add `getDeviceStatus(deviceId)` — calls Express proxy, returns parsed capabilities or null |
| `server/server.js` | Modify | Add `GET /api/device/:deviceId/status` — proxies to Arranger `get status`, parses HTML/text response, returns JSON |
| `src/contexto/Contexto.jsx` | Modify | New `estadoInicial.dispositivos` object + legacy `decos`. Add `estadoApp_version: 1` to preset init |
| `src/App.jsx` | Modify | Migration logic: read `estadoApp_version`, run `migrarEstado()` if v0. Wire `handleChangeEstadoDispositivos` |
| `src/componentes/Canales.jsx` | Modify | Dynamic `<select>` from `getByCapability('channelControl')` |
| `src/componentes/MatrizVideo.jsx` | Modify | DTVRACK buttons via `.map()` over `getByCapability('videoSource')`; 8 handlers → 1 factory |
| `src/componentes/MatrizPreset.jsx` | Modify | Read `tvs` from preset (unchanged), but save includes `dispositivos` |
| `src/componentes/Aside.jsx` | Modify | Iterate `Object.values(dispositivos)` instead of `decos[i]` |
| `src/componentes/Aside.css` | Modify | Replace hardcoded inline `backgroundColor` with dynamic color from device registry |
| `src/componentes/Audio.jsx` | Modify | Dynamic source `<option>`s from `getByCapability('audioSource')` |
| Tests (4 files) | Modify | Update context mocks to include `dispositivos` object |

## Interfaces / Contracts

### Device Registry (`dispositivos.js`)

```javascript
export const DISPOSITIVOS = {
  DTV1: { id: 'DTV1', hardware: 'IPEX5001', mac: '341B22819781',
    connected: 'DirecTV HD Decoder', color: '#EF9A9A',
    capabilities: ['videoSource', 'audioSource', 'channelControl', 'serialGateway'],
    defaultChannel: 1603 },
  DTV2: { id: 'DTV2', hardware: 'IPEX5001', mac: '...',
    connected: 'DirecTV HD Decoder', color: '#EC407A',
    capabilities: ['videoSource', 'audioSource', 'channelControl'],
    defaultChannel: 1604 },
  // DTV3-DTV6: identical to DTV2, different color/channel
  DTV7: { id: 'DTV7', hardware: 'IPEX5001', mac: '6C930870C0C9',
    connected: 'OBS Encoder', color: '#FFCA28',
    capabilities: ['videoSource', 'audioSource'],
    defaultChannel: null },
  DTV8: { id: 'DTV8', hardware: 'IPEX5001', mac: '...',
    connected: 'Streaming Device', color: '#BDBDBD',
    capabilities: ['videoSource', 'audioSource'],
    defaultChannel: null },
};

export const getByCapability = (cap) =>
  Object.values(DISPOSITIVOS).filter(d => d.capabilities.includes(cap));
```

### `getDeviceStatus(deviceId)` → `{ capabilities: string[] } | null`

Calls Express proxy. Returns `null` if proxy unavailable or Arranger down.

### New estado shape (v1)

```javascript
estado = {
  dispositivos: { DTV1: { canalActual: 1603, online: true }, ... },
  decos: [ /* legacy array, maintained for migration window */ ],
  tvs: { /* unchanged */ }, audio: [ /* unchanged */ ],
  favoritos: [ /* unchanged */ ],
  descripcionPreset: [ /* unchanged */ ],
  _version: 1,
};
```

### Migration: `migrarEstado(v0data) → v1data`

Converts `v0data.decos[]` to `dispositivos` object, copying `canalDeco → canalActual`. Preserves `tvs`, `audio`, `favoritos` as-is. Adds `_version: 1`.

## Component Refactor Patterns

**Canales.jsx — Dropdown:**
```
BEFORE: <option value="DTV1">DTV 1</option> (×8 hardcoded)
AFTER:  {getByCapability('channelControl').map(d =>
          <option key={d.id} value={d.id}>{d.id}</option>)}
```

**MatrizVideo.jsx — DTVRACK buttons:**
```
BEFORE: 8 separate handleBtnDTV1..8 functions + 8 <button> elements
AFTER:  const handleBtn = (id) => async () => { await assignSourceToDestination(id, 'TVRACK'); ... }
        {getByCapability('videoSource').map(d =>
          <button key={d.id} onClick={handleBtn(d.id)}>{d.id}</button>)}
```

**Select `<option>`s** (MatrizVideo, Audio): replace 8 hardcoded `<option>` lines with `getByCapability('videoSource').map(...)`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getByCapability()` filters | Pure function tests with known registry |
| Unit | `migrarEstado()` transforms v0→v1 | Input/output assertions |
| Unit | `getDeviceStatus()` parsing | Mock fetch, test stream→capability mapping |
| Component | Canales dropdown excludes DTV7/DTV8 | Render with full context, query `<option>` count = 6 |
| Component | MatrizVideo DTVRACK buttons generated dynamically | Button count equals `videoSource` devices |

Mock `getDeviceStatus` to return `null` (offline fallback). No server integration tests needed.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. This change modifies internal state model and UI rendering only.

## Migration / Rollout

**Auto-migration on app load**: when `localStorage` lacks `_version` or has `_version: 0`, `migrarEstado()` converts data before first render. If migration fails, fallback to `estadoInicial` (v1). Rollback: revert commit; v0 presets remain unmodified until next save.

## Open Questions

- [ ] Confirm Express proxy path does not conflict with existing `/api` Vite dev proxy routing
- [ ] Confirm DTV1 `serialGateway` capability (used by Audio.jsx for Tesira commands) — DTV1 is the RS-232 bridge, not a capability to filter in dropdowns
