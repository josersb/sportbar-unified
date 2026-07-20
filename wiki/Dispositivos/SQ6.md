# Allen & Heath SQ6

Consola de mezcla digital para audio en vivo. Ubicada en la Mesa de Control/Escenario. Se conecta a la red en la subred `192.168.1.0/24`.

## Datos técnicos

| Campo | Valor |
|-------|-------|
| IP | 192.168.1.101 |
| Software control | App iOS SQ MixPad |
| Tablet control | 192.168.1.102 |

## Rol en el sistema

La SQ6 se usa para mezcla de audio en eventos en vivo. El audio se envía al sistema distribuido a través de un convertidor **MuxLab** (Analógico → Dante, 2 canales) hacia la red Dante que alimenta las interfaces de audio en los racks.

**No está integrada con sportbar-unified**. La app actual controla el audio del SportBar vía Tesira (comandos seriales). La SQ6 es un sistema independiente para eventos.

## Relaciones

- Conectada a la red Dante vía MuxLab
- [[../Dispositivos/ZonasAudio]] — sistema de audio del sportbar
- [[../Docs/referencia-instalacion]] — referencia completa
- [[../README]] — documentación general
