# Tasks: AHM-32 Audio Matrix Integration (Fase 1)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~640 (515 new + 125 modified) |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
800-line budget risk: Low

### Suggested Work Units

N/A — single PR.

## Phase 1: Server Foundation

- [ ] 1.1 Install `ws@8.18.2` — `pnpm install ws@8.18.2` in `server/`
- [ ] 1.2 Create `server/midi-commands.js` — pure Buffer factory: `setZoneMute()`, `setZoneLevel()`, `getZoneLevel()`, `getZoneMute()`, `dbToMidiValue()`, constants (SYSEX_HEADER, CH_TYPE_ZONE, NRPN_LEVEL)
- [ ] 1.3 Create `server/ahm-bridge.js` — EventEmitter singleton: `tls.connect()`, auth send (`profile,password\n`) + AuthOK await, `processBuffer()` MIDI parser (Note On 3B, NRPN 12+B, SysEx F0…F7, running status), exponential backoff (1s→30s), heartbeat (30s getZoneMute(0)), command queue (dedup by zone+type), events (connected, disconnected, state, error)

## Phase 2: Server Integration

- [ ] 2.1 Modify `server/server.js` — `http.createServer(app)`, attach `WebSocketServer({ path: "/ws/ahm" })`, wire AhmBridge events → broadcast, CSP connectSrc add `ws://localhost:3000`

## Phase 3: Frontend Client

- [ ] 3.1 Create `src/api/ahmApi.js` — native WebSocket wrapper: `connect()`, `setZoneLevel(zone, dB)`, `setZoneMute(zone, bool)`, `onState(cb)`, `onConnection(cb)`, auto-reconnect on close (2s delay)
- [ ] 3.2 Create `src/contexto/ContextoAHM.jsx` — ProviderAHM with state `{ connected, zones: { norte, centro, sur } }`, `useAhmZone(zone)` hook, `useAhmConnection()` hook, split contexts or memo for optimized re-renders

## Phase 4: UI Integration

- [ ] 4.1 Add `AHM32` entry to `src/contexto/dispositivos.js` — capabilities: `audioProcessor`, `zoneControl`, `levelControl`, `muteControl`
- [ ] 4.2 Modify `src/App.jsx` — wrap `<ProviderAHM>` after `<ProviderUser>`
- [ ] 4.3 Modify `src/componentes/Audio.jsx` — replace `sendSerialCommand()` + `handleChangeEstadoAudio` with `setMute`/`setLevel` from ContextoAHM, add connection indicator (green/red dot), keep Formik structure, leave `audio[]` in Contexto.jsx untouched
- [ ] 4.4 Modify `vite.config.js` — add `"/ws": { target: "ws://localhost:3000", ws: true }` proxy
- [ ] 4.5 Update `.env.example` — add `AHM_HOST`, `AHM_PORT`, `AHM_PROFILE`, `AHM_PASSWORD`, `VITE_AHM_ENABLED`

## Phase 5: Verification

- [ ] 5.1 Verify `midi-commands.js` — `Buffer.equals()` against known MIDI byte sequences (Note On, NRPN, SysEx)
- [ ] 5.2 Verify `ahm-bridge.js` — inject TCP byte fixtures, assert correct EventEmitter events fire
- [ ] 5.3 Verify server+WS — `wscat` / Node.js WS client sends commands → bridge echoes broadcast
- [ ] 5.4 Verify full-stack — `pnpm run dev:full`, open Audio.jsx, toggle mute/slider, confirm indicator and toast feedback
