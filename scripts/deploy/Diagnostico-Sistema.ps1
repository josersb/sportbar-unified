<#
.SYNOPSIS
    Diagnóstico completo del sistema para deploy de SportBar v1.1.0

.DESCRIPTION
    Recolecta TODA la información necesaria para planificar la
    coexistencia v1.0 + v1.1.0. Se adapta dinámicamente al usuario
    y equipo donde se ejecuta — sin rutas hardcodeadas.

    Compatible con PowerShell 5.1 (Windows 10 default) y 7+.
    Cero dependencias externas. Solo cmdlets built-in + .NET.

.OUTPUTS
    Reporte detallado en pantalla + archivo diagnostico-sistema-YYYYMMDD-HHmmss.log

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File ".\Diagnostico-Sistema.ps1"

.NOTES
    Ejecutar como el usuario que usará SportBar. NO requiere admin
    (los chequeos que necesitan admin se omiten con aviso explícito).
    Las rutas de v1.0 y v1.1.0 se derivan de %USERPROFILE%\Documents.
#>

param(
    [switch]$Silent,
    [string]$OutputDir = $PSScriptRoot
)

$ErrorActionPreference = "Continue"

# ── Configuración ──────────────────────────────────────────────
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path $OutputDir "diagnostico-sistema-$Timestamp.log"
$ReportLines = [System.Collections.ArrayList]::new()

# Contador de chequeos omitidos por falta de permisos admin
$Script:AdminSkipped = 0
$Script:AdminSkippedItems = [System.Collections.ArrayList]::new()

# ── Rutas dinámicas (basadas en el usuario que ejecuta) ──────────
$UserDocs = [Environment]::GetFolderPath("MyDocuments")
$UserProfile = $env:USERPROFILE
$CurrentUser = $env:USERNAME

# Rutas esperadas de SportBar (derivadas del usuario actual)
$v10Dir_Default = Join-Path $UserDocs "sportbar"
$v110Dir_Default = Join-Path $UserDocs "sportbar-v1.1.0"

# ── Helpers ────────────────────────────────────────────────────
function Write-Section {
    param([string]$Title)
    $sep = "=" * 72
    $line = "`n$sep`n  $Title`n$sep"
    Write-Host $line -ForegroundColor Cyan
    [void]$ReportLines.Add($line)
}

function Write-OK {
    param([string]$Label, [string]$Value)
    $line = "  ✓ $Label $Value"
    Write-Host $line -ForegroundColor Green
    [void]$ReportLines.Add($line)
}

function Write-WARN {
    param([string]$Label, [string]$Value)
    $line = "  ⚠ $Label $Value"
    Write-Host $line -ForegroundColor Yellow
    [void]$ReportLines.Add($line)
}

function Write-ERR {
    param([string]$Label, [string]$Value)
    $line = "  ✗ $Label $Value"
    Write-Host $line -ForegroundColor Red
    [void]$ReportLines.Add($line)
}

function Write-INFO {
    param([string]$Label, [string]$Value)
    $line = "    $Label $Value"
    Write-Host $line -ForegroundColor Gray
    [void]$ReportLines.Add($line)
}

function Write-SKIP {
    param([string]$Label, [string]$Reason)
    $line = "  ⊘ $Label $Reason"
    Write-Host $line -ForegroundColor DarkGray
    [void]$ReportLines.Add($line)
    $Script:AdminSkipped++
    [void]$Script:AdminSkippedItems.Add($Label)
}

function Write-Raw {
    param([string]$Text)
    Write-Host $Text
    [void]$ReportLines.Add($Text)
}

# Helper: compatible PS 5.1 (Get-WmiObject) y PS 7.x (Get-CimInstance)
function Get-WMI {
    param([string]$Class, [string]$Filter)
    $params = @{ ClassName = $Class; ErrorAction = "Stop" }
    if ($Filter) { $params["Filter"] = $Filter }
    try   { return Get-CimInstance @params }
    catch { return Get-WmiObject -Class $Class -Filter $Filter -ErrorAction Stop }
}

# ── Inicio ─────────────────────────────────────────────────────
Clear-Host
Write-Raw ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                  ║" -ForegroundColor Cyan
Write-Host "║      🔍 DIAGNÓSTICO DE SISTEMA — SportBar Unified v1.1.0        ║" -ForegroundColor Cyan
Write-Host "║      $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')                                               ║" -ForegroundColor Cyan
Write-Host "║                                                                  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Raw ""
Write-INFO "Log:" $LogFile
Write-Raw ""

# ── 1. SISTEMA OPERATIVO ───────────────────────────────────────
Write-Section "1. SISTEMA OPERATIVO"

try {
    $os = Get-WMI -Class Win32_OperatingSystem
    Write-OK "Windows:" "$($os.Caption.Trim())"
    Write-INFO "Version:" $os.Version
    Write-INFO "Build:" $os.BuildNumber
    Write-INFO "Architecture:" $os.OSArchitecture
    Write-INFO "Instalado:" ([Management.ManagementDateTimeConverter]::ToDateTime($os.InstallDate)).ToString("yyyy-MM-dd")
    Write-INFO "Ultimo arranque:" ([Management.ManagementDateTimeConverter]::ToDateTime($os.LastBootUpTime)).ToString("yyyy-MM-dd HH:mm")
    Write-INFO "Service Pack:" "$($os.ServicePackMajorVersion).$($os.ServicePackMinorVersion)"
    Write-INFO "Windows Directory:" $os.WindowsDirectory
} catch {
    Write-ERR "No se pudo leer info del SO:" $_.Exception.Message
}

# ── 2. HARDWARE ────────────────────────────────────────────────
Write-Section "2. HARDWARE"

try {
    $cpu = Get-WMI -Class Win32_Processor
    $cores = ($cpu | Measure-Object).Count
    $logical = $cpu.NumberOfLogicalProcessors
    Write-OK "CPU:" "$($cpu.Name.Trim())"
    Write-INFO "Nucleos fisicos:" $cores
    Write-INFO "Nucleos logicos:" $logical
    Write-INFO "Max Clock:" "$($cpu.MaxClockSpeed) MHz"
} catch {
    Write-ERR "No se pudo leer CPU:" $_.Exception.Message
}

try {
    $osMem = Get-WMI -Class Win32_OperatingSystem
    $totalRAM = [math]::Round($osMem.TotalVisibleMemorySize / 1MB, 1)
    $freeRAM = [math]::Round($osMem.FreePhysicalMemory / 1MB, 1)
    $usedRAM = [math]::Round(($osMem.TotalVisibleMemorySize - $osMem.FreePhysicalMemory) / 1MB, 1)
    Write-OK "RAM Total:" "${totalRAM} GB"
    Write-INFO "RAM Libre:" "${freeRAM} GB"
    Write-INFO "RAM Usada:" "${usedRAM} GB"
    Write-INFO "RAM % Libre:" "$([math]::Round(($osMem.FreePhysicalMemory / $osMem.TotalVisibleMemorySize) * 100, 1))%"
} catch {
    Write-ERR "No se pudo leer RAM:" $_.Exception.Message
}

try {
    $disk = Get-WMI -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
    $diskFree = [math]::Round($disk.FreeSpace / 1GB, 1)
    $diskTotal = [math]::Round($disk.Size / 1GB, 1)
    $diskUsed = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 1)
    Write-OK "Disco C: libre:" "${diskFree} GB / ${diskTotal} GB"
    Write-INFO "Disco C: usado:" "${diskUsed} GB"
    Write-INFO "Disco C: % libre:" "$([math]::Round(($disk.FreeSpace / $disk.Size) * 100, 1))%"
    Write-INFO "Filesystem:" $disk.FileSystem
} catch {
    Write-ERR "No se pudo leer disco C:" $_.Exception.Message
}

# ── 3. USUARIO ACTUAL ──────────────────────────────────────────
Write-Section "3. USUARIO ACTUAL"

$currentUserFull = whoami
$hostname = $env:COMPUTERNAME
Write-OK "Hostname:" $hostname
Write-OK "Usuario:" $currentUserFull
Write-INFO "USERPROFILE:" $UserProfile
Write-INFO "Documents:" $UserDocs

# El deploy espera que las carpetas sportbar estén en Documents del usuario actual
Write-INFO "Ruta esperada v1.0:" $v10Dir_Default
Write-INFO "Ruta esperada v1.1.0:" $v110Dir_Default

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if ($isAdmin) {
    Write-INFO "Administrador:" "SI (ejecutando como admin)"
} else {
    Write-INFO "Administrador:" "NO (algunos chequeos pueden ser limitados)"
}

# ── 4. POWERSHELL ──────────────────────────────────────────────
Write-Section "4. POWERSHELL"

Write-OK "PS Version:" $PSVersionTable.PSVersion.ToString()
Write-INFO "PS Edition:" $PSVersionTable.PSEdition
Write-INFO "PS Compatibility:" $PSVersionTable.PSCompatibleVersions -join ", "
Write-INFO "CLR Version:" $PSVersionTable.CLRVersion
Write-INFO "Build:" $PSVersionTable.BuildVersion
Write-INFO "WSMan Stack:" $PSVersionTable.WSManStackVersion

try {
    $execPolicy = Get-ExecutionPolicy -Scope CurrentUser -ErrorAction Stop
    Write-OK "ExecutionPolicy (User):" $execPolicy
} catch {
    Write-WARN "ExecutionPolicy (User):" "No se pudo leer"
}
try {
    $execPolicyMachine = Get-ExecutionPolicy -Scope LocalMachine -ErrorAction Stop
    Write-INFO "ExecutionPolicy (Machine):" $execPolicyMachine
} catch {
    Write-INFO "ExecutionPolicy (Machine):" "No disponible"
}

# ── 5. NODE.JS ─────────────────────────────────────────────────
Write-Section "5. NODE.JS & NPM"

try {
    $nodeVersion = & node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Node.js version:" $nodeVersion.Trim()

        # Node architecture
        try {
            $nodePath = (Get-Command node -ErrorAction Stop).Source
            Write-INFO "Node.js path:" $nodePath
            $nodeArch = & node -e "console.log(process.arch)" 2>&1
            Write-INFO "Node.js arch:" $nodeArch.Trim()
        } catch {
            Write-WARN "Node.js path:" "No se pudo determinar"
        }

        try {
            $npmVersion = & npm --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-OK "npm version:" $npmVersion.Trim()
                $npmPath = (Get-Command npm -ErrorAction Stop).Source
                Write-INFO "npm path:" $npmPath
            } else {
                Write-ERR "npm:" "No se pudo ejecutar npm --version"
            }
        } catch {
            Write-ERR "npm:" "No instalado o no en PATH"
        }
    } else {
        Write-ERR "Node.js:" "NO INSTALADO o no en PATH. ES REQUERIDO para v1.1.0."
    }
} catch {
    Write-ERR "Node.js:" "NO INSTALADO. Se requiere Node.js 18.x para SportBar v1.1.0."
}

try {
    $pnpmVersion = & pnpm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-INFO "pnpm version:" $pnpmVersion.Trim()
    } else {
        Write-INFO "pnpm:" "No instalado (esperado — usaremos npm en el bar)"
    }
} catch {
    Write-INFO "pnpm:" "No instalado (esperado — usaremos npm en el bar)"
}

# node_modules check
try {
    $globalModules = & npm list -g --depth=0 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-INFO "Global npm packages:" ($globalModules -join "; ").Replace("`n", " | ").Substring(0, [Math]::Min(120, ($globalModules -join "; ").Length))
    }
} catch { }

# ── 6. RED & PUERTOS ───────────────────────────────────────────
Write-Section "6. RED & PUERTOS"

# IP local
try {
    $netAdapters = Get-WMI -Class Win32_NetworkAdapterConfiguration -Filter "IPEnabled=TRUE"
    foreach ($adapter in $netAdapters) {
        $desc = $adapter.Description
        foreach ($ip in $adapter.IPAddress) {
            if ($ip -match "^\d{1,3}\.") {
                Write-INFO "IP local ($desc):" $ip
            }
        }
        if ($adapter.DefaultIPGateway) {
            Write-INFO "Gateway ($desc):" ($adapter.DefaultIPGateway -join ", ")
        }
    }
} catch {
    Write-WARN "Adaptadores de red:" "No se pudo leer configuración"
}

# Arranger connectivity
Write-Raw ""
Write-INFO "Verificando conectividad con Arranger (192.168.2.254:80)..." ""

$arrangerReachable = $false
# Try Test-Connection first (ping)
try {
    $ping = Test-Connection -ComputerName "192.168.2.254" -Count 1 -Quiet -ErrorAction Stop
    if ($ping) {
        Write-OK "Ping Arranger (192.168.2.254):" "RESPONDE"
        $arrangerReachable = $true
    } else {
        Write-ERR "Ping Arranger (192.168.2.254):" "NO RESPONDE — ¿está la PC en la red 192.168.2.x?"
    }
} catch {
    Write-ERR "Ping Arranger:" "Error: $($_.Exception.Message)"
}

# Try Test-NetConnection (port)
try {
    $tnc = Test-NetConnection -ComputerName "192.168.2.254" -Port 80 -WarningAction SilentlyContinue -ErrorAction Stop
    if ($tnc.TcpTestSucceeded) {
        Write-OK "TCP Arranger (192.168.2.254:80):" "ABIERTO — API accesible"
        $arrangerReachable = $true
    } else {
        Write-WARN "TCP Arranger (192.168.2.254:80):" "CERRADO o timeout"
    }
} catch {
    # Fallback: Test-NetConnection no disponible (PowerShell muy viejo)
    Write-WARN "Test-NetConnection:" "No disponible en esta versión de PS"
}

# ── Puertos ─────────────────────────────────────────────────────
Write-Raw ""

# Check port 3000 (v1.0)
$port3000Free = $true
try {
    $conn3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction Stop 2>$null
    if ($conn3000) {
        $proc = Get-Process -Id $conn3000.OwningProcess -ErrorAction SilentlyContinue
        Write-WARN "Puerto 3000:" "EN USO por PID $($conn3000.OwningProcess) ($($proc.ProcessName))"
        Write-INFO "  Estado:" $conn3000.State
        $port3000Free = $false
    }
} catch {
    # Get-NetTCPConnection requiere admin — fallback a netstat
    try {
        $netstat3000 = & netstat -ano 2>$null | Select-String ":3000"
        if ($netstat3000) {
            Write-WARN "Puerto 3000:" "EN USO (netstat): $($netstat3000 -join '; ')"
            $port3000Free = $false
        }
    } catch { }
}

if ($port3000Free) {
    Write-OK "Puerto 3000 (v1.0):" "LIBRE (o no podemos verificarlo sin admin)"
}

# Check port 3051 (v1.1.0 target)
$port3051Free = $true
try {
    $conn3051 = Get-NetTCPConnection -LocalPort 3051 -ErrorAction Stop 2>$null
    if ($conn3051) {
        $proc = Get-Process -Id $conn3051.OwningProcess -ErrorAction SilentlyContinue
        Write-ERR "Puerto 3051:" "OCUPADO por PID $($conn3051.OwningProcess) ($($proc.ProcessName)). ¡v1.1.0 NO podrá usar este puerto!"
        Write-INFO "  Estado:" $conn3051.State
        $port3051Free = $false
    }
} catch {
    try {
        $netstat3051 = & netstat -ano 2>$null | Select-String ":3051"
        if ($netstat3051) {
            Write-ERR "Puerto 3051:" "OCUPADO (netstat): $($netstat3051 -join '; ')"
            $port3051Free = $false
        }
    } catch { }
}

if ($port3051Free) {
    Write-OK "Puerto 3051 (v1.1.0):" "LIBRE"
}

# Check port 3050 and 3052 (alternatives)
foreach ($altPort in @(3050, 3052, 3055)) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $altPort -ErrorAction Stop 2>$null
        if (-not $conn) {
            Write-INFO "Puerto alternativo $($altPort):" "LIBRE"
        } else {
            Write-INFO "Puerto alternativo $($altPort):" "OCUPADO"
        }
    } catch { }
}

# ── 7. SPORTBAR v1.0 (EXISTENTE) ───────────────────────────────
Write-Section "7. SPORTBAR v1.0 (EXISTENTE)"

# Buscar v1.0 primero en la ruta esperada, luego en alternativas
$v10Dir = $v10Dir_Default
$v10Found = $false
$altPaths = @(
    (Join-Path $UserProfile "Desktop\sportbar"),
    (Join-Path $UserProfile "sportbar"),
    "C:\sportbar",
    "D:\sportbar"
)

# Verificar ruta por defecto
if (Test-Path $v10Dir) { $v10Found = $true }
else {
    # Buscar en alternativas comunes
    foreach ($alt in $altPaths) {
        if (Test-Path $alt) {
            $v10Dir = $alt
            $v10Found = $true
            Write-INFO "  Encontrado en ruta alternativa:" $alt
            break
        }
    }
}

if ($v10Found) {
    Write-OK "Directorio v1.0:" $v10Dir
    Write-INFO "  Existe:" "SI"

    $v10Index = Join-Path $v10Dir "index.js"
    if (Test-Path $v10Index) {
        $indexSize = (Get-Item $v10Index).Length
        Write-OK "  index.js:" "Existe ($indexSize bytes)"
        $indexContent = Get-Content $v10Index -Raw
        if ($indexContent -match "3000") {
            Write-INFO "  Puerto configurado:" "3000 (hardcodeado)"
        }
        if ($indexContent -match "public") {
            Write-INFO "  Sirve estáticos desde:" "public/"
        }
    } else {
        Write-WARN "  index.js:" "NO EXISTE — ¿ruta correcta?"
    }

    $v10Public = Join-Path $v10Dir "public"
    if (Test-Path $v10Public) {
        $publicItems = (Get-ChildItem $v10Public -Directory).Name -join ", "
        Write-OK "  public/:" "Existe con subdirectorios: $publicItems"

        $v10IndexHtml = Join-Path $v10Public "index.html"
        if (Test-Path $v10IndexHtml) {
            Write-OK "  public/index.html:" "Existe"
        }
    }

    # Check state.json / lowdb
    $v10State = Join-Path $v10Dir "state.json"
    if (Test-Path $v10State) {
        Write-INFO "  state.json:" "Existe (persistencia lowdb)"
    }
} else {
    Write-ERR "Directorio v1.0:" "NO ENCONTRADO en ninguna ruta conocida"
    Write-INFO "  Rutas buscadas:" ($v10Dir_Default + ", " + ($altPaths -join ", "))
    Write-INFO "  v1.0 no está instalado o está en una ubicación atípica."
}

# ── 7b. Proceso node corriendo en puerto 3000 ──────────────────
Write-Raw ""
try {
    $nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcs) {
        Write-OK "Procesos node activos:" "$($nodeProcs.Count)"
        foreach ($proc in $nodeProcs) {
            Write-INFO "  PID $($proc.Id):" "CPU: $([math]::Round($proc.CPU, 1))s, RAM: $([math]::Round($proc.WorkingSet64 / 1MB, 1)) MB"
        }
    } else {
        Write-WARN "Procesos node activos:" "NINGUNO — v1.0 no está corriendo"
    }
} catch {
    Write-INFO "Procesos node:" "No se pudo verificar"
}

# ── 8. VARIABLES DE ENTORNO ────────────────────────────────────
Write-Section "8. VARIABLES DE ENTORNO (SportBar)"

$varsToCheck = @(
    "VITE_ARRANGER_TOKEN",
    "ARRANGER_HOST",
    "ARRANGER_PORT",
    "PORT",
    "NODE_ENV",
    "VITE_MOCK_ARRANGER"
)

foreach ($varName in $varsToCheck) {
    $varValue = [Environment]::GetEnvironmentVariable($varName, "User")
    $varValueMachine = [Environment]::GetEnvironmentVariable($varName, "Machine")

    if ($varValue) {
        if ($varName -like "*TOKEN*") {
            Write-OK "$varName (User):" "CONFIGURADO (valor oculto: $($varValue.Substring(0, [Math]::Min(4, $varValue.Length)))...)"
        } else {
            Write-OK "$varName (User):" "$varValue"
        }
    }
    if ($varValueMachine) {
        if ($varName -like "*TOKEN*") {
            Write-INFO "$varName (Machine):" "CONFIGURADO (valor oculto)"
        } else {
            Write-INFO "$varName (Machine):" "$varValueMachine"
        }
    }
    if (-not $varValue -and -not $varValueMachine) {
        if ($varName -eq "VITE_ARRANGER_TOKEN") {
            Write-WARN $varName "NO CONFIGURADO — ¡REQUERIDO para comunicación con Arranger!"
        } else {
            Write-INFO $varName "No configurado (se usará default)"
        }
    }
}

# También chequear variables de proceso (sesión actual)
$processVars = @("VITE_ARRANGER_TOKEN", "PORT", "NODE_ENV")
foreach ($pv in $processVars) {
    $val = [Environment]::GetEnvironmentVariable($pv, "Process")
    if ($val -and $pv -like "*TOKEN*") {
        Write-INFO "$pv (Process):" "Configurado en esta sesión"
    } elseif ($val) {
        Write-INFO "$pv (Process):" "$val"
    }
}

# ── 9. TASK SCHEDULER ──────────────────────────────────────────
Write-Section "9. TASK SCHEDULER (Tareas Programadas)"

try {
    $allTasks = Get-ScheduledTask -ErrorAction Stop
    $sportbarTasks = $allTasks | Where-Object {
        $_.TaskName -like "*sportbar*" -or
        $_.TaskName -like "*SportBar*" -or
        $_.TaskName -like "*node*"
    }

    if ($sportbarTasks) {
        Write-OK "Tareas SportBar/node encontradas:" "$($sportbarTasks.Count)"
        foreach ($task in $sportbarTasks) {
            $taskInfo = Get-ScheduledTaskInfo -TaskName $task.TaskName -ErrorAction SilentlyContinue
            Write-INFO "  $($task.TaskName):" "Estado: $($task.State), Última ejecución: $($taskInfo.LastRunTime)"
        }
    } else {
        Write-WARN "Tareas SportBar:" "NINGUNA — se necesitará crear tarea para auto-arranque"
    }

    # Logon triggers
    $logonTasks = $allTasks | Where-Object {
        $_.Triggers | Where-Object { $_.CimClass.CimClassName -like "*LogonTrigger*" }
    } | Select-Object -First 5
    if ($logonTasks) {
        Write-INFO "Otras tareas al iniciar sesión:" "$($logonTasks.Count) encontradas"
        foreach ($t in $logonTasks) {
            Write-INFO "  $($t.TaskName):" $t.State
        }
    }
} catch {
    Write-SKIP "Task Scheduler" "(Get-ScheduledTask requiere admin)"
}

# ── 10. FIREWALL Y SEGURIDAD ───────────────────────────────────
Write-Section "10. FIREWALL & SEGURIDAD"

try {
    $fw = Get-NetFirewallProfile -ErrorAction Stop | Where-Object { $_.Enabled -eq $true }
    foreach ($profile in $fw) {
        Write-INFO "Firewall $($profile.Name):" "ACTIVO — $($profile.DefaultInboundAction) inbound, $($profile.DefaultOutboundAction) outbound"
    }
} catch {
    Write-SKIP "Firewall — perfiles" "(Get-NetFirewallProfile requiere admin)"
}

# Check firewall rules for port 3000 and 3051
try {
    $fwRules = Get-NetFirewallRule -ErrorAction Stop | Where-Object {
        $_.DisplayName -like "*3000*" -or
        $_.DisplayName -like "*3051*" -or
        $_.DisplayName -like "*node*" -or
        $_.DisplayName -like "*SportBar*"
    }
    if ($fwRules) {
        Write-INFO "Reglas de firewall relevantes:" "$($fwRules.Count) encontradas"
        foreach ($rule in $fwRules) {
            $status = if ($rule.Enabled) { "HABILITADA" } else { "DESHABILITADA" }
            Write-INFO "  $($rule.DisplayName):" "$status ($($rule.Direction))"
        }
    } else {
        Write-INFO "Reglas de firewall para SportBar:" "No hay reglas específicas (node.exe puede necesitar acceso)"
    }
} catch {
    Write-SKIP "Firewall — reglas" "(Get-NetFirewallRule requiere admin)"
}

# Windows Defender
try {
    $defender = Get-MpPreference -ErrorAction Stop
    if ($defender.DisableRealtimeMonitoring) {
        Write-WARN "Windows Defender tiempo real:" "DESACTIVADO"
    } else {
        Write-INFO "Windows Defender tiempo real:" "ACTIVO"
    }
    # Exclusiones
    $exclusions = $defender.ExclusionPath
    if ($exclusions) {
        Write-INFO "Exclusiones Defender:" ($exclusions -join ", ")
    }
} catch {
    Write-SKIP "Windows Defender" "(Get-MpPreference requiere admin)"
}

# Pending reboot
try {
    $rebootPending = Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired" -ErrorAction SilentlyContinue
    if (-not $rebootPending) {
        $rebootPending = Get-WMI -Class Win32_ComputerSystem | Select-Object -ExpandProperty AutomaticManagedPagefile
        # Alternative: check CBS
        $cbsPending = Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending" -ErrorAction SilentlyContinue
        $rebootPending = $rebootPending -or $cbsPending
    }
    if ($rebootPending) {
        Write-WARN "Reinicio pendiente:" "SI — conviene reiniciar antes del deploy"
    } else {
        Write-OK "Reinicio pendiente:" "NO"
    }
} catch { }

# ── 11. DIRECTORIOS PARA v1.1.0 ────────────────────────────────
Write-Section "11. DIRECTORIO DESTINO v1.1.0"

$v110Dir = $v110Dir_Default
if (Test-Path $v110Dir) {
    Write-WARN "Directorio v1.1.0:" "$v110Dir YA EXISTE — ¿deploy previo?"
    $existingItems = (Get-ChildItem $v110Dir -Directory).Name -join ", "
    Write-INFO "  Contenido existente:" $existingItems
} else {
    Write-OK "Directorio v1.1.0:" "NO EXISTE — listo para crear en deploy"
    
    # Verificar que el padre existe
    $v110Parent = Split-Path $v110Dir -Parent
    if (Test-Path $v110Parent) {
        Write-OK "Directorio padre:" "$v110Parent — existe"
    } else {
        Write-ERR "Directorio padre:" "$v110Parent — NO EXISTE"
    }
}

# ── 12. RESUMEN Y RECOMENDACIONES ──────────────────────────────
Write-Section "12. RESUMEN DE HALLAZGOS"

$issues = 0
$warnings = 0
$oks = 0

# Esta sección evalúa los datos recolectados y emite recomendaciones

# Node.js check
try {
    $nodeOK = & node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $nodeMajor = [int]($nodeOK -replace "v", "").Split(".")[0]
        if ($nodeMajor -lt 16) {
            Write-ERR "⚠ ACCIÓN REQUERIDA:" "Node.js $($nodeOK.Trim()) es demasiado viejo. Se necesita Node 18.x LTS."
            $issues++
        } elseif ($nodeMajor -lt 18) {
            Write-WARN "⚠ Node.js $($nodeOK.Trim()) — funcional pero se recomienda 18.x LTS."
            $warnings++
        } else {
            Write-OK "✅ Node.js $($nodeOK.Trim()):" "Versión compatible"
            $oks++
        }
    }
} catch { $issues++ }

# Port 3051
if ($port3051Free) {
    Write-OK "✅ Puerto 3051:" "Disponible para v1.1.0"
    $oks++
} else {
    Write-ERR "⚠ ACCIÓN REQUERIDA:" "Puerto 3051 ocupado. Liberarlo o elegir otro puerto (3050, 3052, 3055)"
    $issues++
}

# Arranger
if ($arrangerReachable) {
    Write-OK "✅ Arranger (192.168.2.254):" "Accesible"
    $oks++
} else {
    Write-WARN "⚠ Arranger:" "No accesible — ¿la PC está en la red 192.168.2.x? ¿Arranger encendido?"
    $warnings++
}

# Token
$tokenSet = [Environment]::GetEnvironmentVariable("VITE_ARRANGER_TOKEN", "User") -or
            [Environment]::GetEnvironmentVariable("VITE_ARRANGER_TOKEN", "Machine")
if ($tokenSet) {
    Write-OK "✅ VITE_ARRANGER_TOKEN:" "Configurado"
    $oks++
} else {
    Write-ERR "⚠ ACCIÓN REQUERIDA:" "VITE_ARRANGER_TOKEN no configurado. Sin esto NO se puede comunicar con el Arranger."
    $issues++
}

# v1.0 directory
if (Test-Path $v10Dir) {
    Write-OK "✅ SportBar v1.0:" "Encontrado en $v10Dir"
    $oks++
} else {
    Write-WARN "⚠ SportBar v1.0:" "No encontrado en ruta esperada"
    $warnings++
}

# RAM
if ($totalRAM -lt 2) {
    Write-ERR "⚠ RAM insuficiente:" "${totalRAM}GB — se recomienda al menos 4GB para dos procesos Node"
    $issues++
} elseif ($totalRAM -lt 4) {
    Write-WARN "⚠ RAM ajustada:" "${totalRAM}GB — funcional pero justa para dos procesos Node"
    $warnings++
} else {
    Write-OK "✅ RAM:" "${totalRAM}GB — suficiente"
    $oks++
}

# Disk
if ($diskFree -lt 1) {
    Write-ERR "⚠ Disco C: crítico:" "${diskFree}GB libres — insuficiente"
    $issues++
} elseif ($diskFree -lt 5) {
    Write-WARN "⚠ Disco C: bajo:" "${diskFree}GB libres — ajustado pero funcional"
    $warnings++
} else {
    Write-OK "✅ Disco C:" "${diskFree}GB libres — suficiente"
    $oks++
}

# Firewall for node
if ($isAdmin) {
    try {
        $nodeFwRule = Get-NetFirewallRule -DisplayName "*node*" -ErrorAction SilentlyContinue
        if (-not $nodeFwRule) {
            Write-WARN "⚠ Firewall:" "No hay regla explícita para node.exe. Si hay problemas de acceso, crear regla inbound para puertos 3000,3051."
            $warnings++
        }
    } catch { }
}

# ── RESULTADO ───────────────────────────────────────────────────
Write-Raw ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                     RESULTADO DEL DIAGNÓSTICO                   ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  ✅ $oks OK   ⚠ $warnings Warnings   ✗ $issues Issues              ║" -ForegroundColor White
if ($Script:AdminSkipped -gt 0) {
    Write-Host "║  ⊘ $($Script:AdminSkipped) chequeos omitidos (requiere admin)                          ║" -ForegroundColor DarkGray
    $skippedSummary = ($Script:AdminSkippedItems -join ", ")
    if ($skippedSummary.Length -gt 55) {
        $skippedSummary = $skippedSummary.Substring(0, 52) + "..."
    }
    Write-Host "║    $skippedSummary" -ForegroundColor DarkGray
}
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

if ($issues -gt 0) {
    Write-Raw ""
    Write-Host "  ⚠ ATENCIÓN: Hay $issues problemas que DEBEN resolverse antes del deploy." -ForegroundColor Red
    Write-Host "  Revisá las secciones marcadas con ✗ más arriba." -ForegroundColor Red
}

if ($issues -eq 0 -and $warnings -eq 0) {
    Write-Raw ""
    Write-Host "  🎉 ¡Todo listo! El sistema está preparado para el deploy de v1.1.0." -ForegroundColor Green
}

# ── Guardar log ─────────────────────────────────────────────────
try {
    $ReportLines -join "`n" | Out-File -FilePath $LogFile -Encoding UTF8
    Write-Raw ""
    Write-INFO "📄 Reporte completo guardado en:" $LogFile
} catch {
    Write-WARN "Log:" "No se pudo guardar el archivo — $($_.Exception.Message)"
}

Write-Raw ""
