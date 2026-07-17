# DirecTV Decos

Seis decodificadores DirecTV físicos (DTV1 a DTV6) que funcionan como fuentes de video y audio para el sistema SportBar. Cada uno está conectado a un encoder [[IPEX5001-Encoder]] que digitaliza su señal HDMI y la transmite por la red IP hacia la matriz controlada por el [[Arranger-IPEXCB]].

## Lista de decodificadores

| Decodificador | MAC (Arranger) | Color CSS | Canal por defecto |
|---------------|----------------|-----------|-------------------|
| DTV1 | `341B22819781` | `#EF9A9A` (rojo claro) | 1603 |
| DTV2 | `341B228197F2` | `#EC407A` (rosa) | 1604 |
| DTV3 | `341B22819728` | `#7E57C2` (púrpura) | 1605 |
| DTV4 | `341B22819780` | `#42A5F5` (azul) | 1608 |
| DTV5 | `341B2281976D` | `#66BB6A` (verde) | 1621 |
| DTV6 | `341B22819825` | `#FFEE58` (amarillo) | 1629 |

## Dispositivos DTV7 y DTV8 — NO son decodificadores

Las entradas **DTV7** y **DTV8** en el sistema NO corresponden a decodificadores DirecTV. Son dos encoders [[IPEX5001-Encoder]] adicionales identificados en el Arranger como:

| Nombre en el sistema | Nombre en Arranger | MAC | Tipo real | Canal por defecto |
|----------------------|-------------------|-----|-----------|-------------------|
| DTV7 | `E-OBS_CS` | `6C930870C0C9` | IPEX5001 Encoder (fuente OBS) | 1631 |
| DTV8 | `F-STREAMING-CS` | `6C930870C19B` | IPEX5001 Encoder (fuente streaming) | 1644 |

Ambos funcionan como fuentes de video adicionales (computadora con OBS Studio y dispositivo de streaming) y se integran en la matriz igual que los decodificadores DirecTV. Al ser encoders, NO aceptan comandos IR de cambio de canal.

## Flujo de control IR

El cambio de canal en los decodificadores DirecTV sigue esta cadena:

1. Usuario selecciona canal en [[../Componentes/Canales]]
2. La app envía `preset load decoXcanalNNNN` al [[Arranger-IPEXCB]]
3. El Arranger ejecuta el preset, que contiene un comando `send ir` con el código hexadecimal del canal
4. El comando IR viaja por la red IP hacia el [[IPEX5001-Encoder]] asociado al decodificador
5. El encoder emite la señal IR por su puerto **IR OUT** hacia el receptor infrarrojo del decodificador DirecTV
6. **IMPORTANTE**: las señales IR SIGUEN la ruta de video. Si el `join av` cambia, la ruta IR cambia con él

Esto significa que el emisor IR físico debe estar correctamente posicionado frente al receptor IR del decodificador DirecTV para que el control funcione.

## Conexión física

Cada DirecTV se conecta así:

```
DirecTV Deco (HDMI OUT) → IPEX5001 (HDMI IN)
DirecTV Deco (IR receiver) ← IPEX5001 (IR OUT, emisor pegado al receptor)
IPEX5001 (LAN) → Switch PoE → Arranger IPEXCB
```

El encoder recibe PoE del switch y no necesita fuente de alimentación local.

## Uso en la matriz

Cada decodificador DirecTV puede:
- Ser fuente de video para cualquier TV o Video Wall mediante `join av`
- Ser fuente de audio para cualquiera de las 3 [[../Dispositivos/ZonasAudio]]
- Ser monitoreado individualmente en el TVRACK (botones dedicados en [[../Componentes/MatrizVideo]])
- Su canal actual se muestra en tiempo real en el panel [[../Componentes/Aside]]

## Relaciones

- [[../Dispositivos/IPEX5001-Encoder]] — encoder al que está conectado cada DirecTV
- [[../Dispositivos/Arranger-IPEXCB]] — controlador que enruta las señales
- [[../Dispositivos/Decodificadores]] — página general del catálogo de fuentes
- [[../API/ArrangerApi]] — API de comandos del controlador
- [[../Componentes/MatrizVideo]] — asigna decos a TVs
- [[../Componentes/Canales]] — cambia canales vía IR
- [[../Componentes/Audio]] — usa decos como fuente de audio
- [[../Componentes/Aside]] — monitoreo de estado
- [[../Conceptos/SistemaPresets]] — presets guardan configuraciones de decos
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
