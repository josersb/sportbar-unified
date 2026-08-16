<#
.SYNOPSIS
    Pre-flight: audita dependencias antes de permitir el arranque en producción

.DESCRIPTION
    Ejecuta npm audit --production y bloquea el arranque si encuentra
    vulnerabilidades HIGH o CRITICAL.

    Debe ejecutarse ANTES de iniciar SportBar Master.ps1.

.OUTPUTS
    Exit code 0 = seguro para arrancar
    Exit code 1 = vulnerabilidades HIGH/CRITICAL encontradas

.EXAMPLE
    powershell -File ".\audit-check.ps1" -AppDir "C:\Users\salamultimedia\Documents\sportbar-v1.1.0"
#>

param(
    [string]$AppDir = $PSScriptRoot,
    [int]$MaxHighAllowed = 0,
    [int]$MaxModerateAllowed = 5,
    [switch]$SkipAudit
)

$ErrorActionPreference = "Continue"

# Auto-detectar si AppDir apunta a scripts/deploy/hardening y subir
if ((Split-Path $AppDir -Leaf) -eq "hardening") {
    $AppDir = Split-Path (Split-Path $AppDir -Parent) -Parent
}

$serverDir = Join-Path $AppDir "server"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔍 SPORTBAR AUDIT CHECK — Pre-Flight Security              ║" -ForegroundColor Cyan
Write-Host "║  $serverDir" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($SkipAudit) {
    Write-Host "  ⊘ AUDIT SALTADO (--SkipAudit). NO recomendado para producción." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

if (-not (Test-Path $serverDir)) {
    Write-Host "  ✗ Directorio server/ no encontrado: $serverDir" -ForegroundColor Red
    exit 1
}

Push-Location $serverDir

# ── Verificar que node_modules existe ──────────────────────────
if (-not (Test-Path "node_modules")) {
    Write-Host "  ⚠ node_modules no encontrado. Ejecutá npm install --production primero." -ForegroundColor Yellow
    Write-Host "    cd $serverDir && npm install --production" -ForegroundColor Gray
    Pop-Location
    exit 1
}

# ── Ejecutar npm audit ────────────────────────────────────────
Write-Host "  Ejecutando npm audit --omit=dev..."
Write-Host ""

# npm 11 usa --omit=dev en vez de --production
# 2>&1 mergea stderr warnings con stdout JSON — hay que filtrar
$auditRaw = & npm audit --omit=dev --json 2>&1
$auditExit = $LASTEXITCODE

# Extraer solo el JSON (npm 11 puede anteponer warnings en stderr)
if ($auditRaw -is [array]) { $auditRaw = $auditRaw -join "`n" }
$jsonStart = $auditRaw.IndexOf("{")
if ($jsonStart -gt 0) { $auditRaw = $auditRaw.Substring($jsonStart) }

# Parsear resultado
try {
    $auditJson = $auditRaw | ConvertFrom-Json
} catch {
    Write-Host "  ⚠ npm audit no devolvió JSON válido." -ForegroundColor Yellow
    Write-Host "  Salida cruda (primeros 500 chars): $($auditRaw.Substring(0, [Math]::Min(500, $auditRaw.Length)))" -ForegroundColor Gray
    Pop-Location
    exit 0
}

# ── Analizar vulnerabilidades ──────────────────────────────────
$critical = 0
$high = 0
$moderate = 0
$low = 0
$info = 0

if ($auditJson.metadata.vulnerabilities) {
    $vulns = $auditJson.metadata.vulnerabilities
    $critical = $vulns.critical
    $high = $vulns.high
    $moderate = $vulns.moderate
    $low = $vulns.low
    $info = $vulns.info
}

Write-Host "  ┌─────────────────────────────────────┐"
Write-Host "  │  CRITICAL : $critical" -ForegroundColor $(if ($critical -gt 0) { "Red" } else { "Green" })
Write-Host "  │  HIGH     : $high" -ForegroundColor $(if ($high -gt 0) { "Red" } else { "Green" })
Write-Host "  │  MODERATE : $moderate" -ForegroundColor $(if ($moderate -gt 0) { "Yellow" } else { "Green" })
Write-Host "  │  LOW      : $low" -ForegroundColor Gray
Write-Host "  │  INFO     : $info" -ForegroundColor Gray
Write-Host "  └─────────────────────────────────────┘"
Write-Host ""

# ── Decisión ───────────────────────────────────────────────────
$blocked = $false

if ($critical -gt 0) {
    Write-Host "  ✗ BLOQUEADO: $critical vulnerabilidades CRITICAL" -ForegroundColor Red
    Write-Host "    No se puede desplegar a producción con vulnerabilidades críticas." -ForegroundColor Red
    $blocked = $true
}

if ($high -gt $MaxHighAllowed) {
    Write-Host "  ✗ BLOQUEADO: $high vulnerabilidades HIGH (máx permitido: $MaxHighAllowed)" -ForegroundColor Red
    Write-Host "    Actualizar paquetes afectados o aceptar con --MaxHighAllowed." -ForegroundColor Red
    $blocked = $true
}

if ($moderate -gt $MaxModerateAllowed) {
    Write-Host "  ✗ BLOQUEADO: $moderate vulnerabilidades MODERATE (máx permitido: $MaxModerateAllowed)" -ForegroundColor Red
    $blocked = $true
}

if (-not $blocked) {
    Write-Host "  ✓ AUDIT APROBADO. Seguro para arrancar." -ForegroundColor Green
    if ($moderate -gt 0) {
        Write-Host "    $moderate moderadas — dentro del umbral aceptable ($MaxModerateAllowed)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "  i Para revisar detalles: cd $serverDir ; npm audit" -ForegroundColor Gray
Write-Host "  i Para forzar (NO recomendado): -SkipAudit o -MaxHighAllowed 999" -ForegroundColor Gray
Write-Host ""

Pop-Location

if ($blocked) { exit 1 } else { exit 0 }
