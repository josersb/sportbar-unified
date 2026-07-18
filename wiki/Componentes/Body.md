# Body

Layout principal de la aplicación. Renderiza el `<Header>`, `<Nav>`, `<Aside>` y el `<Routes>` de React Router. Define las 6 rutas de la SPA.

Ubicación: `src/componentes/Body.jsx`

## Rutas definidas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | [[Portada]] | Página de inicio |
| `/inicio` | [[Portada]] | Alias de inicio |
| `/matrizvideo` | [[MatrizVideo]] | Control de matriz de video |
| `/canales` | [[Canales]] | Gestión de canales |
| `/audio` | [[Audio]] | Control de audio |
| `/arranger` | [[Arranger]] | Links al Arranger |
| `/soporte` | [[Soporte]] | Información de soporte |

## Relaciones

- Usa [[../Conceptos/StateManagement]] via React Router
- Renderiza [[Header]], [[Nav]], [[Aside]], y el contenido de ruta
- [[../README]] — documentación general
