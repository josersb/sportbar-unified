# ViteProxy

Configuración del proxy de desarrollo de Vite que redirige llamadas a `/api` hacia el controlador Arranger en `192.168.2.254`, evitando problemas de CORS durante el desarrollo local. También define la estrategia de chunks para el build de producción.

Ubicación: `vite.config.js`

## Proxy de desarrollo

```javascript
proxy: {
  "/api": {
    target: "http://192.168.2.254",
    changeOrigin: true,
    secure: false,
  }
}
```

### Comportamiento
- Toda request a `http://localhost:5173/api/*` se redirige a `http://192.168.2.254/api/*`
- `changeOrigin: true` modifica el header `Origin` para que coincida con el target
- `secure: false` acepta certificados SSL inválidos del Arranger
- Handlers de `error` y `proxyReq` para logging en consola

### Importante
Los componentes actualmente **no usan** el proxy — hacen fetch directo a `http://192.168.2.254/api/command/...`. El proxy está configurado y disponible, pero las llamadas usan la IP directa con `mode: "no-cors"`. La [[../API/ArrangerApi]] (`arrangerApi.js`) sí está preparada para usar variables de entorno (`VITE_ARRANGER_API_BASE`) que permitirían rutear por el proxy si se configurara.

## Dev Server

| Configuración | Valor |
|---------------|-------|
| Puerto | 5173 |
| Host | `true` (acepta conexiones externas) |
| Auto-open | `true` |
| CORS | `true` |

## Build de producción

### Chunks manuales
La configuración de Rollup separa las dependencias en 4 chunks:
| Chunk | Paquetes |
|-------|----------|
| `vendor` | react, react-dom |
| `router` | react-router-dom |
| `forms` | formik, react-hook-form |
| `ui` | styled-components, react-select |

### Otras configuraciones de build
- `outDir`: `dist`
- `minify`: `esbuild`
- `target`: `esnext`
- `sourcemap`: `false`
- `chunkSizeWarningLimit`: 1000 KB

## Variables de entorno

- Prefijo: `VITE_` (solo variables con este prefijo se exponen al cliente)
- `define` expone `__APP_VERSION__` y `__ARRANGER_API__` como constantes globales

## Relaciones

- La [[../API/ArrangerApi]] puede usar el proxy si se configura `VITE_ARRANGER_API_BASE`
- [[../Configuracion/PnpmSetup]] — gestor de paquetes que ejecuta Vite
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki y arquitectura Vite
