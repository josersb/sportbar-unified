# StateManagement

Patrón de gestión de estado global de SportBar Unified. Combina React Context API para el estado en memoria con **persistencia dual**: localStorage (cliente) + lowdb en Express (servidor). Esto permite que múltiples equipos en la red local compartan el mismo estado.

## Arquitectura

```
App.jsx (useState + useEffect → carga servidor → localStorage → default)
  ├── GET /api/state → lowdb (server/state.json) [prioridad 1]
  ├── localStorage "estadoApp" [prioridad 2, fallback]
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
- `estadoInicial` — objeto con la estructura completa del estado (dispositivos, tvs, audio, favoritos, descripcionPreset)
- `ProviderUser` — alias del Provider para envolver la app

### 2. Provider y Handlers
Archivo: [[../Componentes/App]] (`src/App.jsx`)

- `useState(estadoAppGuardado)` — inicializa desde servidor (lowdb), luego localStorage, luego `estadoInicial`
- `useEffect` — persiste cambios en localStorage y fire-and-forget al servidor (`POST /api/state`)
- 4 handlers que usan `setEstado` con spread para actualización inmutable

### 3. Persistencia dual

| Capa | Tecnología | Ubicación | Propósito |
|------|-----------|-----------|-----------|
| Servidor | lowdb 7.0.1 | `server/state.json` (Express) | Estado compartido entre equipos en red |
| Cliente | localStorage | Navegador | Disponible sin conexión al servidor |

**Flujo de carga**: `GET /api/state` → localStorage `estadoApp` → `estadoInicial` (default)  
**Flujo de guardado**: `localStorage.setItem` + `POST /api/state` (fire-and-forget)

### 4. localStorage
- Key principal: `estadoApp` — estado actual de la aplicación
- Keys de presets: `estadoApp_Preset1` a `estadoApp_Preset5` — 5 configuraciones guardables

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
