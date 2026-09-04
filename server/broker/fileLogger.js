"use strict";

/**
 * fileLogger — persistencia de TODA la salida de consola del server a archivo
 * (hotfix 5, evidencia #908: la mayoría de las líneas no tenía timestamp ni
 * persistencia — reconstruir el timeline de un incidente era imposible).
 *
 * Intercepta console.log/warn/error desde el arranque del proceso y escribe
 * CADA línea a consola Y al archivo de log del boot:
 *
 *   server/logs/sportbar-<YYYY-MM-DD_HHmmss>.txt
 *
 * - Rollover: al superar ROLLOVER_BYTES (900KB), el archivo actual se cierra
 *   y se continúa en `-part2.txt`, `-part3.txt`, … (mismo nombre base).
 * - Retención: en el arranque (installFileLogger) se borran los logs viejos
 *   dejando solo los últimos RETAIN_FILES (10) archivos.
 * - Formato: `[YYYY-MM-DD HH:mm:ss.mmm] <mensaje>` — timestamp completo al
 *   inicio de CADA línea (multi-línea: cada línea física lleva su timestamp).
 * - Escritura: fs.appendFileSync por línea (volumen de log del broker lo
 *   tolera sin bloquear el event loop de forma perceptible).
 * - Fail-safe: si la escritura al archivo falla (disco lleno, permisos), NO
 *   crashea el server — un console.warn nativo (una sola vez) y a correr.
 *
 * Uso: require al principio de server.js — el interceptor vive mientras
 * viva el proceso. No requiere configuración.
 */

const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.join(__dirname, "..", "logs");
const ROLLOVER_BYTES = 900 * 1024; // 900KB por archivo
const RETAIN_FILES = 10; // últimos 10 archivos de log al boot
const FILE_PREFIX = "sportbar-";

/** Timestamp `[YYYY-MM-DD HH:mm:ss.mmm]` para el prefijo de cada línea. */
function timestamp() {
  const now = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
  return `[${date} ${time}]`;
}

/** Nombre base del archivo de este boot: sportbar-<YYYY-MM-DD_HHmmss>. */
function bootFileName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    FILE_PREFIX +
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.txt`
  );
}

/** Ordena los archivos de log por boot+parte (nombre base determinista). */
function listLogFiles(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir).filter((f) => f.startsWith(FILE_PREFIX) && f.endsWith(".txt"));
  } catch {
    return []; // directorio ausente (se crea al instalar)
  }
  return entries.sort();
}

/**
 * Crea el logger de archivo. Sin side effects sobre console — el caller
 * (installFileLogger) decide cuándo interceptar.
 *
 * options: { dir, rolloverBytes, retainFiles } — override para tests.
 */
function createFileLogger(options = {}) {
  const dir = options.dir || LOGS_DIR;
  const rolloverBytes = options.rolloverBytes || ROLLOVER_BYTES;
  const retainFiles = options.retainFiles != null ? options.retainFiles : RETAIN_FILES;

  let currentPath = null; // archivo actual (con parte activa)
  let baseName = null; // sportbar-<boot>.txt (sin sufijo -partN)
  let part = 1; // parte activa (1 = sin sufijo)
  let bytes = 0; // bytes escritos en el archivo actual
  let warnedOnce = false; // aviso único de fallo de escritura

  /** Retención al boot: deja solo los últimos `retainFiles` archivos. */
  function pruneOldLogs() {
    const files = listLogFiles(dir);
    // Excluye el archivo de este boot (se crea a continuación).
    const excess = files.slice(0, Math.max(0, files.length - (retainFiles - 1)));
    for (const f of excess) {
      try {
        fs.rmSync(path.join(dir, f), { force: true });
      } catch {
        /* borrado best-effort */
      }
    }
    return excess.length;
  }

  /** Abre el archivo del boot (crea el directorio si no existe). */
  function openBootFile(now = new Date()) {
    baseName = bootFileName(now);
    fs.mkdirSync(dir, { recursive: true });
    pruneOldLogs();
    currentPath = path.join(dir, baseName);
    part = 1;
    bytes = fs.existsSync(currentPath) ? fs.statSync(currentPath).size : 0;
    return currentPath;
  }

  /** Rollover: cierra la parte actual y abre la siguiente. */
  function rollover() {
    part += 1;
    const stem = baseName.replace(/\.txt$/, "");
    currentPath = path.join(dir, `${stem}-part${part}.txt`);
    bytes = 0;
    return currentPath;
  }

  /**
   * Escribe una línea (sin \n final) al archivo actual con timestamp. Si
   * supera el rollover, abre la parte siguiente. Fail-safe: nunca lanza.
   * @returns {boolean} true si escribió al archivo
   */
  function writeLine(line) {
    if (!currentPath) return false;
    try {
      const stamped = `${timestamp()} ${line}\n`;
      const buf = Buffer.from(stamped, "utf8");
      if (bytes > 0 && bytes + buf.length > rolloverBytes) rollover();
      fs.appendFileSync(currentPath, buf);
      bytes += buf.length;
      return true;
    } catch {
      if (!warnedOnce) {
        warnedOnce = true;
        // console.warn ORIGINAL (sin pasar por el interceptor) para no loopear.
        const nativeWarn = console.__fileLoggerNativeWarn || console.warn;
        nativeWarn("[fileLogger] No se puede escribir el log a archivo (continuando sin persistencia): disco lleno o permisos");
      }
      return false;
    }
  }

  return {
    openBootFile,
    writeLine,
    rollover,
    pruneOldLogs,
    get currentPath() {
      return currentPath;
    },
    get bytes() {
      return bytes;
    },
  };
}

/**
 * Instala el interceptor de console + abre el archivo del boot. Devuelve el
 * logger activo (para verificaciones) o null si el directorio no se puede
 * crear (el server sigue sin log a archivo, nunca crashea).
 */
function installFileLogger(options = {}) {
  const logger = createFileLogger(options);
  let bootPath;
  try {
    bootPath = logger.openBootFile();
  } catch {
    return null; // sin log a archivo — el server arranca igual
  }

  // Guardar los métodos nativos ANTES de interceptar (el warn nativo queda
  // disponible para el fail-safe del propio fileLogger).
  console.__fileLoggerNativeWarn = console.warn.bind(console);

  for (const method of ["log", "warn", "error"]) {
    const native = console[method].bind(console);
    console[method] = (...args) => {
      native(...args);
      // Una entrada de consola puede traer \n — cada línea física lleva su
      // propio timestamp.
      const text = args
        .map((a) => (typeof a === "string" ? a : a instanceof Error ? (a.stack || a.message) : JSON.stringify(a)))
        .join(" ");
      for (const line of text.split("\n")) {
        if (line.trim() !== "") logger.writeLine(line);
      }
    };
  }
  console.log(`[fileLogger] Log del boot → ${bootPath} (rollover ${options.rolloverBytes || ROLLOVER_BYTES / 1024}KB, retención ${options.retainFiles != null ? options.retainFiles : RETAIN_FILES} archivos)`);
  return logger;
}

module.exports = { createFileLogger, installFileLogger, bootFileName, timestamp, LOGS_DIR, ROLLOVER_BYTES, RETAIN_FILES };
