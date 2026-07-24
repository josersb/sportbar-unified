# Apply Progress: AHM-32 Audio Matrix Integration — Batch 1

## Status: Complete (11/15 tasks)

### Completed Tasks

| Task | Status | Details |
|------|--------|---------|
| 1.1 Install ws@8.18.2 | ✅ | `pnpm add ws@8.18.2` in server/ |
| 1.2 Create midi-commands.js | ✅ | Pure Buffer factories: dB↔MIDI conversion, zone mute/level commands, SysEx queries |
| 1.3 Create ahm-bridge.js | ✅ | EventEmitter singleton TLS bridge, MIDI parser, auth, heartbeat, backoff, command queue |
| 2.1 Modify server.js | ✅ | http.createServer, WebSocketServer /ws/ahm, AhmBridge events → broadcast, CSP |
| 3.1 Create ahmApi.js | ✅ | Native WebSocket client, auto-reconnect, zone mute/level commands |
| 3.2 Create ContextoAHM.jsx | ✅ | AhmProvider, useAhm(), useAhmZone(zoneNumber), useAhmConnection() hooks |
| 4.1 Add AHM32 to dispositivos.js | ✅ | audioProcessor, zoneControl, levelControl, muteControl capabilities |
| 4.2 Modify App.jsx | ✅ | Wrap `<AhmProvider>` after `<ProviderUser>` |
| 4.3 Modify Audio.jsx | ✅ | Dual path (AHM/legacy), connection indicator, dynamic volume range |
| 4.4 Modify vite.config.js | ✅ | `/ws` proxy with ws:true |
| 4.5 Update .env / .env.example | ✅ | AHM_HOST, AHM_PORT, AHM_PROFILE, AHM_PASSWORD, VITE_AHM_ENABLED |

### Pending Tasks

| Task | Description |
|------|-------------|
| 5.1 | Verify midi-commands.js — Buffer.equals() against known MIDI byte sequences |
| 5.2 | Verify ahm-bridge.js — inject TCP byte fixtures |
| 5.3 | Verify server+WS — wscat / Node WS client |
| 5.4 | Verify full-stack — pnpm run dev:full |

### Files Changed

| File | Action |
|------|--------|
| `server/midi-commands.js` | Created |
| `server/ahm-bridge.js` | Created |
| `src/api/ahmApi.js` | Created |
| `src/contexto/ContextoAHM.jsx` | Created |
| `server/server.js` | Modified |
| `src/componentes/Audio.jsx` | Modified |
| `src/componentes/Audio.module.css` | Modified |
| `src/contexto/dispositivos.js` | Modified |
| `src/App.jsx` | Modified |
| `vite.config.js` | Modified |
| `.env` | Modified |
| `.env.example` | Modified |
| `openspec/changes/ahm-integration/ahm-integration/tasks.md` | Modified |
| `server/package.json` | Modified (via pnpm add) |

### Design Deviations

1. **Zone numbering in hooks**: Design used raw WS zone numbers (0-2). Implementation wraps with user-facing zoneNumber (1=Norte, 2=Centro, 3=Sur) in `useAhmZone()` for cleaner DX.
2. **Audio.jsx dual path**: Maintained full backward compatibility when `VITE_AHM_ENABLED=false`. Volume/mute changes remain submit-based (Formik), not real-time.
3. **Source routing**: Source selection still goes through old `sendSerialCommand` path even when AHM is enabled, since AHM-32 doesn't control video source routing.

### Risks / Open Issues

1. **Auth protocol**: Bridge expects "AuthOK" text string from AHM. Actual AHM auth response format unverified.
2. **SysEx response format**: Response byte positions assumed from query structure — may differ on real hardware.
3. **Heartbeat interference**: Using getZoneMute(0) as keepalive may cause brief mute state flickers on Norte zone.
4. **Reconnection timing**: 1s initial backoff may be too aggressive for cold AHM boot.
5. **No load testing**: Single-client assumed. Multi-client WS broadcasting uses simple O(n) loop.

### Workload / PR Boundary

- **Mode**: Single PR (size:~640 lines, within 800-line budget)
- **Current work unit**: N/A — single PR
- **Review budget**: ~640 lines estimated
- **Rollback boundary**: Remove `<AhmProvider>` from App.jsx + revert server.js to `app.listen()` + revert `/ws` proxy. Audio.jsx falls back automatically via feature flag.
