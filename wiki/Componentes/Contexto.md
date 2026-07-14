# Contexto

Archivo de definición del estado global de la aplicación. Crea el `React.createContext()`, define el estado inicial (`estadoInicial`), inicializa los 5 presets en localStorage si no existen, y exporta `ProviderUser` y `ContextoUser` para que los componentes consuman el estado.

Ubicación: `src/contexto/Contexto.jsx`

## Estado Inicial (`estadoInicial`)

### Decodificadores (`decos`)
Array de 8 objetos `{ nombreDeco, canalDeco }` con valores por defecto:
- DTV1 → 1603, DTV2 → 1604, DTV3 → 1605, DTV4 → 1608
- DTV5 → 1621, DTV6 → 1629, DTV7 → 1631, DTV8 → 1644

### Favoritos (`favoritos`)
Array de 20 números de canal: 1603, 1604, 1605, 1608, 1609, 1610, 1612, 1613, 1614, 1620, 1621, 1622, 1623, 1625, 1628, 1629, 1631, 1639, 1644, 1677.

### TVs (`tvs`)
Objeto con 30+ propiedades mapeando destino → deco fuente. Incluye:
- **Video Walls**: VWN, VWC, VWS (todos → DTV1 por defecto)
- **TVs individuales**: TV01–TV26 (todos → DTV1 por defecto)
- **TV Rack**: TVRACK → DTV1
- **Agrupaciones de barra**: `TvsBarraLivertador`, `TvsBarraSur`, `TvsBarraPista`, `TvsBarraNorte`
- **Agrupaciones de escalera**: `TvsEscaleraNorte`, `TvsEscaleraCentro`, `TvsEscaleraSur`

### Audio (`audio`)
Array de 3 objetos `{ nombreZona, fuenteAudio, volumen, mute }`:
- Sur → DTV1, -21 dB, sin mute
- Centro → DTV1, -23 dB, sin mute
- Norte → DTV1, -21 dB, sin mute

### Descripción de Presets (`descripcionPreset`)
Array de 5 objetos `{ presetX: "ingresar descripción" }`.

## Inicialización de localStorage

Al cargar el módulo, se ejecutan 5 verificaciones — una por preset (`estadoApp_Preset1` a `estadoApp_Preset5`). Si alguna key no existe en localStorage, se crea con `JSON.stringify(estadoInicial)`.

## Exports

- `ContextoUser` (default) — el contexto de React
- `estadoInicial` (named) — usado por [[../Componentes/App]] para inicializar `useState`
- `ProviderUser` (named) — alias de `ContextoUser.Provider`

## Relaciones

- Es la base de [[../Conceptos/StateManagement]]
- [[../Componentes/App]] lo consume para crear el provider global
- Todos los componentes ([[MatrizVideo]], [[MatrizPreset]], [[Canales]], [[Audio]], [[Aside]]) consumen `ContextoUser`
- Inicializa las keys del [[../Conceptos/SistemaPresets]]
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
