# NVM-Windows Auto-Switch Script
# Ubicacion: perfil de PowerShell o ejecucion manual
# Usage: Agregar al perfil de PowerShell

function Switch-NodeVersion {
    <#
    .SYNOPSIS
        Automatically switches Node version based on .nvmrc file
    
    .DESCRIPTION
        Detects .nvmrc in current directory and switches to the specified Node version using NVM for Windows
    #>
    
    # Buscar archivo .nvmrc en directorio actual o padres
    $currentDir = Get-Location
    $nvmrcPath = $null
    
    # Buscar desde directorio actual hacia arriba
    $dir = $currentDir
    while ($dir) {
        $testPath = Join-Path $dir ".nvmrc"
        if (Test-Path $testPath) {
            $nvmrcPath = $testPath
            break
        }
        $dir = Split-Path $dir -Parent
    }
    
    if (-not $nvmrcPath) {
        return  # No se encontro .nvmrc
    }
    
    # Leer version
    $nodeVersion = (Get-Content $nvmrcPath -Raw).Trim()
    
    if (-not $nodeVersion) {
        Write-Host "[NVM-Auto] .nvmrc vacio en $nvmrcPath" -ForegroundColor Yellow
        return
    }
    
    # Verificar que la version este instalada
    $installedVersions = (nvm list 2>&1) -replace '\s+', '' -split '\r?\n'
    
    if (-not ($installedVersions -contains $nodeVersion)) {
        Write-Host "[NVM-Auto] Version $nodeVersion no instalada. Instalar con: nvm install $nodeVersion" -ForegroundColor Yellow
        return
    }
    
    # Obtener version actual
    $currentVersion = (nvm current 2>&1)
    
    if ($currentVersion -eq $nodeVersion) {
        return  # Ya esta usando la version correcta
    }
    
    # Cambiar version
    Write-Host "[NVM-Auto] Cambiando a Node v$nodeVersion..." -ForegroundColor Cyan
    nvm use $nodeVersion
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[NVM-Auto] OK - Node v$nodeVersion activo" -ForegroundColor Green
    }
}

# Alias para usar en cada cd
function cd {
    param(
        [string]$Path = $null
    )
    
    if ($Path) {
        Set-Location $Path
    } else {
        Set-Location $HOME
    }
    
    # Auto-switch Node version
    Switch-NodeVersion
}

# Tambien ejecutar en prompt para detectar cambios de directorio
$originalPrompt = if (Get-Command prompt -ErrorAction SilentlyContinue) { (Get-Command prompt).ScriptBlock } else { { "PS $($executionContext.SessionState.Path.CurrentLocation)$('>' * ($nestedPromptLevel + 1)) " } }

function prompt {
    # Ejecutar switch en cada prompt
    Switch-NodeVersion
    & $originalPrompt
}
