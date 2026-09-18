"use strict";

/**
 * Clasificación de errores del Arranger (Liberty AV DigiIP IPEXCB,
 * firmware v1.3.4, API V210826).
 *
 * El Arranger SIEMPRE responde HTTP 200: los errores viajan en el body con
 * el formato `error [tipo]` (a veces `error tipo`, sin corchetes). Este
 * helper puro clasifica esa respuesta para que el broker pueda distinguir
 * una falla recuperable de una definitiva, SIN acoplarse al control de flujo.
 *
 *   transient → reintentable: dispositivo desconectado, licencia ausente,
 *               timeout/red del fetch.
 *   permanent → no reintentar: argumentos/stream/modo inválidos, device
 *               inexistente, security key mismatch, comando incompleto.
 *   unknown   → todo lo demás, incluidas las respuestas de éxito con un
 *               formato inesperado (no se asume ni error ni éxito).
 *
 * Decisión de alcance (QW-1): el mapa implementa EXACTAMENTE las listas del
 * quick win. Por eso `preset '<X>' not found`, `invalid subscription '<type>'`
 * y `join failed` quedan como `unknown` (no figuran en la lista), e
 * `invalid license` es `transient` aunque el catálogo histórico de la wiki lo
 * describa como permanente. Ampliar el mapa es agregar una entrada a RULES.
 *
 * NO implementa retry: solo tipifica. La política de reintento es del broker.
 */

const ARRANGER_ERROR_KINDS = Object.freeze({
  TRANSIENT: "transient",
  PERMANENT: "permanent",
  UNKNOWN: "unknown",
});

// Orden de evaluación: transient primero. Los patrones no se solapan entre sí,
// pero fijar el orden hace la clasificación determinista ante futuras reglas.
const TRANSIENT_RULES = Object.freeze([
  { name: "device disconnected", pattern: /device\s+(?:'[^']*'\s+)?disconnected/i },
  { name: "invalid license", pattern: /invalid license/i },
  {
    name: "timeout/network",
    pattern:
      /timeout|timed out|abort|econnrefused|econnreset|enotfound|ehostunreach|eai_again|fetch failed|network error|socket hang up|getaddrinfo/i,
  },
]);

const PERMANENT_RULES = Object.freeze([
  { name: "invalid arguments", pattern: /invalid arguments/i },
  { name: "invalid stream", pattern: /invalid stream/i },
  { name: "device not found", pattern: /device\s+(?:'[^']*'\s+)?not found/i },
  { name: "invalid mode", pattern: /invalid mode/i },
  { name: "security key mismatch", pattern: /security key mismatch/i },
  { name: "incomplete", pattern: /\bincomplete\b/i },
]);

/** Extrae texto comparable de string | Error | { text } | { message } | { error }. */
function toText(rawResponse) {
  if (rawResponse == null) return "";
  if (typeof rawResponse === "string") return rawResponse;
  if (rawResponse instanceof Error) return rawResponse.message || "";
  if (typeof rawResponse === "object") {
    if (typeof rawResponse.text === "string") return rawResponse.text;
    if (typeof rawResponse.message === "string") return rawResponse.message;
    if (rawResponse.error != null) return toText(rawResponse.error);
  }
  return String(rawResponse);
}

/**
 * Clasifica la respuesta cruda del Arranger.
 * @param {string|Error|{text?:string,message?:string,error?:unknown}|null|undefined} rawResponse
 * @returns {{ kind: "transient"|"permanent"|"unknown", matched: string|null, text: string }}
 */
function classifyArrangerError(rawResponse) {
  const text = toText(rawResponse);
  const trimmed = text.trim();
  if (!trimmed) {
    return { kind: ARRANGER_ERROR_KINDS.UNKNOWN, matched: null, text };
  }
  for (const rule of TRANSIENT_RULES) {
    if (rule.pattern.test(trimmed)) {
      return { kind: ARRANGER_ERROR_KINDS.TRANSIENT, matched: rule.name, text };
    }
  }
  for (const rule of PERMANENT_RULES) {
    if (rule.pattern.test(trimmed)) {
      return { kind: ARRANGER_ERROR_KINDS.PERMANENT, matched: rule.name, text };
    }
  }
  return { kind: ARRANGER_ERROR_KINDS.UNKNOWN, matched: null, text };
}

/**
 * ¿La respuesta es una respuesta de error del Arranger? (`error ...`, con o
 * sin corchetes). El Arranger responde HTTP 200 aunque el body sea un error.
 */
function isArrangerErrorResponse(rawResponse) {
  return /^\s*error\b/i.test(toText(rawResponse));
}

module.exports = {
  ARRANGER_ERROR_KINDS,
  classifyArrangerError,
  isArrangerErrorResponse,
};
