# SistemaPresets

Sistema de 5 configuraciones guardables que permiten almacenar y recuperar instantáneamente el estado completo de la matriz audiovisual. Cada preset persiste la asignación de decodificadores a TVs, canales sintonizados, configuración de audio y descripciones personalizadas.

## Keys de localStorage

| Preset | Key | Descripción inicial |
|--------|-----|---------------------|
| Preset 1 | `estadoApp_Preset1` | "ingresar descripción" |
| Preset 2 | `estadoApp_Preset2` | "ingresar descripción" |
| Preset 3 | `estadoApp_Preset3` | "ingresar descripción" |
| Preset 4 | `estadoApp_Preset4` | "ingresar descripción" |
| Preset 5 | `estadoApp_Preset5` | "ingresar descripción" |

Cada key almacena un `JSON.stringify(estado)` completo — es decir, todo el objeto de estado (`decos`, `tvs`, `audio`, `favoritos`, `descripcionPreset`), no solo una sección.

## Inicialización

En [[../Componentes/Contexto]] (`Contexto.jsx`), al cargar el módulo se verifica cada una de las 5 keys. Si no existen, se crean con `JSON.stringify(estadoInicial)`. Esto garantiza que los presets siempre tengan un valor válido, incluso en la primera carga.

## Flujo de carga (Load)

1. Usuario hace clic en "Preset X" en [[../Componentes/MatrizPreset]]
2. `localStorage.getItem("estadoApp_PresetX")` → `JSON.parse`
3. `handleChangeEstadoVideo(preset.tvs)` — actualiza la asignación de TVs en el estado React
4. `handleCargaMatriz()` — envía 29 comandos `join av` al hardware via [[../API/ArrangerApi]]
5. `window.location.reload()` — recarga completa de la página

## Flujo de grabación (Save)

1. Usuario edita la descripción en el input de texto
2. Usuario hace clic en el botón de grabar (ícono de guardar)
3. `descripcionPreset[X].presetX = inputRef.current.value`
4. `handleChangeEstadoPreset(descripcionPreset)` — actualiza descripción en React
5. `localStorage.setItem("estadoApp_PresetX", JSON.stringify(estado))` — persiste el estado completo

## Qué guarda cada preset

Un preset captura el estado completo de la aplicación:
- Los 8 [[../Dispositivos/DirecTV/Decodificadores/Decodificadores]] con sus canales actuales
- Las 30+ asignaciones de TVs a decos ([[../Componentes/MatrizVideo]])
- Las 3 [[../Conceptos/ZonasAudio]] con fuente, volumen y mute
- Las descripciones personalizadas de los 5 presets
- La lista de canales favoritos

## Limitación: `window.location.reload()`

Al cargar un preset, el componente fuerza un `window.location.reload()`. Esto es un hard reset del DOM y del estado React. La razón es que el Aside actualiza colores por manipulación directa del DOM (`document.querySelector(":root")`), no por React, y el reload garantiza que los colores reflejen el nuevo estado. Es una solución pragmática pero rompe la experiencia SPA.

## Relaciones

- Gestionado por [[../Componentes/MatrizPreset]]
- Inicializado en [[../Componentes/Contexto]]
- Depende de [[../Conceptos/StateManagement]] para los handlers
- Usa la [[../API/ArrangerApi]] para aplicar presets al hardware
- Afecta a [[../Dispositivos/DirecTV/Decodificadores/Decodificadores]] y [[../Conceptos/ZonasAudio]]
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
