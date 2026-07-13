# AGENTS.md — SportBar Unified

## Idioma de Configuracion
Todos los procesos de pensamiento y respuestas deben ser generados en Espanol.

## Project Overview
Aplicacion React/Vite para controlar una matriz audiovisual de sport bars. Se interfacea con hardware fisico (matriz Arranger en `192.168.2.254:80`).

## Arquitectura
- **Frontend**: React 18 + Vite 5 (ES modules, puerto 5173 dev / 3000 prod)
- **Backend**: Express 4 server en directorio `server/` (CommonJS)
- **Estado**: Context API global (`src/contexto/Contexto.jsx`) + persistencia en localStorage (5 presets: `estadoApp_Preset1` a `estadoApp_Preset5`)
- **Hardware**: 8 decodificadores DirecTV (DTV1-DTV8), 40+ TVs, 3 zonas de audio (Norte, Centro, Sur)

## Gestor de Paquetes: pnpm (UNICO)

Este proyecto usa **pnpm** como gestor de paquetes unico para frontend y server.

### Por que pnpm?

| Criterio | npm | pnpm |
|----------|-----|------|
| Instalacion de optional deps en Windows | Bug #4828 | Funciona correctamente |
| Espacio en disco | ~170MB | ~50MB (hard links) |
| Velocidad | Normal | 2-3x mas rapido |
| Lockfile | package-lock.json | pnpm-lock.yaml |

**Insight**: npm tiene un bug documentado que impide instalar correctamente dependencias opcionales nativas (como `@rollup/rollup-win32-x64-msvc`) en Windows. pnpm resuelve esto usando hard links al almacen global.

**Insight**: pnpm usa `pnpm-lock.yaml` en lugar de `package-lock.json`. Ambos lockfiles no son compatibles entre si.

### Comandos Principales (pnpm)
```bash
# Instalacion
pnpm install              # Instalar todas las dependencias (frontend + server)
pnpm install <paquete>    # Instalar paquete en frontend
cd server && pnpm install # Instalar dependencias del server

# Desarrollo
pnpm run dev             # Dev server (puerto 5173)
pnpm run dev:full        # Dev + server simultaneamente

# Build y Produccion
pnpm run build           # Build a dist/
pnpm run preview         # Preview del build
pnpm run serve           # Server Express (puerto 3000)
pnpm run start           # Build + serve combinado

# Setup completo
pnpm run setup:auto      # Setup completo

# Limpieza
pnpm run clean           # Limpiar node_modules del frontend
pnpm run clean:all       # Limpiar frontend + server
```

## Pinned Versions (CRITICO)

Este proyecto exige **versiones exactas** via `.npmrc` (`save-exact=true`).

### Dependencias Frontend

| Paquete | Version Actual | Version Anterior |
|---------|---------------|-----------------|
| react | 18.3.1 | 18.2.0 |
| react-dom | 18.3.1 | 18.2.0 |
| react-router-dom | 6.30.3 | 6.3.0 |
| styled-components | 6.1.0 | 5.3.5 |
| react-select | 5.8.0 | 5.4.0 |
| react-hook-form | 7.53.0 | 7.34.2 |
| vite | 5.4.21 | 3.0.7 |
| @vitejs/plugin-react | 4.3.1 | 2.0.1 |

### Dependencias Server

| Paquete | Version Actual | Version Anterior |
|---------|---------------|-----------------|
| express | 4.19.2 | 4.18.1 |
| path-to-regexp | 0.1.13 | (transitiva) |
| nodemon | 2.0.20 | 2.0.20 |

### Insights sobre las decisiones de versionado

**Vite 5.x en lugar de 3.x**:
- Vite 3.0.7 (2022) referenciaba versiones de Babel que ya no existen en el registry
- Vite 5.4.x es estable, bien testeado, y compatible con Node 18+
- Actualizar a Vite 6.x requiere testing adicional de la aplicacion

**React Router 6.30.3**:
- Incluye parches de seguridad para XSS via Open Redirects
- Compatible con la API de React Router 6.x existente
- No hay cambios de breaking API desde 6.3.0

**Express 4.19.2 en server**:
- Corrige 5 vulnerabilidades de alta severidad
- Usa overrides en `pnpm.overrides` para forzar dependencias seguras
- Requiere Node >=18.0.0

**Insight - styled-components 6.x**:
- Nueva API de renderizado mas rapida
- Requiere migracion menor de estilos (si se usan APIs deprecated)

## Configuracion de Node

- **Node**: 18.17.1 (definido en `.nvmrc` y `volta.node`)
- **Archivo `.nvmrc`**: `18.17.1`

### Auto-switch de Node con nvm-windows

NVM en Windows no lee automaticamente `.nvmrc`. Para auto-switch, usar el script `scripts/nvm-auto-switch.ps1`:

```powershell
# Ejecutar en PowerShell
. .\scripts\nvm-auto-switch.ps1

# Ahora al hacer cd al proyecto, cambia automaticamente a 18.17.1
cd sportbar-unified
```

## Configuracion Vite
- Proxy dev: `/api` -> `http://192.168.2.254`
- Prefijo env: `VITE_` (ej: `VITE_API_URL`)
- Chunks: vendor, router, forms, ui separados

## Rutas de la Aplicacion
- `/` — Portada (home)
- `/matrizvideo` — Control de matriz de video
- `/canales` — Gestion de canales
- `/audio` — Control de audio
- `/arranger` — Interface Arranger
- `/soporte` — Informacion de soporte

## Integracion Externa
- **Arranger API**: `http://192.168.2.254/api/command/[command]/[token]`
- **Protocolo**: HTTP GET, mode: no-cors
- **Comandos**: `join av [SOURCE] [DEST]`, `status`, etc.

## Seguridad

### Frontend (2 vulnerabilidades aceptables)

| Paquete | Severidad | Motivo de Aceptacion |
|---------|-----------|---------------------|
| esbuild (dev) | MODERATE | Solo afecta dev server, no produccion |
| vite 5.x path traversal | MODERATE | El CVE es para vite 6.x, no 5.x |

### Server (5 vulnerabilidades aceptables)

| Paquete | Severidad | Motivo de Aceptacion |
|---------|-----------|---------------------|
| Deps transitivas varias | LOW | Versiones fijadas via overrides, riesgo minimo |

**Insight**: Las vulnerabilidades de esbuild son aceptables porque solo afectan el dev server. vite 5.x path traversal no aplica porque el proyecto usa 5.x, no 6.x.

**Insight**: El server usa `pnpm.overrides` para forzar versiones seguras de body-parser, path-to-regexp, qs y semver que express no puede resolver automaticamente.

### Recomendacion
Ejecutar `pnpm audit` regularmente en ambos directorios. Si se desea eliminar las vulnerabilidades restantes, migrar a Vite 6.x o Express 5.x requerira testing completo.

## Configuracion .npmrc (Corregido)

```ini
# Versiones exactas
save-exact=true
package-lock=true

# Seguridad
audit-level=moderate
fund=false

# Performance
prefer-offline=true

# Logging
loglevel=notice
registry=https://registry.npmjs.org/

# Node
engine-strict=true
progress=true
omit=optional
```

**Nota**: Las opciones `cache-max` y `optional` fueron deprecadas y reemplazadas por sus equivalentes actuales.

## Estructura de Lockfiles

```
sportbar-unified/
├── pnpm-lock.yaml              # Lockfile del frontend
├── server/
│   └── pnpm-lock.yaml         # Lockfile del server
```

**Importante**: pnpm genera su propio lockfile (`pnpm-lock.yaml`). Si anteriormente se uso npm, ejecutar `pnpm install` regenerara el lockfile.

## Brechas Conocidas
- Linting y testing no configurados
- No hay `.env.example`; el script de setup lo crea desde template si existe

## Insights Tecnicos Clave

1. **Bug de npm en Windows**: npm 9.x/10.x no instala correctamente dependencias opcionales nativas. pnpm resuelve esto.

2. **Vite 3 -> 5**: La actualizacion fue necesaria porque las dependencias de Babel referenciadas por Vite 3.x ya no existen.

3. **Exact versions**: El proyecto fue disenado para reproducibilidad maxima con versiones exactas.

4. **pnpm overrides**: Express 4.x no puede resolver automaticamente vulnerabilidades en sus dependencias transitivas. pnpm permite sobreescribir versiones via `pnpm.overrides`.

5. **NVM-Windows**: No soporta auto-switch via `.nvmrc`. Requiere script personalizado.
