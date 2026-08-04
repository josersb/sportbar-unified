# AHM-32 (Allen & Heath)

Matriz de audio digital 32×32 canales con procesamiento DSP integrado. Documentado en `Docs/equipaments/ahm/`. Incluye protocolo TCP para control externo.

## Documentación disponible

- `AHM-32-Tech-Datasheet.pdf` — ficha técnica
- `AHM-TCP-Protocol-V1.5.pdf` — protocolo TCP para integración
- `DX-GX-System-Guide-ISS_5.pdf` — guía de expansión
- `AHM System Manager V1.60 Installer.exe` — software de gestión

## Relevancia para SportBar

El AHM-32 podría ser un reemplazo o complemento del procesador Tesira actual (192.168.2.252). La documentación del protocolo TCP permitiría integrarlo con comandos similares a los `send serial` que ya se usan para el Tesira.

**Estado**: sin integrar. Requiere investigación del protocolo TCP y compatibilidad con la infraestructura existente.

## Relaciones

- [[../../../Conceptos/ZonasAudio]] — posible nuevo controlador de audio
- [[../../../../API/ArrangerApi]] — los comandos seriales actuales van al Tesira
- [[../../../../Docs/referencia-instalacion]] — referencia completa de la instalación
- [[../../../../README]] — documentación general
