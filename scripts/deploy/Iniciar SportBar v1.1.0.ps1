<#
.SYNOPSIS
    Inicia SportBar v1.1.0 (Express + React SPA) en puerto 3051

.DESCRIPTION
    Script de producción para Windows 10/11. Valida prerequisitos,
    monitorea el proceso, y reintenta automáticamente si falla.
    Logs diarios en logs\sportbar-v1.1.0-YYYY-MM-DD.log

.PARAMETER MaxRetries
    Número máximo de reintentos si el proceso muere (default: 3)

.PARAMETER SkipPortCheck
    No verificar si el puerto está en uso

.EXAMPLE
    .\Iniciar SportBar v1.1.0.ps1
    .\Iniciar SportBar v1.1.0.ps1 -MaxRetries 5
#>

param(
    [int]$MaxRetries = 3,
    [switch]$SkipPortCheck
)

$ErrorActionPreference = "Stop"

# ── Configuración ──────────────────────────────────────────
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path $MyInvocation.MyCommand.Path -Parent }
$Port = 3051
$NodeEnv = "production"
$ServerScript = "server\server.js"
$DistIndex = "dist\index.html"

# Detectar si estamos en scripts/deploy/ y subir dos niveles
$DeployPattern = [regex]::Escape((Join-Path "scripts" "deploy"))
if ($ScriptDir -match $DeployPattern) {
    $BaseDir = Split-Path (Split-Path $ScriptDir -Parent) -Parent
} else {
    $BaseDir = $ScriptDir
}

# Si la ruta no contiene sportbar-v1.1.0, derivar de Documents del usuario
if ($BaseDir -notmatch "sportbar-v1\.1\.0") {
    $UserDocs = [Environment]::GetFolderPath("MyDocuments")
    $BaseDir = Join-Path $UserDocs "sportbar-v1.1.0"
    Write-Warning "Ruta no contiene sportbar-v1.1.0. Usando ruta derivada del usuario: $BaseDir"
}

# ── Configurar logging ─────────────────────────────────────
$LogDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$LogDate = Get-Date -Format "yyyy-MM-dd"
$LogFile = Join-Path $LogDir "sportbar-v1.1.0-$LogDate.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Line = "[$Timestamp] [$Level] $Message"
    
    # Colores en consola
    switch ($Level) {
        "ERROR" { Write-Host $Line -ForegroundColor Red }
        "WARN"  { Write-Host $Line -ForegroundColor Yellow }
        "OK"    { Write-Host $Line -ForegroundColor Green }
        default { Write-Host $Line -ForegroundColor White }
    }
    
    # A archivo (siempre)
    Add-Content -Path $LogFile -Value $Line -Encoding UTF8
}

# ── Función: Mostrar header ASCII ──────────────────────────
function Show-Header {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         🏆 SPORTBAR v1.1.0 — INICIANDO                 ║" -ForegroundColor Cyan
    Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "║  Directorio: $BaseDir" -ForegroundColor Cyan
    Write-Host "║  Puerto:     $Port" -ForegroundColor Cyan
    Write-Host "║  Modo:       $NodeEnv" -ForegroundColor Cyan
    Write-Host "║  Log:        $LogFile" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# ── Función: Validar prerequisitos ─────────────────────────
function Test-Prerequisites {
    Write-Log "Validando prerequisitos..." "INFO"
    
    # Node.js
    try {
        $nodeCommand = Get-Command node -ErrorAction Stop
        $nodeVersion = & node --version 2>&1
        Write-Log "✓ Node.js $nodeVersion detectado ($($nodeCommand.Source))" "OK"
    } catch {
        Write-Log "✗ Node.js no encontrado en el PATH" "ERROR"
        Write-Log "  Instalar Node.js 18+ desde https://nodejs.org" "ERROR"
        throw "Node.js no instalado"
    }
    
    # server/server.js
    $ServerPath = Join-Path $BaseDir $ServerScript
    if (-not (Test-Path $ServerPath)) {
        Write-Log "✗ No se encuentra $ServerPath" "ERROR"
        Write-Log "  ¿Ejecutaste DEPLOY.md y copiaste la carpeta server/?" "ERROR"
        throw "server/server.js no encontrado"
    }
    Write-Log "✓ $ServerScript encontrado" "OK"
    
    # dist/index.html
    $DistPath = Join-Path $BaseDir $DistIndex
    if (-not (Test-Path $DistPath)) {
        Write-Log "✗ No se encuentra $DistPath" "ERROR"
        Write-Log "  El build de producción no está presente." "ERROR"
        Write-Log "  En máquina dev: pnpm run sportbar:build" "ERROR"
        Write-Log "  Luego copiar dist/ a: $BaseDir\dist\" "ERROR"
        throw "dist/index.html no encontrado"
    }
    Write-Log "✓ $DistIndex encontrado" "OK"
    
    # server/node_modules (solo advertir, no bloquear)
    $NodeModulesPath = Join-Path $BaseDir "server\node_modules\express"
    if (-not (Test-Path $NodeModulesPath)) {
        Write-Log "⚠ node_modules del server no detectado" "WARN"
        Write-Log "  Intentando: npm install --production en server/" "WARN"
        try {
            Push-Location (Join-Path $BaseDir "server")
            & npm install --production 2>&1 | ForEach-Object { Write-Log "  npm: $_" }
            Pop-Location
            Write-Log "✓ Dependencias instaladas" "OK"
        } catch {
            Write-Log "✗ Falló npm install en server/" "ERROR"
            throw "No se pudieron instalar dependencias del server"
        }
    } else {
        Write-Log "✓ server\node_modules detectado" "OK"
    }
    
    Write-Log "Prerequisitos validados correctamente" "OK"
}

# ── Función: Verificar puerto ──────────────────────────────
function Test-PortAvailable {
    if ($SkipPortCheck) {
        Write-Log "Verificación de puerto omitida (--SkipPortCheck)" "WARN"
        return $true
    }
    
    Write-Log "Verificando puerto $Port..." "INFO"
    
    $connections = netstat -ano 2>$null | Select-String ":$Port "
    
    if ($connections) {
        Write-Log "⚠ El puerto $Port está en uso:" "WARN"
        foreach ($conn in $connections) {
            Write-Log "  $conn" "WARN"
        }
        
        # Extraer PIDs únicos
        $pids = @()
        foreach ($conn in $connections) {
            $line = $conn.ToString().Trim()
            $parts = $line -split '\s+'
            if ($parts.Count -ge 5) {
                $pidStr = $parts[-1]
                if ($pidStr -match '^\d+$' -and $pidStr -notin $pids) {
                    $pids += $pidStr
                }
            }
        }
        
        if ($pids.Count -gt 0) {
            $processes = Get-Process -Id $pids -ErrorAction SilentlyContinue
            Write-Log "Procesos en puerto $Port`:" "WARN"
            foreach ($proc in $processes) {
                Write-Log "  PID $($proc.Id): $($proc.ProcessName) ($($proc.MainWindowTitle))" "WARN"
            }
            
            $response = Read-Host "`n¿Matar los procesos en el puerto $Port? (s/N)"
            if ($response -eq 's' -or $response -eq 'S') {
                foreach ($proc in $processes) {
                    Stop-Process -Id $proc.Id -Force
                    Write-Log "  Proceso $($proc.Id) ($($proc.ProcessName)) terminado" "WARN"
                }
                Start-Sleep -Seconds 2
                Write-Log "✓ Puerto $Port liberado" "OK"
                return $true
            } else {
                Write-Log "✗ Puerto ocupado, no se puede continuar" "ERROR"
                return $false
            }
        }
    }
    
    Write-Log "✓ Puerto $Port libre" "OK"
    return $true
}

# ── Función: Iniciar servidor ──────────────────────────────
function Start-SportBarServer {
    Write-Log "Iniciando SportBar v1.1.0..." "INFO"
    
    $ServerPath = Join-Path $BaseDir $ServerScript
    
    $env:PORT = $Port.ToString()
    $env:NODE_ENV = $NodeEnv
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "node"
    # Flags de seguridad en runtime (supply chain hardening)
    $processInfo.Arguments = "--no-warnings --max-http-header-size=16384 --max-old-space-size=256 $ServerPath".Trim()
    $processInfo.WorkingDirectory = $BaseDir
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.EnvironmentVariables["PORT"] = $Port.ToString()
    $processInfo.EnvironmentVariables["NODE_ENV"] = $NodeEnv
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    
    # Registrar eventos
    $process.OutputDataReceived += {
        if ($_.Data) { Write-Log "[server] $($_.Data)" }
    }
    $process.ErrorDataReceived += {
        if ($_.Data) { Write-Log "[server/err] $($_.Data)" "WARN" }
    }
    
    try {
        $process.Start() | Out-Null
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        Write-Log "✓ Servidor iniciado (PID: $($process.Id))" "OK"
        return $process
    } catch {
        Write-Log "✗ Error al iniciar el servidor: $_" "ERROR"
        throw
    }
}

# ── MAIN ───────────────────────────────────────────────────
Show-Header
Write-Log "=== SportBar v1.1.0 iniciando ===" "INFO"

try {
    # Validar prerequisitos
    Test-Prerequisites
    
    # Verificar puerto
    $portOk = Test-PortAvailable
    if (-not $portOk) { exit 1 }
    
    # Mantener referencia al proceso para graceful shutdown
    $Global:CurrentProcess = $null
    
    # Registrar handler para Ctrl+C
    $ConsoleCtrlHandler = {
        Write-Host ""
        Write-Log "📴 Ctrl+C recibido — cerrando SportBar v1.1.0..." "INFO"
        if ($Global:CurrentProcess -and -not $Global:CurrentProcess.HasExited) {
            Write-Log "Terminando proceso PID $($Global:CurrentProcess.Id)..." "INFO"
            $Global:CurrentProcess.Kill()
            $Global:CurrentProcess.WaitForExit(5000)
        }
        Write-Log "SportBar v1.1.0 detenido. ¡Hasta luego!" "INFO"
        exit 0
    }
    
    try {
        [Console]::TreatControlCAsInput = $false
    } catch {
        # No disponible en todas las versiones de PS
    }
    
    # Bucle de inicio con reintentos
    $retryCount = 0
    
    while ($retryCount -le $MaxRetries) {
        if ($retryCount -gt 0) {
            Write-Log "Reintento $retryCount de $MaxRetries..." "WARN"
            Start-Sleep -Seconds 5
        }
        
        try {
            $process = Start-SportBarServer
            $Global:CurrentProcess = $process
            $retryCount = 0  # Reset al arrancar exitosamente
            
            # Esperar a que termine
            $process.WaitForExit()
            
            $exitCode = $process.ExitCode
            
            if ($exitCode -eq 0) {
                Write-Log "Servidor finalizó limpiamente (exit code: $exitCode)" "INFO"
            } else {
                Write-Log "Servidor finalizó con error (exit code: $exitCode)" "ERROR"
            }
        } catch {
            Write-Log "Excepción al ejecutar el servidor: $_" "ERROR"
            $exitCode = -1
        }
        
        $retryCount++
        
        if ($retryCount -ge $MaxRetries) {
            Write-Log "✗ Se alcanzó el máximo de $MaxRetries reintentos. Abortando." "ERROR"
            Write-Log "  Último código de salida: $exitCode" "ERROR"
            Write-Log "  Revisar logs en: $LogFile" "ERROR"
            break
        }
    }
    
    # Si salimos del bucle, el proceso falló definitivamente
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ✗ SPORTBAR v1.1.0 — FALLÓ DESPUÉS DE VARIOS INTENTOS ║" -ForegroundColor Red
    Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Red
    Write-Host "║  Revisá los logs en:                                   ║" -ForegroundColor Red
    Write-Host "║  $LogFile" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    
} catch {
    Write-Log "ERROR CRÍTICO: $_" "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
    exit 1
} finally {
    Write-Log "=== SportBar v1.1.0 finalizado ===" "INFO"
}
