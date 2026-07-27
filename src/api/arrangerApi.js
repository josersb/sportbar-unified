/**
 * arrangerApi.js
 * Centraliza las llamadas a la API del controller Arranger (IPEX5000)
 * para el sistema SportBar Unified.
 *
 * Permite construir y enviar comandos de forma reutilizable y escalable.
 * Listo para ser importado y utilizado en cualquier parte del proyecto.
 */

// Las requests al Arranger van a través del proxy de Express (/api/command/*),
// no directamente a 192.168.2.254. Esto permite que la app funcione desde
// cualquier PC que pueda alcanzar el servidor Express, sin necesidad de
// estar en la misma red local que el Arranger.
const ARRANGER_BASE_URL = "/api/command";
const ARRANGER_TOKEN = import.meta.env.VITE_ARRANGER_TOKEN;
if (!ARRANGER_TOKEN) throw new Error("Missing VITE_ARRANGER_TOKEN");

const REQUEST_TIMEOUT_MS = 10000;

/*
 * Envía un comando genérico a la API de Arranger.
 * @param {string} command - Comando completo (ej: "join av DTV1 TV01")
 * @param {object} [options] - Opciones adicionales para fetch (method, headers, etc)
 * @param {number} [timeoutMs] - Timeout en milisegundos (default: 10000)
 * @returns {Promise<Response>} - Promesa con la respuesta de fetch
 */
export async function sendArrangerCommand(command, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const url = `${ARRANGER_BASE_URL}/${encodeURIComponent(command)}/${ARRANGER_TOKEN}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Ya no usamos mode: "no-cors": ahora las requests van al mismo origen
  // (Express proxy) y CORS no es problema. Esto permite leer el body
  // y detectar errores del Arranger como "Invalid Security Key".
  const fetchOptions = {
    method: "GET",
    signal: controller.signal,
    ...options,
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const text = await response.text();

    // El Arranger devuelve HTTP 200 incluso con errores.
    // Detectamos mensajes de error en el body para no tratar la
    // respuesta como exitosa si el comando no se ejecutó realmente.
    const lowerText = text.toLowerCase();
    if (lowerText.includes("invalid") || lowerText.includes("error") || lowerText.includes("not found")) {
      throw new Error(`Arranger rechazó el comando: ${text.trim()}`);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[ArrangerAPI] Comando enviado: ${command} → ${text.trim()}`);
    }
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Timeout: el comando "${command}" excedió los ${timeoutMs / 1000} segundos`);
    }
    console.error(`[ArrangerAPI] Error enviando comando "${command}":`, error);
    throw error;
  }
}

/*
 * Asigna una fuente (deco) a un destino (TV) usando el comando "join av".
 * @param {string} source - Nombre del decodificador (ej: "DTV1")
 * @param {string} destination - Nombre del TV o destino (ej: "TV01")
 * @returns {Promise<Response>}
 */
export async function assignSourceToDestination(source, destination) {
  const command = buildArrangerCommand("join av", source, destination);
  return sendArrangerCommand(command);
}

export async function assignVideoSource(source, destination) {
  const command = buildArrangerCommand("join video", source, destination);
  return sendArrangerCommand(command);
}

export async function assignAudioSource(source, destination) {
  const command = buildArrangerCommand("join audio", source, destination);
  return sendArrangerCommand(command);
}

export async function getDevices(target = "all") {
  return sendArrangerCommand(buildArrangerCommand("get devices", target));
}

export async function getStatus(device, stream = "") {
  const args = stream ? `${device} ${stream}` : device;
  return sendArrangerCommand(buildArrangerCommand("get status", args));
}

export async function getMatrix(stream) {
  return sendArrangerCommand(buildArrangerCommand("get matrix", stream));
}

export async function getJoins(decoder = "") {
  const args = decoder || "";
  return sendArrangerCommand(buildArrangerCommand("get joins", args));
}

export async function leaveAv(decoder) {
  return sendArrangerCommand(buildArrangerCommand("leave av", decoder));
}

/*
 * Ejecuta join av secuencial para un array de asignaciones {source, dest}.
 * Cada ítem se ejecuta en orden; si uno falla, loggea el error y continúa.
 * @param {Array<{source: string, dest: string}>} mappings
 * @returns {Promise<void>}
 */
export async function joinMultipleTVs(mappings) {
  const BATCH_SIZE = 8;

  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = mappings.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async ({ source, dest }) => {
        try {
          await assignSourceToDestination(source, dest);
        } catch (error) {
          console.error(
            `[ArrangerAPI] Error enviando comando "join av ${source} ${dest}":`,
            error
          );
        }
      })
    );
  }
}

/*
 * Envía un comando serial a un dispositivo Tesira con terminador \\x0A.
 * El payload se codifica como URL, el \\x0A literal se convierte en %5Cx0A.
 * Esto es correcto para HTTP transport: el Arranger recibe el string "\x0A"
 * en la URL y lo convierte al byte LF (0x0A) real cuando lo reenvía al
 * dispositivo serial (API docs Rev 240207, sección 10.6).
 * @param {string} device - Nombre del dispositivo (ej: "DTV1")
 * @param {string} command - Comando serial (ej: "Mute1 set mute 1 true")
 * @returns {Promise<Response>}
 */
export async function sendSerialCommand(device, command) {
  const payload = `${command}\\x0A`;
  const urlCommand = `send serial ${device} "${payload}"`;
  return sendArrangerCommand(urlCommand);
}

/*
 * Carga un preset de canal en un decodificador específico.
 * @param {number} decoNumber - Número de decodificador (1..8)
 * @param {number|string} channel - Número de canal (ej: 1603)
 * @returns {Promise<Response>}
 */
export async function loadChannelPreset(decoNumber, channel) {
  return sendArrangerCommand(`preset load deco${decoNumber}canal${channel}`);
}

/**
 * Carga un preset completo de matriz desde el Arranger.
 * Útil para restaurar configuraciones frecuentes con un solo comando
 * en lugar de enviar 46 join av individuales.
 * @param {string} presetName - Nombre del preset en el Arranger (ej: "futbol-domingo")
 * @returns {Promise<Response>}
 */
export async function loadMatrixPreset(presetName) {
  return sendArrangerCommand(`preset load ${presetName}`);
}

/**
 * Envía un comando IR a un dispositivo vía el Arranger.
 * @param {string} deviceId - ID del dispositivo (ej: "DTV1")
 * @param {string} hexCode - Código IR en formato Pronto hex
 * @returns {Promise<Response>}
 */
export async function sendIrCommand(deviceId, hexCode) {
  return sendArrangerCommand(`send ir ${deviceId} ${hexCode}`);
}

/**
 * Envía un cambio de canal dígito por dígito vía IR.
 * Cada dígito se envía con un delay de 300ms entre comandos,
 * replicando el comportamiento de los presets del Arranger.
 * @param {string} deviceId - ID del dispositivo (ej: "DTV1")
 * @param {string|number} channel - Número de canal (ej: "1603")
 * @param {boolean} [useLirc=false] - Usar códigos LIRC RC64 en vez de Arranger
 * @throws {Error} Si algún dígito no tiene código IR en la tabla
 * @returns {Promise<void>}
 */
export async function sendChannelDigits(deviceId, channel, useLirc = false) {
  const { IR_CODES, IR_CODES_LIRC } = await import("../data/irCodes.js");
  const codes = useLirc ? IR_CODES_LIRC : IR_CODES;
  const digits = String(channel).split("");
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const decoNumber = parseInt(deviceId.replace("DTV", ""), 10);

  for (const digit of digits) {
    if (digit === "2") {
      // El dígito 2 falla con send ir — usar preset del Arranger en su lugar
      // Requiere preset: decoNcanal0002 (ej: deco1canal0002, deco2canal0002...)
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
 * Utilidades para construir comandos (opcional, para futuros comandos avanzados)
 */
/*
 * Construye un comando de Arranger de forma dinámica y recursiva.
 * @param {string} command - El comando principal (ej: "join av", "mute audio", etc)
 * @param {...any} args - Argumentos adicionales del comando (strings, arrays, etc)
 * @returns {string} - Comando listo para enviar
 */
export function buildArrangerCommand(command, ...args) {
  // Expande arrays anidados recursivamente
  const flattenArgs = (arr) =>
    arr.flatMap((arg) => (Array.isArray(arg) ? flattenArgs(arg) : [arg]));
  const allArgs = flattenArgs(args);
  return [command, ...allArgs].join(" ");
}

/**
 * Obtiene el estado de un dispositivo IPEX5001 consultando el proxy Express.
 * El proxy se comunica con el Arranger sin restricciones CORS y devuelve
 * los streams activos parseados como JSON.
 *
 * @param {string} deviceId - ID del dispositivo (ej: 'DTV1')
 * @returns {Promise<{streams: object, online: boolean}>}
 */
export async function getDeviceStatus(deviceId) {
  const response = await fetch(`/api/device/${deviceId}/status`);
  if (!response.ok) {
    throw new Error(`Device ${deviceId} status failed: ${response.status}`);
  }
  return response.json();
}

// ── TVRACK State Store ──

const STATE_BASE_URL = "/api/tvrack";

export async function fetchTvrackState() {
  const response = await fetch(`${STATE_BASE_URL}/state`);
  if (!response.ok) throw new Error("Failed to fetch TVRACK state");
  return response.json();
}

export async function setTvrackVideo(deviceId) {
  const response = await fetch(`${STATE_BASE_URL}/video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!response.ok) throw new Error("Failed to set TVRACK video");
  return response.json();
}

export async function setTvrackAudio(deviceId) {
  const response = await fetch(`${STATE_BASE_URL}/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!response.ok) throw new Error("Failed to set TVRACK audio");
  return response.json();
}

export async function setTvrackLink(linked) {
  const response = await fetch(`${STATE_BASE_URL}/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linked }),
  });
  if (!response.ok) throw new Error("Failed to set TVRACK link");
  return response.json();
}

// ── Zonas Fuera State Store ──

const ZONAS_FUERA_BASE_URL = "/api/zonas-fuera";

/**
 * Obtiene el estado completo de todas las zonas fuera.
 * @returns {Promise<Object>} Mapa de zoneId → { video, audio, link, lastUpdated }
 */
export async function fetchZonasFueraState() {
  const response = await fetch(`${ZONAS_FUERA_BASE_URL}/state`);
  if (!response.ok) throw new Error(`Failed to fetch zonas fuera state: ${response.status}`);
  return response.json();
}

/**
 * Establece la fuente de video de una zona fuera.
 * @param {string} zoneId - ID de la zona (ej: "aVip-Barra-Centro")
 * @param {string} deviceId - Fuente de video (ej: "DTV3")
 * @returns {Promise<Object>} Estado actualizado de la zona
 */
export async function setZonasFueraVideo(zoneId, deviceId) {
  const response = await fetch(`${ZONAS_FUERA_BASE_URL}/${zoneId}/video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!response.ok) throw new Error(`Failed to set video for ${zoneId}: ${response.status}`);
  return response.json();
}

/**
 * Establece la fuente de audio de una zona fuera.
 * @param {string} zoneId - ID de la zona (ej: "aVip-Barra-Centro")
 * @param {string} deviceId - Fuente de audio (ej: "DTV3")
 * @returns {Promise<Object>} Estado actualizado de la zona
 */
export async function setZonasFueraAudio(zoneId, deviceId) {
  const response = await fetch(`${ZONAS_FUERA_BASE_URL}/${zoneId}/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!response.ok) throw new Error(`Failed to set audio for ${zoneId}: ${response.status}`);
  return response.json();
}

/**
 * Activa o desactiva el link video/audio de una zona fuera.
 * @param {string} zoneId - ID de la zona (ej: "aVip-Barra-Centro")
 * @param {boolean} linked - true para vincular video y audio
 * @returns {Promise<Object>} Estado actualizado de la zona
 */
export async function setZonasFueraLink(zoneId, linked) {
  const response = await fetch(`${ZONAS_FUERA_BASE_URL}/${zoneId}/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linked }),
  });
  if (!response.ok) throw new Error(`Failed to set link for ${zoneId}: ${response.status}`);
  return response.json();
}

// Exportar la URL y el token por si se necesitan en otros módulos
export const ARRANGER_API_CONFIG = {
  baseUrl: ARRANGER_BASE_URL,
  token: ARRANGER_TOKEN,
};

/**
 * Ejemplo de uso futuro:
 * import { assignSourceToDestination } from "../api/arrangerApi";
 * await assignSourceToDestination("DTV1", "TV01");
 */
