# StateManagement

Patrón de gestión de estado global de SportBar Unified. Combina React Context API para el estado en memoria con localStorage para persistencia, más 4 handlers específicos por dominio que permiten a los componentes modificar secciones independientes del estado sin afectar al resto.

## Arquitectura

```
App.jsx (useState + useEffect → localStorage "estadoApp")
  └── ProviderUser (Context API)
        └── Body (Router)
              ├── MatrizVideo → handleChangeEstadoVideo
              ├── MatrizPreset → handleChangeEstadoVideo, handleChangeEstadoPreset
              ├── Canales → handleChangeEstadoDecos
              ├── Audio → handleChangeEstadoAudio
              └── Aside (solo lectura)
```

## Componentes del sistema

### 1. Contexto Global
Archivo: [[../Componentes/Contexto]] (`src/contexto/Contexto.jsx`)

- `React.createContext()` — crea `ContextoUser`
- `estadoInicial` — objeto con la estructura completa del estado (decos, tvs, audio, favoritos, descripcionPreset)
- `ProviderUser` — alias del Provider para envolver la app

### 2. Provider y Handlers
Archivo: [[../Componentes/App]] (`src/App.jsx`)

- `useState(estadoAppGuardado)` — inicializa desde localStorage o `estadoInicial`
- `useEffect` — persiste todo cambio de estado en `localStorage.setItem("estadoApp")`
- 4 handlers que usan `setEstado` con spread para actualización inmutable:
  - `handleChangeEstadoDecos(decos)`
  - `handleChangeEstadoAudio(audio)`
  - `handleChangeEstadoVideo(tvs)`
  - `handleChangeEstadoPreset(descripcionPreset)`

### 3. localStorage
- Key principal: `estadoApp` — estado actual de la aplicación (se actualiza en cada cambio)
- Keys de presets: `estadoApp_Preset1` a `estadoApp_Preset5` — 5 configuraciones guardables (ver [[../Conceptos/SistemaPresets]])
- Recuperación: al cargar la app, `App.jsx` lee `estadoApp` de localStorage; si no existe, usa `estadoInicial`

## Flujo de actualización

1. Componente recibe `handleChange*` del contexto
2. Llama al handler con la sección modificada (ej: `handleChangeEstadoDecos(nuevoDecos)`)
3. `setEstado` en App hace spread del estado anterior + la sección nueva
4. `useEffect` detecta el cambio y persiste en localStorage
5. Todos los componentes que consumen `ContextoUser` se re-renderizan con el nuevo estado

## Relaciones

- [[../Componentes/Contexto]] — definición del contexto y estado inicial
- [[../Componentes/App]] — provider y handlers
- [[../Conceptos/SistemaPresets]] — mecanismo de presets sobre localStorage
- Todos los componentes consumidores: [[../Componentes/MatrizVideo]], [[../Componentes/MatrizPreset]], [[../Componentes/Canales]], [[../Componentes/Audio]], [[../Componentes/Aside]]
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
