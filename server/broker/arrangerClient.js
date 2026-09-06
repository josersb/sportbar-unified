"use strict";

/**
 * Cliente del Arranger para el State Broker.
 *
 * Único punto de comunicación con la matriz Liberty AV DigiIP IPEXCB
 * (firmware v1.3.4, API V210826). Comandos soportados por el broker:
 *   - getEncoder(dest, sub)  → lectura confirmada del hardware
 *   - joinAv(source, dest)   → escritura de intención video + audio
 *   - joinVideo(source, dest) / joinAudio(source, dest) → stream independiente
 *
 * Retry con exponential backoff para fallos de red (no para 4xx).
 * Switch mock: si VITE_MOCK_ARRANGER=1 (o mock: true), delega en mockArranger
 * en lugar de hacer fetch al hardware — para verificación sin hardware real.
 *
 * ── HOTFIX 6 (semáforo global) ─────────────────────────────────────────────
 * El Arranger es un dispositivo SERIAL: procesa comandos de a uno. Un batch
 * de "Enviar" disparaba ~29 joins casi simultáneos (writeQueue serializa por
 * destino pero paraleliza ENTRE destinos) → el Arranger los encolaba
 * internamente → los joins del final del batch esperaban MINUTOS (evidencia
 * #908: 13 joins >60s, hasta 283s). El semáforo serializa TODOS los comandos
 * que pasan por requestArranger (max 1 in-flight, configurable
 * ARRANGER_MAX_CONCURRENT): batch de 29 ≈ 29 × ~250ms ≈ 8s serial sin
 * congestión. Es una capa ABAJO del writeQueue — la semántica FIFO por
 * destino (última intención gana) no cambia.
 *
 * ── FW-LOCKED ─────────────────────────────────────────────────────────────
 * getMatrix / getJoins / getStatus: getters de la API V1.4.0.0 que NO existen
 * en el firmware v1.3.4. Se CONSERVAN con banner de aviso (por si el firmware
 * se actualiza) pero NO se usan ni se exponen al cliente. El broker solo
 * consume getEncoder, la única lectura disponible en V210826.
 */

const { createMockArranger } = require("./mockArranger");

const FW_LOCKED_BANNER =
  "[FW-LOCKED] getter no disponible en firmware v1.3.4 (API V210826). " +
  "Conservado solo para futura compatibilidad con firmware >=1.4.0.0. No usar.";

function isMockEnabled(explicit) {
  if (typeof explicit === "boolean") return explicit;
  const env = String(process.env.VITE_MOCK_ARRANGER || "").toLowerCase();
  return env === "1" || env === "true";
}

/** Max comandos in-flight al Arranger (dispositivo serial). Default 1. */
function resolveMaxConcurrent(explicit) {
  if (explicit != null && Number.isFinite(explicit) && explicit >= 1) return Math.floor(explicit);
  const env = parseInt(String(process.env.ARRANGER_MAX_CONCURRENT || ""), 10);
  return Number.isFinite(env) && env >= 1 ? env : 1;
}

/** Crea el cliente. options: { baseUrl, token, retries, baseDelayMs, mock, mockMode, log, maxConcurrent, semaphoreTimeoutMs }. */
function createArrangerClient(options = {}) {
  const baseUrl = options.baseUrl || process.env.ARRANGER_BASE || "http://192.168.2.254:80";
  const token = options.token || process.env.VITE_ARRANGER_TOKEN || process.env.ARRANGER_TOKEN;
  const retries = options.retries != null ? options.retries : 3;
  const baseDelayMs = options.baseDelayMs != null ? options.baseDelayMs : 1000;
  const log = options.log || console;
  const useMock = isMockEnabled(options.mock);
  const mock = useMock ? createMockArranger({ mode: options.mockMode, blipEvery: options.mockBlipEvery }) : null;

  // ── HOTFIX 6: semáforo global de comandos al Arranger ──
  // Cola FIFO + contador in-flight. TODO comando al hardware (join av/video/
  // audio, get encoder, proxy) pasa por acquire() → requestArranger es el
  // único punto de comunicación con el dispositivo serial. El turno se
  // libera SIEMPRE (finally), incluso si el fetch cuelga: un watchdog
  // (Promise.race contra semaphoreTimeoutMs) suelta el turno aunque el
  // comando siga colgado — el semáforo nunca queda trabado.
  const maxConcurrent = resolveMaxConcurrent(options.maxConcurrent);
  const semaphoreTimeoutMs = options.semaphoreTimeoutMs != null ? options.semaphoreTimeoutMs : 30000;
  let inFlight = 0;
  const waitQueue = []; // FIFO de { resolve, enteredAt, writeId }
  let turnSeq = 0;

  function logSem(writeId, msg) {
    // Integrado con el file logger existente (intercepta console.log).
    console.log(`[SEM${writeId ? ` ${writeId}` : ""}] ${msg}`);
  }

  async function acquire(writeId) {
    if (inFlight < maxConcurrent) {
      inFlight += 1;
      return;
    }
    const enteredAt = Date.now();
    await new Promise((resolve) => {
      waitQueue.push({ resolve, enteredAt, writeId });
      // Log de la cola (hotfix 6): si el caller no trae writeId (p.ej. el
      // proxy), usar un sequence propio del semáforo para poder correlar.
      turnSeq += 1;
      const label = writeId || `w-${String(turnSeq).padStart(3, "0")}`;
      logSem(writeId, `${label} espera turno (in-flight ${inFlight}, waiting ${waitQueue.length})`);
    });
    // Al despertar el turno YA fue transferido por release() (inFlight ya
    // está contado a nombre de este comando).
  }

  /**
   * Ejecuta fn() bajo el semáforo. El turno se libera SIEMPRE:
   *   - finally del promise devuelto por fn (camino normal y errores).
   *   - Watchdog: si fn() no resuelve en semaphoreTimeoutMs (~30s), el turno
   *     se libera igualmente (join colgado NO bloquea la cola para siempre).
   * El watchdog NO aborta el fetch colgado (AbortController al hardware real
   * es intrusivo); solo devuelve el turno — el comando huérfano puede aún
   * completarse tarde, pero la cola sigue avanzando.
   */
  async function withSemaphore(writeId, fn) {
    await acquire(writeId);
    let released = false;
    let watchdog = null;
    const releaseOnce = () => {
      if (released) return;
      released = true;
      if (watchdog) clearTimeout(watchdog);
      if (inFlight > 0) inFlight -= 1;
      // Pasar el turno al siguiente de la cola (FIFO estricto).
      const next = waitQueue.shift();
      if (next) {
        inFlight += 1; // transferencia directa: no pasa por acquire()
        const waitedMs = Date.now() - next.enteredAt;
        logSem(next.writeId, `${next.writeId || "cmd"} turno concedido (esperó ${(waitedMs / 1000).toFixed(1)}s)`);
        next.resolve();
      }
    };
    try {
      return await Promise.race([
        fn(),
        new Promise((resolve, reject) => {
          // NOTA: sin unref() — el watchdog DEBE dispararse aunque el loop
          // quede vacío (un fetch colgado no es un timer, es un promise
          // pendiente que no mantiene vivo el proceso). El clearTimeout del
          // releaseOnce evita timers huérfanos en el camino normal.
          watchdog = setTimeout(() => {
            logSem(writeId, `timeout de seguridad (${semaphoreTimeoutMs}ms): turno liberado con comando colgado`);
            releaseOnce();
            reject(new Error(`[arrangerClient] comando "${writeId || "?"}" excedió ${semaphoreTimeoutMs}ms (turno liberado por watchdog)`));
          }, semaphoreTimeoutMs);
        }),
      ]);
    } finally {
      releaseOnce();
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Ejecuta un GET al Arranger con retry exponencial. Nunca lanza por red. */
  async function requestArranger(command, writeId) {
    if (mock) {
      return { mock: true, command };
    }
    // HOTFIX 6: TODO comando al hardware real pasa por el semáforo global
    // (dispositivo serial, max 1 in-flight). El semáforo envuelve la
    // ejecución COMPLETA (fetch + retries): mientras un comando reintenta con
    // backoff conserva su turno — es un solo comando lógico al dispositivo.
    return withSemaphore(writeId, () => doRequestArranger(command, writeId));
  }

  /** Camino real (ya con el turno del semáforo otorgado). */
  async function doRequestArranger(command, writeId, tokenOverride) {
    const effectiveToken = tokenOverride || token;
    const url = `${baseUrl}/api/command/${encodeURIComponent(command)}/${encodeURIComponent(effectiveToken)}`;
    const startMs = Date.now();
    // Timeout del fetch (10s): un comando colgado aborta y entra al retry —
    // el semáforo nunca depende de un fetch zombie (además del watchdog).
    const fetchTimeoutMs = options.fetchTimeoutMs != null ? options.fetchTimeoutMs : 10000;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeoutMs) });
        const text = (await response.text()).trim();
        if (writeId) {
          console.log(
            `[ARRANGER ${writeId}] ← "${command}" → ${response.status} (${Date.now() - startMs}ms) ${text.slice(0, 80)}`,
          );
        }
        return { response, text };
      } catch (error) {
        if (attempt === retries) {
          log.error(`[arrangerClient] Red caída para "${command}" (${attempt}/${retries}): ${error.message}`);
          return { error };
        }
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        log.warn(`[arrangerClient] Intento ${attempt}/${retries} para "${command}" falló, reintentando en ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  /**
   * get encoder <DEST> <SUB> → string | null.
   * Parse de respuesta Arranger:
   *   "get encoder success TV01 DTV3" → "DTV3"
   *   "no encoder connected" | error | invalid → null
   * null = sin lectura confirmada (desconectado / Arranger caído / blip).
   */
  async function getEncoder(dest, subscription = "video", writeId) {
    if (mock) {
      return mock.getEncoder(dest, subscription);
    }
    const command = `get encoder ${dest} ${subscription}`;
    const result = await requestArranger(command, writeId);
    if (result.error) return null;
    const text = result.text.toLowerCase();
    if (text.includes("no encoder connected")) return null;
    if (text.includes("error") || text.includes("invalid")) return null;
    const match = result.text.match(/get encoder success (.+)/i);
    return match ? match[1].trim() : null;
  }

  /**
   * join av <SOURCE> <DEST> → { ok: true, text } | { ok: false, error }.
   * Comando de escritura; retry solo para red, no para 4xx.
   */
  async function joinAv(source, dest, writeId) {
    if (mock) {
      try {
        return await mock.joinAv(source, dest);
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }
    const command = `join av ${source} ${dest}`;
    if (writeId) console.log(`[ARRANGER ${writeId}] → "${command}"`);
    const result = await requestArranger(command, writeId);
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: result.response.ok, text: result.text, status: result.response.status };
  }

  /** Ejecuta un join independiente manteniendo el mismo contrato/retry que joinAv. */
  async function joinStream(stream, source, dest, writeId) {
    if (mock) {
      try {
        return await mock[stream === "video" ? "joinVideo" : "joinAudio"](source, dest);
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }
    const command = `join ${stream} ${source} ${dest}`;
    if (writeId) console.log(`[ARRANGER ${writeId}] → "${command}"`);
    const result = await requestArranger(command, writeId);
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: result.response.ok, text: result.text, status: result.response.status };
  }

  async function joinVideo(source, dest, writeId) {
    return joinStream("video", source, dest, writeId);
  }

  async function joinAudio(source, dest, writeId) {
    return joinStream("audio", source, dest, writeId);
  }

  /**
   * Proxy raw de un comando arbitrario (endpoint /api/command, hardware real).
   * Pasa por el MISMO semáforo global: el Arranger es serial sin importar
   * quién dispare el comando (broker o proxy IR/serial legacy).
   * @returns {{ ok: boolean, status?: number, text?: string, error?: string }}
   */
  async function sendRaw(command, tokenOverride, writeId) {
    if (mock) {
      // Sin hardware: el proxy usa mockCommandResult del server (no llega acá).
      return { ok: false, error: "sendRaw no aplica en mock" };
    }
    const result = await withSemaphore(writeId || "proxy", () => doRequestArranger(command, writeId || "proxy", tokenOverride));
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: result.response.ok, status: result.response.status, text: result.text };
  }

  // ── FW-LOCKED getters: conservados con banner, no usados por el broker ──
  function fwLocked(name) {
    log.warn(`${FW_LOCKED_BANNER} [${name}]`);
    return null;
  }

  return {
    getEncoder,
    joinAv,
    joinVideo,
    joinAudio,
    sendRaw,
    getCommandLog: () => (mock && typeof mock.getCommandLog === "function" ? mock.getCommandLog() : []),
    isMock: useMock,
    get baseUrl() { return baseUrl; },
    // HOTFIX 6: introspección del semáforo (verify + diagnóstico).
    getSemaphoreStats: () => ({ maxConcurrent, inFlight, waiting: waitQueue.length, timeoutMs: semaphoreTimeoutMs }),
    // Conservados con banner (futura compatibilidad firmware >=1.4.0.0):
    getMatrix: () => fwLocked("get matrix"),
    getJoins: () => fwLocked("get joins"),
    getStatus: () => fwLocked("get status"),
  };
}

module.exports = { createArrangerClient, FW_LOCKED_BANNER };
