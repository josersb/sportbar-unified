/**
 * arrangerApi.js — Cliente del State Broker.
 *
 * PR 3: el cliente solo habla con el broker. NINGÚN componente llama al
 * Arranger directo ni a endpoints legacy de estado:
 *   - Estado de matriz/tvrack/zonas-fuera: llega por SSE (useBrokerState) o
 *     GET /api/broker/state (polling de respaldo versionado).
 *   - Escrituras de matriz: POST /api/tvs/:id/source (write-through
 *     confirmado: desired → join → get encoder → reported → broadcast).
 *   - Escrituras tvrack/zonas-fuera: POSTs write-through confirmados.
 *   - Presets: snapshot completo {tvs, zonasFuera, tvrack}; load server-side
 *     POST /api/presets/:n/load (sin BATCH de 29 requests cliente).
 *
 * El proxy /api/command/:command/:token SIGUE vivo para comandos IR/serial/
 * preset-deco (sendIrCommand, sendChannelDigits, sendSerialCommand, etc.):
 * esos no son estado de matriz y no pasan por el broker.
 */

// ── Cliente del broker ──

/**
 * Error de escritura con el status HTTP adjunto (hotfix 5): los handlers del
 * cliente detectan el 429 del express-rate-limit por `err.status === 429` para
 * elegir el mensaje del toast y revertir el optimistic update.
 */
function writeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Estado del broker (GET /api/broker/state). `since` (ej. "tvs:12,zonasFuera:3")
 * trae solo los dominios con versión mayor (polling de respaldo versionado).
 * @param {string} [since] — query versionada
 * @returns {Promise<object>} { schemaVersion, sync, versions, domains, appOnly }
 */
export async function fetchBrokerState(since = "") {
  const url = since ? `/api/broker/state?since=${encodeURIComponent(since)}` : "/api/broker/state";
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch broker state: ${response.status}`);
  return response.json();
}

/**
 * Escritura confirmada de un TV/video-wall: POST /api/tvs/:id/source.
 * El server serializa por destino (writeQueue), ejecuta join av, lee
 * get encoder y responde {ok, reported, version, lastUpdated, sync}.
 * WS5-DEDUPE: el server deduplica writes no-op contra el `reported`
 * confirmado; `force` reenvía el join salteando ese guard (UXF-2).
 *
 * @param {string} tvId — id app (TV01, VWN) o Arranger (VW-Norte)
 * @param {string} source — fuente (DTV1..DTV8)
 * @param {object} [opts] - { force?: boolean } escape "forzar reenvío"
 * @returns {Promise<object>} respuesta confirmada del broker
 */
export async function setTvSource(tvId, source, { force = false } = {}) {
  const response = await fetch(`/api/tvs/${encodeURIComponent(tvId)}/source`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, ...(force ? { force: true } : {}) }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw writeError(response.status, body.error || `Failed to set source for ${tvId}: ${response.status}`);
  }
  return response.json();
}

/**
 * Merge parcial del estado app-only (decos, dispositivos, audio, favoritos,
 * descripcionPreset, etc.). El server es dueño del estado app; el cliente no
 * hace POST /api/app-state con parches parciales.
 * @param {object} patch — subconjunto del estado app a mergear
 * @returns {Promise<object>} { ok, appState }
 */
export async function setAppState(patch) {
  const response = await fetch("/api/app-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`Failed to merge app state: ${response.status}`);
  return response.json();
}

// ── TVRACK State (write-through confirmado vía broker) ──

const TVRACK_BASE_URL = "/api/tvrack";

export async function setTvrackVideo(deviceId) {
  const response = await fetch(`${TVRACK_BASE_URL}/video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!response.ok) throw writeError(response.status, "Failed to set TVRACK video");
  return response.json();
}

export async function setTvrackAudio(deviceId) {
  const response = await fetch(`${TVRACK_BASE_URL}/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!response.ok) throw writeError(response.status, "Failed to set TVRACK audio");
  return response.json();
}

export async function setTvrackLink(linked) {
  const response = await fetch(`${TVRACK_BASE_URL}/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linked }),
  });
  if (!response.ok) throw writeError(response.status, "Failed to set TVRACK link");
  return response.json();
}

// ── Zonas Fuera State (write-through confirmado vía broker) ──

const ZONAS_FUERA_BASE_URL = "/api/zonas-fuera";

/**
 * Establece la fuente de video de una zona fuera (write-through confirmado).
 * @param {string} zoneId - ID de la zona (ej: "aVip-Barra-Centro")
 * @param {string} deviceId - Fuente de video (ej: "DTV3")
 * @returns {Promise<Object>} { zoneId, video, audio, link, lastUpdated }
 */
export async function setZonasFueraVideo(zoneId, deviceId) {
  const response = await fetch(`${ZONAS_FUERA_BASE_URL}/${zoneId}/video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!response.ok) throw writeError(response.status, `Failed to set video for ${zoneId}: ${response.status}`);
  return response.json();
}

/**
 * Establece la fuente de audio de una zona fuera (write-through confirmado).
 */
export async function setZonasFueraAudio(zoneId, deviceId) {
  const response = await fetch(`${ZONAS_FUERA_BASE_URL}/${zoneId}/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!response.ok) throw writeError(response.status, `Failed to set audio for ${zoneId}: ${response.status}`);
  return response.json();
}

/**
 * Activa/desactiva el link video/audio de una zona fuera (app-only, sin arbitraje).
 */
export async function setZonasFueraLink(zoneId, linked) {
  const response = await fetch(`${ZONAS_FUERA_BASE_URL}/${zoneId}/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linked }),
  });
  if (!response.ok) throw writeError(response.status, `Failed to set link for ${zoneId}: ${response.status}`);
  return response.json();
}

// ── Presets (snapshot completo, load server-side) ──

/**
 * Guarda un preset como snapshot completo {tvs, zonasFuera, tvrack}.
 * El server migra formatos viejos (migratePreset) y versiona el dominio.
 * @param {number} n - 1..5
 * @param {object} snapshot - { tvs, zonasFuera, tvrack, descripcionPreset?, _version }
 */
export async function savePreset(n, snapshot) {
  const response = await fetch(`/api/presets/${n}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (!response.ok) throw new Error(`Failed to save preset ${n}: ${response.status}`);
  return response.json();
}

/**
 * Lee un preset del server (snapshot completo o null).
 * @param {number} n - 1..5
 * @returns {Promise<object|null>}
 */
export async function fetchPreset(n) {
  const response = await fetch(`/api/presets/${n}`);
  if (!response.ok) throw new Error(`Failed to fetch preset ${n}: ${response.status}`);
  const { preset } = await response.json();
  return preset || null;
}

/**
 * Carga un preset en el hardware: el server restaura los 3 dominios
 * (tvs + zonasFuera + tvrack) vía writeQueue en batches de 4 (sin BATCH 8
 * cliente). Responde {ok, applied, failed}.
 * @param {number} n - 1..5
 */
export async function loadPreset(n) {
  const response = await fetch(`/api/presets/${n}/load`, { method: "POST" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.error || `Failed to load preset ${n}: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Elimina un preset del server (libera el slot).
 */
export async function deletePresetServer(n) {
  const response = await fetch(`/api/presets/${n}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Failed to delete preset ${n}: ${response.status}`);
  return response.json();
}

// ── WS3: Intención de canal DTV (app-only, server-owned) ──

/**
 * Registra la intención de canal de un decodificador (write-through, CD-1/CD-3).
 * El server persiste {canalActual, lastSentAt, ack:"pending"} y lo difunde por
 * SSE. CD-2: si el canal ya es el vigente responde {noop:true, reason:"canal ya
 * sintonizado"} y el cliente NO debe emitir IR.
 *
 * @param {string} decoId — DTV1..DTV8
 * @param {string|number} canal
 * @returns {Promise<object>} { ok, noop?, message?, intent?, version? }
 */
export async function setChannelIntent(decoId, canal) {
  const response = await fetch(`/api/decos/${encodeURIComponent(decoId)}/channel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ canal }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw writeError(response.status, body.error || `Failed to set channel intent for ${decoId}: ${response.status}`);
  }
  return response.json();
}

/**
 * Reporta el resultado del IR client-side para que el server persista el ACK
 * del controlador en channelIntent.ack (CD-1/CD-4).
 *
 * @param {string} decoId — DTV1..DTV8
 * @param {"accepted"|"rejected"} ack — resultado de `send ir success`
 * @returns {Promise<object>} { ok, decoId, intent, version }
 */
export async function setChannelIntentAck(decoId, ack) {
  const response = await fetch(`/api/decos/${encodeURIComponent(decoId)}/channel/ack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ack }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw writeError(response.status, body.error || `Failed to ack channel for ${decoId}: ${response.status}`);
  }
  return response.json();
}

// ── WS4c: Grupos de la matriz (server-authoritative, cliente read-only MG-1) ──

/**
 * Envía valores de subgrupo al broker: POST /api/matrix-groups {values}.
 * El server valida cada valor contra optionsFor(size) (MG-5), expande al
 * patch de TVs y encola los writes; persiste y difunde matrixGroups por SSE.
 * El cliente NUNCA persiste ni decide matrixGroups (MG-1) — solo reporta la
 * intención del operador. (El submit de MatrizVideo lo consume en WS4e.)
 * WS5-DEDUPE: el server deduplica los writes no-op contra el `reported`
 * confirmado (guard pre-join en executeWrite); `force` reenvía todo
 * salteando ese guard (escape explícito "forzar reenvío", UXF-2).
 *
 * @param {object} values — clave de subgrupo → combo "DTVxyz" | fuente única | null
 * @param {object} [opts] - { force?: boolean } escape "forzar reenvío"
 * @returns {Promise<object>} { ok, accepted }
 */
export async function setMatrixGroups(values, { force = false } = {}) {
  const response = await fetch("/api/matrix-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values, ...(force ? { force: true } : {}) }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw writeError(response.status, body.error || `Failed to set matrix groups: ${response.status}`);
  }
  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// Proxy de comandos del Arranger (IR / serial / preset-deco)
// ═══════════════════════════════════════════════════════════════════════════

const ARRANGER_BASE_URL = "/api/command";
const ARRANGER_TOKEN = import.meta.env.VITE_ARRANGER_TOKEN;
if (!ARRANGER_TOKEN) throw new Error("Missing VITE_ARRANGER_TOKEN");

const REQUEST_TIMEOUT_MS = 10000;

/**
 * Envía un comando genérico al Arranger a través del proxy de Express
 * (/api/command). Sigue vivo SOLO para comandos que no son estado de matriz:
 * IR, serial (Tesira), preset-deco. Los joins de matriz van por el broker.
 */
export async function sendArrangerCommand(command, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const url = `${ARRANGER_BASE_URL}/${encodeURIComponent(command)}/${ARRANGER_TOKEN}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions = {
    method: "GET",
    signal: controller.signal,
    ...options,
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const text = await response.text();
    const lowerText = text.toLowerCase();
    if (lowerText.includes("invalid") || lowerText.includes("error") || lowerText.includes("not found")) {
      throw new Error(`Arranger rechazó el comando: ${text.trim()}`);
    }
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Timeout: el comando "${command}" excedió los ${timeoutMs / 1000} segundos`);
    }
    throw error;
  }
}

export function buildArrangerCommand(command, ...args) {
  const flattenArgs = (arr) =>
    arr.flatMap((arg) => (Array.isArray(arg) ? flattenArgs(arg) : [arg]));
  const allArgs = flattenArgs(args);
  return [command, ...allArgs].join(" ");
}

export async function joinIr(encoder, decoder) {
  return sendArrangerCommand(buildArrangerCommand("join ir", encoder, decoder));
}

export async function joinSerial(encoder, decoder) {
  return sendArrangerCommand(buildArrangerCommand("join serial", encoder, decoder));
}

export async function getDevices(target = "all") {
  return sendArrangerCommand(buildArrangerCommand("get devices", target));
}

/**
 * Envía un comando serial a un dispositivo Tesira con terminador \\x0A.
 */
export async function sendSerialCommand(device, command) {
  const payload = `${command}\\x0A`;
  const urlCommand = `send serial ${device} "${payload}"`;
  return sendArrangerCommand(urlCommand);
}

/**
 * Carga un preset de canal en un decodificador (preset-deco, no es estado de matriz).
 */
export async function loadChannelPreset(decoNumber, channel) {
  return sendArrangerCommand(`preset load deco${decoNumber}canal${channel}`);
}

/**
 * Envía un comando IR a un dispositivo vía el Arranger.
 */
export async function sendIrCommand(deviceId, hexCode) {
  return sendArrangerCommand(`send ir ${deviceId} ${hexCode}`);
}

/**
 * Envía un cambio de canal dígito por dígito vía IR (Canales.jsx).
 */
export async function sendChannelDigits(deviceId, channel, useLirc = false) {
  const { IR_CODES, IR_CODES_LIRC } = await import("../data/irCodes.js");
  const codes = useLirc ? IR_CODES_LIRC : IR_CODES;
  const digits = String(channel).split("");
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const decoNumber = parseInt(deviceId.replace("DTV", ""), 10);

  for (const digit of digits) {
    if (digit === "2") {
      await loadChannelPreset(decoNumber, "0002");
    } else {
      const hex = codes[digit];
      if (!hex) {
        throw new Error(`Código IR no encontrado para dígito: ${digit}`);
      }
      await sendIrCommand(deviceId, hex);
    }
    await delay(300);
  }
}

/**
 * Presets del Arranger (get presets / add / delete / load matrix preset) —
 * comandos del hardware, no el estado de la app.
 */
export async function getPresets() {
  return sendArrangerCommand("get presets");
}

export async function addPreset(name, command) {
  return sendArrangerCommand(`preset add ${name} ${command}`);
}

export async function deletePreset(name) {
  return sendArrangerCommand(`preset delete ${name}`);
}

export async function loadMatrixPreset(presetName) {
  return sendArrangerCommand(`preset load ${presetName}`);
}

// Exportar la URL y el token por si se necesitan en otros módulos
export const ARRANGER_API_CONFIG = {
  baseUrl: ARRANGER_BASE_URL,
  token: ARRANGER_TOKEN,
};
