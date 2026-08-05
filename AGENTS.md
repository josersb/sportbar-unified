# AGENTS.md — SportBar Unified

## Idioma de Configuracion
Todos los procesos de pensamiento y respuestas deben ser generados en Espanol.

## Entorno de Ejecucion (MANDATORIO — leer antes de ejecutar cualquier comando)

| Dato | Valor |
|---|---|
| Sistema operativo | **Windows** |
| Terminal | **PowerShell 7+ (pwsh)** |
| Shell scripts | Usar `node -e "..."` o `pwsh -Command "..."`, NUNCA `rm`, `cp`, `chmod` ni pipes de Unix |
| Paths | Backslash o forward slash, PowerShell acepta ambos. Usar forward slash por consistencia con Git. |
| Comandos compuestos | `&&` funciona en pwsh. `;` solo si no importa el exit code. |

**⚠️ Todos los agentes y subagentes DEBEN adaptar sus comandos a PowerShell 7+.** Si un comando documentado usa `rm -rf`, traducirlo a `Remove-Item -Recurse -Force`. Si usa `grep`, usar `Select-String`. NUNCA asumir que el entorno es Unix/Linux.

### Servidores y procesos de larga duración (MANDATORIO)

**NUNCA iniciar servidores con timeout.** Un timeout mata el proceso automáticamente, lo cual es ilógico para un servidor que debe correr hasta que el usuario decida detenerlo.

| Regla | Instrucción |
|---|---|
| Inicio | Usar `Start-Process -NoNewWindow pwsh -ArgumentList "-Command", "<comando>"` para lanzar en segundo plano. Redirigir salida con `> $null 2>&1` para no quedarse escuchando. |
| Timeout | **NUNCA** usar timeout en comandos de servidores. Si la herramienta lo exige, usar `Start-Process`. |
| Cierre | **ANTES de iniciar**, proporcionar al usuario los comandos para matar el proceso. |
| Soltar | Inmediatamente después de lanzar, **soltar y volver al chat**. No quedarse escuchando logs. |

**Ejemplo correcto para Vite:**
```powershell
Start-Process -NoNewWindow pwsh -ArgumentList "-Command", "pnpm run dev"
```
**Para matarlo después:**
```powershell
Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*vite*" } | Stop-Process -Force
```

**Ejemplo correcto para Express:**
```powershell
Start-Process -NoNewWindow pwsh -ArgumentList "-Command", "pnpm run serve"
```
**Para matarlo después:**
```powershell
Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*server.js*" } | Stop-Process -Force
```

**⚠️ Configuración de worktree NUNCA se versiona.** Los puertos específicos de cada worktree viven en `worktree.config.json` (gitignored). `vite.config.js`, `server/server.js`, y `package.json` leen de ese archivo y permanecen genéricos. Al mergear feat/* → v2, estos archivos no generan conflictos de configuración.

## Project Overview
Aplicacion React/Vite para controlar una matriz audiovisual de sport bars. Se interfacea con hardware fisico (matriz Arranger en `192.168.2.254:80`).

## Arquitectura
- **Frontend**: React 18 + Vite 5 (ES modules, puerto 5173 dev / 3000 prod)
- **Backend**: Express 4 server en directorio `server/` (CommonJS)
- **Estado**: Context API global (`src/contexto/Contexto.jsx`) + persistencia en localStorage (5 presets: `estadoApp_Preset1` a `estadoApp_Preset5`)
- **Hardware**: 8 decodificadores DirecTV (DTV1-DTV8), 40+ TVs, 3 zonas de audio (Norte, Centro, Sur)

## Estrategia de Branching (DETERMINISTICA — el orquestador DEBE leer esto al iniciar sesion)

Este proyecto usa múltiples ramas y worktrees. El orquestador debe seguir estas reglas sin excepción.

### Puertos por entorno

| Rama | Worktree | Vite | Express | Script |
|------|----------|------|---------|--------|
| `v2` | `sportbar-unified` (principal) | 5173 | 3101 | `pnpm run sportbar:dev` |
| `feat/ahm-integration` | `sportbar-unified-worktrees/ahm-integration` | 5174 | 3102 | `pnpm run sportbar:dev` |
| `master` | — | — | 3000 | producción (solo deploy) |

### Flujo de trabajo

```
feat/ahm-integration ──→ v2 ──→ master
     (worktree aislado)   (staging)  (producción)
```

### Reglas obligatorias para el orquestador

1. **Al iniciar sesión**, verificar `git branch --show-current` y `git worktree list`
2. **NUNCA commit directo a `master`**. Solo merge desde `v2`.
3. **NUNCA commit directo a `v2`**. Solo merge desde `feat/*` branches. (Excepción: hotfixes urgentes con aprobación explícita del usuario)
4. **Si la rama actual es `master`**, preguntar al usuario: "¿Querés trabajar en `v2` (mejoras) o en `feat/ahm-integration`?". No asumir.
5. **Si se inicia una feature nueva**, crear worktree + feature branch. Asignar puerto secuencial (3103, 3104...). Documentar en AGENTS.md y wiki.
6. **Todo push incluye** `git push origin <branch>` — nunca trabajar solo local.
7. **Rebase periódico**: cada feature branch se re-basea desde `v2` para mantenerse al día.
8. **El state store del Express usa puertos diferentes por worktree** — verificar que CORS y CSP en `server/server.js` incluyan el puerto correcto.

### Worktrees activos (mantener actualizado)

| Worktree | Rama | Vite | Express |
|----------|------|------|---------|
| `sportbar-unified` (principal) | `v2` | 5173 | 3101 |
| `sportbar-unified-worktrees/ahm-integration` | `feat/ahm-integration` | 5174 | 3102 |
| `sportbar-unified-worktrees/buttons-redesign` | `feat/buttons-redesign` | 5176 | 3104 |
| `sportbar-unified-worktrees/frontend-redesign` | `feat/frontend-redesign` | ? | ? |
| `sportbar-unified-worktrees/security-ronda-4` | `feat/security-ronda-4` | ? | ? |

Para crear un nuevo worktree:
```bash
git worktree add -b feat/<nombre> ../sportbar-unified-worktrees/<nombre> v2
# Luego generar la configuración automáticamente:
node scripts/bootstrap-worktree.cjs --name "feat/<nombre>" --vite-port <puerto> --express-port <puerto>
```
La configuración de puertos queda en `worktree.config.json` (gitignored). `vite.config.js`, `server/server.js`, y `package.json` leen de ese archivo — no se modifican por worktree. Al mergear feat/* → v2, estos archivos no generan conflictos.

**⚠️ pnpm 11 — worktree nuevo**: después de `pnpm install`, verificar `pnpm-workspace.yaml`. Si `allowBuilds` tiene `"set this to true or false"`, reemplazar por `true` en los 4 paquetes (esbuild, @fortawesome/fontawesome-common-types, @fortawesome/fontawesome-svg-core, snyk). Sin esto, `pnpm run build` falla con `ERR_PNPM_IGNORED_BUILDS`. Solución documentada en Engram #630.

**⚠️ Server en worktree nuevo**: el `pnpm-lock.yaml` del server referencia paths del worktree original. `pnpm install` en `server/` dice "Already up to date" pero no crea `server/node_modules/`. Solución en 2 pasos:
1. `Remove-Item -Force server/pnpm-lock.yaml`
2. `pnpm install --ignore-workspace` (en el directorio `server/`)

El flag `--ignore-workspace` es necesario porque pnpm 11 detecta el `pnpm-workspace.yaml` de la raíz y no trata `server/` como proyecto independiente. Documentado en Engram #648.

## Variables de Entorno y Secrets (MANDATORIO)

### Estrategia híbrida

| Tipo | Dónde vive | Ejemplos |
|---|---|---|
| **No sensibles** (host, puerto, flags) | `.env-shared` en `Proyectos hip/` | `VITE_ARRANGER_HOST`, `VITE_ARRANGER_PORT`, `VITE_MOCK_ARRANGER` |
| **Secretos** (tokens, keys) | Variable de entorno del sistema Windows | `VITE_ARRANGER_TOKEN` |

### `.env-shared`

Archivo único en `C:\Users\joserafael\Proyectos\proyectos hip\.env-shared`. Cada worktree tiene un **symlink** `.env → ../../.env-shared`. Al editar `.env-shared`, todos los worktrees ven el cambio al instante.

**Al crear un worktree nuevo:**
```powershell
Remove-Item ".env" -Force -ErrorAction SilentlyContinue
New-Item -ItemType SymbolicLink -Path ".env" -Target "..\..\.env-shared"
```

**⚠️ El token NO está en este archivo.** `.env-shared` contiene un comentario recordatorio.

### `VITE_ARRANGER_TOKEN`

Vive en el sistema operativo, nunca en un archivo del proyecto. Esto evita que un commit, un `git clean`, o una copia del worktree filtren el token.

**Consultar el token actual:**
```powershell
[Environment]::GetEnvironmentVariable('VITE_ARRANGER_TOKEN', 'User')
```

**Cambiar el token:**
```powershell
[Environment]::SetEnvironmentVariable('VITE_ARRANGER_TOKEN', '<token-real>', 'User')
# Reiniciar la terminal para que Vite/Express lo lean
```

**⚠️ Si Vite no encuentra el token**, verificar que la variable esté configurada a nivel `User` (no `Process`). Usar `[Environment]::GetEnvironmentVariable(...)` para confirmar.

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

## LLM Wiki Schema

Esta sección define las reglas de la wiki markdown interconectada del proyecto. El LLM lee este schema antes de cualquier operación de wiki (ingest, lint, query, creación de páginas).

### Entity Types

Tipos de páginas que pueden existir en esta wiki:

| Type | Description | Naming convention | Example |
|------|-------------|-------------------|---------|
| Componente React | Página funcional o UI del frontend | `Componentes/Nombre.md` | `Componentes/MatrizVideo.md` |
| API / Endpoint | Integración externa o endpoint del servidor | `API/Nombre.md` | `API/ArrangerApi.md` |
| Dispositivo Hardware | Equipo físico conectado a la matriz | `Dispositivos/{Fabricante}/{Categoria}/Dispositivo.md` | `Dispositivos/DirecTV/Decodificadores/Decodificadores.md` |
| Concepto | Patrón, idea o principio de diseño | `Conceptos/Nombre.md` | `Conceptos/StateManagement.md` |
| Configuración | Archivo o conjunto de settings del proyecto | `Configuracion/Nombre.md` | `Configuracion/Vite.md` |
| Preset | Configuración guardada de estado de la matriz | `Presets/Nombre.md` | `Presets/Preset1.md` |
| Source | Documento ingerido a la wiki desde fuente externa | `Sources/YYYY-MM-DD-Titulo.md` | `Sources/2026-02-14-DevicesAll.md` |
| Decision | Elección de diseño con justificación y tradeoffs | `Decisions/YYYY-MM-DD-Titulo.md` | `Decisions/2026-01-19-PnpmChoice.md` |
| Query | Pregunta que produjo una respuesta valiosa | `Queries/Titulo.md` | `Queries/ComoFuncionaJoinAV.md` |

#### Catálogo de Entidades Conocidas

##### Componentes React

| Componente | Ruta | Descripción |
|------------|------|-------------|
| MatrizVideo | `src/componentes/MatrizVideo.jsx` | Control principal de la matriz de video |
| MatrizPreset | `src/componentes/MatrizPreset.jsx` | Gestión de presets de configuración |
| Canales | `src/componentes/Canales.jsx` | Visualización y gestión de canales |
| Audio | `src/componentes/Audio.jsx` | Control de zonas de audio |
| Arranger | `src/componentes/Arranger.jsx` | Interface con la matriz Arranger |
| Aside | `src/componentes/Aside.jsx` | Panel lateral de navegación |
| Portada | `src/componentes/Portada.jsx` | Página de inicio |
| Nav | `src/componentes/Nav.jsx` | Barra de navegación superior |
| Soporte | `src/componentes/Soporte.jsx` | Información de soporte técnico |
| Header | `src/componentes/Header.jsx` | Cabecera común |
| Body | `src/componentes/Body.jsx` | Layout principal |
| Select | `src/componentes/Select.jsx` | Componente reutilizable de selección |
| Radio | `src/componentes/Radio.jsx` | Componente radio button |
| CheckBox | `src/componentes/CheckBox.jsx` | Componente checkbox |
| TextInput | `src/componentes/TextInput.jsx` | Componente input de texto |
| CanalFavorito | `src/elementos/CanalFavorito.jsx` | Componente de canal favorito |

##### APIs y Endpoints

| API | Fuente | Descripción |
|-----|--------|-------------|
| ArrangerApi | `src/api/arrangerApi.js` | Cliente HTTP para comandos de la matriz |
| Comando `join av` | Arranger API | Conecta fuente de video/audio a destino |
| Comando `preset load` | Arranger API | Carga un preset en la matriz |
| Comando `send serial` | Arranger API | Envía comandos seriales a dispositivos |
| Comando `get status` | Arranger API | Obtiene estado actual de la matriz |
| Comando `devices all` | Arranger API | Lista todos los dispositivos conectados |

##### Dispositivos Hardware

| Grupo | Dispositivos | Descripción |
|-------|-------------|-------------|
| Decodificadores | DTV1, DTV2, DTV3, DTV4, DTV5, DTV6, DTV7, DTV8 | Decodificadores DirecTV (8) |
| TVs Principales | TV01–TV26 | TVs numeradas del bar (26) |
| TVs Especiales | VWN, VWC, VWS | TVs de áreas especiales (3) |
| TV Rack | TVRACK | TV del rack técnico (1) |
| Zonas de Audio | Norte, Centro, Sur | Zonas de audio independientes (3) |

##### Conceptos

| Concepto | Descripción |
|----------|-------------|
| State Management | Context API global en `src/contexto/Contexto.jsx` |
| Presets (localStorage) | Persistencia de 5 configuraciones en `localStorage` (keys: `estadoApp_Preset1`–`estadoApp_Preset5`) |
| Proxy Vite | Redirección de `/api` → `http://192.168.2.254` en entorno dev |

##### Configuración

| Archivo | Descripción |
|---------|-------------|
| `vite.config.js` | Configuración de Vite (proxy, build, chunks) |
| `server/` | Servidor Express 4 para producción (puerto 3000) |
| `package.json` | Scripts y dependencias del proyecto |
| `.npmrc` | Configuración de npm/pnpm (save-exact, seguridad) |

##### Presets

| Preset | Key en localStorage | Descripción |
|--------|-------------------|-------------|
| Preset1 | `estadoApp_Preset1` | Configuración de matriz 1 |
| Preset2 | `estadoApp_Preset2` | Configuración de matriz 2 |
| Preset3 | `estadoApp_Preset3` | Configuración de matriz 3 |
| Preset4 | `estadoApp_Preset4` | Configuración de matriz 4 |
| Preset5 | `estadoApp_Preset5` | Configuración de matriz 5 |

### Categories for index.md

Secciones del `index.md`:

```markdown
## Proyecto
## Componentes React
## APIs y Endpoints
## Dispositivos Hardware
## Conceptos
## Configuración
## Presets
## Entorno y Configuración
## Historial y Estado
## Análisis
## Referencias de API
## Sources
## Decisions
## Queries
```

### Naming Conventions

- **Archivos de entidad**: `PascalCase.md` — igual que el nombre de la entidad en el código o hardware. Ej: `MatrizVideo.md`, `DTV1.md`, `ArrangerApi.md`.
- **Archivos de fuente y decisión**: prefijo `YYYY-MM-DD-` + título en `kebab-case`. Ej: `2026-02-14-DevicesAll.md`.
- **Archivos de query**: `PascalCase.md` con prefijo descriptivo. Ej: `ComoFuncionaJoinAV.md`.
- **Carpetas**: una por entity type, en español y `PascalCase`: `Componentes/`, `API/`, `Dispositivos/`, `Conceptos/`, `Configuracion/`, `Presets/`, `Sources/`, `Decisions/`, `Queries/`.
- **Títulos de página**: `# Nombre de la Entidad` (primera línea, usado como display name en Obsidian). Coincide con el nombre de archivo.
- **Archivos raíz obligatorios**: `index.md`, `log.md`. Van en la raíz del vault (no en subcarpetas).

### Link Conventions

- **Wikilinks con path relativo**: `[[Componentes/MatrizVideo]]` para páginas en subcarpetas. `[[README]]` para páginas en raíz.
- **Desde página anidada a raíz**: `[[../README]]`, `[[../AGENTS]]`.
- **Desde página anidada a sibling**: `[[../API/ArrangerApi]]`.
- **Regla de inbound mínimo**: toda página de entidad DEBE tener al menos un wikilink entrante desde otra página. Las páginas huérfanas (sin inbound links) se detectan en lint y requieren corrección.
- **Cross-linking esperado por tipo**:
  - Componente → vinculado desde su Concepto (State Management) y desde la página de ruta que lo renderiza.
  - API → vinculado desde los Componentes que la consumen y desde Dispositivos que controla.
  - Dispositivo → vinculado desde la API que lo gestiona y desde los Componentes que lo usan
  - Dispositivo jerárquico → mismo que Dispositivo plano, más los placeholders de su misma categoría..
  - Concepto → vinculado desde todos los Componentes y APIs que lo implementan.
  - Preset → vinculado desde `MatrizPreset` y desde los Dispositivos que referencia.
  - Decision → vinculado desde las entidades y conceptos que afecta.
- **Dispositivos jerárquicos**: `[[Dispositivos/{Fabricante}/{Categoria}/Dispositivo]]` para dispositivos en la nueva estructura. Ej: `[[Dispositivos/Liberty/Distribucion/IPEX5001-Encoder]]`.
- **No usar paths absolutos** (con `C:\` o `/home/`). Solo paths relativos dentro del vault.
- **No usar Markdown links** `[texto](path)`. Siempre `[[wikilinks]]`.

### Ingest Triggers

Qué eventos disparan actualizaciones de la wiki:

| Trigger | Action |
|---------|--------|
| Nuevo archivo en `API commands/` | Full ingest: crear/actualizar página en `API/`, cross-link a Dispositivos relevantes, actualizar `index.md` y `log.md` |
| Nuevo componente React creado o modificado significativamente | Crear/actualizar página en `Componentes/`, vincular a Conceptos relevantes |
| Cambio en `src/api/arrangerApi.js` | Actualizar página `API/ArrangerApi`, revisar cross-links con Dispositivos |
| Cambio en `src/contexto/Contexto.jsx` | Actualizar página `Conceptos/StateManagement`, verificar impacto en Componentes |
| Cambio en configuración (vite, pnpm, express) | Actualizar página en `Configuracion/`, registrar en `log.md` |
| Nuevo preset guardado o cambio en estructura de presets | Actualizar páginas en `Presets/`, revisar referencias en `MatrizPreset` |
| Bug fix con causa raíz | Actualizar entidad afectada, crear Decision si la solución es no-obvia |
| Nuevo documento en `Docs/` | Ingest del documento como Source, cross-link a entidades mencionadas |

