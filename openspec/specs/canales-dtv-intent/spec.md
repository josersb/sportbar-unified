# canales-dtv-intent Specification

## Purpose

Intención de canal DTV persistida en el servidor como `desired` (`canalActual` + `lastSentAt` + ACK del controlador), sin `reported` de canal (no verificable), con rehidratación al startup y broadcast SSE.

## Requirements

### Requirement: CD-1 — Intención server-side con ACK del controlador

El servidor MUST persistir la intención de canal DTV como `{ canalActual, lastSentAt, ack }`. `ack` MUST reflejar el resultado del controlador (`send ir success`): `accepted` o `rejected`. El sistema MUST NOT modelar `reported` de canal (no verificable contra el deco).

#### Scenario: Intención aceptada

- GIVEN el controlador responde `send ir success`
- WHEN se cambia el canal
- THEN `ack` se persiste como `accepted` con `lastSentAt`

#### Scenario: Intención rechazada

- GIVEN el controlador rechaza el comando IR
- WHEN se cambia el canal
- THEN `ack` se persiste como `rejected`

### Requirement: CD-2 — Reenvío del canal vigente sin emitir IR

Si la intención entrante es el mismo `canalActual` ya sintonizado, el servidor MUST responder "canal ya sintonizado" y MUST NOT emitir IR.

#### Scenario: Mismo canal vigente

- GIVEN `canalActual` ya es el canal X
- WHEN un cliente reenvía el canal X
- THEN se responde "canal ya sintonizado" sin emitir IR

### Requirement: CD-3 — Cambio de canal con feedback

Al cambiar a un canal distinto, el sistema MUST emitir IR y responder "cambiando al canal X".

#### Scenario: Cambio de canal

- GIVEN `canalActual` es X y se pide el canal Y
- WHEN el servidor procesa
- THEN emite IR y responde "cambiando al canal Y"

### Requirement: CD-4 — Fallo del controlador

Si el controlador falla al emitir IR, el sistema MUST responder "error al cambiar canal, volvé a intentar".

#### Scenario: Fallo de controlador

- GIVEN el controlador no confirma `send ir success`
- WHEN se cambia el canal
- THEN se responde error y se invita a reintentar

### Requirement: CD-5 — Rehidratación y broadcast

El servidor MUST rehidratar la intención persistida al arrancar y MUST emitirla en el snapshot y en eventos SSE a los clientes.

#### Scenario: Intención sobrevive reload y segundo cliente

- GIVEN una intención de canal persistida
- WHEN otro cliente conecta o el actual recarga
- THEN recibe `canalActual` desde el servidor vía SSE
