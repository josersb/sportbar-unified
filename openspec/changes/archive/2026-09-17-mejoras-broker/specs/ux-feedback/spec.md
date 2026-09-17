# Delta for ux-feedback

## ADDED Requirements

### Requirement: Toasts de intención y rechazo de canal

El sistema MUST mostrar toasts específicos: "canal ya sintonizado" al reenviar el canal vigente, "cambiando al canal X" al cambiar, y "error al cambiar canal, volvé a intentar" ante fallo del controlador. Un canal inválido MUST mostrar toast de advertencia.

#### Scenario: Canal ya sintonizado

- GIVEN el operador reenvía el canal vigente
- WHEN el servidor responde no-op
- THEN aparece el toast "canal ya sintonizado"

#### Scenario: Cambio de canal

- GIVEN el operador cambia al canal X
- WHEN el servidor confirma
- THEN aparece el toast "cambiando al canal X"

#### Scenario: Fallo del controlador

- GIVEN el controlador falla
- WHEN el operador intenta cambiar el canal
- THEN aparece "error al cambiar canal, volvé a intentar"

#### Scenario: Canal inválido

- GIVEN un canal fuera de la allowlist
- WHEN el operador intenta ejecutarlo
- THEN aparece un toast de advertencia

### Requirement: Toast de no-op y escape forzar

Un no-op confirmado MUST mostrar el toast "sin cambios". La UI MUST ofrecer una acción explícita "forzar reenvío".

#### Scenario: No-op confirmado

- GIVEN una escritura descartada por dedupe
- WHEN el servidor responde no-op
- THEN aparece el toast "sin cambios"

#### Scenario: Acción forzar reenvío

- GIVEN un envío deduplicado
- WHEN el operador elige "forzar reenvío"
- THEN se reenvía el comando
