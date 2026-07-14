# MatrizVideo

Componente principal de control de la matriz de video. Renderiza la ruta `/matrizvideo` y permite asignar decodificadores DirecTV (DTV1 a DTV8) a cada uno de los 30+ destinos de video del SportBar, organizados por zonas: Video Walls, TVs de escalera, TVs de barra y TVRACK de monitoreo.

## Props / Estado

No recibe props. Consume el contexto global via [[../Componentes/Contexto|ContextoUser]]:

- `estado.tvs` — objeto con 30+ keys (VWN, VWC, VWS, TV01–TV26, TVRACK, y agrupaciones como `TvsBarraLivertador`, `TvsBarraSur`, etc.)
- `handleChangeEstadoVideo(tvs)` — handler que persiste la asignación de decos a TVs

## APIs y Endpoints

Llama directamente a la [[../API/ArrangerApi]] con fetch en modo `no-cors`:

- `join av [SOURCE] [DEST]` — para cada TV individual (TV01–TV26, VWN, VWC, VWS) al submit del formulario
- `join av DTVx TVRACK` — botones individuales para seleccionar qué deco se ve en el TVRACK

URL base: `http://192.168.2.254/api/command/`  
Token: `TOKEN_REMOVED`

## Dispositivos con los que interactúa

- 8 [[../Dispositivos/Decodificadores]] (DTV1–DTV8)
- 3 Video Walls (VWN, VWC, VWS)
- 26 TVs principales (TV01–TV26)
- 1 TV de rack ([[../Dispositivos/Decodificadores#TVRACK|TVRACK]])

## Lógica de agrupación por zona

El componente usa `Formik` para gestionar un formulario con selects por zona. Cada zona tiene configuraciones predefinidas (ej: `DTV1234`, `DTV1212`, `DTV5432`) que expanden a asignaciones individuales por TV mediante un `switch`. Las zonas son:

- **Video Walls** (Norte, Centro, Sur): asignación directa 1 deco → 1 VW
- **Perímetro de TVs**: Escalera Norte (TV23–TV26), Escalera Centro (TV19–TV22), Escalera Sur (TV15–TV18)
- **Barras**: Barra Norte (TV11–TV14), Barra Livertador (TV01–TV03), Barra Sur (TV04–TV07), Barra Pista (TV08–TV10)

## Relaciones

- Renderiza [[MatrizPreset]] como componente hijo en el panel lateral derecho
- Usado por [[../Componentes/App]] a través del router en [[../Conceptos/StateManagement]]
- [[../README]] — documentación general del proyecto
- [[../AGENTS]] — schema de la wiki y arquitectura
