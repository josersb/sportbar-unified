/**
 * arrangerApi.js
 * Centraliza las llamadas a la API del controller Arranger (IPEX5000)
 * para el sistema SportBar Unified.
 *
 * Permite construir y enviar comandos de forma reutilizable y escalable.
 * Listo para ser importado y utilizado en cualquier parte del proyecto.
 */

const ARRANGER_BASE_URL =
  import.meta.env.VITE_ARRANGER_API_BASE || "http://192.168.2.254/api/command";
const ARRANGER_TOKEN = import.meta.env.VITE_ARRANGER_TOKEN || "TOKEN_REMOVED";

/*
 * Envía un comando genérico a la API de Arranger.
 * @param {string} command - Comando completo (ej: "join av DTV1 TV01")
 * @param {object} [options] - Opciones adicionales para fetch (method, headers, etc)
 * @returns {Promise<Response>} - Promesa con la respuesta de fetch
 */
export async function sendArrangerCommand(command, options = {}) {
  const url = `${ARRANGER_BASE_URL}/${encodeURIComponent(command)}/${ARRANGER_TOKEN}`;
  const fetchOptions = {
    method: "GET",
    mode: "no-cors",
    cache: "default",
    ...options,
  };

  try {
    const response = await fetch(url, fetchOptions);
    // No se puede leer el body en modo no-cors, pero se puede loguear el status
    if (process.env.NODE_ENV === "development") {
      console.log(`[ArrangerAPI] Comando enviado: ${command} → Status: ${response.status}`);
    }
    return response;
  } catch (error) {
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
