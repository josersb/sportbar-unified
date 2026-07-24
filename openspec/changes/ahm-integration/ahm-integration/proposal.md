# Proposal: AHM-32 Audio Matrix Integration (Fase 1)

## Intent

Replace the fire-and-forget RS-232 serial audio control (Arranger proxy) with bidirectional AHM-32 integration. Operators currently see assumed state, not real hardware state. The AHM-32 already handles all venue audio; this brings it under unified SportBar management.

## Scope

### In Scope
- Zone mute/unmute and level control (-inf to +10 dB) for Norte, Centro, Sur
- Bidirectional sync: AHM is source of truth; physical/desktop changes reflected in UI
- WebSocket bridge (Express ↔ AHM TCP/MIDI port 51327 TLS)
- Connection indicator (online/offline)
- AHM IP/credentials via server environment variables
- Separate React context (`ContextoAHM`) isolated from video domain

### Out of Scope
Source Selector (Fase 2), Preset Recall (Fase 3), EQ/Room Combiners (Fase 4), preamps/playback (Fase 5), VU meters, legacy serial fallback.

## Capabilities

### New Capabilities
- `ahm-websocket-bridge`: TCP/MIDI↔WebSocket bridge with auth, heartbeat, auto-reconnect, MIDI parsing
- `ahm-audio-control`: Zone mute/level with bidirectional sync; AHM as authoritative source
- `ahm-frontend-context`: Isolated React context + WebSocket client for audio state

### Modified Capabilities
- `ux-feedback`: Extend toast system for AHM connection events. No other capability changes.

## Approach

**Single PR** under 800-line budget. Architecture: `Browser ←WS→ Express ←TCP/MIDI→ AHM-32`. Dependency: `ws@8.18.2` (server only). Custom MIDI parser (~150 lines). No new frontend packages.

Implementation order: MIDI factory → TCP bridge → WS server → Express integration → frontend client + context → Audio.jsx migration → App.jsx wiring + Vite proxy.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `server/ahm-midi.js` | New | MIDI command factory (mute, level, getLevel) |
| `server/ahm-bridge.js` | New | TCP connection, MIDI parser, heartbeat, reconnect |
| `server/ws-server.js` | New | WS command routing, client broadcast, state snapshot |
| `server/server.js` | Modified | Attach WS server, init AhmBridge singleton |
| `src/api/ahmApi.js` | New | Frontend WS client with auto-reconnect |
| `src/contexto/ContextoAHM.jsx` | New | React context: connected flag, zones state |
| `src/componentes/Audio.jsx` | Modified | Replace serial calls with AHM context; add connection indicator |
| `src/App.jsx` | Modified | Add `ProviderAHM` in provider tree |
| `src/contexto/dispositivos.js` | Modified | Add AHM-32 entry |
| `vite.config.js` | Modified | Add `/ws` WebSocket dev proxy |
| `arrangerApi.js`, `Contexto.jsx` (video), `MatrizVideo.jsx` | **Untouched** | Video domain isolated |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| AHM unreachable | Medium | Exponential backoff reconnect (1s→30s); UI shows "Audio no disponible" |
| MIDI parsing errors | Medium | Running-status handling, buffer accumulation, test with documented SysEx |
| `ws` ESM/CJS incompat | Low | Pin `ws@8.18.2` (verified CJS require support) |
| Multi-client races | Low | Last-write-wins; AHM serializes TCP; broadcast reflects authoritative state |
| TCP idle disconnect | Low | 30s heartbeat via innocent MIDI query |

## Rollback Plan

Remove `ProviderAHM` from `App.jsx` and WS init from `server/server.js`. No database migrations, no separate services, no state to unwind. Audio zones return to manual-only operation temporarily.

## Dependencies

- AHM-32 network-accessible from Express server (red multim)
- AHM UserProfile/password configured
- Zone mapping (Norte→0, Centro→1, Sur→2) verified against AHM config
- `Docs/equipaments/ahm/` protocol reference

## Success Criteria

- [ ] Mute/unmute and volume control per zone from web UI
- [ ] Physical/desktop AHM changes reflected in web UI within 30s
- [ ] Connection indicator accurate (green/red)
- [ ] AHM IP configurable via env vars, no code change
- [ ] Video control (MatrizVideo, Arranger) continues functioning identically
- [ ] No new frontend npm dependencies
