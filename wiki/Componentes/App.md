# App

Componente raíz de la aplicación React. Inicializa el estado global desde localStorage, define los 4 handlers de modificación de estado, y envuelve toda la app en el `ProviderUser` del contexto global. Renderiza el componente Body como hijo único.

Ubicación: `src/App.jsx`

## Props / Estado

No recibe props. Es el punto de entrada de la aplicación.

### Inicialización
- Intenta leer `localStorage.getItem("estadoApp")`
- Si existe, lo usa como estado inicial (`useState(estadoAppGuardado)`)
- Si no existe, usa `estadoInicial` de [[Contexto]]

### Persistencia automática
Un `useEffect` guarda el estado completo en `localStorage.setItem("estadoApp", JSON.stringify(estado))` cada vez que `estado` cambia.

## Handlers de estado

App define 4 handlers que pasan al contexto. Cada uno usa `setEstado` con spread del estado anterior para actualizar solo la sección correspondiente:

| Handler | Sección que modifica | Usado por |
|---------|---------------------|-----------|
| `handleChangeEstadoDecos(decos)` | `estado.decos` | [[Canales]] |
| `handleChangeEstadoAudio(audio)` | `estado.audio` | [[Audio]] |
| `handleChangeEstadoVideo(tvs)` | `estado.tvs` | [[MatrizVideo]], [[MatrizPreset]] |
| `handleChangeEstadoPreset(descripcionPreset)` | `estado.descripcionPreset` | [[MatrizPreset]] |

## Provider

```jsx
<ProviderUser value={{
  estado,
  handleChangeEstadoDecos,
  handleChangeEstadoAudio,
  handleChangeEstadoVideo,
  handleChangeEstadoPreset,
}}>
  <Body />
</ProviderUser>
```

## Relaciones

- Es el entry point del [[../Conceptos/StateManagement]]
- Consume [[Contexto]] (`estadoInicial`, `ProviderUser`)
- Renderiza Body (que contiene el router con [[MatrizVideo]], [[Canales]], [[Audio]], [[Arranger]], [[Aside]])
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
