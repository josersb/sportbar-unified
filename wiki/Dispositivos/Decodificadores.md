# Decodificadores

Catálogo de fuentes de video y audio del sistema SportBar. Incluye 6 decodificadores DirecTV físicos y 2 fuentes de video adicionales basadas en encoders [[IPEX5001-Encoder]] (OBS Studio y streaming).

## Decodificadores DirecTV (6)

| Decodificador | MAC (Arranger) | Color CSS | Canal por defecto |
|---------------|----------------|-----------|-------------------|
| DTV1 | `341B22819781` | `#EF9A9A` (rojo claro) | 1603 |
| DTV2 | `341B228197F2` | `#EC407A` (rosa) | 1604 |
| DTV3 | `341B22819728` | `#7E57C2` (púrpura) | 1605 |
| DTV4 | `341B22819780` | `#42A5F5` (azul) | 1608 |
| DTV5 | `341B2281976D` | `#66BB6A` (verde) | 1621 |
| DTV6 | `341B22819825` | `#FFEE58` (amarillo) | 1629 |

Cada DirecTV está conectado físicamente a un [[IPEX5001-Encoder]] que convierte su señal HDMI en stream IP para la matriz [[../Dispositivos/Arranger-IPEXCB|Arranger]]. Ver [[../Dispositivos/DirecTV-Decos|DirecTV-Decos]] para el detalle completo de conexión física y flujo de control IR.

## Fuentes de video adicionales (2)

| Nombre en sistema | Nombre en Arranger | MAC | Tipo | Canal por defecto |
|-------------------|-------------------|-----|------|-------------------|
| DTV7 | `E-OBS_CS` | `6C930870C0C9` | [[IPEX5001-Encoder]] (fuente OBS) | 1631 |
| DTV8 | `F-STREAMING-CS` | `6C930870C19B` | [[IPEX5001-Encoder]] (fuente streaming) | 1644 |

DTV7 y DTV8 NO son decodificadores DirecTV. Son dos encoders [[IPEX5001-Encoder]] que transmiten señales de una computadora con OBS Studio y de un dispositivo de streaming respectivamente. Se integran en la matriz con los mismos comandos `join av` que los decodificadores, pero NO aceptan comandos IR de cambio de canal. El cambio de fuente en estos dispositivos debe hacerse directamente en el equipo origen.

## Cómo se usan

### Como fuente de video
Cada fuente puede ser asignada a cualquier TV o Video Wall mediante el comando `join av` de la [[../API/ArrangerApi]]. Una misma fuente puede alimentar múltiples destinos simultáneamente. El componente [[../Componentes/MatrizVideo]] gestiona estas asignaciones por zona.

### Como fuente de audio
Las fuentes también alimentan las [[../Dispositivos/ZonasAudio]] a través del procesador Tesira. El componente [[../Componentes/Audio]] permite seleccionar qué fuente alimenta cada zona (Norte, Centro, Sur).

### Cambio de canal
Los DirecTV (DTV1–DTV6) reciben comandos IR de cambio de canal mediante **`sendChannelDigits`** de la [[../API/ArrangerApi]]: envía cada dígito del canal secuencialmente vía IR con 300ms de delay, usando los códigos hexadecimales de `src/data/irCodes.js`. El método `loadChannelPreset` (presets pre-grabados en el Arranger) se mantiene como **backup activo** si el envío IR dinámico falla. DTV7 y DTV8 no aceptan cambio de canal.

## TVRACK

TV especial ubicada en el rack técnico que permite monitorear cualquiera de las 8 fuentes. El componente [[../Componentes/MatrizVideo]] tiene 8 botones dedicados para conmutar instantáneamente la señal del TVRACK entre DTV1 y DTV8.

## Estado visual

El componente [[../Componentes/Aside]] muestra cada fuente con su color distintivo y el canal o fuente actual. Las TVs en el mapa visual heredan el color de la fuente asignada mediante CSS custom properties.

## Relaciones

- [[../Dispositivos/DirecTV-Decos]] — detalle de los 6 DirecTV y su control IR
- [[../Dispositivos/IPEX5001-Encoder]] — hardware encoder para cada fuente
- [[../Dispositivos/Arranger-IPEXCB]] — controlador central
- [[../API/ArrangerApi]] — todos los comandos pasan por esta API
- [[../Componentes/MatrizVideo]] — asigna fuentes a TVs
- [[../Componentes/Canales]] — cambia canales en los DirecTV
- [[../Componentes/Audio]] — usa fuentes para audio por zona
- [[../Componentes/Aside]] — muestra estado visual de las fuentes
- [[../Componentes/MatrizPreset]] — persiste y carga configuraciones
- [[../Conceptos/SistemaPresets]] — los presets guardan la configuración de fuentes
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
