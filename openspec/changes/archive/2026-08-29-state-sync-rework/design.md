# Design: state-sync-rework — State Broker

## Technical Approach

Express pasa de "passthrough + store" a **State Broker**: dueño canónico del estado en lowdb v3, modelo `desired`/`reported`, escrituras serializadas por destino con confirmación `get encoder`, reconciliación auto-adopt server-side y broadcast SSE. El cliente React consume SSE y deja de tocar el Arranger. Presets = snapshot completo `{tvs, zonasFuera, tvrack}`. Server dividido en `server/broker/` (CommonJS); `server.js` = composition root.

## Architecture Decisions

| Decisión | Opciones | Tradeoff | Elegida |
|---|---|---|---|
| Organización server | 1 archivo vs módulos `broker/` | single-file 545 líneas, +broker lo duplicaría | **Módulos `server/broker/`** |
| Reconexión SSE | Last-Event-ID + replay vs snapshot siempre | replay = buffer por cliente; snapshot simple | **Snapshot en cada (re)connect** |
| Escritura cliente | optimistic + rollback vs confirmed-only | optimistic reintroduce las races originales | **Confirmed-only** |
| Carga preset | cliente itera joins vs server-side load | cliente = 29 requests, BATCH 8 duplicado | **`POST /api/presets/:n/load`** |
| Token Arranger | `VITE_` vs `ARRANGER_` | hoy línea 20 vs 460 divergen (gap 2) | **`VITE_ARRANGER_TOKEN \|\| ARRANGER_TOKEN`**, fail-fast |
| Nomenclatura VW | 3 maps cliente vs 1 server | VW_REVERSE/VW_FORWARD/vwDestNames duplican | **`destinations.js` único** |
| Disparo scan | solo startup+manual vs interval | sin interval no hay convergencia continua | **startup + 60s**, single-flight |
| Persistencia | lowdb vs SQLite | LAN aislada, 2-3 clientes | **lowdb v3** |

## Data Flow

```
Cliente ──POST /api/tvs/:id──▶ writeQueue(dest) ──▶ Arranger (join + get encoder)
   ▲                            │ (confirma)                    │
   └─ SSE /api/stream ◀─ eventBus ◀─ store lowdb v3 (desired/reported) ◀┘
                                  ▲
      reconciler (60s scan, auto-adopt solo lectura confirmada) ─┘
```

## File Changes

| File | Acción | Descripción |
|---|---|---|
| `server/broker/store.js` | Create | Schema v3, escrituras versionadas, migración v3 |
| `server/broker/destinations.js` | Create | 40 destinos canónicos + mapa VW-*↔VW* |
| `server/broker/arrangerClient.js` | Create | `getEncoder`/`join` con retry; switch mock |
| `server/broker/writeQueue.js` | Create | Cola FIFO por destino (`Map<key,Promise>`) |
| `server/broker/reconciler.js` | Create | Scan batch 4, buildDiffs (del hook), auto-adopt, single-flight |
| `server/broker/eventBus.js` | Create | EventEmitter + hub SSE (heartbeat 25s, máx 10 conexiones) |
| `server/broker/mockArranger.js` | Create | Mock con modos normal/blip/offline |
| `server/server.js` | Modify | Compone módulos; token único; rate limiters; endpoints |
| `src/hooks/useBrokerState.js` | Create | SSE + fallback poll (onerror/heartbeat 25s → poll 5s, backoff→30s) |
| `src/hooks/useArrangerReconciliation.js` | Delete | Reemplazado por reconciler server-side |
| `src/App.jsx` | Modify | Elimina 3 polls, persist, batch apply, refs de parche; sin join cliente |
| `src/contexto/Contexto.jsx` | Modify | Quita keys legacy; `syncStatus` estable |
| `src/api/arrangerApi.js` | Modify | Quita dead code; setters → broker |
| `src/componentes/MatrizVideo.jsx` | Modify | Quita 4º fetch tvrack; escrituras vía broker |
| `src/componentes/SyncPanel.jsx` | Modify | Indicador, sin Apply/Ignore |
| `src/componentes/Header.jsx` | Modify | Tab sync enum |
| `src/hooks/usePreset.js` + `MatrizPreset.jsx` | Modify | Snapshot completo; load server-side |
| `vite.config.js` | Modify | Proxy `/api/stream`,`/api/broker`,`/api/tvs`; quita fallback `/api`→Arranger |

## Interfaces / Contracts

**Broker state** (`GET /api/broker/state`): `tvs`/`tvrack`/`zonasFuera` como `{desired, reported}` (+`link` app-only), `appState`, `presets`, `versions` por dominio, `sync: {status: synced|stale|out_of_sync|offline, lastSync}`.

**Eventos SSE**: `snapshot` (estado completo) · `state` `{domain, payload, version, lastUpdated}` · `sync` `{status, lastSync}`.

**Endpoints**: agregados `GET /api/stream`, `GET /api/broker/state?since=tvs:12,...` (respaldo versionado), `POST /api/app-state` (merge parcial), `POST /api/tvs/:id/source`, `POST /api/presets/:n/load`. Removidos: `GET|POST /api/state`, `GET /api/tvrack/state`, `GET /api/zonas-fuera/state`, `GET /api/matrix/state` (interno), `GET /api/device/:id/status`. Modificados (write-through + await + broadcast): POSTs tvrack/zonas-fuera, presets. Proxy `/api/command/:command/:token` intacto (IR/serial/preset deco).

**Rate limiter**: `/api/stream` sin limiter (máx 10 conexiones) · reads 300/15min · writes 240/15min (serializer acota tráfico real) · proxy sin limiter (bursts IR). Fuera el `stateLimiter` compartido 500/15min.

## Testing Strategy

| Capa | Qué | Cómo |
|---|---|---|
| Unit | N/A — vitest no instalado; tests existentes quedan como referencia | — |
| Integración | Mock Arranger (normal/blip/offline) + escenarios de los 8 specs | manual `pnpm run sportbar:dev` |
| E2E | 2 browsers: propagación <1s, reconexión, preset 3 dominios, fresh-start | manual multi-PC |
| Gate | Build producción | `pnpm run sportbar:build` |

## Threat Matrix

N/A — cambia routing HTTP interno (Express↔Arranger) y agrega SSE, pero no ejecuta shell, subprocesos, automatización VCS/PR, ni clasificación de ejecutables. Ninguna fila aplicable.

## Migration / Rollout

Migración v3 con backup (`state.backup.json`, precedente v2 server.js:143-208): extrae matriz de `state.tvs` → `desired.*`, elimina keys legacy, `reported` vacío lo reconstruye el scan de arranque (fresh-start). Presets viejos migrados con defaults; app-only conservado. **Coexistencia**: migración conjunta, sin shim v1.0. Rollback: revert + backup.

## Open Questions

- [ ] Intervalo del reconciler 60s (~20% duty del Arranger): ¿confirmar o subir a 5min?
- [ ] ¿Eliminar ya los getters FW-locked del cliente (`getStatus`/`getMatrix`/`getJoins`/`leaveAv`) o esperar al merge de firmware?
