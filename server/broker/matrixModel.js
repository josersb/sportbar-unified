"use strict";

/**
 * Modelo declarativo de la matriz de video (WS4a — reencuadre data-driven).
 *
 * ÚNICA fuente de verdad de zonas/subgrupos y combos (MG-4: no se admite
 * hardcodeo por subgrupo en ningún lado):
 *
 *   - `zones` → subgroups `{ key, dir, screens[] }`. 3 zonas / 10 subgrupos /
 *     29 pantallas (MG-3).
 *   - `combosBySize { 3, 4 }` → patrones "DTVxyz": fuente por pantalla,
 *     posición por posición (DTV123 → TV_a=DTV1, TV_b=DTV2, TV_c=DTV3).
 *
 * `dir` es una ETIQUETA de display (Norte/Centro/Sur/Libertador/Pista), NO un
 * comando del Arranger. El único mapeo a hardware es `screens[]`.
 *
 * Consumidores:
 *   - `groups.js` deriva GROUP_DEFS/GROUP_PATTERNS/optionsFor de aquí.
 *   - WS4b lo servirá read-only como snapshot `matrixModel` (contrato del
 *     design) y WS4c/d renderizará el cliente desde él — sin copias.
 *
 * Módulo PURO CommonJS: sin dependencias de Express/store/Arranger.
 */

/** Fuentes individuales del form (decodificadores DirecTV). */
const SOURCES = ["DTV1", "DTV2", "DTV3", "DTV4", "DTV5", "DTV6", "DTV7", "DTV8"];

/**
 * Zonas → subgrupos. `key` es la clave del dominio `matrixGroups` y del form;
 * `dir` es la etiqueta que muestra la UI (MG-7: "Libertador", nunca
 * "Livertador"); `screens` son destinos canónicos del broker en orden físico.
 */
const MATRIX_MODEL = {
  zones: [
    {
      key: "videowall",
      subgroups: [
        { key: "VWN", dir: "Norte", screens: ["VWN"] },
        { key: "VWC", dir: "Centro", screens: ["VWC"] },
        { key: "VWS", dir: "Sur", screens: ["VWS"] },
      ],
    },
    {
      key: "perimetro",
      subgroups: [
        { key: "TvsEscaleraNorte", dir: "Norte", screens: ["TV23", "TV24", "TV25", "TV26"] },
        { key: "TvsEscaleraCentro", dir: "Centro", screens: ["TV19", "TV20", "TV21", "TV22"] },
        { key: "TvsEscaleraSur", dir: "Sur", screens: ["TV15", "TV16", "TV17", "TV18"] },
      ],
    },
    {
      key: "barra",
      subgroups: [
        { key: "TvsBarraNorte", dir: "Norte", screens: ["TV11", "TV12", "TV13", "TV14"] },
        { key: "TvsBarraLibertador", dir: "Libertador", screens: ["TV01", "TV02", "TV03"] },
        { key: "TvsBarraSur", dir: "Sur", screens: ["TV04", "TV05", "TV06", "TV07"] },
        { key: "TvsBarraPista", dir: "Pista", screens: ["TV08", "TV09", "TV10"] },
      ],
    },
  ],

  /**
   * Patrones por tamaño. Clave = opción completa del select (contrato del
   * design: `combosBySize: { 3: ["DTV123", …] }`), valor = secuencia por
   * posición. Tamaños sin combos (p. ej. 1 pantalla) → solo `SOURCES`.
   */
  combosBySize: {
    3: ["DTV123", "DTV121", "DTV542", "DTV143", "DTV153"],
    4: ["DTV1234", "DTV1212", "DTV1231", "DTV5432", "DTV3254", "DTV1354"],
  },
};

/** Subgrupos aplanados en orden zonas → declaración. */
function subgroups() {
  return MATRIX_MODEL.zones.flatMap((zone) => zone.subgroups);
}

/** Claves de los 10 subgrupos (orden de declaración). */
function subgroupKeys() {
  return subgroups().map((sg) => sg.key);
}

/** Busca un subgrupo por key. undefined si no existe. */
function findSubgroup(key) {
  return subgroups().find((sg) => sg.key === key);
}

/** Pantallas de un subgrupo (por objeto o por key). [] si no existe. */
function screensOf(subgroup) {
  const sg = typeof subgroup === "string" ? findSubgroup(subgroup) : subgroup;
  return sg ? [...sg.screens] : [];
}

/**
 * Opciones de un subgrupo de `size` pantallas (MG-5): DTV1..DTV8 más los
 * combos declarados para ese tamaño. Tamaños sin combos → solo SOURCES.
 */
function optionsFor(size) {
  const combos = MATRIX_MODEL.combosBySize[size] || [];
  return [...SOURCES, ...combos];
}

/**
 * Decodifica un combo "DTVxyz" → ["DTVx", "DTVy", "DTVz"] (fuente por
 * posición). Combo malformado → null.
 */
function decodeCombo(combo) {
  if (typeof combo !== "string" || !/^DTV\d+$/.test(combo)) return null;
  return combo
    .slice(3)
    .split("")
    .map((d) => `DTV${d}`);
}

module.exports = {
  SOURCES,
  MATRIX_MODEL,
  subgroups,
  subgroupKeys,
  findSubgroup,
  screensOf,
  optionsFor,
  decodeCombo,
};
