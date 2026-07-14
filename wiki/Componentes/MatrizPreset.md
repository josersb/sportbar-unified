# MatrizPreset

Componente de gestión de presets de configuración de la matriz. Renderiza 5 slots de preset, cada uno con botón de cargar y botón de grabar, más un campo de texto para descripción. Se muestra como panel lateral dentro de [[MatrizVideo]].

## Props / Estado

No recibe props. Consume el contexto global via [[../Componentes/Contexto|ContextoUser]]:

- `estado.tvs` — asignación actual de decos a TVs
- `estado.descripcionPreset` — array de 5 objetos con descripciones editables
- `handleChangeEstadoVideo(tvs)` — aplica la configuración de un preset cargado
- `handleChangeEstadoPreset(descripcionPreset)` — persiste la descripción editada

Usa `useRef` para 5 inputs de texto (preset1–preset5).

## APIs y Endpoints

Llama directamente a la [[../API/ArrangerApi]] en `handleCargaMatriz()`, que envía 29 comandos `join av` secuenciales (VWN, VWC, VWS + TV01–TV26) para aplicar la configuración de un preset a la matriz física.

URL base: `http://192.168.2.254/api/command/`  
Token: `TOKEN_REMOVED`

## Flujo de Presets

### Cargar preset
1. Lee `localStorage.getItem("estadoApp_PresetX")`
2. `JSON.parse` del valor guardado
3. `handleChangeEstadoVideo(preset.tvs)` — actualiza estado React
4. `handleCargaMatriz()` — envía 29 comandos `join av` al hardware
5. `window.location.reload()` — recarga la página completa

### Grabar preset
1. Actualiza `descripcionPreset[X].presetX` con el valor del input
2. `handleChangeEstadoPreset(descripcionPreset)` — actualiza estado React
3. `localStorage.setItem("estadoApp_PresetX", JSON.stringify(estado))` — persiste estado completo

## Relaciones

- Renderizado dentro de [[MatrizVideo]]
- Usa el [[../Conceptos/SistemaPresets]] (5 keys de localStorage)
- Depende de [[../Conceptos/StateManagement]] para el estado global
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
