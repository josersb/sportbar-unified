<#
.SYNOPSIS
    Orquestador maestro: ejecuta SportBar v1.0 (puerto 3000) y v1.1.0 (puerto 3051)

.DESCRIPTION
    Monitorea ambas versiones simultáneamente con reintentos independientes.
    Si una falla, la otra sigue funcionando. Logs diarios en logs/master-YYYY-MM-DD.log

.PARAMETER MonitorInterval
    Intervalo en segundos entre chequeos de salud (default: 30)

.PARAMETER MaxRetries
    Reintentos máximos por servicio antes de marcar ALERTA CRÍTICA (default: 3)

.EXAMPLE
    .\SportBar Master.ps1
    .\SportBar Master.ps1 -MonitorInterval 15 -MaxRetries 5
#>

param(
    [int]$MonitorInterval = 30,
    [int]$MaxRetries = 3
)

$ErrorActionPreference = "Stop"

# ── Configuración ──────────────────────────────────────────
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path $MyInvocation.MyCommand.Path -Parent }

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
}

# v1.0 (NO se toca — solo referencia, derivada del usuario actual)
$UserDocs = [Environment]::GetFolderPath("MyDocuments")
$V10_Dir = Join-Path $UserDocs "sportbar"
$V10_Port = 3000
$V10_Entry = "index.js"

# v1.1.0 (nuestra)
$V110_Dir = $BaseDir
$V110_Port = 3051
$V110_Entry = "server\server.js"

# ── Logging ────────────────────────────────────────────────
$LogDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$LogDate = Get-Date -Format "yyyy-MM-dd"
$LogFile = Join-Path $LogDir "master-$LogDate.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO", [string]$Service = "MASTER")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Line = "[$Timestamp] [$Level] [$Service] $Message"
    
    switch ($Level) {
        "ERROR"    { Write-Host $Line -ForegroundColor Red }
        "WARN"     { Write-Host $Line -ForegroundColor Yellow }
        "OK"       { Write-Host $Line -ForegroundColor Green }
        "CRITICAL" { Write-Host $Line -ForegroundColor DarkRed -BackgroundColor Yellow }
        default    { Write-Host $Line -ForegroundColor White }
    }
    
    Add-Content -Path $LogFile -Value $Line -Encoding UTF8
}

# ── Estado global ──────────────────────────────────────────
$Global:Services = @{
    "v1.0" = @{
        Name = "SportBar v1.0"
        Process = $null
        Retries = 0
        Status = "STOPPED"
        Port = $V10_Port
        Dir = $V10_Dir
        Entry = $V10_Entry
        Critical = $false
    }
    "v1.1.0" = @{
        Name = "SportBar v1.1.0"
        Process = $null
        Retries = 0
        Status = "STOPPED"
        Port = $V110_Port
        Dir = $V110_Dir
        Entry = $V110_Entry
        Critical = $false
    }
}

# ── Función: Mostrar header ASCII ──────────────────────────
function Show-Header {
    Clear-Host
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                                  ║" -ForegroundColor Cyan
    Write-Host "║           🏆  SPORTBAR MASTER ORCHESTRATOR  🏆                   ║" -ForegroundColor Cyan
    Write-Host "║           Gestionando v1.0 + v1.1.0 simultáneamente              ║" -ForegroundColor Cyan
    Write-Host "║                                                                  ║" -ForegroundColor Cyan
    Write-Host "╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    
    foreach ($key in $Global:Services.Keys) {
        $svc = $Global:Services[$key]
        $statusColor = switch ($svc.Status) {
            "RUNNING"  { "Green" }
            "STOPPED"  { "Yellow" }
            "FAILED"   { "Red" }
            "CRITICAL" { "DarkRed" }
            default    { "Gray" }
        }
        $statusIcon = switch ($svc.Status) {
            "RUNNING"  { "🟢" }
            "STOPPED"  { "🟡" }
            "FAILED"   { "🔴" }
            "CRITICAL" { "💀" }
            default    { "⚪" }
        }
        $pidStr = if ($svc.Process -and -not $svc.Process.HasExited) { "PID:$($svc.Process.Id)" } else { "-----" }
        Write-Host "║  $statusIcon $($svc.Name)  Puerto:$($svc.Port)  $pidStr  Reintentos:$($svc.Retries)/$MaxRetries" -ForegroundColor $statusColor
    }
    
    Write-Host "╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "║  Monitor: cada $MonitorInterval s  |  Reintentos máx: $MaxRetries" -ForegroundColor Cyan
    Write-Host "║  Log: $LogFile" -ForegroundColor Cyan
    Write-Host "║  Ctrl+C para detener todos los servicios                        ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# ── Función: Validar directorios ───────────────────────────
function Test-Directories {
    Write-Log "Validando directorios..." "INFO"
    
    # v1.0 — solo advertir si no existe (no es nuestra responsabilidad)
    if (-not (Test-Path $V10_Dir)) {
        Write-Log "⚠ Directorio v1.0 no encontrado: $V10_Dir" "WARN"
        Write-Log "  v1.0 NO se iniciará. Esto no afecta a v1.1.0." "WARN"
        $Global:Services["v1.0"].Status = "FAILED"
        $Global:Services["v1.0"].Critical = $true
    } else {
        $v10Entry = Join-Path $V10_Dir $V10_Entry
        if (-not (Test-Path $v10Entry)) {
            Write-Log "⚠ Entry point v1.0 no encontrado: $v10Entry" "WARN"
            $Global:Services["v1.0"].Status = "FAILED"
            $Global:Services["v1.0"].Critical = $true
        } else {
            Write-Log "✓ Directorio v1.0 encontrado: $V10_Dir" "OK"
        }
    }
    
    # v1.1.0 — requerido
    if (-not (Test-Path $V110_Dir)) {
        Write-Log "✗ Directorio v1.1.0 no encontrado: $V110_Dir" "ERROR"
        $Global:Services["v1.1.0"].Status = "FAILED"
        $Global:Services["v1.1.0"].Critical = $true
    } else {
        Write-Log "✓ Directorio v1.1.0 encontrado: $V110_Dir" "OK"
        
        $v110Entry = Join-Path $V110_Dir $V110_Entry
        if (-not (Test-Path $v110Entry)) {
            Write-Log "✗ Entry point v1.1.0 no encontrado: $v110Entry" "ERROR"
            $Global:Services["v1.1.0"].Status = "FAILED"
            $Global:Services["v1.1.0"].Critical = $true
        }
        
        $v110Dist = Join-Path $V110_Dir "dist\index.html"
        if (-not (Test-Path $v110Dist)) {
            Write-Log "⚠ dist/index.html no encontrado: $v110Dist" "WARN"
        }
    }
}

# ── Función: Iniciar un servicio ───────────────────────────
function Start-Service {
    param([string]$ServiceKey)
    
    $svc = $Global:Services[$ServiceKey]
    
    if ($svc.Critical) {
        Write-Log "Saltando $($svc.Name) — estado crítico previo" "WARN" -Service $ServiceKey
        return
    }
    
    Write-Log "Iniciando $($svc.Name)..." "INFO" -Service $ServiceKey
    
    try {
        $procInfo = New-Object System.Diagnostics.ProcessStartInfo
        $procInfo.FileName = "node"

        # Flags de seguridad para v1.1.0 (v1.0 no los soporta, se lanza sin flags)
        $nodeFlags = ""
        if ($ServiceKey -eq "v1.1.0") {
            $nodeFlags = "--no-warnings --max-http-header-size=16384 --max-old-space-size=256"
        }
        $procInfo.Arguments = "$nodeFlags $($svc.Entry)".Trim()
        $procInfo.WorkingDirectory = $svc.Dir
        $procInfo.UseShellExecute = $false
        $procInfo.RedirectStandardOutput = $true
        $procInfo.RedirectStandardError = $true
        
        # Establecer variables de entorno específicas por servicio
        switch ($ServiceKey) {
            "v1.0" {
                $procInfo.EnvironmentVariables["PORT"] = "3000"
                $procInfo.EnvironmentVariables["NODE_ENV"] = "production"
            }
            "v1.1.0" {
                $procInfo.EnvironmentVariables["PORT"] = "3051"
                $procInfo.EnvironmentVariables["NODE_ENV"] = "production"
            }
        }
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $procInfo
        $process.EnableRaisingEvents = $true
        
        # Capturar salida
        $process.OutputDataReceived += {
            if ($_.Data) { Write-Log "[out] $($_.Data)" "INFO" -Service $ServiceKey }
        }
        $process.ErrorDataReceived += {
            if ($_.Data) { Write-Log "[err] $($_.Data)" "WARN" -Service $ServiceKey }
        }
        
        # Evento de salida
        $process.Exited += {
            $exitCode = $process.ExitCode
            Write-Log "Proceso terminado (exit code: $exitCode)" "WARN" -Service $ServiceKey
        }
        
        $process.Start() | Out-Null
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        
        $svc.Process = $process
        $svc.Status = "RUNNING"
        $svc.Retries = 0
        
        Write-Log "✓ $($svc.Name) iniciado (PID: $($process.Id)) en puerto $($svc.Port)" "OK" -Service $ServiceKey
        
    } catch {
        Write-Log "✗ Error al iniciar $($svc.Name): $_" "ERROR" -Service $ServiceKey
        $svc.Status = "FAILED"
        $svc.Retries++
    }
}

# ── Función: Verificar salud de un servicio ────────────────
function Test-ServiceHealth {
    param([string]$ServiceKey)
    
    $svc = $Global:Services[$ServiceKey]
    
    if ($svc.Critical) {
        return  # Ya está en estado crítico, no molestar
    }
    
    if ($null -eq $svc.Process) {
        # Nunca se inició, intentar
        if ($svc.Status -ne "RUNNING") {
            Write-Log "No iniciado — intentando arrancar" "WARN" -Service $ServiceKey
            Start-Service -ServiceKey $ServiceKey
        }
        return
    }
    
    if ($svc.Process.HasExited) {
        $exitCode = $svc.Process.ExitCode
        Write-Log "Proceso muerto (exit code: $exitCode)" "ERROR" -Service $ServiceKey
        $svc.Status = "FAILED"
        $svc.Retries++
        
        if ($svc.Retries -ge $MaxRetries) {
            Write-Log "💀 ALERTA CRÍTICA: $($svc.Name) falló $($svc.Retries) veces" "CRITICAL" -Service $ServiceKey
            Write-Log "  Último exit code: $exitCode" "CRITICAL" -Service $ServiceKey
            Write-Log "  El servicio NO se reintentará más automáticamente." "CRITICAL" -Service $ServiceKey
            Write-Log "  Revisar logs y reiniciar manualmente." "CRITICAL" -Service $ServiceKey
            $svc.Critical = $true
            $svc.Status = "CRITICAL"
            return
        }
        
        Write-Log "Reintentando en 5 segundos (intento $($svc.Retries) de $MaxRetries)..." "WARN" -Service $ServiceKey
        Start-Sleep -Seconds 5
        Start-Service -ServiceKey $ServiceKey
    }
}

# ── Función: Detener todos los servicios ───────────────────
function Stop-AllServices {
    Write-Host ""
    Write-Log "╔══════════════════════════════════════════════════════════════════╗" "INFO"
    Write-Log "║              📴 DETENIENDO TODOS LOS SERVICIOS                  ║" "INFO"
    Write-Log "╚══════════════════════════════════════════════════════════════════╝" "INFO"
    
    foreach ($key in $Global:Services.Keys) {
        $svc = $Global:Services[$key]
        if ($svc.Process -and -not $svc.Process.HasExited) {
            try {
                Write-Log "Deteniendo $($svc.Name) (PID: $($svc.Process.Id))..." "INFO" -Service $key
                $svc.Process.Kill()
                $svc.Process.WaitForExit(5000)
                $svc.Status = "STOPPED"
                Write-Log "✓ $($svc.Name) detenido" "OK" -Service $key
            } catch {
                Write-Log "Error al detener $($svc.Name): $_" "WARN" -Service $key
            }
        }
    }
    
    Write-Log "Todos los servicios detenidos. ¡Hasta luego!" "INFO"
}

# ── Función: Bucle principal de monitoreo ──────────────────
function Start-MonitorLoop {
    Write-Log "Iniciando bucle de monitoreo (intervalo: ${MonitorInterval}s)" "INFO"
    
    while ($true) {
        Show-Header
        
        foreach ($key in $Global:Services.Keys) {
            Test-ServiceHealth -ServiceKey $key
        }
        
        Start-Sleep -Seconds $MonitorInterval
    }
}

# ── MAIN ───────────────────────────────────────────────────
Show-Header
Write-Log "╔══════════════════════════════════════════════════════════════════╗" "INFO"
Write-Log "║           SPORTBAR MASTER ORCHESTRATOR INICIADO                 ║" "INFO"
Write-Log "╚══════════════════════════════════════════════════════════════════╝" "INFO"
Write-Log "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "INFO"
Write-Log "Script: $($MyInvocation.MyCommand.Path)" "INFO"
Write-Log "Config: MonitorInterval=${MonitorInterval}s, MaxRetries=$MaxRetries" "INFO"
Write-Log "" "INFO"

# Registrar handler de Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-Host ""
    Write-Log "🛑 Señal de cierre recibida..." "WARN"
    Stop-AllServices
}

# Manejador manual de Ctrl+C (comportamiento más predecible)
try {
    [Console]::TreatControlCAsInput = $false
} catch { }

try {
    # Validar directorios
    Test-Directories
    
    # ── Pre-flight: audit de seguridad ─────────────────────────
    Write-Host ""
    $auditScript = Join-Path $ScriptDir "hardening\audit-check.ps1"
    if (Test-Path $auditScript) {
        Write-Log "Ejecutando audit de seguridad pre-flight..." "INFO"
        $auditResult = & powershell -ExecutionPolicy Bypass -File $auditScript -AppDir $BaseDir 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "✗ AUDIT DE SEGURIDAD FALLÓ — deployment bloqueado" "CRITICAL"
            Write-Host $auditResult -ForegroundColor Red
            Write-Log "Corregir vulnerabilidades y reintentar." "CRITICAL"
            Write-Log "Para forzar (NO recomendado): ejecutar con --SkipAudit" "WARN"
            exit 1
        }
        Write-Log "✓ Audit de seguridad aprobado" "OK"
    } else {
        Write-Log "⚠ audit-check.ps1 no encontrado — saltando verificación" "WARN"
    }
    Write-Host ""
    
    Write-Log "Iniciando servicios..." "INFO"
    Write-Host ""
    
    # Iniciar ambos servicios
    foreach ($key in $Global:Services.Keys) {
        Start-Service -ServiceKey $key
        Start-Sleep -Seconds 3  # Pequeña pausa entre inicios
    }
    
    Write-Host ""
    Write-Log "Todos los servicios lanzados. Iniciando monitoreo..." "OK"
    Write-Log "Presiona Ctrl+C para detener todos los servicios" "INFO"
    Write-Host ""
    
    # Bucle de monitoreo
    Start-MonitorLoop
    
} catch {
    Write-Log "ERROR CRÍTICO EN MASTER: $_" "CRITICAL"
    Write-Log "Stack: $($_.ScriptStackTrace)" "CRITICAL"
    Stop-AllServices
    exit 1
} finally {
    Write-Log "=== Master Orchestrator finalizado ===" "INFO"
}
