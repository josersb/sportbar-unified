# Decodificadores DirecTV

> Fusión de las páginas `Decodificadores.md` y `DirecTV-Decos.md`.
> Contenido único de ambos archivos preservado.

Catálogo de fuentes de video y audio del sistema SportBar. Incluye 6 decodificadores DirecTV físicos y 2 fuentes de video adicionales basadas en encoders [[../../Liberty/Distribucion/IPEX5001-Encoder]] (OBS Studio y streaming).

Seis decodificadores DirecTV físicos (DTV1 a DTV6) que funcionan como fuentes de video y audio para el sistema SportBar. Cada uno está conectado a un encoder [[../../Liberty/Distribucion/IPEX5001-Encoder]] que digitaliza su señal HDMI y la transmite por la red IP hacia la matriz controlada por el [[../../Liberty/Controladores/Arranger-IPEXCB]].

## Conexión física

Cada DirecTV se conecta así:

```
DirecTV Deco (HDMI OUT) → IPEX5001 (HDMI IN)
DirecTV Deco (IR receiver) ← IPEX5001 (IR OUT, emisor pegado al receptor)
IPEX5001 (LAN) → Switch PoE → Arranger IPEXCB
```

El encoder recibe PoE del switch y no necesita fuente de alimentación local.

## Lista de decodificadores

| Decodificador | MAC (Arranger) | Color CSS | Canal por defecto |
|---------------|----------------|-----------|-------------------|
| DTV1 | `341B22819781` | `#EF9A9A` (rojo claro) | 1603 |
| DTV2 | `341B228197F2` | `#EC407A` (rosa) | 1604 |
| DTV3 | `341B22819728` | `#7E57C2` (púrpura) | 1605 |
| DTV4 | `341B22819780` | `#42A5F5` (azul) | 1608 |
| DTV5 | `341B2281976D` | `#66BB6A` (verde) | 1621 |
| DTV6 | `341B22819825` | `#FFEE58` (amarillo) | 1629 |

Cada DirecTV está conectado físicamente a un [[../../Liberty/Distribucion/IPEX5001-Encoder]] que convierte su señal HDMI en stream IP para la matriz [[../../Liberty/Controladores/Arranger-IPEXCB|Arranger]].

## Dispositivos DTV7 y DTV8 — NO son decodificadores

Las entradas **DTV7** y **DTV8** en el sistema NO corresponden a decodificadores DirecTV. Son dos encoders [[../../Liberty/Distribucion/IPEX5001-Encoder]] adicionales identificados en el Arranger como:

| Nombre en el sistema | Nombre en Arranger | MAC | Tipo real | Canal por defecto |
|----------------------|-------------------|-----|-----------|-------------------|
| DTV7 | `E-OBS_CS` | `6C930870C0C9` | IPEX5001 Encoder (fuente OBS) | 1631 |
| DTV8 | `F-STREAMING-CS` | `6C930870C19B` | IPEX5001 Encoder (fuente streaming) | 1644 |

Ambos funcionan como fuentes de video adicionales (computadora con OBS Studio y dispositivo de streaming) y se integran en la matriz igual que los decodificadores DirecTV. Al ser encoders, NO aceptan comandos IR de cambio de canal.

## Estado visual

El componente [[../../../Componentes/Aside]] muestra cada fuente con su color distintivo y el canal o fuente actual. Las TVs en el mapa visual heredan el color de la fuente asignada mediante CSS custom properties.

## Flujo de control IR

El cambio de canal en los decodificadores DirecTV sigue esta cadena:

1. Usuario selecciona canal en [[../../../Componentes/Canales]]
2. La app envía `preset load decoXcanalNNNN` al [[../../Liberty/Controladores/Arranger-IPEXCB]]
3. El Arranger ejecuta el preset, que contiene un comando `send ir` con el código hexadecimal del canal
4. El comando IR viaja por la red IP hacia el [[../../Liberty/Distribucion/IPEX5001-Encoder]] asociado al decodificador
5. El encoder emite la señal IR por su puerto **IR OUT** hacia el receptor infrarrojo del decodificador DirecTV
6. **IMPORTANTE**: las señales IR SIGUEN la ruta de video. Si el `join av` cambia, la ruta IR cambia con él

Esto significa que el emisor IR físico debe estar correctamente posicionado frente al receptor IR del decodificador DirecTV para que el control funcione.

## Relaciones

- [[../../Liberty/Controladores/Arranger-IPEXCB]] — controlador central
- [[../../Liberty/Distribucion/IPEX5001-Encoder]] — hardware encoder para cada fuente
- [[../../../API/ArrangerApi]] — todos los comandos pasan por esta API
- [[../../../Componentes/MatrizVideo]] — asigna fuentes a TVs
- [[../../../Componentes/Canales]] — cambia canales en los DirecTV
- [[../../../Componentes/Audio]] — usa fuentes para audio por zona
- [[../../../Componentes/Aside]] — muestra estado visual de las fuentes
- [[../../../Componentes/MatrizPreset]] — persiste y carga configuraciones
- [[../../../Conceptos/SistemaPresets]] — los presets guardan la configuración de fuentes
- [[../../../Conceptos/ZonasAudio]] — sistema de audio del sportbar
- [[../../../README]] — documentación general
- [[../../../AGENTS]] — schema de la wiki

## TVRACK

TV especial ubicada en el rack técnico que permite monitorear cualquiera de las 8 fuentes. El componente [[../../../Componentes/MatrizVideo]] tiene 8 botones dedicados para conmutar instantáneamente la señal del TVRACK entre DTV1 y DTV8.

## Uso en la matriz

Cada decodificador DirecTV puede:
- Ser fuente de video para cualquier TV o Video Wall mediante `join av`
- Ser fuente de audio para cualquiera de las 3 [[../../../Conceptos/ZonasAudio]]
- Ser monitoreado individualmente en el TVRACK (botones dedicados en [[../../../Componentes/MatrizVideo]])
- Su canal actual se muestra en tiempo real en el panel [[../../../Componentes/Aside]]

### Cambio de canal
Los DirecTV (DTV1–DTV6) reciben comandos IR de cambio de canal mediante **`sendChannelDigits`** de la [[../../../API/ArrangerApi]]: envía cada dígito del canal secuencialmente vía IR con 300ms de delay, usando los códigos hexadecimales de `src/data/irCodes.js`. El método `loadChannelPreset` (presets pre-grabados en el Arranger) se mantiene como **backup activo** si el envío IR dinámico falla. DTV7 y DTV8 no aceptan cambio de canal.

### Como fuente de audio
Las fuentes también alimentan las [[../../../Conceptos/ZonasAudio]] a través del procesador Tesira. El componente [[../../../Componentes/Audio]] permite seleccionar qué fuente alimenta cada zona (Norte, Centro, Sur).

### Como fuente de video
Cada fuente puede ser asignada a cualquier TV o Video Wall mediante el comando `join av` de la [[../../../API/ArrangerApi]]. Una misma fuente puede alimentar múltiples destinos simultáneamente. El componente [[../../../Componentes/MatrizVideo]] gestiona estas asignaciones por zona.
