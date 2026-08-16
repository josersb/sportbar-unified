# Tasks: Zonas Fuera — Botones Independientes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350-400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Server endpoints + API functions | PR 1 → feature/zonas-fuera | `pnpm exec vitest run src/componentes/MatrizVideo.test.jsx --reporter verbose` (verify mocks compile + server tests) | `pnpm run dev:full` + curl `GET /api/zonas-fuera/state` | `git revert` PR 1 merge; state.json regenerates on restart |
| 2 | Client state + UI + tests | PR 2 → PR 1 branch | `pnpm exec vitest run src/componentes/MatrizVideo.test.jsx --reporter verbose` | `pnpm run dev:full` + browser `/matrizvideo` | `git revert` PR 2 merge; selects return, mini-cards disappear |

## Phase 1: Server Infrastructure ✅ PR 1

- [x] 1.1 `server/server.js` — Add `ZONAS_FUERA_IDS` whitelist (10 zone keys)
- [x] 1.2 `server/server.js` — Add `zonasFuera` to lowdb defaults (10 zones, video/audio/link/lastUpdated)
- [x] 1.3 `server/server.js` — Add migration: legacy string values → `{video, audio, link, lastUpdated}`
- [x] 1.4 `server/server.js` — Add `GET /api/zonas-fuera/state` endpoint
- [x] 1.5 `server/server.js` — Add `POST /api/zonas-fuera/:id/video` (+ Arranger `join video` command)
- [x] 1.6 `server/server.js` — Add `POST /api/zonas-fuera/:id/audio` (+ Arranger `join audio` command)
- [x] 1.7 `server/server.js` — Add `POST /api/zonas-fuera/:id/link` (state-only, no Arranger)
- [x] 1.8 `src/api/arrangerApi.js` — Add `fetchZonasFueraState()`
- [x] 1.9 `src/api/arrangerApi.js` — Add `setZonasFueraVideo(id, deviceId)`
- [x] 1.10 `src/api/arrangerApi.js` — Add `setZonasFueraAudio(id, deviceId)`
- [x] 1.11 `src/api/arrangerApi.js` — Add `setZonasFueraLink(id, value)`

## Phase 2: Client State ✅ PR 2

- [x] 2.1 `src/contexto/Contexto.jsx` — Remove 10 zone keys from `estadoInicial.tvs`
- [x] 2.2 `src/contexto/Contexto.jsx` — (ProviderUser value wired in App.jsx — `zonasFueraState` + `handleZonasFueraChange`)
- [x] 2.3 `src/App.jsx` — Add `zonasFueraState` useState + first load
- [x] 2.4 `src/App.jsx` — Add polling useEffect for `GET /api/zonas-fuera/state` (5s)
- [x] 2.5 `src/App.jsx` — Add unified `handleZonasFueraChange(zoneId, type, deviceId)` handler
- [x] 2.6 `src/App.jsx` — Wire `zonasFueraState` + `handleZonasFueraChange` into `ProviderUser` value

## Phase 3: UI — ZonasFueraSection ✅ PR 2

- [x] 3.1 `src/componentes/MatrizVideo.jsx` — Remove `<select>` block for 10 zonas
- [x] 3.2 `src/componentes/MatrizVideo.jsx` — Add inline `ZonasFueraSection` with mini-card grid
- [x] 3.3 `src/componentes/MatrizVideo.jsx` — Each card: header + name badge + 8 BrawlStarsButton video + link toggle
- [x] 3.4 `src/componentes/MatrizVideo.jsx` — Wire handlers via `handleZonasFueraChange` from context
- [x] 3.5 `src/componentes/MatrizVideo.module.css` — Remove `.zonasColumn`, `.zonasRow`, `.zonasLabel`, `.zonasSelect`
- [x] 3.6 `src/componentes/MatrizVideo.module.css` — Add `.zonasFueraGrid` (repeat(auto-fill, minmax(300px,1fr)), gap 1rem)
- [x] 3.7 `src/componentes/MatrizVideo.module.css` — Add `.zonaCard` styles

## Phase 4: Tests ✅ PR 2

- [x] 4.1 `src/componentes/MatrizVideo.test.jsx` — Remove 10 zone keys from `initialTvs`
- [x] 4.2 `src/componentes/MatrizVideo.test.jsx` — Add `zonasFueraState` + `handleZonasFueraChange` to context mocks
- [x] 4.3 `src/componentes/MatrizVideo.test.jsx` — Test: "renders 10 zona cards with zone labels from ZONE_LABELS"
- [x] 4.4 `src/componentes/MatrizVideo.test.jsx` — Test: "video click calls handleZonasFueraChange with zoneId, 'video', deviceId"
- [x] 4.5 `src/componentes/MatrizVideo.test.jsx` — *(No audio buttons in simplified design — link toggle handles audio sync)*
- [x] 4.6 `src/componentes/MatrizVideo.test.jsx` — Test: "link toggle calls handleZonasFueraChange with link type"
- [x] 4.7 Run `pnpm run build` — ✅ passes (231 modules)

## Phase 5: Verification ✅ PR 2

- [x] 5.1 Verify `joinMultipleTVs` no longer includes zone mappings (36 instead of 46, verified by test)
- [x] 5.2 `pnpm exec vitest run` — 98/98 tests pass, 10/10 test files pass
- [x] 5.3 `pnpm run build` — clean build, 0 errors
