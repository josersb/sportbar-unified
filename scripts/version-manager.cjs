#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * SportBar Unified - Version Manager
 * Script para gestionar versiones exactas de dependencias
 */

const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  reset: '\x1b[0m'
};

const projectRoot = path.resolve(__dirname, '..');
const serverDir = path.join(projectRoot, 'server');

function log(message, color = 'reset') {
  console.log(colors[color] ? colors[color](message) : message);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function execCommand(command, cwd = projectRoot, silent = false) {
  try {
    const result = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function readPackageJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logError(`Error leyendo ${filePath}: ${error.message}`);
    return null;
  }
}

function writePackageJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (error) {
    logError(`Error escribiendo ${filePath}: ${error.message}`);
    return false;
  }
}

function removeVersionRanges(dependencies) {
  if (!dependencies) return dependencies;

  const cleaned = {};
  for (const [pkg, version] of Object.entries(dependencies)) {
    // Remover ^ ~ >= < > etc.
    const cleanVersion = version.replace(/^[^0-9]*/, '');
    cleaned[pkg] = cleanVersion;
  }
  return cleaned;
}

function checkVersionRanges(packagePath) {
  logStep('CHECK', `Verificando versiones en ${path.basename(packagePath)}`);

  const pkg = readPackageJson(packagePath);
  if (!pkg) return false;

  let hasRanges = false;
  const issues = [];

  // Verificar dependencies
  if (pkg.dependencies) {
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      if (version.match(/^[^0-9]/)) {
        hasRanges = true;
        issues.push(`dependencies.${name}: ${version}`);
      }
    }
  }

  // Verificar devDependencies
  if (pkg.devDependencies) {
    for (const [name, version] of Object.entries(pkg.devDependencies)) {
      if (version.match(/^[^0-9]/)) {
        hasRanges = true;
        issues.push(`devDependencies.${name}: ${version}`);
      }
    }
  }

  if (hasRanges) {
    logWarning(`Encontradas versiones con rangos en ${path.basename(packagePath)}:`);
    issues.forEach(issue => log(`  - ${issue}`, 'yellow'));
  } else {
    logSuccess(`Todas las versiones son exactas en ${path.basename(packagePath)}`);
  }

  return !hasRanges;
}

function fixVersionRanges(packagePath) {
  logStep('FIX', `Corrigiendo versiones en ${path.basename(packagePath)}`);

  const pkg = readPackageJson(packagePath);
  if (!pkg) return false;

  let modified = false;

  // Corregir dependencies
  if (pkg.dependencies) {
    const cleaned = removeVersionRanges(pkg.dependencies);
    if (JSON.stringify(cleaned) !== JSON.stringify(pkg.dependencies)) {
      pkg.dependencies = cleaned;
      modified = true;
    }
  }

  // Corregir devDependencies
  if (pkg.devDependencies) {
    const cleaned = removeVersionRanges(pkg.devDependencies);
    if (JSON.stringify(cleaned) !== JSON.stringify(pkg.devDependencies)) {
      pkg.devDependencies = cleaned;
      modified = true;
    }
  }

  if (modified) {
    if (writePackageJson(packagePath, pkg)) {
      logSuccess(`Versiones corregidas en ${path.basename(packagePath)}`);
      return true;
    }
  } else {
    logSuccess(`No se requieren cambios en ${path.basename(packagePath)}`);
    return true;
  }

  return false;
}

function installWithExactVersions(cwd, packageName) {
  const dir = path.basename(cwd);
  logStep('INSTALL', `Instalando dependencias en ${dir}`);

  // Verificar que existe .npmrc con save-exact=true
  const npmrcPath = path.join(cwd, '.npmrc');
  if (!fs.existsSync(npmrcPath)) {
    logWarning(`No se encontró .npmrc en ${dir}, creando...`);
    fs.writeFileSync(npmrcPath, 'save-exact=true\npackage-lock=true\n');
  }

  const result = execCommand('npm install', cwd);
  if (result.success) {
    logSuccess(`Dependencias instaladas en ${dir}`);
    return true;
  } else {
    logError(`Error instalando dependencias en ${dir}`);
    return false;
  }
}

function listDependencies(packagePath) {
  const pkg = readPackageJson(packagePath);
  if (!pkg) return;

  const dir = path.basename(path.dirname(packagePath));
  logStep('LIST', `Dependencias en ${dir}`);

  if (pkg.dependencies) {
    log('\n  Dependencies:', 'bold');
    Object.entries(pkg.dependencies).forEach(([name, version]) => {
      const exact = !version.match(/^[^0-9]/);
      const marker = exact ? colors.green('✓') : colors.red('✗');
      console.log(`    ${marker} ${name}: ${version}`);
    });
  }

  if (pkg.devDependencies) {
    log('\n  DevDependencies:', 'bold');
    Object.entries(pkg.devDependencies).forEach(([name, version]) => {
      const exact = !version.match(/^[^0-9]/);
      const marker = exact ? colors.green('✓') : colors.red('✗');
      console.log(`    ${marker} ${name}: ${version}`);
    });
  }
}

function showUsage() {
  logHeader('SportBar Unified - Version Manager');
  console.log('Gestiona versiones exactas de dependencias NPM\n');

  log('Uso:', 'bold');
  console.log('  node scripts/version-manager.js [comando]\n');

  log('Comandos:', 'bold');
  console.log('  check     - Verificar si hay versiones con rangos');
  console.log('  fix       - Corregir versiones a exactas');
  console.log('  install   - Instalar con versiones exactas');
  console.log('  list      - Listar todas las dependencias');
  console.log('  audit     - Verificar configuración completa');
  console.log('  help      - Mostrar esta ayuda\n');

  log('Ejemplos:', 'bold');
  console.log('  npm run check-versions');
  console.log('  node scripts/version-manager.js fix');
  console.log('  node scripts/version-manager.js audit\n');
}

function auditProject() {
  logHeader('Auditoría Completa de Versiones');

  let allGood = true;

  // Verificar archivos package.json
  const packages = [
    path.join(projectRoot, 'package.json'),
    path.join(serverDir, 'package.json')
  ];

  packages.forEach(pkgPath => {
    if (fs.existsSync(pkgPath)) {
      const isExact = checkVersionRanges(pkgPath);
      if (!isExact) allGood = false;
    } else {
      logError(`No se encontró: ${pkgPath}`);
      allGood = false;
    }
  });

  // Verificar archivos .npmrc
  const npmrcs = [
    path.join(projectRoot, '.npmrc'),
    path.join(serverDir, '.npmrc')
  ];

  log('\n');
  logStep('NPMRC', 'Verificando configuración .npmrc');

  npmrcs.forEach(npmrcPath => {
    if (fs.existsSync(npmrcPath)) {
      const content = fs.readFileSync(npmrcPath, 'utf8');
      if (content.includes('save-exact=true')) {
        logSuccess(`Configuración correcta: ${path.relative(projectRoot, npmrcPath)}`);
      } else {
        logWarning(`Falta save-exact=true en: ${path.relative(projectRoot, npmrcPath)}`);
        allGood = false;
      }
    } else {
      logWarning(`No existe: ${path.relative(projectRoot, npmrcPath)}`);
      allGood = false;
    }
  });

  // Resumen final
  console.log('\n' + '='.repeat(60));
  if (allGood) {
    logSuccess('✅ Proyecto configurado correctamente para versiones exactas');
    log('\nTodas las nuevas dependencias se instalarán con versiones exactas.', 'green');
  } else {
    logWarning('⚠️ Se encontraron problemas de configuración');
    log('\nEjecuta: node scripts/version-manager.js fix', 'yellow');
  }
  console.log('='.repeat(60));
}

// Función principal
function main() {
  const command = process.argv[2] || 'help';

  const packages = [
    path.join(projectRoot, 'package.json'),
    path.join(serverDir, 'package.json')
  ];

  switch (command) {
    case 'check':
      logHeader('Verificando Versiones');
      packages.forEach(pkg => {
        if (fs.existsSync(pkg)) checkVersionRanges(pkg);
      });
      break;

    case 'fix':
      logHeader('Corrigiendo Versiones');
      packages.forEach(pkg => {
        if (fs.existsSync(pkg)) fixVersionRanges(pkg);
      });
      break;

    case 'install':
      logHeader('Instalando con Versiones Exactas');
      installWithExactVersions(projectRoot, 'main');
      if (fs.existsSync(serverDir)) {
        installWithExactVersions(serverDir, 'server');
      }
      break;

    case 'list':
      logHeader('Listando Dependencias');
      packages.forEach(pkg => {
        if (fs.existsSync(pkg)) listDependencies(pkg);
      });
      break;

    case 'audit':
      auditProject();
      break;

    case 'help':
    default:
      showUsage();
      break;
  }
}

// Verificar si se ejecuta directamente
if (require.main === module) {
  main();
}

module.exports = {
  checkVersionRanges,
  fixVersionRanges,
  installWithExactVersions,
  auditProject
};
