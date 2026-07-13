#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏆 SportBar Unified - Setup Script');
console.log('='.repeat(50));

const projectRoot = __dirname;
const serverDir = path.join(projectRoot, 'server');

// Color functions for console output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

function logStep(step, message) {
  console.log(`${colors.cyan(`[${step}]`)} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green('✓')} ${message}`);
}

function logError(message) {
  console.log(`${colors.red('✗')} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow('⚠')} ${message}`);
}

function execCommand(command, cwd = projectRoot) {
  try {
    execSync(command, { cwd, stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`Error executing: ${command}`);
    console.error(error.message);
    return false;
  }
}

function checkNodeVersion() {
  logStep('1/8', 'Verificando versión de Node.js...');

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 16) {
    logSuccess(`Node.js ${nodeVersion} (compatible)`);
    return true;
  } else {
    logError(`Node.js ${nodeVersion} no es compatible. Se requiere >= 16.0.0`);
    return false;
  }
}

function installMainDependencies() {
  logStep('2/8', 'Instalando dependencias principales...');

  if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
    logError('package.json no encontrado en el directorio raíz');
    return false;
  }

  console.log('  📦 Ejecutando npm install...');
  const success = execCommand('npm install');

  if (success) {
    logSuccess('Dependencias principales instaladas');
    return true;
  } else {
    logError('Error al instalar dependencias principales');
    return false;
  }
}

function installServerDependencies() {
  logStep('3/8', 'Instalando dependencias del servidor...');

  if (!fs.existsSync(path.join(serverDir, 'package.json'))) {
    logError('package.json del servidor no encontrado');
    return false;
  }

  console.log('  📦 Ejecutando npm install en /server...');
  const success = execCommand('npm install', serverDir);

  if (success) {
    logSuccess('Dependencias del servidor instaladas');
    return true;
  } else {
    logError('Error al instalar dependencias del servidor');
    return false;
  }
}

function checkEnvironmentFile() {
  logStep('4/8', 'Verificando archivo de configuración...');

  const envFile = path.join(projectRoot, '.env');
  const envExampleFile = path.join(projectRoot, '.env.example');

  if (fs.existsSync(envFile)) {
    logSuccess('Archivo .env encontrado');
    return true;
  } else if (fs.existsSync(envExampleFile)) {
    logWarning('Archivo .env no encontrado, copiando desde .env.example');
    try {
      fs.copyFileSync(envExampleFile, envFile);
      logSuccess('Archivo .env creado desde template');
      return true;
    } catch (error) {
      logError('Error al crear archivo .env');
      return false;
    }
  } else {
    logWarning('Archivos de configuración no encontrados (continuando sin ellos)');
    return true;
  }
}

function createDirectories() {
  logStep('5/8', 'Creando directorios necesarios...');

  const directories = [
    'dist',
    'src/temp',
    'public/temp'
  ];

  let allCreated = true;

  directories.forEach(dir => {
    const fullPath = path.join(projectRoot, dir);
    try {
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`  📁 Creado: ${dir}`);
      } else {
        console.log(`  📁 Existe: ${dir}`);
      }
    } catch (error) {
      logError(`Error creando directorio ${dir}: ${error.message}`);
      allCreated = false;
    }
  });

  if (allCreated) {
    logSuccess('Directorios verificados/creados');
    return true;
  } else {
    logError('Error creando algunos directorios');
    return false;
  }
}

function checkArrangerConnection() {
  logStep('6/8', 'Verificando conexión con Arranger...');

  // Este es un check básico - en producción se debería hacer una llamada real
  const arrangerHost = process.env.VITE_ARRANGER_HOST || '192.168.2.254';

  logWarning(`Configurado para conectar a: ${arrangerHost}`);
  logWarning('Verificar manualmente que la matriz Arranger esté disponible');

  return true;
}

function runInitialBuild() {
  logStep('7/8', 'Ejecutando build inicial...');

  console.log('  🔨 Compilando aplicación React...');
  const success = execCommand('npm run build');

  if (success) {
    logSuccess('Build inicial completado');
    return true;
  } else {
    logWarning('Build inicial falló - puede ejecutarlo manualmente con: npm run build');
    return true; // No es crítico para el setup
  }
}

function showCompletionInfo() {
  logStep('8/8', 'Setup completado');

  console.log('\n' + '='.repeat(50));
  console.log(colors.bold(colors.green('🎉 ¡Setup de SportBar Unified completado!')));
  console.log('='.repeat(50));

  console.log('\n📋 ' + colors.bold('Comandos disponibles:'));
  console.log(`  ${colors.cyan('npm run dev')}      - Servidor de desarrollo`);
  console.log(`  ${colors.cyan('npm run build')}    - Compilar para producción`);
  console.log(`  ${colors.cyan('npm run serve')}    - Servidor de producción`);
  console.log(`  ${colors.cyan('npm run start')}    - Build + servidor completo`);

  console.log('\n🌐 ' + colors.bold('URLs de acceso:'));
  console.log(`  Desarrollo:  ${colors.blue('http://localhost:5173')}`);
  console.log(`  Producción:  ${colors.blue('http://localhost:3000')}`);

  console.log('\n⚙️  ' + colors.bold('Configuración:'));
  console.log(`  Arranger API: ${colors.yellow('192.168.2.254')}`);
  console.log(`  Archivo config: ${colors.yellow('.env')}`);

  console.log('\n🚀 ' + colors.bold('Para comenzar:'));
  console.log(`  ${colors.green('npm run dev')} - Inicia desarrollo`);
  console.log(`  ${colors.green('npm run start')} - Inicia producción completa`);

  console.log('\n📖 ' + colors.bold('Documentación:'));
  console.log(`  Lee el archivo ${colors.yellow('README.md')} para más información`);

  console.log('\n' + '='.repeat(50));
}

// Función principal del setup
async function runSetup() {
  try {
    console.log('Iniciando configuración del proyecto SportBar Unified...\n');

    const steps = [
      checkNodeVersion,
      installMainDependencies,
      installServerDependencies,
      checkEnvironmentFile,
      createDirectories,
      checkArrangerConnection,
      runInitialBuild
    ];

    let success = true;

    for (const step of steps) {
      if (!step()) {
        success = false;
        break;
      }
      console.log(); // Línea en blanco entre pasos
    }

    if (success) {
      showCompletionInfo();
    } else {
      logError('Setup incompleto debido a errores. Revisa los mensajes anteriores.');
      process.exit(1);
    }

  } catch (error) {
    logError(`Error durante el setup: ${error.message}`);
    process.exit(1);
  }
}

// Verificar si se está ejecutando directamente
if (require.main === module) {
  runSetup();
}

module.exports = { runSetup };
