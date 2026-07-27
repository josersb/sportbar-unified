# ViteProxy

Configuración del proxy de desarrollo de Vite que redirige llamadas a Express (estado compartido y comandos) y al Arranger en ARRANGER_HOST (configurable en `.env`, default `192.168.2.254`), evitando problemas de CORS durante el desarrollo local. También define la estrategia de chunks para el build de producción.

Ubicación: `vite.config.js`

## Proxy de desarrollo

```javascript
proxy: {
  "/api/device/": { target: "http://localhost:3101" },
  "/api/state":   { target: "http://localhost:3101" },
  "/api/tvrack":  { target: "http://localhost:3101" },
  "/api":         { target: "http://ARRANGER_HOST" },
}
```

### Comportamiento
- `/api/device/*`, `/api/state`, `/api/tvrack/*` → Express en `localhost:3101` (state store + comandos)
- `/api/command/*` y resto → Arranger en ARRANGER_HOST (configurable en `.env`, default `192.168.2.254`)
- Las rutas específicas (`/api/tvrack`) van **primero** para que matcheen antes que el genérico `/api`
- `changeOrigin: true` modifica el header `Origin` para que coincida con el target
- Handlers de `error` y `proxyReq` para logging en consola

### Entorno de desarrollo (v2)

El nuevo entorno de desarrollo usa el puerto **3101** para evitar conflictos con la versión legacy en `:3000`:

| Servicio | Puerto | Script |
|----------|--------|--------|
| Vite (frontend) | 5173 | `pnpm run dev` |
| Express (backend) | 3101 | `$env:PORT=3101; pnpm run serve` |
| Ambos | — | `pnpm run sportbar:dev` |

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
| `ui` | react-select |

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

- La [[../API/ArrangerApi]] usa el proxy para comandos y el state store de TVRACK
- [[../Configuracion/PnpmSetup]] — gestor de paquetes que ejecuta Vite
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki y arquitectura Vite
