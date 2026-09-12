# Design: Ventana de confirmación por comando (settling Arranger v1.3.4)

## Technical Approach

`confirmEncoder` deja de reintentar con backoff fijo (~1,5 s) y pasa a esperar el settling medido del comando de join emitido: un primer read inmediato (fast-path no-op/ya-settleado) y un read definitivo anclado a la ventana del comando. Ventana y margen se centralizan como constantes nombradas; el caller (`executeWrite`) deriva la política del mismo `joinKind` que usa para despachar el comando (única fuente de verdad). Si agota la ventana, mantiene `{ value, confirmed:false }` y el re-read 3 s/9 s + reconciler siguen de fallback (sin cambios). El wait ocurre FUERA del semáforo global: solo los dos reads toman turno.

## Architecture Decisions

| Decisión | Opciones | Tradeoff | Elegida |
|---|---|---|---|
| Constantes de settling | inline mágicas vs nombradas | mágicas no auditables | **`CONFIRM_SETTLE_AV_MS=3700`, `CONFIRM_SETTLE_STREAM_MS=2700`, `CONFIRM_FIRST_READ_MS=200`** |
| Firma | cambiar contrato vs param extra | romper callers | **5º param `policy`; retorno intacto `{value,confirmed}`** |
| Derivación | re-evaluar condición vs single-source | duplicar el branch | **`joinKind` reutilizado por dispatch y política** |
| Reintentos | N backoffs vs 2 reads anclados | backoffs cortos ya probaron fallar | **primer read + read definitivo a la ventana** |
| Test | mock mode nuevo vs cliente fake inyectado | tocar 2º archivo prod | **cliente fake inyectado vía `options.client`** |

Margen: av 3340+360 ms; stream 2302+398 ms (≥300 ms sobre el máximo medido, tolerancia ±20 ms). El primer read ~200 ms cubre el no-op sin esperar el settling.

## Data Flow

```
POST → writeQueue(dest) → executeWrite
  joinKind = (domain==="tvs"||linked) ? "av" : sub==="audio" ? "audio" : "video"
  join(kind) ─▶ client
  confirmEncoder(dest,sub,source,wid, CONFIRM_POLICY[joinKind])
       read#1 (t≈0) ── confirmed? ─▶ {value,confirmed:true}
             └ stale ─ sleep(settleMs - elapsed, piso 200ms) ─ read#2 (t≈ventana)
                       └ confirmed? ─▶ true ; else ─▶ {value,confirmed:false}
  confirmed=false ─▶ scheduleDelayedReRead 3s/9s (sin cambios) ─▶ reconciler 5min
```

Casos límite: (1) read `null`/blip → `confirmed:false`, sin envenenar, fallback re-read; (2) `source===actual` (no-op) → read#1 confirma en <200 ms; (3) semáforo congestionado → read#1 tardío, el read definitivo se ancla al start (nunca antes del settle); (4) múltiples writes al mismo dest → `writeQueue` serializa (última intención gana) y el re-read es single-flight, sin cambios.

## File Changes

| File | Action | Description |
|---|---|---|
| `server/server.js` | Modify | Constantes + `CONFIRM_POLICY`; `confirmEncoder` con `policy`; `executeWrite` deriva `joinKind`/`policy`; `options.client` como seam de test; reenvío de `mockLagSettleMs` a `createArrangerClient` |
| `server/broker/arrangerClient.js` | Modify | Reenvío de `mockLagSettleMs` → `createMockArranger({ lagSettleMs })` (antes nadie plombeaba el option que el mock ya soporta) |
| `server/broker/verify/verify-confirm-settling.cjs` | Create | Verify determinístico sin hardware (cliente fake con settling) |
| `server/broker/verify/run-all.cjs` | Modify | Registrar el verify nuevo (1 línea) |
| `server/broker/verify/verify-write-confirm.cjs` | Modify | Escenario E-b: `mockLagSettleMs: 5000` explícito (lag > ventana av y < re-read) + comentario corregido; Escenario 429: esperar la hidratación de `reported` antes del baseline (race latente expuesta por la ventana av más larga) |

**Desviación justificada**: el design asumía "`verify-write-confirm` intacto", pero la ventana `av` (3700 ms) supera el default de `lagSettleMs` del mock (3000 ms) → el Escenario E-b (oneJoinLag síncrono) confirmaba en vez de quedar `unconfirmed`, rompiendo 6 checks. Se **plombea el option `mockLagSettleMs`** (que `createMockArranger` ya soportaba pero `createArrangerClient`/`createServer` no reenviaban) en lugar de tocar la ventana o subir el default del mock — así el default del mock sigue alineado al firmware real y la ventana queda como design congelado. Además, el Escenario 429 capturaba `reportedBefore` antes de que el scan de arranque del reconciler hidratara `reported` (race latente, no relacionada con el settling): la ventana av más larga la volvió intermitente y se estabilizó esperando la hidratación antes del baseline, sin cambiar la intención del check.

## Interfaces / Contracts

```js
const CONFIRM_SETTLE_AV_MS = 3700;     // join av   3340ms medido + 360ms
const CONFIRM_SETTLE_STREAM_MS = 2700; // join video/audio ~2302ms + 398ms
const CONFIRM_FIRST_READ_MS = 200;     // piso del read definitivo / fast-path
const CONFIRM_POLICY = Object.freeze({
  av:    { settleMs: CONFIRM_SETTLE_AV_MS },
  video: { settleMs: CONFIRM_SETTLE_STREAM_MS },
  audio: { settleMs: CONFIRM_SETTLE_STREAM_MS },
});

// Retorno intacto: { value: string|null, confirmed: boolean }
async function confirmEncoder(dest, sub, source, writeId, policy = CONFIRM_POLICY.video)

// createServer: seam de test (default = cliente real/mock actual)
const client = options.client || createArrangerClient({ token, mock: options.mock, mockMode: options.mockMode, log });
```

Read definitivo: `remaining = Math.max(CONFIRM_FIRST_READ_MS, settleMs - (Date.now()-startMs)); await sleep(remaining); read#2`. Anclar `remaining` al start (post-join) evita que un read#1 tardío por semáforo congestionado adelante el definitivo: si `elapsed ≥ settleMs`, lee enseguida (ya settleado).

Agotado: `confirmed:false`, `reported` NO se toca (contrato vigente) y se agenda `scheduleDelayedReRead` 3s/9s. El re-read no se modifica.

## Testing Strategy

| Capa | Qué | Cómo |
|---|---|---|
| Unit (guard) | margen ≥300 ms vs medido | regex de `CONFIRM_SETTLE_*` sobre `server.js` (patrón `max:600` del 429) |
| Integración | av/stream confirman en ventana; no-op < ventana; settle>ventana → unconfirmed + re-read converge | `verify-confirm-settling.cjs` con cliente fake inyectado |
| Regresión | suite existente | `run-all.cjs` (verify-write-confirm intacto) |

`verify-confirm-settling.cjs` define `createSettleClient({avSettleMs, streamSettleMs})`: envuelve `createArrangerClient({mock:true})` y, por join que CAMBIA el valor, arma `until = now + settleMs` guardando el valor previo; `getEncoder` devuelve el previo hasta `until` (no-op → no arma → read#1 confirma). Escenarios: (A) TV → `join av`, `avSettleMs=3340` → `confirmed:true`, elapsed≥3340; (B) TVRACK `link=false` → `join video`, `streamSettleMs=2302` → confirmed; (C) re-POST del mismo source → no-op, elapsed<ventana; (D) `avSettleMs=5000 > 3700` → `confirmed:false`, reported no envenenado, re-read 3s converge; (E) guard de margen. `reconcilerIntervalMs: 3_600_000` y drain de `writeQueue` antes del cleanup (patrón existente).

Correr (root del worktree, pwsh): `node server/broker/verify/verify-confirm-settling.cjs` o `node server/broker/verify/run-all.cjs`.

## Threat Matrix

N/A — no hay routing, shell, subprocesos, automatización VCS/PR, clasificación de ejecutables ni integración de procesos. Es temporización interna del broker.

## Migration / Rollout

No requiere migración. Rollback: revertir el commit (vuelve a la ventana fija ~1,5 s; re-read/reconciler intactos).

## Open Questions

- [ ] ¿Ventana av 3700/stream 2700 (margen estricto ≥300 ms) o los ~3600/~2600 del ejemplo (margen 260/298 ms)? El design elige el margen estricto.
- [ ] ¿Exponer `options.confirmPolicy` para E2E manual, o dejar las constantes fijas? El test usa cliente fake y no lo necesita.
