# canales-favoritos Specification

## Purpose

Fuente única de verdad para canales favoritos: una allowlist derivada de `CANALES_FAVORITOS` que alimenta tanto la grilla como la validación, con feedback de rechazo y reconciliación de drift.

## Requirements

### Requirement: CF-1 — Allowlist única de canales favoritos

El sistema MUST derivar los canales favoritos de `CANALES_FAVORITOS` como un `Set` de `ch.canal`. La grilla y la validación MUST consumir esa misma allowlist; ninguna vista MAY mantener una lista paralela.

#### Scenario: Grilla y validación comparten allowlist

- GIVEN `CANALES_FAVORITOS` define el canal 1624
- WHEN la grilla se renderiza y se valida el canal 1624
- THEN el canal aparece en la grilla y se acepta

#### Scenario: Canal de la grilla siempre ejecuta

- GIVEN un canal presente en la grilla
- WHEN el operador lo selecciona
- THEN se ejecuta la acción sin rechazo

### Requirement: CF-2 — Rechazo explícito de canal inválido

Un canal que no está en la allowlist MUST NOT fallar en silencio. El sistema MUST mostrar un toast de advertencia y MUST NOT resetear el estado a un valor por defecto.

#### Scenario: Canal inválido muestra advertencia

- GIVEN un canal que no está en la allowlist
- WHEN el operador intenta ejecutarlo
- THEN se muestra un toast de advertencia
- AND no hay reset silencioso del estado

### Requirement: CF-3 — Reconciliación de drift

Cuando `estado.favoritos` contiene entradas ausentes de la allowlist (drift), el sistema MUST reconciliar la lista con la grilla derivada de `CANALES_FAVORITOS`.

#### Scenario: Favorito obsoleto se reconcilia

- GIVEN `estado.favoritos` guarda un canal removido de la allowlist
- WHEN el estado se hidrata
- THEN el favorito obsoleto se elimina o se realinea con la grilla
