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

/*
 * Ejecuta join av secuencial para un array de asignaciones {source, dest}.
 * Cada ítem se ejecuta en orden; si uno falla, loggea el error y continúa.
 * @param {Array<{source: string, dest: string}>} mappings
 * @returns {Promise<void>}
 */
export async function joinMultipleTVs(mappings) {
  for (const { source, dest } of mappings) {
    try {
      await assignSourceToDestination(source, dest);
    } catch (error) {
      console.error(`[ArrangerAPI] Error enviando comando "join av ${source} ${dest}":`, error);
    }
  }
}

/*
 * Envía un comando serial a un dispositivo Tesira con terminador \\x0A.
 * El payload se codifica como URL, el \\x0A literal se convierte en %5Cx0A.
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
 * @throws {Error} Si algún dígito no tiene código IR en la tabla
 * @returns {Promise<void>}
 */
export async function sendChannelDigits(deviceId, channel) {
  const { IR_CODES } = await import("../data/irCodes.js");
  const digits = String(channel).split("");
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const digit of digits) {
    const hex = IR_CODES[digit];
    if (!hex) {
      throw new Error(`Código IR no encontrado para dígito: ${digit}`);
    }
    await sendIrCommand(deviceId, hex);
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
