"use strict";

/**
 * Mock Arranger — harness de verificación del State Broker.
 *
 * Simula la matriz Liberty AV DigiIP IPEXCB (firmware v1.3.4, API V210826)
 * SIN hardware real. Mantiene un estado interno de la matriz (fuente de
 * verdad del mock) y responde a los mismos comandos que el Arranger físico:
 *
 *   join av <SOURCE> <DEST>   — vincula fuente a destino (video + audio)
 *   join video/audio <SOURCE> <DEST> — actualiza solo un stream
 *   get encoder <DEST> <SUB>  — lee la fuente actual de un destino
 *
 * Modos (deterministas, mismo input → mismo output):
 *   normal  — siempre responde correctamente.
 *   blip    — falla periódicamente (cada `blipEvery` llamadas) simulando
 *             lecturas intermitentes: get encoder devuelve null, join lanza.
 *   offline — Arranger inalcanzable: get encoder devuelve null, join lanza.
 *   settle  — simula el settling time del firmware v1.3.4: tras un join, la
 *             PRIMERA lectura get encoder del destino devuelve el valor
 *             ANTERIOR (stale) y las siguientes el nuevo — el hardware físico
 *             ya aplicó el join pero el routing table tarda en reflejarlo.
 *   oneJoinLag — simula el lag POR COMANDO del firmware v1.3.4 (hotfix 4,
 *             evidence w-001..w-008): tras un join, TODA lectura get encoder
 *             del destino devuelve el valor del join ANTERIOR (stale) hasta
 *             que pasa `lagSettleMs` (default 3s), momento en el que el
 *             routing table "asienta" y las lecturas devuelven el valor real.
 *             A diferencia de `settle` (solo la primera lectura es stale),
 *             aquí los 3 retries de confirmEncoder (~1.5s) leen stale
 *             SIEMPRE, como contra el hardware físico.
 */

const { MATRIX_DESTINATIONS, DEFAULT_SOURCE } = require("./destinations");

const MOCK_MODES = ["normal", "blip", "offline", "settle", "oneJoinLag"];

/** Crea un mock arranger con estado de matriz inicializado a DEFAULT_SOURCE. */
function createMockArranger(options = {}) {
  const mode = options.mode || "normal";
  if (!MOCK_MODES.includes(mode)) {
    throw new Error(`[mockArranger] Modo inválido: ${mode}. Válidos: ${MOCK_MODES.join(", ")}`);
  }

  // Estado interno: dest → { video, audio }. join av vincula ambos.
  const matrix = {};
  for (const dest of MATRIX_DESTINATIONS) {
    matrix[dest] = { video: DEFAULT_SOURCE, audio: DEFAULT_SOURCE };
  }

  const blipEvery = options.blipEvery || 3; // blip: falla 1 de cada N llamadas
  let callCount = 0;
  let currentMode = mode;
  const commandLog = [];
  // settle: dest:sub → valor ANTERIOR que debe devolver la primera lectura
  // post-join (simula el routing table que tarda en reflejar el join).
  const settlePending = new Map();
  // oneJoinLag: dest:sub → { stale, until }. Toda lectura antes de `until`
  // devuelve el valor del join ANTERIOR (lag por comando, no por tiempo);
  // después el routing table "asienta" y se lee el valor real.
  const lagPending = new Map();
  const lagSettleMs = options.lagSettleMs || 3000;

  function isOffline() {
    return currentMode === "offline";
  }

  function isBlipCall() {
    return currentMode === "blip" && callCount % blipEvery === 0;
  }

  /** Ejecuta un join y actualiza solo los streams indicados. Determinista. */
  async function join(source, dest, streams, command) {
    callCount += 1;
    commandLog.push(`${command} ${source} ${dest}`);
    if (isOffline()) {
      throw new Error("[mockArranger] offline: Arranger inalcanzable");
    }
    if (isBlipCall()) {
      throw new Error("[mockArranger] blip: fallo intermitente en join");
    }
    if (!(dest in matrix)) {
      throw new Error(`[mockArranger] destino inválido: ${dest}`);
    }
    // settle: registrar el valor previo de cada stream para devolverlo una vez
    if (currentMode === "settle") {
      for (const stream of streams) {
        settlePending.set(`${dest}:${stream}`, matrix[dest][stream]);
      }
    }
    // oneJoinLag: registrar el valor previo como stale durante lagSettleMs
    if (currentMode === "oneJoinLag") {
      for (const stream of streams) {
        lagPending.set(`${dest}:${stream}`, { stale: matrix[dest][stream], until: Date.now() + lagSettleMs });
      }
    }
    for (const stream of streams) matrix[dest][stream] = source;
    return { ok: true, text: `${command} success ${source} ${dest}` };
  }

  /** join av <SOURCE> <DEST> → { ok, text }. Determinista. */
  async function joinAv(source, dest) {
    return join(source, dest, ["video", "audio"], "join av");
  }

  async function joinVideo(source, dest) {
    return join(source, dest, ["video"], "join video");
  }

  async function joinAudio(source, dest) {
    return join(source, dest, ["audio"], "join audio");
  }

  /**
   * get encoder <DEST> <SUB> → string | null.
   * Devuelve la fuente conectada, o null si el destino está desconectado o el
   * Arranger no responde (offline/blip). Nunca lanza: el broker trata null
   * como "sin lectura confirmada" y NO auto-adopta con null.
   */
  async function getEncoder(dest, subscription = "video") {
    callCount += 1;
    if (isOffline() || isBlipCall()) {
      return null;
    }
    // settle: la PRIMERA lectura post-join devuelve el valor ANTERIOR (stale)
    // y se consume la entrada; las siguientes devuelven el valor nuevo.
    if (currentMode === "settle") {
      const pendingKey = `${dest}:${subscription}`;
      if (settlePending.has(pendingKey)) {
        const stale = settlePending.get(pendingKey);
        settlePending.delete(pendingKey);
        return stale || null;
      }
    }
    // oneJoinLag: toda lectura antes de `until` devuelve el valor del join
    // ANTERIOR (stale); al expirar, el routing table asienta y se consume la
    // entrada para leer el valor real.
    if (currentMode === "oneJoinLag") {
      const lagKey = `${dest}:${subscription}`;
      const lag = lagPending.get(lagKey);
      if (lag) {
        if (Date.now() < lag.until) return lag.stale || null;
        lagPending.delete(lagKey);
      }
    }
    const entry = matrix[dest];
    if (!entry) return null;
    const value = entry[subscription];
    return value || null;
  }

  /** Estado completo de la matriz mock (para verificación). */
  function getMatrixState() {
    return JSON.parse(JSON.stringify(matrix));
  }

  function getCommandLog() {
    return [...commandLog];
  }

  /** Cambia el modo en caliente (útil en verificación y E2E manual). */
  function setMode(nextMode) {
    if (!MOCK_MODES.includes(nextMode)) {
      throw new Error(`[mockArranger] Modo inválido: ${nextMode}. Válidos: ${MOCK_MODES.join(", ")}`);
    }
    currentMode = nextMode;
  }

  return { joinAv, joinVideo, joinAudio, getEncoder, getMatrixState, getCommandLog, setMode, get mode() { return currentMode; } };
}

module.exports = { createMockArranger, MOCK_MODES };
