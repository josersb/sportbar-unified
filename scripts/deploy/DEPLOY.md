# SportBar v1.1.0 — Guía de Despliegue

## Requisitos de la PC del bar

| Requisito | Detalle |
|-----------|---------|
| SO | Windows 10 o 11 |
| PC Name | La PC donde corre actualmente SportBar v1.0 |
| Usuario | El usuario que ejecuta SportBar (normalmente `salamultimedia`) |
| Node.js | **18.x** (LTS) — instalado en el sistema |
| npm | Viene con Node.js (no se necesita pnpm en el bar) |
| Puerto 3051 | Libre para v1.1.0 |
| Puerto 3000 | Libre para v1.0 (existente) |

---

## 1. HARDENING DE SEGURIDAD (OBLIGATORIO — antes de instalar)

Antes de `npm install`, aplicar el kit de hardening para blindar contra
supply chain attacks en el ecosistema Node.js/npm:

```powershell
cd scripts\deploy\hardening
powershell -ExecutionPolicy Bypass -File ".\Security-Hardening.ps1"
```

Esto aplica **5 capas de protección**:

1. **npm blindado**: `.npmrc` con `ignore-scripts=true` (bloquea preinstall, install, postinstall, prepare)
2. **Proceso aislado**: verifica que no se ejecute como admin/root
3. **Filesystem**: app en modo readonly, solo `state.json` y `logs/` escribibles
4. **Red**: firewall inbound solo desde LAN `192.168.2.0/24` al puerto 3051
5. **Runtime**: flags restrictivos de Node.js (`--no-experimental-fetch`, `--no-warnings`, `--max-http-header-size=16384`)

Si no se puede ejecutar como admin, usar:
```powershell
powershell -ExecutionPolicy Bypass -File ".\Security-Hardening.ps1" -SkipFirewall -SkipFilesystem
```

---

## 2. Build en máquina de desarrollo

Desde el worktree `v2` (directorio `sportbar-unified`):

```powershell
pnpm run sportbar:build
```

Esto genera `dist/` con la SPA React optimizada para producción.

---

## 3. Preparar los archivos para copiar

Los siguientes archivos/carpetas deben copiarse a la PC del bar:

```
sportbar-v1.1.0/
├── dist/                    # Build de React (SPA)
├── server/
│   ├── server.js            # Express server (CommonJS, 545 líneas)
│   ├── package.json         # Dependencias: express, helmet, lowdb, rate-limit
│   └── package-lock.json    # Lockfile de npm (generado en paso 3)
├── scripts/
│   └── deploy/              # Scripts de launcher y monitoreo
│       ├── Iniciar SportBar v1.1.0.bat
│       ├── Iniciar SportBar v1.1.0.ps1
│       ├── SportBar Master.bat
│       ├── SportBar Master.ps1
│       └── logs/            # Se crea solo si no existe
└── .env                     # Variables de entorno (ver paso 4)
```

**No copiar:**
- `node_modules/` — se instalan en el bar con npm
- `server/node_modules/` — ídem
- `src/` — código fuente, no necesario en producción
- `worktree.config.json` — solo para desarrollo con worktrees
- `pnpm-lock.yaml` — no se usa en el bar (se usa npm)

### Copiar a la PC del bar

Opción A — Red local:
```powershell
# Desde la máquina de desarrollo (ajustar NOMBRE_PC_BAR y USUARIO_BAR)
$barPC = "NOMBRE_PC_BAR"       # ej: salamultimedia
$barUser = "USUARIO_BAR"       # ej: salamultimedia
$target = "\\$barPC\Users\$barUser\Documents\sportbar-v1.1.0"
New-Item -ItemType Directory -Path $target -Force

Copy-Item -Recurse "dist" "$target\dist"
Copy-Item -Recurse "server" "$target\server"
Copy-Item -Recurse "scripts\deploy" "$target\scripts\deploy"
```

Opción B — USB / disco externo: copiar manualmente.

---

## 4. Instalar dependencias del server EN la PC del bar

En la PC del bar, abrir PowerShell como el usuario que ejecutará SportBar.

**Antes de instalar**, copiar el `.npmrc` blindado:

```powershell
Copy-Item "$env:USERPROFILE\Documents\sportbar-v1.1.0\scripts\deploy\hardening\.npmrc-production" `
          -Destination "$env:USERPROFILE\Documents\sportbar-v1.1.0\server\.npmrc"
```

Luego instalar:

```powershell
cd $env:USERPROFILE\Documents\sportbar-v1.1.0\server
npm install --production
```

El `.npmrc` garantiza:
- `ignore-scripts=true` — ningún paquete ejecuta postinstall/preinstall/prepare
- `omit=optional` — sin dependencias opcionales
- `audit-level=high` — `npm install` falla si hay HIGH o CRITICAL

Esto instala: `express`, `express-rate-limit`, `helmet`, `lowdb`, `path-to-regexp`.

**Nota**: Se usa **npm** (no pnpm) porque el bar no tiene pnpm instalado. npm viene con Node.js.

---

## 4. Configurar variables de entorno

### 4.1 Archivo `.env`

Crear `%USERPROFILE%\Documents\sportbar-v1.1.0\.env`:

```env
# Arranger Matrix API
ARRANGER_HOST=192.168.2.254
ARRANGER_PORT=80

# Puerto del servidor Express (v1.1.0)
PORT=3051
```

⚠ **El server NO carga automáticamente `.env` con dotenv.** Las variables clave (`PORT`, `ARRANGER_HOST`, `ARRANGER_PORT`) se pasan como variables de entorno en los scripts de launcher. El `.env` es documentación y respaldo.

### 4.2 Token de Arranger (variable del sistema)

El token se configura como variable de entorno del sistema Windows:

```powershell
[Environment]::SetEnvironmentVariable('VITE_ARRANGER_TOKEN', '<TOKEN_REAL>', 'User')
```

**Reiniciar la sesión** después de configurarlo, o abrir una terminal nueva. Verificar:

```powershell
[Environment]::GetEnvironmentVariable('VITE_ARRANGER_TOKEN', 'User')
```

---

## 6. Probar manualmente

### 6.0 Audit de seguridad pre-flight (OBLIGATORIO)

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Documents\sportbar-v1.1.0\scripts\deploy\hardening\audit-check.ps1" -AppDir "$env:USERPROFILE\Documents\sportbar-v1.1.0"
```

Si el audit falla → **NO arrancar**. Corregir vulnerabilidades primero.

### 6.1 Probar solo v1.1.0

```cmd
REM Desde la carpeta donde se copió sportbar-v1.1.0
"%USERPROFILE%\Documents\sportbar-v1.1.0\scripts\deploy\Iniciar SportBar v1.1.0.bat"
```

Verificar que responde:

```powershell
Invoke-WebRequest http://localhost:3051 | Select-Object StatusCode
# Debe devolver: 200
```

También probar la API de estado:

```powershell
Invoke-WebRequest http://localhost:3051/api/state | Select-Object Content
```

### 5.2 Probar con el Master

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Documents\sportbar-v1.1.0\scripts\deploy\SportBar Master.ps1"
```

Esto inicia v1.0 (puerto 3000) y v1.1.0 (puerto 3051) con monitoreo.

---

## 6. Configurar Task Scheduler (inicio automático)

### Opción A: Master Orchestrator (recomendado)

Crear **una** tarea programada que ejecute el master al iniciar sesión:

1. Abrir **Task Scheduler** (`taskschd.msc`)
2. **Create Task** (no Basic Task)
3. **General**:
   - Name: `SportBar Master`
   - Description: `Orquestador SportBar v1.0 + v1.1.0`
   - Run whether user is logged on or not
   - Run with highest privileges
4. **Triggers** → New → **At log on** → seleccionar el usuario que ejecutará SportBar
5. **Actions** → New:
   - Action: `Start a program`
   - Program: `powershell.exe`
   - Arguments:
     ```
     -ExecutionPolicy Bypass -WindowStyle Hidden -File "%USERPROFILE%\Documents\sportbar-v1.1.0\scripts\deploy\SportBar Master.ps1"
     ```
6. **Settings**:
   - Allow task to be run on demand ✓
   - If the task fails, restart every 1 minute (max 3 times)

### Opción B: Dos tareas independientes

**Tarea 1 — SportBar v1.0:**
- Trigger: At log on
- Action: `cmd.exe /c start "" /d "%USERPROFILE%\Documents\sportbar" node index.js`

**Tarea 2 — SportBar v1.1.0:**
- Trigger: At log on
- Action: `powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "%USERPROFILE%\Documents\sportbar-v1.1.0\scripts\deploy\Iniciar SportBar v1.1.0.ps1"`

---

## 7. Rollback

Si algo falla con v1.1.0 y hay que volver solo a v1.0:

```powershell
# Matar solo el proceso de v1.1.0 (filtrar por puerto 3051)
$pid = (Get-NetTCPConnection -LocalPort 3051 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force }

# O más drástico: matar todos los node
Get-Process -Name "node" | Stop-Process -Force

# Deshabilitar la tarea programada de v1.1.0
Disable-ScheduledTask -TaskName "SportBar Master"

# v1.0 se puede re-iniciar manualmente:
# cd %USERPROFILE%\Documents\sportbar && node index.js
```

**v1.0 NO se toca, NO se modifica, NO se mueve.** El rollback solo apaga v1.1.0.

---

## 8. Estructura final en la PC del bar

```
%USERPROFILE%\Documents\
├── sportbar\                      # ⚠ v1.0 — NO TOCAR
│   ├── index.js
│   ├── public/
│   └── ...
│
└── sportbar-v1.1.0\               # ✅ v1.1.0 — nuestra versión
    ├── dist/
    │   └── index.html             # SPA React build
    ├── server/
    │   ├── server.js              # Express server
    │   ├── package.json
    │   ├── package-lock.json
    │   └── node_modules/          # Instalado con npm install
    ├── scripts/
    │   └── deploy/
    │       ├── Iniciar SportBar v1.1.0.bat
    │       ├── Iniciar SportBar v1.1.0.ps1
    │       ├── SportBar Master.bat
    │       ├── SportBar Master.ps1
    │       └── logs/
    │           ├── master-YYYY-MM-DD.log
    │           └── sportbar-v1.1.0-YYYY-MM-DD.log
    └── .env                       # Variables de entorno (referencia)
```

---

## 9. Verificación post-deploy

Checklist:

- [ ] `node --version` devuelve 18.x en la PC del bar
- [ ] Puerto 3051 responde: `curl http://localhost:3051` → HTML de la SPA
- [ ] Puerto 3000 responde: `curl http://localhost:3000` → HTML de v1.0
- [ ] API state funciona: `curl http://localhost:3051/api/state` → JSON
- [ ] Arranger responde (si está en red): `curl http://192.168.2.254/api/command/get_status/<token>`
- [ ] Logs se generan en `scripts/deploy/logs/`
- [ ] Task Scheduler tiene la tarea configurada y habilitada
- [ ] Al reiniciar la PC, ambos servicios arrancan automáticamente

---

## Notas importantes

1. **v1.0 es intocable.** Cualquier cambio debe ser solo en `sportbar-v1.1.0/`.
2. **pnpm NO está en el bar.** Usar `npm` para instalar dependencias del server.
3. **El server usa lowdb** (`server/state.json`). La primera ejecución lo crea automáticamente.
4. **Los logs rotan por fecha.** Se crea un archivo nuevo cada día.
5. **Si el Arranger (192.168.2.254) no está accesible**, el servidor arranca igual pero los endpoints `/api/arranger/*` devolverán errores de conexión.
