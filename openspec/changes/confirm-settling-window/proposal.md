# Proposal: Ventana de confirmación por comando (settling Arranger v1.3.4)

## Intent

Los writes a TVRACK y zonas-fuera quedan sin confirmar en el primer ciclo: el log emite `[STORE w-N] SKIP setReported ... unconfirmed` en 65 de 337 writes de producción (19%), y `reported` converge recién por el re-read postergado (3 s/9 s). No hay corrupción —el sistema nunca guarda un read stale— pero el `reported`/UI lagea y el log se ensucia.

Causa raíz: `confirmEncoder` (`server/server.js:224-240`) lee `get encoder` 3 veces dentro de ~1,5 s (backoff 250/500/750 ms). El firmware v1.3.4 refleja el join recién tras el settling, medido en hardware (39/39 trials, determinístico ±20 ms): `join av` ~3340 ms, `join video`/`join audio` ~2300 ms. La ventana corta antes del settle → siempre stale en destinos aislados (en TVs no se ve por la congestión del semáforo global).

## Scope

### In Scope
- Parametrizar la ventana de confirmación de `confirmEncoder` según el comando de join (`join av` vs `join video`/`join audio`).
- Mantener un primer read rápido para el caso no-op/ya-settleado.
- Centralizar las constantes de settling como valores nombrados.

### Out of Scope
- No cambiar el re-read postergado 3 s/9 s ni el reconciler (se mantienen como fallback).
- No tocar el dispatch por dominio/sub/link (WR-2) ni el semáforo global del `arrangerClient`.
- No introducir configurabilidad runtime ni endpoints nuevos.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `state-broker`: la confirmación post-join (`get encoder` → `reported`) cambia de una ventana fija de ~1,5 s a una ventana por tipo de comando, con primer read rápido para no-op.

## Approach

`confirmEncoder` recibe la política de tiempos según el comando emitido: primer read inmediato (~0,2 s) y reintentos que cubren el settling medido con margen (≥0,3 s sobre el máximo) — ventana mayor para `join av`, menor para `join video`/`join audio`. Si confirma, corta y guarda `reported`; si agota, mantiene el contrato actual (`confirmed: false`, sin envenenar) y delega al re-read/reconciler. No se altera la firma de estado ni la semántica de confirmación.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `server/server.js` (`confirmEncoder` L224-240 y callers de `executeWrite`) | Modified | Ventana de confirmación por tipo de join |
| `openspec/specs/state-broker/spec.md` | Modified | Delta en el requirement de confirmación post-join |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mayor latencia del endpoint de escritura al esperar el settling | Med | Primer read rápido evita la espera en no-op; el semáforo ya serializa |
| Constantes atadas al firmware v1.3.4 (cambio de firmware las invalida) | Med | Valores nombrados y medidos; re-medición documentada |
| Menor throughput en batches por ocupar el semáforo más tiempo | Low | Ventana solo se agota en destinos aislados; TVs ya esperaban por congestión |

## Rollback Plan

Revertir el commit del cambio. Restaura la ventana fija de ~1,5 s. El comportamiento previo (degradado pero honesto: re-read 3 s/9 s + scan del reconciler a 5 min) queda intacto, sin migración de datos ni estado persistido a corregir.

## Dependencies

- Hardware Arranger v1.3.4 (medición de settling 39/39).
- Evidencia Engram: #933 (análisis de logs), #937 (root-cause TVRACK), #938 (settling medido).

## Success Criteria

- [ ] Writes a TVRACK y zonas-fuera con `join av` confirman dentro de la ventana; `unconfirmed` baja de ~19% a ~0 en el mismo escenario.
- [ ] `reported` converge sin depender del re-read 3 s/9 s.
- [ ] El caso no-op/ya-settleado sigue confirmando con el primer read rápido.
