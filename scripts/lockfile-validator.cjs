/**
 * lockfile-validator.cjs
 * Valida la seguridad del lockfile de pnpm
 * Verifica: HTTPS usado, solo registry oficial, sin URLs exóticas
 */

const fs = require('fs');
const path = require('path');

const LOCKFILE_PATH = path.join(__dirname, '..', 'pnpm-lock.yaml');
const ALLOWED_HOSTS = ['registry.npmjs.org', 'registry.npmmirror.com'];
const ALLOWED_SCHEMES = ['https:'];

let exitCode = 0;

function log(level, message) {
  const prefix = {
    INFO: '\x1b[36m[INFO]\x1b[0m',
    WARN: '\x1b[33m[WARN]\x1b[0m',
    FAIL: '\x1b[31m[FAIL]\x1b[0m',
    OK: '\x1b[32m[OK]\x1b[0m'
  };
  console.log(prefix[level] + ' ' + message);
}

function validateLockfile() {
  log('INFO', 'Validando pnpm-lock.yaml...');

  if (!fs.existsSync(LOCKFILE_PATH)) {
    log('FAIL', 'Lockfile no encontrado: ' + LOCKFILE_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(LOCKFILE_PATH, 'utf8');

  // Buscar todas las URLs en el lockfile
  const urlRegex = /(https?:)\/\/([a-zA-Z0-9.-]+)(\/[^\s'"]*)/g;
  let match;
  const urls = new Set();

  while ((match = urlRegex.exec(content)) !== null) {
    urls.add(match[0]);
  }

  log('INFO', `Encontradas ${urls.size} URLs para validar`);

  // Validar cada URL
  let httpsCount = 0;
  let httpCount = 0;
  let invalidHosts = [];

  for (const url of urls) {
    if (url.startsWith('https://')) {
      httpsCount++;
    } else if (url.startsWith('http://')) {
      httpCount++;
      const host = url.match(/http:\/\/([^/]+)/)[1];
      invalidHosts.push(host);
    }
  }

  // Reporte
  log('INFO', `HTTPS: ${httpsCount}, HTTP: ${httpCount}`);

  if (httpCount > 0) {
    log('WARN', `${httpCount} URLs usan HTTP (no seguro):`);
    invalidHosts.slice(0, 5).forEach(h => console.log('  - ' + h));
    if (invalidHosts.length > 5) {
      console.log('  ... y ' + (invalidHosts.length - 5) + ' más');
    }
    exitCode = 1;
  }

  // Validar que solo usa registries permits
  let unknownHosts = [];
  for (const url of urls) {
    const host = url.match(/https?:\/\/([^/]+)/)?.[1];
    if (host && !ALLOWED_HOSTS.includes(host)) {
      unknownHosts.push(host);
    }
  }

  if (unknownHosts.length > 0) {
    log('WARN', `Hosts desconocidos encontrados:`);
    [...new Set(unknownHosts)].slice(0, 5).forEach(h => console.log('  - ' + h));
  }

  // Validar integrity hash
  if (content.includes('integrity: sha512')) {
    log('OK', 'Integrity SHA-512 presente');
  } else {
    log('WARN', 'No se encontró integrity SHA-512');
  }

  // Resultado final
  if (exitCode === 0) {
    log('OK', 'Lockfile通过了 validación de seguridad');
  } else {
    log('FAIL', 'Lockfile tiene problemas de seguridad');
  }

  process.exit(exitCode);
}

validateLockfile();