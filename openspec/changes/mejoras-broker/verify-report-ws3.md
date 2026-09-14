# Verify Report: WS3 — canales-dtv-intent (mejoras-broker)

Fecha: 2026-09-14 · Rama WS3a: `feat/mejoras-broker-ws3a` (base `feat/mejoras-broker-ws2`) · Rama WS3b: `feat/mejoras-broker-ws3b` (base `feat/mejoras-broker-ws3a`) · Worktree: `sportbar-unified-worktrees/mejoras-broker`

Verificación independiente (no se confió en apply-progress): lectura de specs + código diff `ws2..ws3a` y `ws3a..ws3b`, ejecución real de tests y verifies en ambas ramas.

## WS3a — server (commits `1280aff`, `490b031`)

**Tests ejecutados**

| Comando | Resultado |
|---|---|
| `pnpm test` | ✅ 192/192 tests, 15 archivos (idéntico a WS2: sin regresiones) |
| `node server/broker/verify/run-all.cjs` | ✅ exit 0 — TODAS LAS VERIFICACIONES PR 1 + PR 2 PASARON |

Verifiers confirmados en la salida: vite-proxy, destinations, mock, arranger-client, semaphore, store (con backfill `channelIntent`), eventbus, writequeue, reconciler, write-confirm, **confirm-settling** (PR #13 intacto: ventanas av/stream, no-op, unconfirmed, congestión, join-fail, guard ≥300ms), **channel-intent** (nuevo), composition.

**Requirements verificados (canales-dtv-intent: 5/5 requirements, 6/6 scenarios)**

- **CD-1 Intención con ACK** ✅ — `POST /api/decos/:id/channel` persiste `{canalActual, lastSentAt, ack:"pending"}` (server/server.js:886-895); `POST /api/decos/:id/channel/ack` persiste `accepted`/`rejected` y conserva canal/lastSentAt (merge en `setChannelIntentEntry`, store.js). `reported` queda en `null` SIEMPRE (verify escenario E: dominio y snapshot con `reported === null`). Scenarios *Intención aceptada* (B) e *Intención rechazada* (C) ✅.
- **CD-2 Mismo canal → no-op sin IR** ✅ — noop con `reason:"canal ya sintonizado"`, sin bump de versión, `lastSentAt` intacto, el cliente no envía dígitos (verify escenario D).
- **CD-3 Cambio con feedback** ✅ — `message:"cambiando al canal X"`, versión bumpada, broadcast emitido (verify escenario A).
- **CD-4 Fallo del controlador** ✅ (server-side) — ACK `rejected` persistido con canal/lastSentAt conservados (verify escenario C). El mensaje "error al cambiar canal, volvé a intentar" es responsabilidad del cliente (verificado en WS3b).
- **CD-5 Rehidratación y broadcast** ✅ — dominio en snapshot `/api/broker/state` con `versions.channelIntent` (F1); segundo server expone la intención persistida tras reload (F2); broadcast por eventBus (H). El SSE incremental genérico (snapshot+incremental) está verificado en verify-eventbus y verify-composition con clientes SSE reales.

**state-broker (parte WS3)** ✅ — "Intención de canal es app-only": el reconciler solo arbitra tvs/tvrack/zonasFuera; nada consulta ni pisa `channelIntent` desde el Arranger; `reported: null` estructural (patrón `presets`). Backfill idempotente `normalizeV3` para state v3 pre-WS3 sin bump ni backup (verify-store extendido, +43 líneas).

**sync-broadcast (parte WS3)** ✅ — `channelIntent` incluido en snapshot (`/api/broker/state` y diff `?since`, server.js:719-724) y en `broadcastDomain` (payload = `desired`, nunca reported null).

## WS3b — client (commits `94f0bef`, `01636da`)

**Tests ejecutados**

| Comando | Resultado |
|---|---|
| `pnpm test` | ✅ 196/196 tests, 15 archivos (+4 WS3 en `Canales.test.jsx`) |
| `node server/broker/verify/run-all.cjs` | ✅ exit 0 |
| `pnpm run build` | ✅ exit 0 (built in 6.43s) |

**Requirements verificados**

- **canales-dtv-intent CD-1..CD-4 (lado cliente)** ✅ — `Canales.jsx`: write-through `setChannelIntent` ANTES de emitir IR; noop → toast "canal ya sintonizado" y `return` sin IR ni ACK (CD-2); cambio → toast "cambiando al canal X" + `sendChannelDigits` (IR client-side intacto) + ACK `accepted`; fallo del IR → ACK `rejected` + toast "error al cambiar canal, volvé a intentar" (CD-4). Tests: 4 nuevos (intención+IR+accepted; noop sin IR; rejected con toast; fallo del POST sin IR ni ACK).
- **ux-feedback UXF-1** ✅ 4/4 scenarios — canal ya sintonizado (info), cambiando al canal X (info), fallo del controlador (error), canal inválido (warning, ya verificado en WS2, sigue pasando).
- **ux-feedback UXF-2** → **fuera de alcance**: "sin cambios"/"forzar reenvío" es WS5 (T-5.4), verificado en su propio slice.
- **CD-5 rehidratación cliente** ✅ — `rehydrateDecosFromIntent` (brokerClientCore.js:623-663) con precedencia server sobre `decos` y `dispositivos`, invocada desde `App.jsx` en cada snapshot (incluye eventos SSE → `applyStateEvent` con `DESIRED_KEY_DOMAINS` para `channelIntent`); `DOMAIN_KEYS` extendido (:21).
- **sync-broadcast (cliente)** ✅ — el evento incremental `channelIntent` se aplica al snapshot del cliente (desired-key correcto).

**Regresiones**

- `verify-confirm-settling` (PR #13) verde en ambas ramas ✅
- WS2 intacto: 192 tests base + 14 de canalesFavoritos pasando; drift de `estado.favoritos` sin cambios.
- Secuencia IR: `sendChannelDigits`/`IR_CODES`/fallback `"2"`→`loadChannelPreset` sin tocar (diff ws3b no los modifica).
- Pseudo-canales `0000/0000A/0000B`: siguen sin poder ejecutarse — input `type="number"` (Canales.jsx:91) los normaliza/bloquea. Decisión de referencia respetada ✅.
- Server: `confirmEncoder`, ventana de settling y writeQueue sin modificaciones.

## Findings

- **SUGGESTION** — No existe un test que suscriba un cliente SSE real y afirme la recepción del evento incremental `channelIntent` específicamente (verify-channel-intent escenario H valida la publicación al bus; el consumo SSE incremental real se verifica genéricamente en verify-eventbus/verify-composition con tvs/tvrack/zonasFuera). Riesgo bajo: mismo camino de código que los dominios ya probados. Evidencia: server/broker/verify/verify-channel-intent.cjs:19.
- **SUGGESTION** — En `ws3a` aislado, `apply-progress.md` y `tasks.md` seguían marcando WS3 como pendiente (quedó documentado recién en `01636da` de ws3b). Artefactual, no de código; corregido en la punta de la cadena.
- **OBSERVACIÓN (no defecto)** — `Canales.jsx` hace optimistic update local del canal antes del POST; si el POST falla, la UI muestra el canal nuevo hasta que el snapshot/SSE (precedencia server) lo revierte. Consistente con el diseño app-only/server-owned declarado en design.md.
- **NO VERIFICABLE SIN HARDWARE** — IR real contra el Arranger (`send ir success` físico), comportamiento real del deco y settling físico: todo lo verificado corre contra el mock. No se golpeó el Arranger real (restricción respetada). `VITE_MOCK_ARRANGER=1` requerido para replicar.

## Clasificación

- CRITICAL: ninguno.
- WARNING: ninguno.
- SUGGESTION: 2 (cobertura SSE específica de channelIntent; sincronización de artefactos entre ramas de la cadena).

## Veredicto

**PASS** — WS3a y WS3b verificados. CD-1..CD-5 completos, UXF-1 completo, app-only respetado, PR #13 intacto, sin regresiones. Ready-for-archive (junto con el resto del change cuando completen WS4/WS5/WS1).
