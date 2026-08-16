@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ── SportBar Master Launcher (Batch Fallback) ─────────────
:: Versión: 1.0.0
:: Descripción: Inicia SportBar v1.0 (puerto 3000) y
::              SportBar v1.1.0 (puerto 3051) simultáneamente.
::              Fallback simple — para monitoreo avanzado usar
::              SportBar Master.ps1
:: ───────────────────────────────────────────────────────────

title SportBar Master — v1.0 + v1.1.0

:: ── Detectar ruta base ────────────────────────────────────
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║           🏆  SPORTBAR MASTER LAUNCHER  🏆                       ║
echo ║           v1.0 (puerto 3000) + v1.1.0 (puerto 3051)             ║
echo ║                                                                  ║
echo ╠══════════════════════════════════════════════════════════════════╣
echo ║  ⚠ Este es el launcher SIMPLE (batch).                          ║
echo ║  Para monitoreo avanzado con reintentos, usar:                  ║
echo ║    PowerShell -&gt; SportBar Master.ps1                           ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

:: ── Verificar archivos esenciales ─────────────────────────
set "V110_BAT=%SCRIPT_DIR%\Iniciar SportBar v1.1.0.bat"
if not exist "!V110_BAT!" (
    echo [91m✗ ERROR: No se encuentra "Iniciar SportBar v1.1.0.bat"[0m
    echo [93m  Ruta: !V110_BAT![0m
    pause
    exit /b 1
)
echo [92m✓ Launcher v1.1.0 encontrado[0m

:: ── Verificar v1.0 ────────────────────────────────────────
set "V10_DIR=%USERPROFILE%\Documents\sportbar"
if not exist "!V10_DIR!\index.js" (
    echo [93m⚠ ADVERTENCIA: SportBar v1.0 no detectado en !V10_DIR![0m
    echo [93m  v1.1.0 se iniciará igual. v1.0 no se lanzará.[0m
    set "SKIP_V10=1"
) else (
    echo [92m✓ SportBar v1.0 detectado en !V10_DIR![0m
    set "SKIP_V10=0"
)

:: ── Lanzar v1.1.0 en ventana separada ─────────────────────
echo.
echo 🚀 Iniciando SportBar v1.1.0...
start "SportBar v1.1.0 — Puerto 3051" "!V110_BAT!"
echo [92m  ✓ Ventana de v1.1.0 abierta[0m

:: Pequeña pausa para que v1.1.0 empiece a arrancar
timeout /t 3 /nobreak >nul

:: ── Lanzar v1.0 en ventana separada ───────────────────────
if "!SKIP_V10!"=="1" (
    echo [93m⚠ v1.0 omitido (no detectado)[0m
) else (
    echo.
    echo 🚀 Iniciando SportBar v1.0...
    start "SportBar v1.0 — Puerto 3000" /d "!V10_DIR!" node index.js
    echo [92m  ✓ Ventana de v1.0 abierta[0m
)

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║  ✅ AMBOS SERVICIOS LANZADOS                                    ║
echo ║                                                                  ║
echo ║  v1.0:  http://localhost:3000                                   ║
echo ║  v1.1.0: http://localhost:3051                                  ║
echo ║                                                                  ║
echo ║  Cada servicio tiene su propia ventana de consola.              ║
echo ║  ⚠ Para monitoreo con reintentos automáticos, usá:             ║
echo ║     PowerShell -&gt; SportBar Master.ps1                          ║
echo ║                                                                  ║
echo ║  Esta ventana se cerrará en 5 segundos.                         ║
echo ║  Los servicios siguen corriendo en sus ventanas.                ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝

timeout /t 5 /nobreak >nul
exit /b 0
