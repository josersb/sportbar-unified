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

/** Crea el cliente. options: { baseUrl, token, retries, baseDelayMs, mock, mockMode, log }. */
function createArrangerClient(options = {}) {
  const baseUrl = options.baseUrl || process.env.ARRANGER_BASE || "http://192.168.2.254:80";
  const token = options.token || process.env.VITE_ARRANGER_TOKEN || process.env.ARRANGER_TOKEN;
  const retries = options.retries != null ? options.retries : 3;
  const baseDelayMs = options.baseDelayMs != null ? options.baseDelayMs : 1000;
  const log = options.log || console;
  const useMock = isMockEnabled(options.mock);
  const mock = useMock ? createMockArranger({ mode: options.mockMode, blipEvery: options.mockBlipEvery }) : null;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Ejecuta un GET al Arranger con retry exponencial. Nunca lanza por red. */
  async function requestArranger(command, writeId) {
    if (mock) {
      return { mock: true, command };
    }
    const url = `${baseUrl}/api/command/${encodeURIComponent(command)}/${encodeURIComponent(token)}`;
    const startMs = Date.now();
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
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
    getCommandLog: () => (mock && typeof mock.getCommandLog === "function" ? mock.getCommandLog() : []),
    isMock: useMock,
    get baseUrl() { return baseUrl; },
    // Conservados con banner (futura compatibilidad firmware >=1.4.0.0):
    getMatrix: () => fwLocked("get matrix"),
    getJoins: () => fwLocked("get joins"),
    getStatus: () => fwLocked("get status"),
  };
}

module.exports = { createArrangerClient, FW_LOCKED_BANNER };
