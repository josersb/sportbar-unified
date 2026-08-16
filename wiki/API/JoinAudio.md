# JoinAudio

Comando `join audio` del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para enrutamiento de audio independiente. Permite separar la señal de audio de la de video, a diferencia de `join av` que enruta ambos simultáneamente.

## Sintaxis

```
join audio [key:<security_key>] <encoder_device_name> <decoder_device_name> / <group_name> / <all> [<exclusive>]
```

## Argumentos

| Argumento | Descripción |
|-----------|-------------|
| `encoder_device_name` | Nombre del encoder fuente de audio |
| `decoder_device_name` | Nombre del decoder destino |
| `group_name` | Nombre de un grupo de decoders (alternativa a un decoder individual) |
| `all` | Enruta a todos los decoders conectados |
| `exclusive` | Solo el decoder especificado recibe la señal de audio. Todos los demás decoders conectados al encoder se desconectan. (opcional) |

## Valor de retorno

```
join audio success
join audio error [mensaje]
```

### Posibles errores

- `incomplete` — comando incompleto
- `join not permitted` — operación no permitida
- `invalid parameter` — parámetro inválido
- `invalid response` — respuesta inválida
- `encoder '<name>' not found` — encoder no encontrado
- `decoder '<name>' not found` — decoder no encontrado
- `device '<name>' disconnected` — dispositivo desconectado
- `group devices not found` — no se encontraron dispositivos en el grupo

## Ejemplos

```
join audio Encoder1 Decoder1
join audio Encoder1 all
join audio Encoder1 MyGroup
join audio Encoder1 Decoder1 exclusive
join audio Encoder1 MyGroup exclusive
join audio key:abc123 Encoder1 Decoder1
```

## Implementación en SportBar

- [[../API/ArrangerApi#assignaudiosource-source-destination|assignAudioSource()]] — wrapper que construye y envía el comando
- Usado por [[../Componentes/MatrizVideo]] — sección "TV Monitoreo Multimedia — TVRACK", sub-sección ♪ Audio
- El comando se envía como `join audio {source} {dest}` vía `buildArrangerCommand()`

## Relaciones

- Definido por [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — API HTTP del controlador
- Complemento de [[JoinVideo]] — enrutamiento de video independiente
- Alternativa a `join av` — enrutamiento combinado (ver [[ArrangerApi]])
- Usado en la UI de [[../Componentes/MatrizVideo]]
