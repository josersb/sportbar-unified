"use strict";

/**
 * Mock Arranger — harness de verificación del State Broker.
 *
 * Simula la matriz Liberty AV DigiIP IPEXCB (firmware v1.3.4, API V210826)
 * SIN hardware real. Mantiene un estado interno de la matriz (fuente de
 * verdad del mock) y responde a los mismos comandos que el Arranger físico:
 *
 *   join av <SOURCE> <DEST>   — vincula fuente a destino (video + audio)
 *   get encoder <DEST> <SUB>  — lee la fuente actual de un destino
 *
 * Modos (deterministas, mismo input → mismo output):
 *   normal  — siempre responde correctamente.
 *   blip    — falla periódicamente (cada `blipEvery` llamadas) simulando
 *             lecturas intermitentes: get encoder devuelve null, join lanza.
 *   offline — Arranger inalcanzable: get encoder devuelve null, join lanza.
 */

const { MATRIX_DESTINATIONS, DEFAULT_SOURCE } = require("./destinations");

const MOCK_MODES = ["normal", "blip", "offline"];

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

  function isOffline() {
    return currentMode === "offline";
  }

  function isBlipCall() {
    return currentMode === "blip" && callCount % blipEvery === 0;
  }

  /** join av <SOURCE> <DEST> → { ok, text }. Determinista. */
  async function joinAv(source, dest) {
    callCount += 1;
    if (isOffline()) {
      throw new Error("[mockArranger] offline: Arranger inalcanzable");
    }
    if (isBlipCall()) {
      throw new Error("[mockArranger] blip: fallo intermitente en join");
    }
    if (!(dest in matrix)) {
      throw new Error(`[mockArranger] destino inválido: ${dest}`);
    }
    matrix[dest] = { video: source, audio: source };
    return { ok: true, text: `join av success ${source} ${dest}` };
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
    const entry = matrix[dest];
    if (!entry) return null;
    const value = entry[subscription];
    return value || null;
  }

  /** Estado completo de la matriz mock (para verificación). */
  function getMatrixState() {
    return JSON.parse(JSON.stringify(matrix));
  }

  /** Cambia el modo en caliente (útil en verificación y E2E manual). */
  function setMode(nextMode) {
    if (!MOCK_MODES.includes(nextMode)) {
      throw new Error(`[mockArranger] Modo inválido: ${nextMode}. Válidos: ${MOCK_MODES.join(", ")}`);
    }
    currentMode = nextMode;
  }

  return { joinAv, getEncoder, getMatrixState, setMode, get mode() { return currentMode; } };
}

module.exports = { createMockArranger, MOCK_MODES };
