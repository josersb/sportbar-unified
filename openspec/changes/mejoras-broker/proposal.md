# Proposal: mejoras-broker

## Intent

Cinco mejoras al subsistema broker/MatrizVideo: un bug bloqueante de canal (WS2), pérdida de intención del operador entre sesiones/dispositivos (WS3/WS4), exceso de comandos no-op al Arranger (WS5) y una identidad de dispositivo dudosa (WS1). Valor: operación multi-cliente confiable y menor carga sobre el hardware serial.

## Scope

### In Scope
- WS2 (quick win): fuente única de favoritos + feedback de rechazo.
- WS3: intención de canal DTV server-side (`canalActual` + `lastSentAt` + ACK) con rehidratación y toasts.
- WS4: grupos server-authoritative, write-through, broadcast; cliente read-only.
- WS5: dedupe de "Enviar" (cliente + server) con escape explícito "forzar".
- WS1: auditoría read-only de "aMas15-Vwall-Libertador" en el Arranger real (`get devices all`).

### Out of Scope
- WS1: writes a hardware o asumir identidad sin evidencia; si resulta un VW nuevo no modelado → change aparte.
- Confirmar el canal contra el deco (imposible en API V210826).
- Alterar la ventana de settling de PR #13.

## Capabilities

### New Capabilities
- `canales-favoritos`: allowlist única de canales + validación con feedback (WS2).
- `canales-dtv-intent`: intención de canal DTV server-side (WS3).
- `matrix-groups-state`: grupos server-authoritative + resolución de preset server-side (WS4).

### Modified Capabilities
- `state-broker`: appOnly de canal (WS3), `matrixGroups` (WS4), dedupe en `executeWrite` + `lastBatch` (WS5).
- `sync-broadcast`: emisión/rehidratación SSE de los dominios appOnly nuevos para clientes read-only (WS3/WS4).
- `zonas-fuera-state`: coherencia de intención server-authoritative y dedupe de writes de zona (WS4/WS5).
- `ux-feedback`: toasts de rechazo/intención/no-op y escape "forzar" (WS2/WS3/WS5).

## Approach

- **WS2**: derivar allowlist de `CANALES_FAVORITOS` (Set de `ch.canal`) y validar contra ella; toast en el camino inválido; reconciliar drift de `estado.favoritos`.
- **WS3**: dominio server-side como intención `{ canalActual, lastSentAt, ack }`; ACK = controlador (`send ir success`), NO el deco; rehidratar `estado.dispositivos` desde `snapshot.appOnly` con precedencia server; SSE. Toasts: "canal ya sintonizado", "cambiando al canal X", "error al cambiar canal, volvé a intentar".
- **WS4**: `appOnly.matrixGroups` canónico; write-through + broadcast; cliente read-only; el valor de la lista ante carga de preset lo resuelve SOLO el server.
- **WS5**: dedupe cliente pre-POST (`tvs[dest] === source`) + server en `executeWrite` antes del join (no-op contra `reported` confirmado + `isBusy`) + `lastBatch`; sin tocar `confirmEncoder`; escape "forzar reenvío".
- **WS1**: verificación read-only en Arranger real, sin writes.

Orden: WS2 → WS3 → WS4 → WS5 → WS1. Delivery `auto-chain`, PRs encadenados (stacked-to-main a confirmar), presupuesto 400 líneas/PR.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/componentes/Canales.jsx`, `src/data/canalesFavoritos.js` | Modified | WS2 fuente única + toast |
| `src/App.jsx`, `src/api/arrangerApi.js` | Modified | WS3 intención + rehidratación |
| `src/componentes/MatrizVideo.jsx`, `src/hooks/brokerClientCore.js` | Modified | WS4/WS5 grupos + dedupe |
| `server/server.js`, `server/broker/store.js` | Modified | WS3/WS4/WS5 appOnly + executeWrite |
| `API commands/devices_all.txt` | Read-only | WS1 auditoría |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No-op falso por `reported` stale (one-join-lag) | Med | Dedupe solo contra confirmado + escape "forzar" |
| Regresión PR #13 (settling window) | Med | No tocar `confirmEncoder`; guard pre-join aislado |
| Hardware real / bar abierto | Med | Verify con `VITE_MOCK_ARRANGER=1`; WS1 read-only |
| Doble fuente de verdad (favoritos/grupos/canal) | Med | Fuente única server-side por dominio |
| Typo `Livertador` confundido con entidad nueva | Bajo | WS1 audita antes de modelar |

## Rollback Plan

Cada slice es un PR autónomo: `git revert` individual. WS3/WS4 degradan al comportamiento actual si el server no emite el dominio (cliente conserva fallback local). WS5 se desactiva removiendo el guard pre-join, sin afectar `confirmEncoder`.

## Dependencies

- PR #13 (`confirm-settling-window`) ya en `v2` — no romper.
- Mocks de Arranger operativos para verificar sin hardware.

## Success Criteria

- [ ] WS2: canal 1624 aceptado; canal inválido muestra toast, sin reset silencioso.
- [ ] WS3: `canalActual` sobrevive reload y segundo cliente; UI dice "último canal enviado".
- [ ] WS4: selección sobrevive reload/segundo cliente; preset resuelto server-side.
- [ ] WS5: submit sin no-ops; "forzar" reenvía; ventana PR #13 intacta.
- [ ] WS1: identidad documentada con evidencia; cero writes.
