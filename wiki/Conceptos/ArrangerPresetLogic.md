# ArrangerPresetLogic

Lógica de programación embebida del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] para presets y condiciones. Los presets del Arranger soportan operadores condicionales, variables dinámicas y patrones de respuesta serial/tcp que permiten flujos de automatización sin depender del software cliente.

> **Nota**: Esta lógica opera DENTRO del controlador Arranger y es independiente del sistema [[SistemaPresets]] de SportBar (que usa localStorage + `join av`). Sin embargo, los presets del Arranger pueden ser invocados desde la app con `preset load`.

## Operadores condicionales

### Operadores básicos (todas las versiones)

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `if` | Condición simple | `if (get video Decoder1 == "Encoder1") join video Encoder2 Decoder1` |
| `else` | Rama alternativa | `else join video Encoder3 Decoder1` |
| `==` | Igualdad exacta | `get volume TV01 == 50` |
| `!=` | Desigualdad | `get volume TV01 != 0` |
| `<` | Menor que (numérico) | `get volume TV01 < 50` |
| `>` | Mayor que (numérico) | `get volume TV01 > 0` |
| `!` | Negación booleana | `!get video_mute TV01` |

### Operadores avanzados (API V1.4.0.0+)

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `elseif` | Condición múltiple encadenada | `elseif (get video Decoder1 == "Encoder2") join video Encoder3 Decoder1` |
| `&&` | AND lógico | `(get volume TV01 < 50) && (get volume TV01 > 0)` |
| `||` | OR lógico | `(get video Decoder1 == "Encoder1") || (get video Decoder1 == "Encoder2")` |
| `substr()` | Extraer subcadena | `substr(get ver Encoder1, 0, 3) == "1.4"` |
| `instr()` | Buscar subcadena (retorna posición) | `instr(get devices all, "Encoder1") > -1` |
| `trim()` | Eliminar espacios al inicio y final | `trim(get audio_source, " ") == "DTV1"` |
| `inc()` | Incrementar variable | `inc(get var myCounter)` |
| `dec()` | Decrementar variable | `dec(get var myCounter)` |
| `&` | Concatenación de strings | `"Decoder" & "1"` — resulta en `"Decoder1"` |

## Comandos utilizables en condiciones `if/elseif`

### Comandos que retornan strings

| Comando | Valor de retorno |
|---------|-----------------|
| `get audio_source <decoder>` | Nombre del encoder fuente de audio |
| `get devices all` | Lista de dispositivos con MAC |
| `get edid <encoder>` | Datos EDID del display conectado |
| `get scaler <encoder>` | Modo del scaler (`passthrough`, `auto`, `manual`) |
| `get status <device>` | Estado del dispositivo (`CONNECTED`, `STOPPED`, etc.) |
| `get var <name>` | Valor de variable definida por el usuario |
| `get ver <device>` | Versión de firmware |
| `get video <encoder>` | Nombre del decoder que recibe el video |
| `get encoder <decoder>` | Nombre del encoder fuente del video |
| `get ui_button <name>` | Estado del botón de UI (`true` o `false`) |

### Comandos que retornan enteros

| Comando | Valor de retorno |
|---------|-----------------|
| `get frame_converter <encoder>` | Frame rate configurado (ej: `60`, `30`) |
| `get preferred <encoder>` | Resolución preferida del EDID |
| `get rotation <encoder>` | Ángulo de rotación (`0`, `90`, `180`, `270`) |
| `get scaler <encoder>` | Modo de scaler (también retorna entero en contexto numérico) |
| `get video <encoder>` | En contexto numérico: resolución |
| `get video_quality <encoder>` | Valor de calidad de video |
| `get volume <decoder>` | Nivel de volumen (rango típico `0`-`100`) |

### Comandos que retornan booleanos

| Comando | Valor de retorno |
|---------|-----------------|
| `get display_status <decoder>` | `true` si el display está encendido |
| `get var <name>` | `true`/`false` si la variable es booleana |
| `get video_mute <decoder>` | `true` si el video está muteado |
| `get video_status <encoder>` | `true` si el stream de video está activo |
| `get ui_button <name>` | `true` si el botón está presionado |

## Variables de preset

| Variable | Descripción |
|----------|-------------|
| `<<button_name>>` | Nombre del botón UI que disparó el preset |
| `<<slider_value>>` | Valor del slider UI que disparó el preset |
| `<<ui_name>>` | Nombre de la UI que contiene el elemento disparador |

Estas variables permiten presets genéricos que se adaptan al contexto de invocación. Ejemplo:

```
preset add "toggle_source" if (get video <<button_name>> == "Encoder1") join video Encoder2 <<button_name>> else join video Encoder1 <<button_name>>
```

## Patrones de respuesta serial/TCP/GC

Los comandos `send serial`, `send tcp` y `send gc` en presets pueden configurar modos de feedback:

| Modo | Comportamiento | Uso en condición |
|------|---------------|-----------------|
| **None** | Sin espera de respuesta | No condicionable |
| **Reply** | Espera cualquier respuesta | `if (send serial DTV1 "status\r" == "*")` |
| **Contains** | Espera que la respuesta contenga string | `if (send serial DTV1 "status\r" contains "OK")` |
| **Equals** | Espera que la respuesta sea exacta | `if (send serial DTV1 "status\r" equals "POWER_ON")` |

### Ejemplo con Tesla (Biamps)

```
send serial DTV1 "MUTE 1 MUTE 1 1\x0A" reply pattern equals "OK"
→ if (equals == "OK") join audio None DTV1
```

## Ejemplos de presets del manual

### Toggle de fuente con condición

```
preset add "toggle_encoder" if (get video <<button_name>> == "Encoder1") join video Encoder2 <<button_name>> else join video Encoder1 <<button_name>>
```

### Control de volumen con límites

```
preset add "vol_up" if (get volume <<button_name>> < 100) inc(get volume <<button_name>>)
preset add "vol_down" if (get volume <<button_name>> > 0) dec(get volume <<button_name>>)
```

### Routing condicional con múltiples ramas (V1.4.0.0+)

```
preset add "smart_route" if (get video_status Encoder1) join video Encoder1 <<button_name>> elseif (get video_status Encoder2) join video Encoder2 <<button_name>> else join video Encoder3 <<button_name>>
```

### Ciclo de fuentes con concat y condición

```
set var "source_num" 1
preset add "cycle_source" if (get var source_num == 1) join video Encoder1 <<button_name>> inc(get var source_num) elseif (get var source_num == 2) join video Encoder2 <<button_name>> inc(get var source_num) elseif (get var source_num == 3) join video Encoder3 <<button_name>> set var "source_num" 1
```

## Integración con SportBar

- Los presets del Arranger pueden ser cargados desde la app con `preset load <nombre>` (función `loadChannelPreset()` en `arrangerApi.js`)
- La lógica condicional del Arranger permite crear presets de routing inteligente que la app puede disparar sin implementar la lógica del lado React
- Las variables `<<button_name>>` permiten presets reutilizables entre múltiples TVs/decoders
- Para presets que requieren el estado actual de la matriz, combinar con `get matrix` o `get video` como condición

## Relaciones

- [[../API/ArrangerApi]] — API que envía comandos `preset load` y `preset add`
- [[SistemaPresets]] — sistema de presets de la app SportBar (localStorage + estado React)
- [[../Componentes/MatrizPreset]] — UI de gestión de presets en la app
- [[../Componentes/MatrizVideo]] — componente que se beneficia de presets de routing condicional
- [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — controlador donde residen estos presets
- [[../API/SendSerial]] — comandos seriales referenciados en patrones de respuesta
- [[../API/GetMatrix]] — comando útil como condición en presets de validación
