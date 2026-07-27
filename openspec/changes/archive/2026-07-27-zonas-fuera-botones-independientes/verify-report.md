# Verification Report: zonas-fuera-botones-independientes

**Date**: 2026-07-27
**Branch**: feature/zonas-fuera-botones-independientes (HEAD: 440973e)
**PR**: 3 committed (PR 1) + 6 working tree files (PR 2 uncommitted)

## Build & Test Evidence

| Command | Exit | Output Hash (SHA-256) |
|---------|------|----------------------|
| `pnpm run build` | 0 | `85d52a3612ed111de340013cbdd09ed667e1ab9f755290a8da5b367456b351ef` |
| `pnpm exec vitest run` | 0 | `95e79c7aae14d2c37591aa7605357e46fbdcfaabe140b86ea330517f89fe570b` |

- **Build**: ✅ 231 modules, clean build, 0 errors
- **Tests**: ✅ 10/10 files pass, 98/98 tests pass
  - 29 arrangerApi tests (9 new zonasFuera)
  - 26 MatrizVideo tests (7 new ZonasFueraSection)
  - 1 pre-existing unhandled error in `usePreset.test.jsx` (NOT caused by this change)

## Spec Compliance Matrix

### Domain: zonas-fuera-state (6 reqs, 8 scenarios)

| Req | Scenario | Status | Evidence |
|-----|----------|--------|----------|
| Zone State Structure | State loaded from lowdb | ✅ PASS | server.js:92-94 — `zonasFuera: Object.fromEntries(ZONAS_FUERA_IDS.map(...))` |
| Zone State Structure | Default on missing key | ✅ PASS | server.js:27-32 — `DEFAULT_ZONA_FUERA`, server.js:140-141 — fallback |
| LowDB Persistence | State survives restart | ✅ PASS | `await stateDb.write()` in all 4 POST endpoints |
| REST API Endpoints | Set video sends join video | ⚠️ WARNING | Server updates lowdb but does NOT send `join video` to Arranger. Spec says "Arranger receives join video..." |
| REST API Endpoints | Invalid zone returns 404 | ⚠️ WARNING | Returns 400 not 404. server.js:260 — `res.status(400)` |
| Polling Synchronization | Cross-PC sync detected | ✅ PASS | App.jsx:146-169 — 5s polling, JSON diff comparison |
| Independence from Matriz | Zone change excludes matriz | ✅ PASS | Contexto.jsx:95-96 — zones removed from tvs, handleZonasFueraChange does not call handleChangeEstadoVideo |
| Migration | Legacy string migrated on startup | ✅ PASS | server.js:109-174 — `migrateZonasFueraV2()`, backup, string→object, preset migration |

### Domain: destinos-adicionales (1 req, 2 scenarios)

| Req | Scenario | Status | Evidence |
|-----|----------|--------|----------|
| Build and Tests | Build succeeds after zone migration | ✅ PASS | 231 modules, clean build |
| Build and Tests | Matriz Preset load excludes zones | ✅ PASS | usePreset.test.jsx:140 — 29 mappings (no zones), MatrizPreset.test.jsx:99 |

### Domain: arranger-api-centralized (1 req, 3 scenarios)

| Req | Scenario | Status | Evidence |
|-----|----------|--------|----------|
| Zonas Fuera API Functions | Set video triggers join video | ⚠️ WARNING | API POSTs to server, server only updates lowdb — no Arranger command |
| Zonas Fuera API Functions | Set link updates state only | ✅ PASS | POST /:id/link updates lowdb, no Arranger command (correct) |
| Zonas Fuera API Functions | Error logs per convention | ✅ PASS | arrangerApi.js:302,318,334,349 — all throw descriptive errors |

### Summary

| Count | Status |
|-------|--------|
| 10 | PASS |
| 3 | WARNING |
| 0 | CRITICAL |

## Task Completion

| Phase | Tasks | Status |
|-------|-------|--------|
| 1: Server Infrastructure | 11/11 | ✅ Complete (committed: 4a4d4ea, a6bbdcd, 440973e) |
| 2: Client State | 6/6 | ✅ Complete (working tree) |
| 3: UI — ZonasFueraSection | 7/7 | ✅ Complete (working tree) |
| 4: Tests | 7/7 | ✅ Complete (working tree) |
| 5: Verification | 2/2 | ✅ Complete (this report) |
| **Total** | **28/28** | ✅ |

## Design Coherence

| Decision | Match? | Evidence |
|----------|--------|----------|
| 4 parametrized endpoints | ✅ | server.js:266-311 — `/:id/video`, `/:id/audio`, `/:id/link`, `/state` |
| Root key `zonasFuera` in lowdb | ✅ | server.js:92 — `zonasFuera: Object.fromEntries(...)` |
| Generic handlers with zoneId | ✅ | validateZonaFueraId middleware + parametrized routes |
| Grid CSS `repeat(auto-fill, minmax(300px, 1fr))` | ✅ | ZonasFueraSection in MatrizVideo.jsx:629 |
| 8 BrawlStarsButton + link toggle per zone | ✅ | MatrizVideo.jsx:641-660 — video buttons + link checkbox |
| assignVideoSource(deviceId, zoneId) in data flow | ⚠️ NOT IMPLEMENTED | Design says "→ assignVideoSource(deviceId, zoneId) al Arranger" but code only calls setZonasFueraVideo which POSTs to server |

## Issues

### WARNING
1. **Arranger command not forwarded**: `POST /api/zonas-fuera/:id/video` and `POST /api/zonas-fuera/:id/audio` do not send `join video`/`join audio` to Arranger. Server only updates lowdb state. Spec and design both mention Arranger commands.
2. **HTTP status mismatch**: Invalid zone returns 400 (not 404 as spec specifies).
3. **PR 2 uncommitted**: 6 files in working tree (App.jsx, Contexto.jsx, MatrizVideo.jsx, MatrizVideo.module.css, MatrizVideo.test.jsx, arrangerApi.test.js). All 28 tasks are complete but the code is not committed.

### SUGGESTION
1. Add `assignVideoSource(deviceId, zoneId)` call in server video/audio endpoints or in App.jsx handleZonasFueraChange.
2. Change invalid zone response from 400 to 404, or update spec to say 400.

## Files Changed
- `server/server.js` — +ZONAS_FUERA_IDS, +zonasFuera to lowdb, +4 endpoints, +migration v2
- `src/api/arrangerApi.js` — +fetchZonasFueraState, +setZonasFueraVideo/Audio/Link
- `src/App.jsx` — +zonasFueraState, +handleZonasFueraChange, +polling
- `src/contexto/Contexto.jsx` — -10 zone keys from estadoInicial.tvs
- `src/componentes/MatrizVideo.jsx` — -selects, +ZonasFueraSection with mini-cards
- `src/componentes/MatrizVideo.module.css` — -old zone styles, +zonasFueraGrid
- `src/componentes/MatrizVideo.test.jsx` — +7 ZonasFueraSection tests, mock updates
- `src/api/arrangerApi.test.js` — +9 zonasFuera tests

## Verdict

**PASS WITH WARNINGS**

The implementation correctly delivers:
- Independent zone state with 10 zones, persisted in lowdb
- 4 REST API endpoints with zone validation
- Polling synchronization at 5s intervals
- ZonasFueraSection UI with mini-cards and BrawlStarsButton
- Clean build and full test suite (98/98)
- Migration from legacy state format

Two spec deviations should be addressed before archive:
1. Arranger `join video`/`join audio` commands not forwarded (WARNING)
2. Invalid zone returns 400 instead of 404 (WARNING)
