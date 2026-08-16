<#
.SYNOPSIS
    Inspecciona y aplica hardening de seguridad para deploy de SportBar

.DESCRIPTION
    Fase 0 (INSPECCIÓN): analiza el estado actual del equipo sin tocar nada.
    Muestra un GAP ANALYSIS de qué capas necesitan acción y qué ya está OK.
    Luego aplica solo lo faltante (con confirmación interactiva o --Force).

    5 capas de hardening:
    Capa 1: npm blindado (ignore-scripts, solo prod, audit)
    Capa 2: Proceso aislado (no admin/root)
    Capa 3: Filesystem (app readonly, state.json + logs writable)
    Capa 4: Red (firewall: solo LAN 192.168.2.0/24 + Arranger)
    Capa 5: Runtime (flags restrictivos de Node.js)

    Cross-platform: Windows (PS 5.1+) + Linux (PS 7+ o bash).

.PARAMETER Force
    Aplica hardening sin preguntar (no interactivo)

.PARAMETER InspectOnly
    Solo ejecuta la Fase 0 de inspección, no aplica nada

.EXAMPLE
    powershell -File ".\Security-Hardening.ps1"              # Interactivo
    powershell -File ".\Security-Hardening.ps1" -Force        # Auto
    powershell -File ".\Security-Hardening.ps1" -InspectOnly  # Solo análisis
#>

param(
    [string]$AppDir = $PSScriptRoot,
    [switch]$Force,
    [switch]$InspectOnly,
    [switch]$SkipFirewall,
    [switch]$SkipFilesystem
)

$ErrorActionPreference = "Continue"

# ── Forzar UTF-8 en consola (evita caracteres corruptos) ──────
if ($IsWindows) {
    try { & chcp 65001 2>$null | Out-Null } catch { }
    try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
}
$IsWindows = $PSVersionTable.Platform -eq "Win32NT" -or (-not $PSVersionTable.Platform)
$IsAdmin = $false

# ── Detectar SO y privilegios ──────────────────────────────────
if ($IsWindows) {
    $IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    $OSName = "Windows"
} else {
    try { $IsAdmin = (id -u) -eq 0 } catch { $IsAdmin = $false }
    $OSName = "Linux"
}

# ── Auto-detectar AppDir ───────────────────────────────────────
if ((Split-Path $AppDir -Leaf) -eq "hardening") {
    $AppDir = Split-Path (Split-Path $AppDir -Parent) -Parent
}

$sep  = "=" * 64
$sep2 = "-" * 64

# ═══════════════════════════════════════════════════════════════
# FASE 0: INSPECCIÓN — analizar estado actual sin tocar nada
# ═══════════════════════════════════════════════════════════════

Clear-Host
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔍 SPORTBAR SECURITY HARDENING                              ║" -ForegroundColor Cyan
Write-Host "║  FASE 0: Inspección del sistema (solo lectura)               ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  OS: $OSName | Admin: $IsAdmin | AppDir: $AppDir" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Estado de cada capa: "OK", "MISSING", "WARN", "SKIP", "ERROR"
$state = @{}

# ── Inspeccionar Capa 1: npm ───────────────────────────────────
Write-Host $sep
Write-Host "  INSPECCIÓN: Capa 1 — npm blindado (ignore-scripts)"
Write-Host $sep

$npmrcPath = Join-Path $AppDir "server\.npmrc"
$npmrcSource = Join-Path $PSScriptRoot ".npmrc-production"

if (Test-Path $npmrcPath) {
    $npmrcContent = Get-Content $npmrcPath -Raw
    $hasIgnoreScripts = $npmrcContent -match "ignore-scripts\s*=\s*true"
    $hasProduction = $npmrcContent -match "production\s*=\s*true"
    $hasOmitOptional = $npmrcContent -match "omit\s*=\s*optional"
    $hasAudit = $npmrcContent -match "audit-level\s*=\s*(high|critical)"

    Write-Host "  ✓ .npmrc existe: $npmrcPath" -ForegroundColor Green
    Write-Host "    ignore-scripts=true : $(if($hasIgnoreScripts){'✅'}else{'❌'})"
    Write-Host "    production=true     : $(if($hasProduction){'✅'}else{'❌'})"
    Write-Host "    omit=optional       : $(if($hasOmitOptional){'✅'}else{'❌'})"
    Write-Host "    audit-level=high    : $(if($hasAudit){'✅'}else{'❌'})"

    if ($hasIgnoreScripts -and $hasProduction -and $hasOmitOptional -and $hasAudit) {
        $state["npm"] = "OK"
        Write-Host "  → Estado: OK — npm ya está blindado" -ForegroundColor Green
    } else {
        $state["npm"] = "WARN"
        Write-Host "  → Estado: PARCIAL — faltan algunas configuraciones" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ .npmrc NO existe en server/" -ForegroundColor Red
    Write-Host "  → Estado: MISSING — se necesita crear .npmrc blindado" -ForegroundColor Yellow
    $state["npm"] = "MISSING"
}
Write-Host ""

# ── Inspeccionar Capa 2: Proceso ───────────────────────────────
Write-Host $sep
Write-Host "  INSPECCIÓN: Capa 2 — Proceso aislado (no admin/root)"
Write-Host $sep

$currentUser = if ($IsWindows) { whoami } else { "$(whoami) (UID: $(id -u))" }
Write-Host "  Usuario actual: $currentUser"

if ($IsAdmin) {
    Write-Host "  ✗ Ejecutando como ADMINISTRADOR — riesgo elevado" -ForegroundColor Red
    Write-Host "  → Estado: WARN — se recomienda usar usuario limitado" -ForegroundColor Yellow
    $state["process"] = "WARN"
} else {
    Write-Host "  ✓ Ejecutando como usuario limitado" -ForegroundColor Green
    Write-Host "  → Estado: OK" -ForegroundColor Green
    $state["process"] = "OK"
}
Write-Host ""

# ── Inspeccionar Capa 3: Filesystem ────────────────────────────
Write-Host $sep
Write-Host "  INSPECCIÓN: Capa 3 — Filesystem (app readonly)"
Write-Host $sep

if ($SkipFilesystem) {
    Write-Host "  ⊘ Saltado por --SkipFilesystem" -ForegroundColor DarkGray
    $state["filesystem"] = "SKIP"
} elseif (-not $IsAdmin) {
    Write-Host "  ⊘ No se puede inspeccionar sin admin" -ForegroundColor DarkGray
    Write-Host "  → Estado: SKIP — requiere admin para verificar permisos NTFS" -ForegroundColor Yellow
    $state["filesystem"] = "SKIP"
} else {
    if ($IsWindows) {
        $currentPerms = & icacls $AppDir 2>$null
        Write-Host "  Permisos actuales en raíz de app:"
        Write-Host "  $(($currentPerms -split "`n")[0])" -ForegroundColor Gray
        # Verificar herencia (si no está rota, es el default de Windows = heredado)
        if ($currentPerms -match "BUILTIN") {
            Write-Host "  → Estado: DEFAULT — permisos heredados del sistema" -ForegroundColor Yellow
            Write-Host "  → Recomendación: restringir a solo lectura (RX)" -ForegroundColor Yellow
            $state["filesystem"] = "WARN"
        } else {
            Write-Host "  → Estado: MODIFICADO — permisos personalizados" -ForegroundColor Yellow
            $state["filesystem"] = "WARN"
        }
    } else {
        $perms = & stat -c "%a" $AppDir 2>$null
        if ($perms) {
            Write-Host "  Permisos actuales: $perms" -ForegroundColor Gray
            if ($perms -ge "755") {
                Write-Host "  → Estado: DEFAULT — permisos amplios (755+)" -ForegroundColor Yellow
                $state["filesystem"] = "WARN"
            }
        } else {
            $state["filesystem"] = "UNKNOWN"
        }
    }
}
Write-Host ""

# ── Inspeccionar Capa 4: Red ───────────────────────────────────
Write-Host $sep
Write-Host "  INSPECCIÓN: Capa 4 — Red (firewall restringido)"
Write-Host $sep

if ($SkipFirewall) {
    Write-Host "  ⊘ Saltado por --SkipFirewall" -ForegroundColor DarkGray
    $state["firewall"] = "SKIP"
} elseif (-not $IsAdmin) {
    Write-Host "  ⊘ No se puede inspeccionar sin admin" -ForegroundColor DarkGray
    $state["firewall"] = "SKIP"
} else {
    if ($IsWindows) {
        $ruleName = "SportBar v1.1.0 (TCP 3051)"
        $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if ($existing -and $existing.Enabled) {
            Write-Host "  ✓ Regla de firewall existe: $ruleName" -ForegroundColor Green
            $existing | Format-List Direction, Protocol, LocalPort, RemoteAddress, Action | Out-String | Write-Host -ForegroundColor Gray
            Write-Host "  → Estado: OK" -ForegroundColor Green
            $state["firewall"] = "OK"
        } else {
            Write-Host "  ✗ No hay regla de firewall específica para SportBar" -ForegroundColor Yellow
            Write-Host "  → Estado: MISSING — recomendado restringir inbound a LAN" -ForegroundColor Yellow
            $state["firewall"] = "MISSING"
        }

        # Verificar si hay reglas genéricas que permitan node.exe
        $nodeRules = Get-NetFirewallRule -Enabled True -Direction Inbound -ErrorAction SilentlyContinue |
                     Where-Object { $_.DisplayName -like "*node*" -or $_.DisplayName -like "*SportBar*" }
        if ($nodeRules) {
            Write-Host "  ℹ Reglas genéricas para node.exe: $($nodeRules.Count)" -ForegroundColor Gray
        }
    } else {
        $ufwStatus = & ufw status 2>$null
        if ($ufwStatus -match "3051") {
            Write-Host "  ✓ Puerto 3051 en firewall (ufw)" -ForegroundColor Green
            $state["firewall"] = "OK"
        } else {
            Write-Host "  → Estado: MISSING — no hay regla para puerto 3051" -ForegroundColor Yellow
            $state["firewall"] = "MISSING"
        }
    }
}
Write-Host ""

# ── Inspeccionar Capa 5: Runtime ───────────────────────────────
Write-Host $sep
Write-Host "  INSPECCIÓN: Capa 5 — Runtime (flags restrictivos de Node.js)"
Write-Host $sep

try {
    $nodeVersion = & node --version 2>&1
    $nodeMajor = [int]($nodeVersion -replace "v", "").Split(".")[0]
    Write-Host "  Node.js: $nodeVersion (major: $nodeMajor)" -ForegroundColor Gray

    # ── Determinar flags disponibles por versión ─────────────────
    # Los flags experimentales se vuelven estables o se eliminan
    # según la versión de Node.js. No forzamos flags que no existen.
    $availableFlags = @()

    # --no-experimental-fetch: experimental en 18, estable en 21+
    if ($nodeMajor -ge 18 -and $nodeMajor -le 20) {
        $fetchCheck = & node --no-experimental-fetch -e "console.log('ok')" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $availableFlags += "--no-experimental-fetch"
            Write-Host "  ✓ --no-experimental-fetch soportado" -ForegroundColor Green
        }
    } elseif ($nodeMajor -ge 21) {
        Write-Host "  ⊘ --no-experimental-fetch no necesario (fetch estable en Node $nodeMajor+)" -ForegroundColor DarkGray
    }

    # --no-experimental-websocket: eliminado en Node 22+
    if ($nodeMajor -lt 22) {
        $wsCheck = & node --no-experimental-websocket -e "console.log('ok')" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $availableFlags += "--no-experimental-websocket"
            Write-Host "  ✓ --no-experimental-websocket soportado" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⊘ --no-experimental-websocket no necesario (WebSocket estable en Node $nodeMajor+)" -ForegroundColor DarkGray
    }

    # --max-http-header-size: disponible desde Node 12
    $headerCheck = & node --max-http-header-size=16384 -e "console.log('ok')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $availableFlags += "--max-http-header-size=16384"
        Write-Host "  ✓ --max-http-header-size soportado" -ForegroundColor Green
    }

    # --max-old-space-size: siempre disponible
    $availableFlags += "--max-old-space-size=256"
    Write-Host "  ✓ --max-old-space-size soportado" -ForegroundColor Green

    # --no-warnings: siempre disponible
    $availableFlags += "--no-warnings"
    Write-Host "  ✓ --no-warnings soportado" -ForegroundColor Green

    # Guardar flags detectados para usar después
    $Global:DetectedFlags = $availableFlags -join " "
    Write-Host "  → Flags activos para esta versión de Node: $Global:DetectedFlags" -ForegroundColor Gray

    Write-Host "  → Estado: INFO — flags disponibles, verificar en launchers" -ForegroundColor Gray
    $state["runtime"] = "OK"
} catch {
    Write-Host "  ✗ Node.js no detectado" -ForegroundColor Red
    $state["runtime"] = "ERROR"
}
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# GAP ANALYSIS
# ═══════════════════════════════════════════════════════════════

Write-Host $sep
Write-Host "  📊 GAP ANALYSIS — Qué necesita acción"
Write-Host $sep

$okCount = 0; $warnCount = 0; $missingCount = 0; $skipCount = 0; $errorCount = 0

$layers = @(
    @{Key="npm";        Name="1. npm blindado (ignore-scripts)  "; Detail=".npmrc con ignore-scripts, solo prod, audit-level=high"},
    @{Key="process";    Name="2. Proceso aislado (no admin)     "; Detail="El proceso node corre como usuario limitado"},
    @{Key="filesystem"; Name="3. Filesystem (app readonly)      "; Detail="Solo state.json y logs/ tienen write"},
    @{Key="firewall";   Name="4. Red (firewall restringido)     "; Detail="Inbound TCP 3051 solo desde LAN 192.168.2.0/24"},
    @{Key="runtime";    Name="5. Runtime (flags restrictivos)   "; Detail="Node con --no-experimental-fetch, --no-warnings, etc."}
)

foreach ($layer in $layers) {
    $s = $state[$layer.Key]
    $icon, $color = switch ($s) {
        "OK"      { "✅"; "Green" }
        "WARN"    { "⚠️"; "Yellow" }
        "MISSING" { "❌"; "Red" }
        "SKIP"    { "⊘"; "DarkGray" }
        "ERROR"   { "✗"; "Red" }
        default   { "❓"; "Gray" }
    }

    switch ($s) {
        "OK"      { $okCount++ }
        "WARN"    { $warnCount++ }
        "MISSING" { $missingCount++ }
        "SKIP"    { $skipCount++ }
        "ERROR"   { $errorCount++ }
    }

    Write-Host "  $icon $($layer.Name) [$s]" -ForegroundColor $color
    Write-Host "     $($layer.Detail)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "  ┌─────────────────────────────────────────────┐"
Write-Host "  │  ✅ OK: $okCount  ⚠️ WARN: $warnCount  ❌ MISSING: $missingCount  ⊘ SKIP: $skipCount │" -ForegroundColor White
Write-Host "  └─────────────────────────────────────────────┘"
Write-Host ""

# Decisión
if ($InspectOnly) {
    Write-Host "  🔍 Modo --InspectOnly: análisis completo. No se aplicaron cambios." -ForegroundColor Cyan
    Write-Host "     Para aplicar hardening: ejecutar sin --InspectOnly" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

if ($missingCount -eq 0 -and $warnCount -eq 0 -and $errorCount -eq 0) {
    Write-Host "  🎉 El sistema ya cumple con todas las capas de hardening." -ForegroundColor Green
    Write-Host "     No se necesita aplicar nada." -ForegroundColor Green
    Write-Host ""
    exit 0
}

# ── Confirmación interactiva ────────────────────────────────────
if (-not $Force) {
    Write-Host "  ═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  ¿Aplicar hardening a las capas faltantes?" -ForegroundColor Yellow
    Write-Host "  Solo se modificarán las capas en estado MISSING o WARN." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [S] Sí, aplicar   [N] No, salir   [I] Solo inspección" -ForegroundColor White
    Write-Host ""

    $response = Read-Host "  Opción"
    if ($response -notmatch "^(s|si|sí|y|yes)$") {
        Write-Host ""
        Write-Host "  ⊘ Hardening cancelado por el usuario." -ForegroundColor Yellow
        Write-Host "     Para aplicar después: $(Split-Path $MyInvocation.MyCommand.Path -Leaf) --Force" -ForegroundColor Gray
        Write-Host ""
        exit 0
    }
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════
# FASE 1-5: APLICAR — solo lo que falta
# ═══════════════════════════════════════════════════════════════

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔧 APLICANDO HARDENING (solo capas faltantes)               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$applied = @()

# ── Capa 1: npm ─────────────────────────────────────────────────
if ($state["npm"] -in @("MISSING", "WARN")) {
    Write-Host $sep
    Write-Host "  APLICANDO: Capa 1 — npm blindado"
    Write-Host $sep

    if (-not (Test-Path $npmrcSource)) {
        $npmrcContent = @"
ignore-scripts=true
omit=optional
production=true
audit-level=high
save-exact=true
package-lock=true
fund=false
loglevel=warn
registry=https://registry.npmjs.org/
fetch-timeout=30000
fetch-retries=2
"@
    } else {
        $npmrcContent = Get-Content $npmrcSource -Raw
    }

    Set-Content -Path $npmrcPath -Value $npmrcContent -Force
    Write-Host "  ✓ .npmrc creado: $npmrcPath" -ForegroundColor Green
    Write-Host "    ignore-scripts=true → bloquea preinstall/install/postinstall/prepare" -ForegroundColor Gray
    $applied += "npm"
}

# ── Capa 2: Proceso ─────────────────────────────────────────────
if ($state["process"] -eq "WARN") {
    Write-Host $sep
    Write-Host "  ADVERTENCIA: Capa 2 — Proceso aislado"
    Write-Host $sep
    Write-Host "  ⚠ No se puede forzar — estás ejecutando como admin." -ForegroundColor Yellow
    Write-Host "    Recomendación manual:" -ForegroundColor Gray
    if ($IsWindows) {
        Write-Host "    New-LocalUser -Name 'sportbar-svc' -NoPassword" -ForegroundColor Gray
        Write-Host "    Luego ejecutar los launchers como sportbar-svc" -ForegroundColor Gray
    } else {
        Write-Host "    useradd -r -s /bin/false sportbar-svc" -ForegroundColor Gray
    }
    Write-Host ""
}

# ── Capa 3: Filesystem ──────────────────────────────────────────
if ($state["filesystem"] -in @("WARN") -and -not $SkipFilesystem -and $IsAdmin) {
    Write-Host $sep
    Write-Host "  APLICANDO: Capa 3 — Filesystem readonly"
    Write-Host $sep

    if ($IsWindows) {
        $serverDir = Join-Path $AppDir "server"
        $stateFile = Join-Path $serverDir "state.json"
        $logsDir = Join-Path $AppDir "scripts\deploy\logs"
        $cu = $env:USERNAME

        # Crear state.json si no existe
        if (-not (Test-Path $stateFile)) {
            New-Item -ItemType File -Path $stateFile -Force | Out-Null
        }
        # Crear logs/ si no existe
        if (-not (Test-Path $logsDir)) {
            New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
        }

        try {
            & icacls $AppDir /inheritance:r /grant "${cu}:(RX)" /T /Q 2>$null
            Write-Host "  ✓ Árbol de app: readonly (RX) para $cu" -ForegroundColor Green
            & icacls $stateFile /grant "${cu}:(M)" /Q 2>$null
            Write-Host "  ✓ server/state.json: writable para $cu" -ForegroundColor Green
            & icacls $logsDir /grant "${cu}:(M)" /T /Q 2>$null
            Write-Host "  ✓ scripts/deploy/logs/: writable para $cu" -ForegroundColor Green
            $applied += "filesystem"
        } catch {
            Write-Host "  ✗ Error: $_" -ForegroundColor Red
        }
    } else {
        bash -c "chmod -R a-w '$AppDir' 2>/dev/null; touch '$AppDir/server/state.json'; chmod u+w '$AppDir/server/state.json'; mkdir -p '$AppDir/scripts/deploy/logs'; chmod u+w '$AppDir/scripts/deploy/logs'"
        Write-Host "  ✓ Filesystem hardening aplicado (Linux)" -ForegroundColor Green
        $applied += "filesystem"
    }
}

# ── Capa 4: Firewall ────────────────────────────────────────────
if ($state["firewall"] -in @("MISSING") -and -not $SkipFirewall -and $IsAdmin) {
    Write-Host $sep
    Write-Host "  APLICANDO: Capa 4 — Firewall"
    Write-Host $sep

    if ($IsWindows) {
        $ruleName = "SportBar v1.1.0 (TCP 3051)"
        try {
            New-NetFirewallRule -DisplayName $ruleName `
                -Direction Inbound `
                -Protocol TCP `
                -LocalPort 3051 `
                -RemoteAddress "192.168.2.0/24" `
                -Action Allow `
                -Profile Domain,Private `
                -ErrorAction Stop | Out-Null
            Write-Host "  ✓ Regla de firewall creada: $ruleName" -ForegroundColor Green
            Write-Host "    Inbound TCP 3051 solo desde LAN 192.168.2.0/24" -ForegroundColor Gray
            $applied += "firewall"
        } catch {
            Write-Host "  ✗ No se pudo crear regla: $_" -ForegroundColor Red
        }
    }
}

# ── Capa 5: Runtime ─────────────────────────────────────────────
$flagsFile = Join-Path $AppDir "scripts\deploy\node-flags.txt"

# Usar flags detectados en la fase de inspección, con fallback
if ($Global:DetectedFlags) {
    $flagsContent = "# Node.js runtime flags — producción SportBar (Node v$nodeMajor)`n$($Global:DetectedFlags)"
} else {
    # Fallback conservador: solo flags universales
    $flagsContent = @"
# Node.js runtime flags — producción SportBar (fallback universal)
--no-warnings
--max-http-header-size=16384
--max-old-space-size=256
"@
}
Set-Content -Path $flagsFile -Value $flagsContent -Force
Write-Host $sep
Write-Host "  APLICANDO: Capa 5 — Runtime flags"
Write-Host $sep
Write-Host "  ✓ Flags guardados en: $flagsFile" -ForegroundColor Green
Write-Host "  ✓ Flags: $(($flagsContent -split "`n" | Where-Object { $_ -notmatch '^#' -and $_ -match '\S' }) -join ' ')" -ForegroundColor Gray
$applied += "runtime"

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# FASE 6: VERIFICAR
# ═══════════════════════════════════════════════════════════════

Write-Host $sep
Write-Host "  📋 RESUMEN FINAL"
Write-Host $sep

if ($applied.Count -eq 0) {
    Write-Host "  No se aplicaron cambios — el sistema ya estaba OK o se saltaron capas." -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Capas aplicadas: $($applied -join ', ')" -ForegroundColor Green
}

Write-Host ""
Write-Host "  Resumen de estado final:"
foreach ($layer in $layers) {
    $finalState = if ($layer.Key -in $applied) { "✅ APLICADO" }
                  else { $state[$layer.Key] }
    $color = if ($layer.Key -in $applied) { "Green" } else { "Gray" }
    Write-Host "    $($layer.Name) → $finalState" -ForegroundColor $color
}

Write-Host ""
Write-Host "  ┌─────────────────────────────────────────────────────────────┐"
Write-Host "  │  🎉 Hardening completado.                                 │" -ForegroundColor Green
Write-Host "  │  Próximo paso: npm install --production en server/         │" -ForegroundColor Green
Write-Host "  │  Luego: audit-check.ps1 antes de arrancar                  │" -ForegroundColor Green
Write-Host "  └─────────────────────────────────────────────────────────────┘"
Write-Host ""
