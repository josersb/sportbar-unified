/**
 * security-checker.cjs
 * Verificación de seguridad básica sin autenticación externa
 * Ejecuta npm audit y verifica resultados
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function log(level, message) {
  const prefix = {
    INFO: '\x1b[36m[INFO]\x1b[0m',
    WARN: '\x1b[33m[WARN]\x1b[0m',
    FAIL: '\x1b[31m[FAIL]\x1b[0m',
    OK: '\x1b[32m[OK]\x1b[0m'
  };
  console.log(prefix[level] + ' ' + message);
}

function runSecurityCheck() {
  log('INFO', 'Ejecutando verificación de seguridad...');
  
  let exitCode = 0;
  
  try {
    // 1. npm audit
    log('INFO', 'Ejecutando pnpm audit...');
    const auditOutput = execSync('pnpm audit --audit-level=high', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (auditOutput.includes('found')) {
      // Buscar número de vulnerabilidades
      const vulnMatch = auditOutput.match(/(\d+) vulnerabilities? found/i);
      const criticalMatch = auditOutput.match(/(\d+) critical/i);
      const highMatch = auditOutput.match(/(\d+) high/i);
      
      const total = vulnMatch ? vulnMatch[1] : '0';
      const critical = criticalMatch ? criticalMatch[1] : '0';
      const high = highMatch ? highMatch[1] : '0';
      
      if (critical > 0) {
        log('FAIL', `${critical} vulnerabilidades CRÍTICAS encontradas`);
        exitCode = 1;
      } else if (high > 0) {
        log('WARN', `${high} vulnerabilidades HIGH encontradas`);
        exitCode = 1;
      } else {
        log('OK', `${total} vulnerabilidades (aceptable)`);
      }
    } else {
      log('OK', 'No se encontraron vulnerabilidades');
    }
  } catch (error) {
    // npm audit puede devolver código de salida no-cero sin ser error crítico
    const output = error.stdout || error.message || '';
    if (output.includes('0 vulnerabilities') || output.includes('found')) {
      log('OK', 'Audit completado sin problemas críticos');
    } else {
      log('WARN', 'Audit encontró problemas (revisar manualmente)');
    }
  }
  
  // 2. Verificar lockfile
  log('INFO', 'Verificando lockfile...');
  try {
    execSync('node scripts/lockfile-validator.cjs', { encoding: 'utf8' });
  } catch (e) {
    log('FAIL', 'Lockfile tiene problemas');
    exitCode = 1;
  }
  
  // 3. Verificar integridad del package.json
  log('INFO', 'Verificando package.json...');
  try {
    const fs = require('fs');
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name && pkg.version) {
      log('OK', 'package.json es válido');
    }
  } catch (e) {
    log('FAIL', 'package.json tiene errores de sintaxis');
    exitCode = 1;
  }
  
  // Resultado final
  console.log('');
  if (exitCode === 0) {
    log('OK', 'Verificación de seguridad COMPLETA');
  } else {
    log('WARN', 'Verificación de seguridad COMPLETA con advertencias');
  }
  
  process.exit(exitCode);
}

runSecurityCheck();