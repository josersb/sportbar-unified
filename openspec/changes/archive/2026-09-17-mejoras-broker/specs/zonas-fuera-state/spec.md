# Delta for zonas-fuera-state

## ADDED Requirements

### Requirement: Dedupe de escrituras de zona

Las escrituras de `zonasFuera` MUST descartar no-ops reales contra el `reported` confirmado antes de emitir `join` al Arranger. La respuesta MUST ser idempotente/no-op. Un parámetro `forzar` MUST permitir el reenvío.

#### Scenario: Zona no-op descartada

- GIVEN una zona ya reporta la fuente pedida
- WHEN llega una escritura idéntica
- THEN no se emite `join` y se responde no-op

#### Scenario: Escape forzar en zona

- GIVEN `forzar` en true
- WHEN llega una escritura de zona no-op
- THEN se emite el `join` al Arranger
