# JoinVideo

Comando `join video` del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para enrutamiento de video independiente. Permite separar la señal de video de la de audio, a diferencia de `join av` que enruta ambos simultáneamente.

## Sintaxis

```
join video [key:<security_key>] <encoder_device_name> <decoder_device_name> / <group_name> / <all> [<exclusive>] [<original> | <auto> | [size <video_mode>]]
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `encoder_device_name` | Nombre del encoder fuente de video |
| `decoder_device_name` | Nombre del decoder destino |
| `group_name` | Nombre de un grupo de decoders (alternativa a un decoder individual) |
| `all` | Enruta a todos los decoders conectados |
| `exclusive` | Solo el decoder especificado recibe la señal. Todos los demás decoders conectados al encoder se desconectan. (opcional) |
| `original` | El decoder usa resolución pass-through igual a la del encoder. (opcional) |
| `auto` | El decoder ajusta su resolución automáticamente según el EDID del monitor conectado. Solo disponible si hay un monitor con EDID válido. (opcional) |
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
join video success
join video error [mensaje]
```

### Posibles errores

- `incomplete` — comando incompleto
- `join not permitted` — operación no permitida
- `invalid parameter` — parámetro inválido
- `invalid video_mode` — modo de video no soportado
- `monitor not detected` — no se detectó monitor (para modo `auto`)
- `unsupported monitor` — monitor no soportado (para modo `auto`)
- `invalid response` — respuesta inválida
- `encoder '<name>' not found` — encoder no encontrado
- `decoder '<name>' not found` — decoder no encontrado
- `device '<name>' disconnected` — dispositivo desconectado
- `group devices not found` — no se encontraron dispositivos en el grupo

## Ejemplos

```
join video Encoder1 Decoder1
join video Encoder1 all
join video Encoder1 MyGroup
join video Encoder1 Decoder1 exclusive
join video Encoder1 Decoder1 original
join video Encoder1 Decoder1 auto
join video Encoder1 Decoder1 size 1080p60
join video key:abc123 Encoder1 Decoder1
```

## Implementación en SportBar

- [[../API/ArrangerApi#assignvideosource-source-destination|assignVideoSource()]] — wrapper que construye y envía el comando
- Usado por [[../Componentes/MatrizVideo]] — sección "TV Monitoreo Multimedia — TVRACK", sub-sección ▶ Video
- El comando se envía como `join video {source} {dest}` vía `buildArrangerCommand()`

## Relaciones

- Definido por [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — API HTTP del controlador
- Complemento de [[JoinAudio]] — enrutamiento de audio independiente
- Alternativa a `join av` — enrutamiento combinado (ver [[ArrangerApi]])
- Usado en la UI de [[../Componentes/MatrizVideo]]
