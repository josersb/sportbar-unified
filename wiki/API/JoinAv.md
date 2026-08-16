# JoinAv

Comando `join av` del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para enrutamiento combinado de video y audio. Conecta simultáneamente ambas señales desde un encoder fuente hacia un decoder destino, grupo de decoders o todos los decoders.

## Sintaxis

```
join av [key:<security_key>] <encoder_device_name> <decoder_device_name> / <group_name> / all [<exclusive>] [<original> | <auto> | [size <video_mode>]]
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `encoder_device_name` | Nombre del encoder fuente de video+audio |
| `decoder_device_name` | Nombre del decoder destino |
| `group_name` | Nombre de un grupo de decoders (alternativa) |
| `all` | Enruta a todos los decoders conectados |
| `exclusive` | Solo el decoder especificado recibe la señal. Todos los demás decoders conectados al encoder se desconectan. (opcional) |
| `original` | El decoder usa resolución pass-through igual a la del encoder. (opcional) |
| `auto` | El decoder ajusta resolución automáticamente según EDID del monitor. (opcional) |
| `size <video_mode>` | Establece un modo de video específico. (opcional) |

## Modos de video válidos

| Modo | Compatibilidad |
|------|---------------|
| `2160p60` | Solo dispositivos compatibles |
| `2160p50` | Solo dispositivos compatibles |
| `2160p30` | Estándar |
| `1080p60` | Estándar |
| `1080p50` | Estándar |
| `720p60` | Estándar |
| `720p50` | Estándar |

## Valor de retorno

```
join av success
join av error [mensaje]
```

### Posibles errores

- `incomplete` — comando incompleto
- `join not permitted` — operación no permitida
- `invalid parameter` — parámetro inválido
- `invalid video_mode` — modo de video no soportado
- `monitor not detected` — no se detectó monitor (modo `auto`)
- `unsupported monitor` — monitor no soportado (modo `auto`)
- `invalid response` — respuesta inválida
- `encoder '<name>' not found` — encoder no encontrado
- `decoder '<name>' not found` — decoder no encontrado
- `device '<name>' disconnected` — dispositivo desconectado
- `group devices not found` — grupo sin dispositivos

## Ejemplos

```
join av Encoder1 Decoder1
join av Encoder1 all
join av Encoder1 MyGroup
join av Encoder1 MyGroup exclusive
join av Encoder1 Decoder1 exclusive
join av Encoder1 Decoder1 original
join av Encoder1 Decoder1 auto
join av Encoder1 Decoder1 size 1080p60
join av key:abc123 Encoder1 Decoder1
```

## Implementación en SportBar

- **Estado**: ✅ Implementado como `assignSourceToDestination(source, destination)` en `arrangerApi.js:75`
- Es el comando de enrutamiento principal del sistema, usado para la mayoría de las asignaciones de TVs.
- `joinMultipleTVs()` lo llama secuencialmente para arrays de mapeos `{source, dest}`.
- Usado por [[../Componentes/MatrizVideo]] — sección principal de asignación de fuentes a TVs.
- Usado por [[../Componentes/MatrizPreset]] — carga de presets completos de matriz.
- A diferencia de [[JoinVideo]] y [[JoinAudio]], `join av` enruta ambos streams en un solo comando, sin permitir separación de fuentes de video y audio.

## Ver también

- [[JoinVideo]] — enrutamiento de video independiente
- [[JoinAudio]] — enrutamiento de audio independiente
- [[LeaveAv]] — comando inverso (desconectar audio + video)
- [[ArrangerApi]] — cliente API central del sistema
- [[../Componentes/MatrizVideo]] — componente que usa `join av`
