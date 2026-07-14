# Decodificadores

Conjunto de 8 decodificadores DirecTV que funcionan como fuentes de video y audio para todo el sistema SportBar. Cada decodificador puede sintonizar un canal independiente y ser asignado a cualquier combinación de TVs mediante la matriz Arranger.

## Lista de decodificadores

| Decodificador | Color CSS | Canal por defecto | Descripción |
|---------------|-----------|-------------------|-------------|
| DTV1 | `#EF9A9A` (rojo claro) | 1603 | Decodificador principal 1 |
| DTV2 | `#EC407A` (rosa) | 1604 | Decodificador principal 2 |
| DTV3 | `#7E57C2` (púrpura) | 1605 | Decodificador principal 3 |
| DTV4 | `#42A5F5` (azul) | 1608 | Decodificador principal 4 |
| DTV5 | `#66BB6A` (verde) | 1621 | Decodificador principal 5 |
| DTV6 | `#FFEE58` (amarillo) | 1629 | Decodificador principal 6 |
| DTV7 | `#FFCA28` (ámbar) | 1631 | Decodificador principal 7 |
| DTV8 | `#BDBDBD` (gris) | 1644 | Decodificador principal 8 |

## Cómo se usan

### Como fuente de video
Cada decodificador puede ser asignado a cualquier TV o Video Wall mediante el comando `join av` de la [[../API/ArrangerApi]]. Una misma fuente puede alimentar múltiples destinos simultáneamente. El componente [[../Componentes/MatrizVideo]] gestiona estas asignaciones por zona.

### Como fuente de audio
Los decodificadores también son fuentes de audio para las [[../Dispositivos/ZonasAudio]]. El componente [[../Componentes/Audio]] permite seleccionar qué deco alimenta cada zona (Norte, Centro, Sur).

### Cambio de canal
Cada decodificador puede sintonizar un canal específico mediante el comando `preset load` de la [[../API/ArrangerApi]]. El componente [[../Componentes/Canales]] gestiona el cambio de canales con validación contra la lista de favoritos.

## TVRACK

TV especial ubicada en el rack técnico que permite monitorear cualquiera de los 8 decodificadores. El componente [[../Componentes/MatrizVideo]] tiene 8 botones dedicados para conmutar instantáneamente la señal del TVRACK entre DTV1 y DTV8.

## Estado visual

El componente [[../Componentes/Aside]] muestra cada decodificador con su color distintivo y el canal actual. Las TVs en el mapa visual heredan el color del decodificador asignado mediante CSS custom properties.

## Relaciones

- [[../API/ArrangerApi]] — todos los comandos pasan por esta API
- [[../Componentes/MatrizVideo]] — asigna decos a TVs
- [[../Componentes/Canales]] — cambia canales en los decos
- [[../Componentes/Audio]] — usa decos como fuente de audio
- [[../Componentes/Aside]] — muestra estado visual de los decos
- [[../Componentes/MatrizPreset]] — persiste y carga configuraciones de decos
- [[../Conceptos/SistemaPresets]] — los presets guardan la configuración de decos
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
