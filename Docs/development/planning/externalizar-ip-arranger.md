# Plan: Externalizar IP y Token del Arranger

**Fecha**: 25 jul 2026 | **Estado**: En implementación | **Prioridad**: Media

---

## Diagnóstico

La IP `192.168.2.254` y el token del Arranger están hardcodeados en múltiples archivos. Si la IP cambia (mudanza, cambio de subnet, nuevo hardware), hay que modificar 4 archivos distintos.

### Ubicaciones de la IP hardcodeada

| # | Archivo | Línea | Contexto | Tipo |
|---|---|---|---|---|
| 1 | `vite.config.js` | 32 | `target: "http://192.168.2.254"` — Vite dev proxy | 🔴 Código |
| 2 | `vite.config.js` | 81 | `__ARRANGER_API__: "http://192.168.2.254/api/command"` — global constant | 🔴 Código |
| 3 | `server/server.js` | 22 | CSP `connect-src` | 🟡 Infra |
| 4 | `server/server.js` | 26 | CSP `frame-src` | 🟡 Infra |
| 5 | `server/server.js` | 175 | `get status` proxy URL builder | 🔴 Código |
| 6 | `server/server.js` | 206 | Generic command proxy URL builder | 🔴 Código |
| 7 | `Arranger.jsx` | 10,13,16,19,22 | 5 links a la UI web del Arranger | 🟡 UI |
| 8 | `index.http` | — | 7 requests de prueba HTTP | ⚪ Dev tool |

### Wiki (35+ referencias — detectado 25 jul)

La IP también está hardcodeada en 13 páginas de la wiki. La estrategia es distinta al código: reemplazar la IP literal por `ARRANGER_HOST` o `$VITE_ARRANGER_HOST` con una nota de que el valor se configura en `.env`.

| # | Página | Ocurrencias |
|---|---|---|
| 1 | `wiki/API/ArrangerApi.md` | 3 |
| 2 | `wiki/API/ArrangerHttpExamples.md` | 11 |
| 3 | `wiki/Dispositivos/Arranger-IPEXCB.md` | 5 |
| 4 | `wiki/Componentes/Arranger.md` | 6 |
| 5 | `wiki/Configuracion/ViteProxy.md` | 2 |
| 6 | `wiki/Configuracion/Seguridad.md` | 2 |
| 7 | `wiki/Componentes/MatrizVideo.md` | 1 |
| 8 | `wiki/Componentes/MatrizPreset.md` | 1 |
| 9 | `wiki/Componentes/Canales.md` | 1 |
| 10 | `wiki/Componentes/Audio.md` | 1 |
| 11 | `wiki/Conceptos/APIErrorHandling.md` | 1 |
| 12 | `wiki/log.md` | 2 |
| 13 | `wiki/index.md` | 1 |

### Ubicaciones del token

| # | Archivo | Línea | Contexto |
|---|---|---|---|
| 1 | `server/server.js` | 174 | `process.env.ARRANGER_TOKEN \|\| "TOKEN_REMOVED"` — ✅ ya usa env |
| 2 | `src/api/arrangerApi.js` | 15 | `import.meta.env.VITE_ARRANGER_TOKEN` — ✅ ya usa env |
| 3 | `.env` | 17 | `VITE_ARRANGER_TOKEN=TOKEN_REMOVED` — ✅ definido |

### Estado actual de `.env`

Ya existe `.env` con las variables necesarias pero **no se usan** en el código:

```ini
VITE_ARRANGER_HOST=192.168.2.254
VITE_ARRANGER_PORT=80
VITE_ARRANGER_API_BASE=http://192.168.2.254/api/command
VITE_ARRANGER_TOKEN=TOKEN_REMOVED
```

---

## Plan de acción

### Paso 1: Agregar variables de entorno para el server

**Archivo**: `.env`

Agregar variables sin prefijo `VITE_` para que el server (Express, Node) pueda leerlas:

```ini
# Server-side Arranger config (sin VITE_ — Node process.env)
ARRANGER_HOST=192.168.2.254
ARRANGER_PORT=80
ARRANGER_TOKEN=TOKEN_REMOVED
```

### Paso 2: Actualizar `vite.config.js`

**Archivo**: `vite.config.js`

Cambiar la IP hardcodeada por variables de entorno:

```js
// Antes:
target: "http://192.168.2.254",

// Después:
target: `http://${process.env.ARRANGER_HOST || '192.168.2.254'}:${process.env.ARRANGER_PORT || '80'}`,
```

Y la constante global:

```js
// Antes:
__ARRANGER_API__: JSON.stringify("http://192.168.2.254/api/command"),

// Después:
__ARRANGER_API__: JSON.stringify(
  `http://${process.env.ARRANGER_HOST || '192.168.2.254'}:${process.env.ARRANGER_PORT || '80'}/api/command`
),
```

### Paso 3: Actualizar `server/server.js`

**Archivo**: `server/server.js`

Crear una constante al inicio del archivo:

```js
const ARRANGER_HOST = process.env.ARRANGER_HOST || '192.168.2.254';
const ARRANGER_PORT = process.env.ARRANGER_PORT || '80';
const ARRANGER_BASE = `http://${ARRANGER_HOST}:${ARRANGER_PORT}`;
```

Reemplazar las 4 ocurrencias:

```js
// CSP (líneas 22, 26)
connectSrc: ["'self'", ARRANGER_BASE],  // antes: "http://192.168.2.254"
frameSrc: ["'self'", ARRANGER_BASE],    // antes: "http://192.168.2.254"

// Proxy getStatus (línea 175)
const url = `${ARRANGER_BASE}/api/command/get status ${id}/${token}`;  // antes: http://192.168.2.254/...

// Proxy relay (línea 206)
const url = `${ARRANGER_BASE}/api/command/${encodeURIComponent(command)}/${token}`;  // antes: http://192.168.2.254/...
```

### Paso 4: Actualizar `Arranger.jsx`

**Archivo**: `src/componentes/Arranger.jsx`

Usar `import.meta.env.VITE_ARRANGER_HOST` para los 5 links:

```jsx
const ARRANGER_UI = `http://${import.meta.env.VITE_ARRANGER_HOST || '192.168.2.254'}`;

// Reemplazar los 5 href:
href={`${ARRANGER_UI}/#/status`}
href={`${ARRANGER_UI}/#/matrix`}
href={`${ARRANGER_UI}/#/tools/previews`}
href={`${ARRANGER_UI}/#/device-settings`}
href={`${ARRANGER_UI}/#/tools`}
```

### Paso 5: Actualizar `.env.example`

**Archivo**: `.env.example`

Actualizar la sección de Arranger con las variables reales que se usan:

```ini
# Arranger Matrix API Configuration
# IP del controlador Arranger en la red local
VITE_ARRANGER_HOST=192.168.2.254
# Puerto HTTP del Arranger (default: 80)
VITE_ARRANGER_PORT=80
# Token de seguridad generado por el Arranger
VITE_ARRANGER_TOKEN=your-arranger-token-here

# Server-side (sin prefijo VITE_ — solo disponible en Node/Express)
ARRANGER_HOST=192.168.2.254
ARRANGER_PORT=80
ARRANGER_TOKEN=your-arranger-token-here
```

### Paso 6: `index.http` (baja prioridad)

Dejar como está — es un archivo de desarrollo para pruebas manuales con REST Client. Usar una variable `@host` al principio:

```http
@host = 192.168.2.254

GET http://{{host}}/api/command/...
```

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `process.env` no disponible en `vite.config.js` | Vite expone `process.env` en su config file |
| Las variables `VITE_*` se exponen al cliente (browser) | Es esperado — necesitamos que `Arranger.jsx` acceda a `VITE_ARRANGER_HOST` |
| Las variables sin `VITE_` son solo server-side | Correcto — `server.js` usa `process.env` de Node |

---

### Paso 7: Actualizar wiki (13 páginas)

Reemplazar `192.168.2.254` en todas las páginas wiki por `ARRANGER_HOST` (configurable en `.env`, default `192.168.2.254`):

- Páginas de referencia de API (ejemplos HTTP): `http://<ARRANGER_HOST>/api/command/...`
- Páginas de dispositivo: `| Dirección IP | ARRANGER_HOST (configurable en .env, default 192.168.2.254) |`
- Páginas de configuración: `proxy /api → ARRANGER_HOST`
- Páginas de componentes: `URL base: http://<ARRANGER_HOST>/api/command/`

---

## Archivos a modificar

| Archivo | Cambios | Líneas |
|---|---|---|
| `.env` | +3 líneas (ARRANGER_HOST, ARRANGER_PORT, ARRANGER_TOKEN) | 3 |
| `vite.config.js` | 2 reemplazos (proxy target + __ARRANGER_API__) | 2 |
| `server/server.js` | +3 constantes + 4 reemplazos | 7 |
| `Arranger.jsx` | +1 constante + 5 reemplazos | 6 |
| `.env.example` | Actualizar sección Arranger | ~8 |
| `index.http` | Agregar variable @host | 1 |
| `wiki/API/ArrangerApi.md` | 3 reemplazos | 3 |
| `wiki/API/ArrangerHttpExamples.md` | 11 reemplazos | 11 |
| `wiki/Dispositivos/Arranger-IPEXCB.md` | 5 reemplazos | 5 |
| `wiki/Componentes/Arranger.md` | 6 reemplazos | 6 |
| `wiki/Configuracion/ViteProxy.md` | 2 reemplazos | 2 |
| `wiki/Configuracion/Seguridad.md` | 2 reemplazos | 2 |
| `wiki/Componentes/MatrizVideo.md` | 1 reemplazo | 1 |
| `wiki/Componentes/MatrizPreset.md` | 1 reemplazo | 1 |
| `wiki/Componentes/Canales.md` | 1 reemplazo | 1 |
| `wiki/Componentes/Audio.md` | 1 reemplazo | 1 |
| `wiki/Conceptos/APIErrorHandling.md` | 1 reemplazo | 1 |

**Total**: ~62 líneas modificadas en 17 archivos.

---

## Validación

- [ ] `pnpm run sportbar:dev` — verificar que Vite proxy sigue funcionando
- [ ] `pnpm run test` — todos los tests pasan
- [ ] En el bar: verificar que los links de Arranger.jsx abren la UI correcta
- [ ] En el bar: verificar que CSP permite conexiones al Arranger
- [ ] Cambiar temporalmente `ARRANGER_HOST` a una IP inválida y verificar que el error es claro
