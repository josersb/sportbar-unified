/**
 * arrangerApi.js
 * Centraliza las llamadas a la API del controller Arranger (IPEX5000)
 * para el sistema SportBar Unified.
 *
 * Permite construir y enviar comandos de forma reutilizable y escalable.
 * Listo para ser importado y utilizado en cualquier parte del proyecto.
 */

const ARRANGER_BASE_URL =
  process.env.VITE_ARRANGER_API_BASE || "http://192.168.2.254/api/command";
const ARRANGER_TOKEN = process.env.VITE_ARRANGER_TOKEN || "TOKEN_REMOVED";

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
      // eslint-disable-next-line no-console
      console.log(
        `[ArrangerAPI] Comando enviado: ${command} → Status: ${response.status}`,
      );
    }
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
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

/**
 * Ejemplo para agregar más comandos:
 * export async function muteAudioZone(zone) {
 *   const command = `mute audio ${zone}`;
 *   return sendArrangerCommand(command);
 * }
 */

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
