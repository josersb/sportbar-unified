# Exploration: modelo-dispositivos

## Current State

The application controls a sport bar AV matrix via an Arranger IPEX5000 hardware controller at `192.168.2.254`. It has 8 DirecTV devices (DTV1-DTV8), 30+ TVs, and 3 audio zones. All state lives in a single React Context (`Contexto.jsx`) persisted to localStorage as JSON with zero versioning or migration.

## State Structure (Contexto.jsx — `estadoInicial`)

```
estado = {
  decos: [                         // Array[8] — hardcoded, ordered
    { nombreDeco: "DTV1", canalDeco: "1603" },
    { nombreDeco: "DTV2", canalDeco: "1604" },
    { nombreDeco: "DTV3", canalDeco: "1605" },
    { nombreDeco: "DTV4", canalDeco: "1608" },
    { nombreDeco: "DTV5", canalDeco: "1621" },
    { nombreDeco: "DTV6", canalDeco: "1629" },
    { nombreDeco: "DTV7", canalDeco: "1631" },
    { nombreDeco: "DTV8", canalDeco: "1644" },
  ],
  favoritos: [1603,1604,1605,1608,1609,1610,1612,1613,1614,1620,1621,1622,1623,1625,1628,1629,1631,1639,1644,1677],
  tvs: {                           // Object — 33 keys total
    VWN: "DTV1", VWC: "DTV1", VWS: "DTV1",              // Video Walls (3)
    TV01..TV26: "DTV1",                                  // Numbered TVs (26)
    TVRACK: "DTV1",                                      // Monitoring TV (1)
    TvsBarraLivertador: "DTV542",                        // Aggregation groups (7)
    TvsBarraSur: "DTV5432",
    TvsBarraPista: "DTV542",
    TvsBarraNorte: "DTV5432",
    TvsEscaleraNorte: "DTV1234",
    TvsEscaleraCentro: "DTV1234",
    TvsEscaleraSur: "DTV1234",
  },
  audio: [                         // Array[3]
    { nombreZona: "Sur", fuenteAudio: "DTV1", volumen: "-21", mute: false },
    { nombreZona: "Centro", fuenteAudio: "DTV1", volumen: "-23", mute: false },
    { nombreZona: "Norte", fuenteAudio: "DTV1", volumen: "-21", mute: false },
  ],
  descripcionPreset: [             // Array[5]
    { preset1: "ingresar descripción" },
    { preset2: "ingresar descripción" },
    { preset3: "ingresar descripción" },
    { preset4: "ingresar descripción" },
    { preset5: "ingresar descripción" },
  ],
}
```

**Context Provider (App.jsx vs Contexto.jsx):**
- `Contexto.jsx`: Defines `estadoInicial`, creates Context, initializes Preset1-5 in localStorage (module-level side effect), exports `ProviderUser` and `ContextoUser` (default).
- `App.jsx`: Reads `estadoApp` from localStorage (or falls back to `estadoInicial`), creates `useState`, auto-saves on every state change via `useEffect`. Provides 4 mutator functions: `handleChangeEstadoDecos`, `handleChangeEstadoAudio`, `handleChangeEstadoVideo`, `handleChangeEstadoPreset`.

## localStorage Format

| Key | What | When Written |
|-----|------|-------------|
| `estadoApp` | Full `estado` object (JSON) | On every state change (useEffect in App.jsx) |
| `estadoApp_Preset1` | Full `estadoInicial` (JSON) | Created at module init if missing; overwritten by MatrizPreset save |
| `estadoApp_Preset2` | Same | Same |
| `estadoApp_Preset3` | Same | Same |
| `estadoApp_Preset4` | Same | Same |
| `estadoApp_Preset5` | Same | Same |

**Critical details:**
- No version field, no migration logic, no validation on load
- If `estado.decos` structure changes, ALL 6 stored keys become invalid on next load
- `App.jsx` line 7-9: `JSON.parse(localStorage.getItem("estadoApp"))` — if this parses old format, app renders with wrong data shape
- Preset save: `localStorage.setItem("estadoApp_Preset1", JSON.stringify(estado))` — saves FULL estado, not just tvs

## arrangerApi.js — Function Map

| Function | Signature | Purpose | Callers |
|----------|-----------|---------|---------|
| `sendArrangerCommand` | `(command, options?)` | Generic HTTP GET to Arranger | Internal only |
| `assignSourceToDestination` | `(source, destination)` | Single join av command | MatrizVideo.jsx (8 handler funcs: handleBtnDTV1..8) |
| `joinMultipleTVs` | `(mappings)` | Sequential join av for array | MatrizVideo.jsx (onSubmit), MatrizPreset.jsx (handleCargaMatriz) |
| `sendSerialCommand` | `(device, command)` | Send serial to Tesira DSP | Audio.jsx (9 calls, ALL with device="DTV1") |
| `loadChannelPreset` | `(decoNumber, channel)` | preset load decoNcanalXXXX | Canales.jsx (submitCanal) |
| `buildArrangerCommand` | `(command, ...args)` | Build command string | Internal (used by assignSourceToDestination) |

**Key insight for Audio.jsx:** The 9 `sendSerialCommand("DTV1", ...)` calls use "DTV1" as the **serial gateway device name** (Tesira DSP processor), NOT a DirecTV decoder. This is the Arranger's name for the RS-232 port connected to the audio processor. Renaming would require hardware reconfiguration.

## Component Dependencies

| Component | Contexto imports | arrangerApi imports | Would need changes? |
|-----------|-----------------|---------------------|---------------------|
| **App.jsx** | ProviderUser, estadoInicial | None | YES — defines state shape, localStorage load/save |
| **Canales.jsx** | ContextoUser (estado, handleChangeEstadoDecos) | loadChannelPreset | YES — DTV dropdown (hardcoded), submitCanal uses parseInt("DTVx") |
| **MatrizVideo.jsx** | ContextoUser (estado, handleChangeEstadoVideo) | joinMultipleTVs, assignSourceToDestination | YES — 8 handler funcs, switch/case blocks, all selects |
| **MatrizPreset.jsx** | ContextoUser (estado, handleChangeEstadoVideo, handleChangeEstadoPreset) | joinMultipleTVs | LIKELY — saves full estado to localStorage, reads tvs from preset |
| **Audio.jsx** | ContextoUser (estado, handleChangeEstadoAudio) | sendSerialCommand | MAYBE — DTV dropdowns, fuenteAudio values use DTV strings |
| **Aside.jsx** | ContextoUser (estado) | None | YES — renders 8 hardcoded li items from decos array, CSS color map |
| **Body.jsx** | None | None | NO — pure routing |
| **server/server.js** | None | None | NO — Express static server |

## Canales.jsx — Channel Change Flow (deep trace)

```
submitCanal(e):
  1. e.preventDefault()
  2. canal = inputRef.current.value               // user-typed number
  3. Validates: canal in favoritos && 100 <= canal <= 2000
  4. selectedDeco = selectRef.current.value       // "DTV1".."DTV8" (hardcoded <option>)
  5. decoNumber = parseInt(selectedDeco.replace("DTV", ""), 10)  // 1..8
  6. decos[decoNumber - 1].canalDeco = canal      // MUTATES array in place!
  7. await loadChannelPreset(decoNumber, canal)    // Arranger API call
  8. handleChangeEstadoDecos(decos)               // Triggers re-render
```

The mapping `decoNumber - 1` → array index implicitly assumes array order matches number sequence. DTV7 and DTV8 are NOT DirecTV decoders (they're encoder and streaming device), but the code treats them identically.

## MatrizVideo.jsx — DTV Handlers

8 identical handler functions (handleBtnDTV1..handleBtnDTV8), each:
```
const handleBtnDTV1 = async () => {
  await assignSourceToDestination("DTV1", "TVRACK");
  tvs.TVRACK = "DTV1";
  handleChangeEstadoVideo(tvs);
};
```

The onSubmit uses a hardcoded 29-entry mappings array combining 3 VWs + 26 TVs. The switch/case blocks (Livertador, Sur, Pista, Norte, Escalera) decode pseudo-identifiers like "DTV5432" into individual TV assignments — these reference real DTV1-DTV5 strings.

## Aside.jsx — Deco Display

- Renders 8 `<li>` items directly from `estado.decos[0..7]`
- Each has hardcoded `style={{ backgroundColor }}` — color per position, NOT per device
- `refreshEstadoAudioVideo()` sets CSS custom properties: `--TV01` through `--TV26`, `--ANorte/Centro/Sur`, `--VWN/WC/WS`
- These map to CSS variables `--DTV1` through `--DTV8` defined in Aside.css `:root`
- **Commented-out code**: manually fetches `preset load deco1canal${decos[0].canalDeco}` etc. using array index (not API function)

## Aside.css — CSS Custom Properties

```css
:root {
  --DTV1: #ef9a9a;   /* red light */
  --DTV2: #ec407a;   /* pink */
  --DTV3: #7e57c2;   /* purple */
  --DTV4: #42a5f5;   /* blue */
  --DTV5: #66bb6a;   /* green */
  --DTV6: #ffee58;   /* yellow */
  --DTV7: #ffca28;   /* amber */
  --DTV8: #bdbdbd;   /* gray */
  /* + 33 TV/VW/Audio custom properties all default to white */
}
```

TVs get colored via `r.style.setProperty('--${key}', 'var(--${value})')` where value is a DTV string that maps to one of the 8 colors above.

## Test Coverage

| Test | Coverage | Would break? |
|------|----------|-------------|
| **Canales.test.jsx** | submitCanal for all 8 DTVs (parameterized), validates loadChannelPreset called with correct decoNumber | YES — hardcodes 8-element array, DTV1-DTV8 strings |
| **MatrizVideo.test.jsx** | All 8 TVRACK buttons, onSubmit 29 mappings, error handling (reject vs resolve) | YES — uses DTV1-DTV8 strings as tvs values |
| **MatrizPreset.test.jsx** | Preset 1 load → 29 mappings, reload, error resilience | LIKELY — loads presetState from localStorage, uses DTV1-DTV8 strings |
| **Audio.test.jsx** | 9 sendSerialCommand calls with expected params | MAYBE — uses DTV1-DTV8 strings for fuenteAudio |
| **arrangerApi.test.js** | joinMultipleTVs, sendSerialCommand encoding, loadChannelPreset URL format | NO — only tests API functions, not state shape |
| **Select.test.jsx** | Basic render test | NO |

## Approaches

### 1. Typed Device Registry (Recommended)
Replace `estado.decos` with a `dispositivos` registry where each device has a `type`, `name`, `capabilities[]`, and type-specific fields. Keep `nombreDeco` and `canalDeco` as backward-compatible aliases.

- **Pros**: Clean separation of DirecTV decoders vs encoder vs streaming. Capabilities drive UI behavior (e.g., only show channel change for `canChangeChannel`). Extensible for new device types. Backward-compatible migration path via localStorage versioning.
- **Cons**: Requires updating every component. More initial design work. Tests need significant rewrites.
- **Effort**: Medium-High

### 2. Add Type Field to Existing Array
Keep the array but add `tipo: "deco" | "encoder" | "streaming"` and `capacidades: []` to each object. Minimal structural change.

- **Pros**: Smaller diff. Fewer component changes. Tests easier to update.
- **Cons**: Still array-index dependent. Doesn't truly separate concerns. DTV7/DTV8 still live in same array. No registry concept.
- **Effort**: Low-Medium

### 3. Full Device Registry + Map Key
Replace array with an object/map `{ "DTV1": { type, capabilities, ... }, "DTV2": ... }`. Access by key, not index.

- **Pros**: No array-index coupling. Extends naturally. Key-based access is explicit.
- **Cons**: Most disruptive to existing code. All `decos[i]` accesses need rewriting. More files changed.
- **Effort**: High

## Recommendation

**Approach 1 — Typed Device Registry**. Add a `dispositivos` field to estado (keeping `decos` temporarily for migration), implement a localStorage version key, and provide a migration function that converts old `estado.decos` arrays to the new registry on load. This gives us the clean architecture without breaking existing installations on first load.

## Risks

- **localStorage corruption**: If migration is buggy, all 6 stored keys become unreadable. Mitigation: implement version key (`estadoApp_version`) and migration with fallback to `estadoInicial`.
- **Hardware coupling**: Device names ("DTV1", "DTV7", etc.) are hardcoded in the Arranger hardware configuration. Changing them in software without updating the Arranger config would break `join av` commands. Mitigation: keep Arranger-facing names as-is, just change how the app represents them internally.
- **Audio serial gateway**: The 9 `sendSerialCommand("DTV1", ...)` calls use "DTV1" as a serial gateway — renaming it could break audio control. Mitigation: document this explicitly and consider a dedicated serial gateway identifier.
- **Test churn**: 4 of 6 test files need significant updates. Mitigation: update tests incrementally alongside code changes, not all at once.
- **Preset compatibility**: Old presets saved with the old structure won't load. Mitigation: migration function handles old-format presets too.

## Ready for Proposal

**Yes** — the codebase has been fully explored. All dependencies, risks, and affected files are mapped. The orchestrator should proceed to `/sdd-continue modelo-dispositivos` to create the proposal.
