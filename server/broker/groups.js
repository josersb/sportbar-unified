"use strict";

/**
 * Grupos de la matriz de video — dominio server-side (WS4a, data-driven).
 *
 * Todo se DERIVA del modelo declarativo `matrixModel.js` (MG-4): las
 * definiciones (GROUP_DEFS), los patrones (GROUP_PATTERNS) y las opciones
 * (optionsFor) ya no son literales propios — agregar un subgrupo o una TV es
 * editar datos en el modelo, sin tocar este módulo.
 *
 * Módulo PURO, sin dependencias de Express/store/Arranger: solo transforma
 * valores de grupo (los selects del form de MatrizVideo) en el patch de TVs
 * individuales que WS4b encolará por el writeQueue.
 *
 * Contrato:
 *   - Un valor de grupo es un PATRÓN si existe en GROUP_PATTERNS y su longitud
 *     coincide con la cantidad de pantallas del subgrupo. Si no, es un valor
 *     único: todas las pantallas toman ese valor.
 *   - MG-5: un combo cuya longitud no coincide con el nº de pantallas se
 *     RECHAZA (la clave se omite del patch y de matrixGroups). WS4b además
 *     valida contra `optionsFor(size)` antes de llamar aquí.
 *   - MG-6: `collapseGroup` devuelve `null` cuando las pantallas no coinciden
 *     con ninguna opción conocida (mixto) — NUNCA `values[0]`. La UI muestra
 *     "Mixto / Personalizado". `undefined` queda reservado para entrada
 *     inválida o pantallas faltantes.
 *   - VWN/VWC/VWS son subgrupos uniformes de 1 pantalla (del modelo): entran
 *     a `matrixGroups` como cualquier otro y expanden a su única pantalla.
 *     Ya no hay caso especial de passthrough para ellos.
 *   - Las claves de subgrupo (TvsBarra*, TvsEscalera*, VW*) NO se cuelan en
 *     el estado de TVs: `expandGroups` las reporta aparte en `matrixGroups`.
 *     Destinos reales que no son subgrupos (p. ej. TVRACK) siguen pasando
 *     directas a `tvs`.
 */

const model = require("./matrixModel.js");

/** Subgrupo → pantallas que lo componen (derivado del modelo). */
const GROUP_DEFS = Object.fromEntries(model.subgroups().map((sg) => [sg.key, sg.screens]));

/** Combo "DTVxyz" → secuencia de fuentes por posición (derivado del modelo). */
const GROUP_PATTERNS = Object.fromEntries(
  Object.values(model.MATRIX_MODEL.combosBySize)
    .flat()
    .map((combo) => [combo, model.decodeCombo(combo)]),
);

/**
 * Expande valores de grupo (los selects del form) al patch de TVs
 * individuales. Función PURA y determinista: misma entrada → mismo output,
 * sin leer ni mutar estado del broker.
 *
 * @param {object} values - p. ej. { TvsBarraLibertador: "DTV123", VWN: "DTV2" }
 *   - Clave de subgrupo (GROUP_DEFS): expande a sus pantallas según patrón o
 *     valor único, y registra el valor elegido en `matrixGroups`.
 *   - Combo de longitud incorrecta (MG-5): se rechaza (clave omitida).
 *   - Valor null/undefined: se omite.
 *   - Otra clave (destino real, p. ej. TVRACK): passthrough directo a `tvs`.
 * @returns {{tvs: object, matrixGroups: object}}
 *   tvs: patch solo de destinos reales (VWN..TV26) — sin claves de subgrupo.
 *   matrixGroups: clave de subgrupo → valor elegido (dominio server-authoritative).
 */
function expandGroups(values) {
  const tvs = {};
  const matrixGroups = {};
  if (!values || typeof values !== "object") return { tvs, matrixGroups };

  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue;
    const screens = GROUP_DEFS[key];
    if (!screens) {
      // No es subgrupo: passthrough de destino real.
      tvs[key] = value;
      continue;
    }
    const seq = GROUP_PATTERNS[value];
    if (seq && seq.length !== screens.length) continue; // MG-5: rechazo
    matrixGroups[key] = value;
    if (seq) {
      // Patrón: fuente por pantalla en orden físico.
      screens.forEach((id, i) => {
        tvs[id] = seq[i];
      });
    } else {
      // Valor único: todas las pantallas al mismo destino.
      screens.forEach((id) => {
        tvs[id] = value;
      });
    }
  }
  return { tvs, matrixGroups };
}

/**
 * Colapsa pantallas individuales a su valor de grupo (inverso de la
 * expansión). Lo usará WS4b para derivar matrixGroups del preset tvs
 * server-side y como fallback de initialValues.
 *
 * @param {object} tvs - tvs individuales del broker (TV01..TV26, VWN..)
 * @param {string[]} screens - pantallas del subgrupo (GROUP_DEFS o screensOf)
 * @returns {string|null|undefined}
 *   patrón (DTV1234) o valor único; `null` si es mixto (MG-6);
 *   `undefined` si la entrada es inválida o falta alguna pantalla.
 */
function collapseGroup(tvs, screens) {
  if (!tvs || !Array.isArray(screens) || screens.length === 0) return undefined;
  const values = screens.map((id) => tvs[id]);
  if (values.some((v) => v == null)) return undefined;

  for (const [pattern, seq] of Object.entries(GROUP_PATTERNS)) {
    if (seq.length === screens.length && seq.every((v, i) => v === values[i])) return pattern;
  }
  // Todas iguales → valor único
  if (values.every((v) => v === values[0])) return values[0];
  // MG-6: mixto no-predeterminado → null ("Mixto / Personalizado")
  return null;
}

/** Opciones de un subgrupo según tamaño (delegado en el modelo, MG-5). */
const optionsFor = model.optionsFor;

module.exports = { GROUP_DEFS, GROUP_PATTERNS, expandGroups, collapseGroup, optionsFor };
