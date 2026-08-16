# Design: AHM-32 Audio Matrix Integration (Fase 1)

## Architecture Overview

```
Browser ←WebSocket→ Express ←TCP/MIDI→ AHM-32
  ↕                   ↕
ahmApi.js        ahm-bridge.js (EventEmitter, singleton)
  ↕                   ↕
ContextoAHM.jsx   midi-commands.js (pure Buffer fns)
```

Single persistent TCP socket from Express to AHM-32 port 51327 (TLS). Browser connects via native WebSocket. MIDI commands flow browser→WS→TCP→AHM; state responses flow AHM→TCP→WS→broadcast all browsers. AHM is authoritative source of truth.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| WS library | `ws` vs `socket.io` | `ws`: lighter (2MB), manual reconnect. `socket.io`: heavier with unneeded abstractions | `ws@8.18.2` |
| Audio context | Extend Contexto.jsx vs separate | Separate = isolated re-renders, SRP, easier testing | `ContextoAHM.jsx` |
| Server lifecycle | `app.listen()` vs `http.createServer(app)` | `createServer` allows WS upgrade on same port | `http.createServer` |
| MIDI parser | Custom 150-line vs easymidi/jzz | Custom avoids native Windows compilation issues | Custom in `ahm-bridge.js` |
| Auth transport | Plain TCP 51325 vs TLS 51327 | TLS encrypts credentials in transit | TLS 51327 (env overridable) |

## Component Design

### `server/ahm-bridge.js` — TCP Client (new)
EventEmitter singleton. `connect()` opens `tls.connect()` → sends `"profile,password\n"` → waits for "AuthOK". `processBuffer()` accumulates TCP chunks, extracts complete MIDI messages (Note On=3B, NRPN=12+B, SysEx=F0…F7), handles running status. Heartbeat via `getZoneMute(0)` every 30s. Reconexión con backoff exponencial (1s→30s max). Cola de comandos pendientes durante desconexión. Events: `connected`, `disconnected`, `state(zoneObj)`, `error`.

### `server/midi-commands.js` — MIDI Factory (new)
Pure functions returning `Buffer`:
- `setZoneMute(ch, muted)`: Note On 0x91, ch, vel(0x7F mute | 0x3F unmute)
- `setZoneLevel(ch, db)`: NRPN param 17 with `dbToMidiValue()` — maps -inf→0x00, +10dB→0x7F
- `getZoneLevel(ch)` / `getZoneMute(ch)`: SysEx query `F0 00 00 1A 50 12 01 00 01 01 0B/09 17 ch F7`
- Constants: `SYSEX_HEADER`, `CH_TYPE_ZONE=1`, `NRPN_LEVEL=17`

### WebSocket Integration — `server/server.js` (modified)
```javascript
const http = require("http");
const { WebSocketServer } = require("ws");
const { AhmBridge } = require("./ahm-bridge");

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/ahm" });
const ahmBridge = new AhmBridge(envConfig);

ahmBridge.on("state", (zones) => broadcast(wss, { type: "state", zones }));
ahmBridge.on("connected", () => broadcast(wss, { type: "connection", status: "connected" }));
ahmBridge.on("disconnected", () => broadcast(wss, { type: "connection", status: "disconnected" }));

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "state", zones: ahmBridge.lastState }));
  ws.on("message", (data) => {
    const { type, zone, value } = JSON.parse(data);
    if (type === "setLevel") ahmBridge.setLevel(zone, value);
    if (type === "setMute") ahmBridge.setMute(zone, value);
  });
});

server.listen(PORT);
```
Existing HTTP routes unchanged. Add `connectSrc: "ws://localhost:3000"` to CSP when feature flag enabled.

### `src/api/ahmApi.js` — Frontend WS Client (new)
Native WebSocket wrapper. `connect()` opens `ws://${host}/ws/ahm`, wires `onmessage`/`onclose`/`onerror`. Methods: `setZoneLevel(zone, db)`, `setZoneMute(zone, muted)`. Callbacks: `onState(cb)`, `onConnection(cb)`. Auto-reconnect on close (2s delay, no exponential — browser WS lifecycle differs from server TCP).

### `src/contexto/ContextoAHM.jsx` — React Context (new)
```javascript
const initial = { connected: false, zones: { norte: {}, centro: {}, sur: {} } };

function ProviderAHM({ children }) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    const client = new AhmClient();
    client.onState((zones) => setState(p => ({ ...p, zones })));
    client.onConnection((s) => setState(p => ({ ...p, connected: s === "connected" })));
    client.connect();
    return () => client.disconnect();
  }, []);
  const setMute = (z, v) => client.setZoneMute(z, v); // optimistic
  const setLevel = (z, v) => client.setZoneLevel(z, v);
  return <Provider value={{ ahmState: state, setMute, setLevel }}>{children}</Provider>;
}
```

### `src/componentes/Audio.jsx` — Migration (modified)
Replace `sendSerialCommand("DTV1", ...)` calls with `setMute(zone, val)` / `setLevel(zone, val)` from ContextoAHM. Keep Formik structure. Add connection indicator: green `● Conectado` / red `○ Desconectado`. Remove `handleChangeEstadoAudio` dependency. `audio[]` in Contexto.jsx kept unused (no migration risk).

### Other Files
- `src/App.jsx`: add `<ProviderAHM>` after `<ProviderUser>`
- `src/contexto/dispositivos.js`: add `AHM32: { id, hardware, capabilities: ['audioProcessor','zoneControl','levelControl','muteControl'] }`
- `vite.config.js`: add `"/ws": { target: "http://localhost:3000", ws: true }` proxy

## Data Flow: Set Level

Slider → `setLevel("norte", -5)` → WS `{type:"setLevel", zone:0, value:-5}` → Express → `ahmBridge.setLevel(0, -5)` → `midiCommands.setZoneLevel(0, -5)` → TCP NRPN → AHM applies → `getZoneLevel(0)` SysEx → AHM responds → `processBuffer()` emits `state` → WS broadcast to ALL clients → `ahmApi.onState()` → `setState()` → UI sync.

Sync on connect: WS open → server sends `ahmBridge.lastState` snapshot.

## Error Handling

| Failure | Strategy |
|---------|----------|
| AHM unreachable | Exponential backoff 1s→30s; UI shows "Desconectado" |
| TCP idle drop | 30s heartbeat `getZoneMute(0)`; force reconnect on fail |
| MIDI parse error | Skip malformed byte; log; resync on next valid message |
| WS message parse error | Catch JSON.parse; ignore; do not crash server |
| Auth failure | Socket closes before "AuthOK" → log error → stop retry loop |
| Multi-client race | Last-write-wins; AHM serializes TCP; broadcast reflects authoritative state |

## Configuration

```bash
# server/.env
AHM_HOST=192.168.x.x       # IP red multim
AHM_PORT=51327             # TLS (51325 plain)
AHM_PROFILE=00             # UserProfile
AHM_PASSWORD=secret

# frontend .env
VITE_AHM_ENABLED=true      # feature flag
```

`vite.config.js` proxy: `"/ws": { target: "ws://localhost:3000", ws: true }`.

## Security

AHM credentials never reach browser (server-side `process.env` only). WS endpoint LAN-only (same Express port, no external exposure). CSP updated: `connectSrc` adds `ws://localhost:3000` when enabled. Command handler validates `msg.type` against known set; rejects unknowns.

## Testing Strategy

| Layer | Test | Method |
|-------|------|--------|
| Unit: `midi-commands.js` | Byte arrays match MIDI spec | `Buffer.equals()` |
| Unit: `ahm-bridge.js` | Buffer parsing → correct events | Mock `net.Socket`, inject byte fixtures |
| Integration: Express+WS | WS commands → bridge → broadcast | `ws` test client + mock TCP server |
| Component: Audio.jsx | Slider calls `setLevel`, indicator shows status | RTL + mocked ContextoAHM |
| E2E: Full stack | Browser→Express→mock AHM→UI update | Playwright + mock TCP server |

## Migration Path

1. Install `ws@8.18.2` in `server/`
2. Add `ahm-bridge.js`, `midi-commands.js`, `ahmApi.js`, `ContextoAHM.jsx`
3. Modify `server.js`: `http.createServer` + WS + bridge init
4. Modify `Audio.jsx`: replace serial calls, add connection indicator
5. Modify `App.jsx`: add `<ProviderAHM>`
6. Modify `dispositivos.js`: add AHM-32 entry
7. Modify `vite.config.js`: WS proxy
8. Audit: `pnpm audit` in server; `pnpm run start` full-stack test

**Rollback**: Remove ProviderAHM + WS init; Audio.jsx shows "Audio no disponible." No DB migration. `audio[]` in Contexto.jsx preserved but unused post-migration.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundaries introduced.

## Open Questions

- [ ] Confirm AHM IP address on red multim (currently unknown — env placeholder)
- [ ] Confirm zone indices: Norte=0, Centro=1, Sur=2 match AHM config
- [ ] TLS certificate validation: accept self-signed or require CA-signed? (recommend: `rejectUnauthorized: false` for LAN)
