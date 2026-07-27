# Shure ANI — Interfaces de Audio

Interfaces de audio en red Shure ANI22-XLR (entrada) y ANI4OUT-XLR (salida). Usadas para procesamiento de señales de voceo y sistema de emergencia.

## Dispositivos

| Equipo | IP | MAC | Ubicación | Función |
|--------|-----|-----|-----------|---------|
| ANI22-XLR-Bunker | 192.168.2.209 | 00:0E:DD:53:9A:60 | Bunker/Welcome | Procesamiento audio bienvenida |
| ANI22-XLR-Multimedia | 192.168.2.071 | 00:0E:DD:53:99:82 | Sala Multimedia | Audio sala multimedia |
| ANI4OUT-XLR-Rack | 192.168.2.073 | 00:0E:DD:53:99:E0 | Rack Sportbar | Salida e inyección al Tesira |

## Software

Aplicación web Shure para configuración y monitoreo.

## Relevancia para SportBar

**No integrado con sportbar-unified**. El ANI4OUT-XLR-Rack inyecta señal al procesador Tesira, que a su vez es controlado por la app vía comandos seriales. Las interfaces ANI son parte de la cadena de audio pero no requieren control desde la app del SportBar.

## Relaciones

- [[../../../../Conceptos/ZonasAudio]] — el Tesira es el procesador principal
- [[../../../../Docs/referencia-instalacion]] — referencia completa
- [[../../../../README]] — documentación general
