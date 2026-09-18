"use strict";

/**
 * Presets programáticos del Arranger (QW-4) — gestión server-side.
 *
 * Permite que el broker cree, borre y cargue presets del Arranger Liberty AV
 * DigiIP IPEXCB (firmware v1.3.4, API V210826) a partir de una lista de
 * comandos, sin depender de presets grabados a mano en el hardware.
 *
 * ── Fuente de verdad ─────────────────────────────────────────────────────
 * El Arranger es la fuente de verdad de SUS presets: este módulo NO persiste
 * ni cachea estado de presets (ni en lowdb ni en memoria). Solo emite los
 * comandos y, si el firmware lo permite, verifica best-effort el resultado.
 *
 * ── Restricciones V210826 encapsuladas ───────────────────────────────────
 *   - `preset add <name> <data>`: agrega UN comando por invocación (append).
 *   - `preset delay <ms>`: milisegundos (≤ 9999); SOLO válido dentro de un
 *     preset. NO es anidamiento de presets (manual pág. 73/113).
 *   - `preset load <name> [delay]`: el delay opcional es en MINUTOS; `-1`
 *     cancela un delay pendiente.
 *   - `preset delete <name>`: borra un preset; `not found` es idempotente.
 *   - Nombres: ≤ 19 caracteres, sin espacios, sin colisión con reservados.
 *   - Anidamiento PROHIBIDO: `preset add`/`preset delete`/`preset load` NO
 *     pueden ser pasos de otro preset (manual pág. 72). La única excepción es
 *     `preset delay`, que SÍ es un paso válido dentro de un preset.
 *
 * ── Unidades (R4, trampa documentada) ────────────────────────────────────
 *   - `ensurePreset(name, commands)`: los pasos `preset delay <ms>` usan
 *     MILISEGUNDOS (≤ 9999).
 *   - `loadPreset(name, { delayMinutes })`: el delay de carga usa MINUTOS.
 *     NUNCA mezclar unidades entre ambas APIs.
 *
 * ── Decisiones de diseño y pendientes de hardware ────────────────────────
 *   - R3 (append vs overwrite): `ensurePreset` es DETERMINISTA porque borra el
 *     preset ANTES de recrearlo (`preset delete` + ignorar `not found`). Con
 *     cualquiera de las dos semánticas del hardware, el preset resultante
 *     contiene EXACTAMENTE los comandos pedidos. Si una futura verificación en
 *     hardware confirma que `preset add` sobre un nombre existente REEMPLAZA
 *     (en vez de appendea), la pre-borrada puede volverse opcional.
 *   - R1 (licencia UI Creator de `preset add`): sin verificar en hardware. Si
 *     falta la licencia, el hardware responde `error [...]` y este módulo lo
 *     propaga tipificado (normalmente `transient`).
 *   - R2 (`get presets` ❓): no respaldado por V210826. La verificación
 *     post-creación es best-effort: si falla o no lista el preset, se loguea
 *     warning pero NUNCA se considera fallo bloqueante.
 *   - R7 (concurrencia): las operaciones de preset se serializan entre sí con
 *     una cadena de promesas interna; cada comando, además, pasa por el
 *     semáforo global de `arrangerClient`.
 */

const { classifyArrangerError, isArrangerErrorResponse } = require("./arrangerErrors");

const PRESET_NAME_MAX_LEN = 19;
const PRESET_NAME_PREFIX = "sb_";
// Charset seguro: letras, dígitos, guion y guion bajo. El prefijo `sb_` y la
// convención `sb_<ambito>_<slug>` caen dentro de este conjunto.
const PRESET_NAME_RE = /^[A-Za-z0-9_-]+$/;
const RESERVED_PRESET_NAMES = Object.freeze([
  "all",
  "all_rx",
  "all_tx",
  "ungrouped",
  "all_devices",
]);
const PRESET_DELAY_MAX_MS = 9999;
// `preset delay <ms>` como paso dentro del preset (NO anidamiento).
const PRESET_DELAY_RE = /^preset\s+delay\s+(\S+)$/i;
// Cualquier otro comando `preset ...` dentro de un preset está prohibido.
const NESTED_PRESET_RE = /^preset\b/i;
const PRESET_NOT_FOUND_RE = /not\s+found/i;

/** Error de validación de entrada (400 en las rutas, nunca toca hardware). */
class PresetValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PresetValidationError";
    this.isValidation = true;
  }
}

/**
 * Valida el naming de un preset app-owned.
 * Reglas V210826: ≤ 19 chars, sin espacios, charset seguro, prefijo `sb_`,
 * sin slug vacío y sin colisión con los nombres reservados.
 * @param {string} name
 * @returns {string} el mismo nombre validado
 * @throws {PresetValidationError}
 */
function validatePresetName(name) {
  if (typeof name !== "string") {
    throw new PresetValidationError("name debe ser un string");
  }
  if (name.length === 0) {
    throw new PresetValidationError("name no puede estar vacío");
  }
  if (/\s/.test(name)) {
    throw new PresetValidationError(`name no puede contener espacios: "${name}"`);
  }
  if (name.length > PRESET_NAME_MAX_LEN) {
    throw new PresetValidationError(
      `name supera los ${PRESET_NAME_MAX_LEN} caracteres (${name.length}): "${name}"`,
    );
  }
  if (RESERVED_PRESET_NAMES.includes(name.toLowerCase())) {
    throw new PresetValidationError(`name reservado por el Arranger: "${name}"`);
  }
  if (!name.startsWith(PRESET_NAME_PREFIX)) {
    throw new PresetValidationError(
      `name debe comenzar con el prefijo "${PRESET_NAME_PREFIX}" (app-owned): "${name}"`,
    );
  }
  if (name.length === PRESET_NAME_PREFIX.length) {
    throw new PresetValidationError(`name requiere un slug después de "${PRESET_NAME_PREFIX}"`);
  }
  if (!PRESET_NAME_RE.test(name)) {
    throw new PresetValidationError(
      `name solo admite letras, dígitos, "_" y "-": "${name}"`,
    );
  }
  return name;
}

/**
 * Valida y normaliza la lista de comandos/pasos de un preset.
 *
 * Cada elemento es un comando crudo. Se emite como `preset add <name> <cmd>`,
 * excepto `preset delay <ms>` que se emite crudo (paso de delay dentro del
 * preset). Cualquier otro `preset ...` se rechaza por anidamiento (R5).
 *
 * @param {string[]} commands
 * @returns {Array<{ raw: string, isDelay: boolean }>}
 * @throws {PresetValidationError}
 */
function validateCommands(commands) {
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new PresetValidationError("commands debe ser un array no vacío de comandos");
  }
  return commands.map((cmd, index) => {
    if (typeof cmd !== "string") {
      throw new PresetValidationError(`commands[${index}]: debe ser un string`);
    }
    const trimmed = cmd.trim();
    if (!trimmed) {
      throw new PresetValidationError(`commands[${index}]: no puede estar vacío`);
    }
    const delayMatch = trimmed.match(PRESET_DELAY_RE);
    if (delayMatch) {
      const ms = Number(delayMatch[1]);
      if (!Number.isInteger(ms) || ms < 0 || ms > PRESET_DELAY_MAX_MS) {
        throw new PresetValidationError(
          `commands[${index}]: "preset delay" requiere milisegundos enteros entre 0 y ${PRESET_DELAY_MAX_MS} (recibido "${delayMatch[1]}")`,
        );
      }
      return { raw: trimmed, isDelay: true };
    }
    if (NESTED_PRESET_RE.test(trimmed)) {
      throw new PresetValidationError(
        `commands[${index}]: anidamiento de preset prohibido ("${trimmed}"); solo "preset delay <ms>" es válido como paso`,
      );
    }
    return { raw: trimmed, isDelay: false };
  });
}

/**
 * ¿El body es un error del Arranger para comandos preset?
 *
 * El Arranger responde HTTP 200 con el error PREFIJADO por el comando:
 *   `preset add error [incomplete]`
 *   `preset delete error [preset 'x' not found]`
 *   `preset error [invalid mode]`
 *   `preset load preset1 error […]`
 * `isArrangerErrorResponse` (QW-1) solo cubre los que EMPIEZAN con `error`
 * (formato de `join`), así que acá se agrega el patrón `... error [...]`.
 */
function isPresetErrorResponse(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return false;
  if (isArrangerErrorResponse(trimmed)) return true;
  return /\berror\s*\[/i.test(trimmed);
}

/** Convierte la respuesta cruda del cliente en un resultado tipificado. */
function normalizeResult(result) {
  if (!result) {
    return { ok: false, error: "respuesta vacía del Arranger", errorKind: "unknown" };
  }
  if (result.error) {
    const raw = result.error && result.error.message ? result.error.message : String(result.error);
    const { kind } = classifyArrangerError(result.error);
    return { ok: false, error: raw, errorKind: kind };
  }
  const text = typeof result.text === "string" ? result.text : "";
  const failed = result.ok === false || isPresetErrorResponse(text);
  if (failed) {
    const { kind } = classifyArrangerError(text || `HTTP ${result.status}`);
    return { ok: false, error: text || `HTTP ${result.status}`, status: result.status, errorKind: kind };
  }
  return { ok: true, text, status: result.status };
}

/**
 * Crea el módulo de presets.
 *
 * @param {object} deps
 * @param {(command: string, writeId?: string) => Promise<object>} deps.runCommand
 *   Ejecutor de un comando crudo contra el Arranger. En `server.js` se cablea
 *   al cliente HTTP existente: `(cmd, wid) => client.sendRaw(cmd, undefined, wid)`.
 *   Los verify inyectan un mock determinista.
 * @param {{ warn?: Function, info?: Function, error?: Function }} [deps.log]
 */
function createArrangerPresets({ runCommand, log = console } = {}) {
  if (typeof runCommand !== "function") {
    throw new Error("[arrangerPresets] runCommand es obligatorio (función de ejecución de comandos)");
  }

  // R7: serializa operaciones de preset entre sí. Cada comando, además, pasa
  // por el semáforo global de arrangerClient. La cadena nunca se rompe por un
  // rechazo (se encadena con los dos callbacks).
  let opChain = Promise.resolve();
  function withLock(fn) {
    const run = opChain.then(() => fn());
    opChain = run.then(
      () => {},
      () => {},
    );
    return run;
  }

  async function send(command, writeId) {
    try {
      return normalizeResult(await runCommand(command, writeId));
    } catch (error) {
      const { kind } = classifyArrangerError(error);
      return {
        ok: false,
        error: error && error.message ? error.message : String(error),
        errorKind: kind,
      };
    }
  }

  /** `get presets` (❓): lectura best-effort, nunca lanza. */
  async function listPresets(writeId) {
    const result = await send("get presets", writeId);
    if (!result.ok) {
      return { ok: false, error: result.error, errorKind: result.errorKind };
    }
    const names = String(result.text || "")
      .split(/[^A-Za-z0-9_-]+/)
      .filter(Boolean);
    return { ok: true, names, raw: result.text };
  }

  /**
   * Borra un preset tratando `not found` como éxito idempotente.
   * @returns {Promise<{ok:boolean, existed:boolean, error?:string, errorKind?:string}>}
   */
  async function deletePresetInternal(name, writeId) {
    const result = await send(`preset delete ${name}`, writeId);
    if (result.ok) return { ok: true, existed: true };
    if (PRESET_NOT_FOUND_RE.test(result.error || "")) {
      return { ok: true, existed: false, notFound: true };
    }
    return { ok: false, existed: false, error: result.error, errorKind: result.errorKind };
  }

  /**
   * Crea o actualiza un preset con la lista de comandos dada.
   *
   * Borra el preset primero (R3, determinismo) e ignora `not found`; luego
   * emite un `preset add` por comando, en orden. Los pasos `preset delay <ms>`
   * se emiten crudos (ms, ≤ 9999). Al final verifica best-effort con
   * `get presets` (❓): un fallo NO es fatal.
   *
   * @param {string} name nombre app-owned (prefijo `sb_`, ≤ 19 chars)
   * @param {string[]} commands comandos/pasos en orden
   * @param {string} [writeId] correlación para logging
   * @returns {Promise<{ok:boolean, name:string, created:boolean, replaced:boolean, appended:number, verified:boolean, verificationError?:string|null, error?:string, errorKind?:string, failedCommand?:string}>}
   * @throws {PresetValidationError} si el nombre o los comandos son inválidos
   */
  async function ensurePreset(name, commands, writeId) {
    const validName = validatePresetName(name);
    const steps = validateCommands(commands);
    return withLock(async () => {
      // R3: borrar-antes para que el resultado sea determinista sin importar
      // si `preset add` sobre un nombre existente sobrescribe o appendea.
      const del = await deletePresetInternal(validName, writeId);
      if (!del.ok) {
        return {
          ok: false,
          name: validName,
          created: false,
          replaced: false,
          appended: 0,
          verified: false,
          error: del.error,
          errorKind: del.errorKind,
        };
      }
      const replaced = del.existed;

      let appended = 0;
      for (const step of steps) {
        const command = step.isDelay ? step.raw : `preset add ${validName} ${step.raw}`;
        const result = await send(command, writeId);
        if (!result.ok) {
          return {
            ok: false,
            name: validName,
            created: !replaced,
            replaced,
            appended,
            verified: false,
            error: result.error,
            errorKind: result.errorKind,
            failedCommand: command,
          };
        }
        appended += 1;
      }

      // Verificación best-effort (R2): NUNCA bloquea el resultado.
      let verified = false;
      let verificationError = null;
      const list = await listPresets(writeId);
      if (list.ok) {
        verified = list.names.includes(validName);
        if (!verified && typeof log.warn === "function") {
          log.warn(
            `[arrangerPresets] "${validName}" no aparece en get presets (verificación best-effort ❓)`,
          );
        }
      } else {
        verificationError = list.error;
        if (typeof log.warn === "function") {
          log.warn(
            `[arrangerPresets] get presets no disponible; verificación best-effort omitida para "${validName}": ${list.error}`,
          );
        }
      }

      return {
        ok: true,
        name: validName,
        created: !replaced,
        replaced,
        appended,
        verified,
        verificationError,
      };
    });
  }

  /**
   * Elimina un preset por nombre. `not found` es éxito idempotente.
   * @param {string} name
   * @param {string} [writeId]
   * @returns {Promise<{ok:boolean, name:string, deleted:boolean, existed:boolean, error?:string, errorKind?:string}>}
   * @throws {PresetValidationError}
   */
  async function deletePreset(name, writeId) {
    const validName = validatePresetName(name);
    return withLock(async () => {
      const result = await deletePresetInternal(validName, writeId);
      if (!result.ok) {
        return {
          ok: false,
          name: validName,
          deleted: false,
          existed: false,
          error: result.error,
          errorKind: result.errorKind,
        };
      }
      return { ok: true, name: validName, deleted: result.existed, existed: result.existed };
    });
  }

  /**
   * Carga un preset. El delay opcional es en MINUTOS (`-1` cancela); NUNCA
   * confundir con los milisegundos de `preset delay <ms>` (R4).
   *
   * @param {string} name
   * @param {{ delayMinutes?: number, writeId?: string }} [options]
   * @returns {Promise<{ok:boolean, name:string, delayMinutes:number|null, text?:string, error?:string, errorKind?:string}>}
   * @throws {PresetValidationError}
   */
  async function loadPreset(name, options = {}) {
    const validName = validatePresetName(name);
    const { delayMinutes, writeId } = options;
    if (delayMinutes != null) {
      if (!Number.isInteger(delayMinutes) || delayMinutes < -1) {
        throw new PresetValidationError(
          "delayMinutes debe ser un entero >= -1 (minutos; -1 cancela)",
        );
      }
    }
    const command =
      delayMinutes != null ? `preset load ${validName} ${delayMinutes}` : `preset load ${validName}`;
    return withLock(async () => {
      const result = await send(command, writeId);
      const delay = delayMinutes != null ? delayMinutes : null;
      if (!result.ok) {
        return { ok: false, name: validName, delayMinutes: delay, error: result.error, errorKind: result.errorKind };
      }
      return { ok: true, name: validName, delayMinutes: delay, text: result.text };
    });
  }

  return {
    ensurePreset,
    deletePreset,
    loadPreset,
    listPresets,
  };
}

module.exports = {
  createArrangerPresets,
  validatePresetName,
  validateCommands,
  PresetValidationError,
  RESERVED_PRESET_NAMES,
  PRESET_NAME_MAX_LEN,
  PRESET_NAME_PREFIX,
  PRESET_DELAY_MAX_MS,
  PRESET_NOT_FOUND_RE,
};
