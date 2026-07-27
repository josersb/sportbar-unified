# Audio

Componente de control de audio por zonas. Renderiza la ruta `/audio` y permite seleccionar la fuente de audio (deco), ajustar volumen y activar mute para cada una de las 3 zonas del SportBar: Norte, Centro y Sur. Usa Formik para la gestión del formulario.

## Props / Estado

No recibe props. Consume el contexto global via [[../Componentes/Contexto|ContextoUser]]:

- `estado.audio` — array de 3 objetos `{ nombreZona, fuenteAudio, volumen, mute }`
- `handleChangeEstadoAudio(audio)` — persiste cambios de audio en el estado
- `handleChangeEstadoDecos(decos)` — disponible pero no usado directamente en este componente

## APIs y Endpoints

Llama directamente a la [[../API/ArrangerApi]] mediante el comando `send serial` para controlar el procesador de audio **Tesira**. Cada submit del formulario envía 9 comandos:

### Comandos de Mute (Tesira)
- `send serial DTV1 "Mute1 set mute 1 [true|false]\x0A"` — Zona Norte
- `send serial DTV1 "Mute2 set mute 1 [true|false]\x0A"` — Zona Centro
- `send serial DTV1 "Mute3 set mute 1 [true|false]\x0A"` — Zona Sur

### Comandos de Volumen (Tesira)
- `send serial DTV1 "Level3 set level 1 [valor]\x0A"` — Zona Norte
- `send serial DTV1 "Level4 set level 1 [valor]\x0A"` — Zona Centro
- `send serial DTV1 "Level5 set level 1 [valor]\x0A"` — Zona Sur

### Comandos de Fuente de Audio (Tesira SourceSelector)
- `send serial DTV1 "SourceSelector1 set sourceSelection [XX]\x0A"` — Zona Norte
- `send serial DTV1 "SourceSelector2 set sourceSelection [XX]\x0A"` — Zona Centro
- `send serial DTV1 "SourceSelector3 set sourceSelection [XX]\x0A"` — Zona Sur

El valor de sourceSelection se extrae con `.slice(3,5)` del nombre del deco (ej: `"DTV1"` → `"1"`).

URL base: `http://ARRANGER_HOST/api/command/`  
Token: `TOKEN_REMOVED`

## Dispositivos con los que interactúa

- 3 [[../Conceptos/ZonasAudio]] (Norte, Centro, Sur)
- Procesador Tesira (via comando `send serial`)
- 8 [[../Dispositivos/DirecTV/Decodificadores/Decodificadores]] como fuentes de audio seleccionables

## Relaciones

- Usado por [[../Componentes/App]] a través del router
- [[../API/ArrangerApi]] — comandos `send serial`
- [[../Conceptos/ZonasAudio]] — hardware controlado
- [[../Dispositivos/DirecTV/Decodificadores/Decodificadores]] — fuentes de audio
- [[../Conceptos/StateManagement]] — estado global
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
