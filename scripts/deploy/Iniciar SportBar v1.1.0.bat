@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ── SportBar v1.1.0 Launcher ──────────────────────────────
:: Versión: 1.0.0
:: Puerto: 3051
:: Descripción: Inicia el servidor Express de SportBar v1.1.0
::              y sirve la SPA React desde dist/
:: ───────────────────────────────────────────────────────────

title SportBar v1.1.0 — Puerto 3051

:: ── Detectar ruta base ────────────────────────────────────
set "SPORTBAR_DIR=%~dp0"
set "SPORTBAR_DIR=%SPORTBAR_DIR:~0,-1%"

:: Verificar si estamos en la estructura esperada (scripts\deploy\)
echo %SPORTBAR_DIR% | findstr /i "scripts\\deploy" >nul
if %errorlevel% equ 0 (
    :: Estamos dentro de scripts/deploy, subir dos niveles
    for %%i in ("%SPORTBAR_DIR%") do set "SPORTBAR_DIR=%%~dpi"
    set "SPORTBAR_DIR=%SPORTBAR_DIR:~0,-1%"
    for %%i in ("%SPORTBAR_DIR%") do set "SPORTBAR_DIR=%%~dpi"
    set "SPORTBAR_DIR=%SPORTBAR_DIR:~0,-1%"
)

:: Si no se detecta sportbar-v1.1.0 en la ruta, derivar de Documents del usuario
echo %SPORTBAR_DIR% | findstr /i "sportbar-v1.1.0" >nul
if %errorlevel% neq 0 (
    set "SPORTBAR_DIR=%USERPROFILE%\Documents\sportbar-v1.1.0"
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║         🏆 SPORTBAR v1.1.0 — INICIANDO                ║
echo ╠══════════════════════════════════════════════════════════╣
echo ║  Directorio: !SPORTBAR_DIR!
echo ║  Puerto:     3051
echo ║  Modo:       PRODUCCIÓN
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: ── Verificar que server/server.js existe ────────────────
if not exist "!SPORTBAR_DIR!\server\server.js" (
    echo [91m✗ ERROR: No se encuentra server\server.js[0m
    echo [93m  Ruta buscada: !SPORTBAR_DIR!\server\server.js[0m
    echo [93m  ¿Ejecutaste DEPLOY.md y copiaste la carpeta server/?[0m
    echo.
    pause
    exit /b 1
)
echo [92m✓ server\server.js encontrado[0m

:: ── Verificar que dist/index.html existe ─────────────────
if not exist "!SPORTBAR_DIR!\dist\index.html" (
    echo [91m✗ ERROR: No se encuentra dist\index.html[0m
    echo [93m  Ruta buscada: !SPORTBAR_DIR!\dist\index.html[0m
    echo.
    echo [93m  El build de producción no está presente.[0m
    echo [93m  En la máquina de desarrollo ejecutar:[0m
    echo [93m    pnpm run sportbar:build[0m
    echo [93m  Y copiar la carpeta dist/ a:[0m
    echo [93m    !SPORTBAR_DIR!\dist\[0m
    echo.
    pause
    exit /b 1
)
echo [92m✓ dist/index.html encontrado[0m

:: ── Verificar que Node.js está instalado ─────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [91m✗ ERROR: Node.js no está instalado o no está en el PATH[0m
    echo [93m  Instalar Node.js 18+ desde https://nodejs.org[0m
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set "NODE_VERSION=%%v"
echo [92m✓ Node.js !NODE_VERSION! detectado[0m

:: ── Verificar puerto 3051 ────────────────────────────────
echo.
echo Verificando puerto 3051...

netstat -ano 2>nul | findstr ":3051" >nul
if %errorlevel% equ 0 (
    echo [93m⚠ ADVERTENCIA: El puerto 3051 ya está en uso[0m
    echo.
    netstat -ano | findstr ":3051"
    echo.
    echo [93m  Procesos que ocupan el puerto 3051:[0m
    
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3051"') do (
        echo [93m    PID: %%p[0m
    )
    
    echo.
    choice /c SN /m "¿Desea matar los procesos en el puerto 3051? (S/N)"
    if !errorlevel! equ 1 (
        for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3051"') do (
            taskkill /f /pid %%p >nul 2>&1
            echo [93m  Proceso %%p terminado[0m
        )
        timeout /t 2 /nobreak >nul
        echo [92m✓ Puerto 3051 liberado[0m
    ) else (
        echo [91m✗ No se puede continuar con el puerto ocupado. Abortando.[0m
        pause
        exit /b 1
    )
) else (
    echo [92m✓ Puerto 3051 libre[0m
)

:: ── Verificar node_modules del server ────────────────────
if not exist "!SPORTBAR_DIR!\server\node_modules\express" (
    echo [93m⚠ ADVERTENCIA: node_modules del server no detectado[0m
    echo [93m  Ejecutando: npm install --production en server/[0m
    pushd "!SPORTBAR_DIR!\server"
    call npm install --production
    popd
    if %errorlevel% neq 0 (
        echo [91m✗ ERROR: Falló la instalación de dependencias del server[0m
        pause
        exit /b 1
    )
    echo [92m✓ Dependencias instaladas[0m
) else (
    echo [92m✓ server\node_modules detectado[0m
)

:: ── Mensaje popup de inicio ──────────────────────────────
msg * /time:5 "🏆 SportBar v1.1.0 iniciando en puerto 3051..."
echo.

:: ── INICIAR SERVIDOR ─────────────────────────────────────
echo ╔══════════════════════════════════════════════════════════╗
echo ║         🚀 ARRANCANDO SPORTBAR v1.1.0                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo   Presiona Ctrl+C para detener el servidor
echo   La ventana se mantendrá abierta si el proceso falla
echo.
echo ───────────────────────────────────────────────────────────

:INICIAR_SERVIDOR
set "PORT=3051"
set "NODE_ENV=production"

pushd "!SPORTBAR_DIR!"
node --no-warnings --max-http-header-size=16384 --max-old-space-size=256 server/server.js
set "EXIT_CODE=!errorlevel!"
popd

:: Si el proceso murió, mostrar alerta
echo.
echo ╔══════════════════════════════════════════════════════════╗
if !EXIT_CODE! neq 0 (
    echo ║  [91m✗ SPORTBAR v1.1.0 SE DETUVO INESPERADAMENTE         ║[0m
    echo ║  [91m   Código de salida: !EXIT_CODE!                       ║[0m
) else (
    echo ║  [93m⚠ SPORTBAR v1.1.0 SE DETUVO                           ║[0m
    echo ║  [93m   Código de salida: !EXIT_CODE!                       ║[0m
)
echo ╠══════════════════════════════════════════════════════════╣
echo ║  [93mRevisá los logs en:                                   ║[0m
echo ║  [93m  !SPORTBAR_DIR!\scripts\deploy\logs\                 ║[0m
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: Mantener ventana abierta para diagnóstico
msg * /time:0 "⚠ SportBar v1.1.0 se detuvo (código !EXIT_CODE!). Revisá la consola."
pause
exit /b !EXIT_CODE!
