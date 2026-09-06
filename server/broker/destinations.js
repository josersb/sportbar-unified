"use strict";

/**
 * Destinations canónicas del State Broker.
 *
 * 40 destinos de la matriz audiovisual, en nomenclatura del Arranger:
 *   26 TVs (TV01–TV26) + 3 video walls (VW-Norte/Centro/Sur) + TVRACK + 10 zonas fuera.
 *
 * Este módulo es el ÚNICO mapa de nomenclatura VW. Absorbe los 3 maps del cliente
 * (VW_REVERSE / VW_FORWARD / vwDestNames) que duplicaban esta información:
 *   - VW_FORWARD : app (VWN/VWC/VWS) → Arranger (VW-Norte/Centro/Sur)
 *   - VW_REVERSE : Arranger → app
 */

const TV_IDS = [
  "TV01", "TV02", "TV03", "TV04", "TV05", "TV06", "TV07", "TV08", "TV09", "TV10",
  "TV11", "TV12", "TV13", "TV14", "TV15", "TV16", "TV17", "TV18", "TV19", "TV20",
  "TV21", "TV22", "TV23", "TV24", "TV25", "TV26",
];

const VW_ARRANGER = ["VW-Norte", "VW-Centro", "VW-Sur"];
const VW_APP = ["VWN", "VWC", "VWS"];

const TVRACK_ID = "TVRACK";

const ZONA_FUERA_IDS = [
  "aVip-Barra-Centro",
  "aVip-Lobby-Batacazo",
  "aVip-Bar-Boveda",
  "RACK-VIP-PANTALLABATACA",
  "aMas-15-Barra",
  "a-Menos1-Escenario",
  "a-Menos1-Escenario2",
  "a-QMR75-Menos1-TV1",
  "a-QMR75-Menos1-TV2",
  "a-QMC65-Menos1-TV2",
];

/** 40 destinos canónicos en nomenclatura Arranger. */
const MATRIX_DESTINATIONS = [
  ...TV_IDS,
  ...VW_ARRANGER,
  TVRACK_ID,
  ...ZONA_FUERA_IDS,
];

/** app → Arranger (VWN → VW-Norte). Absorbe VW_FORWARD + vwDestNames del cliente. */
const VW_FORWARD = Object.fromEntries(VW_APP.map((app, i) => [app, VW_ARRANGER[i]]));

/** Arranger → app (VW-Norte → VWN). Absorbe VW_REVERSE del cliente. */
const VW_REVERSE = Object.fromEntries(VW_ARRANGER.map((arr, i) => [arr, VW_APP[i]]));

// ── HOTFIX 6 (orden por grupos físicos) ────────────────────────────────────
// Esquema físico del bar: cada destino → grupo de pantallas relacionadas.
// Ordena el batch de "Enviar" para que pantallas relacionadas cambien juntas
// (video wall primero — lo más visible — y de ahí hacia afuera).
// ⚠ DUPLICADO INTENCIONAL: el cliente tiene su propia copia liviana en
// src/data/tvGroups.js (ES module, sin dependencias del server). Ambos
// archivos DEBEN mantenerse sincronizados — documentado en cada extremo.
const DEST_GROUPS = {
  "video-wall": ["VW-Norte", "VW-Sur", "VW-Centro"],
  "escaleras-norte": ["TV23", "TV24", "TV25", "TV26"],
  "escaleras-centro": ["TV19", "TV20", "TV21", "TV22"],
  "escaleras-sur": ["TV15", "TV16", "TV17", "TV18"],
  "barra-libertador": ["TV01", "TV02", "TV03"],
  "barra-sur": ["TV04", "TV05", "TV06", "TV07"],
  "barra-pista": ["TV08", "TV09", "TV10"],
  "barra-norte": ["TV11", "TV12", "TV13", "TV14"],
};

/** Orden de grupos para el batch: video-wall → escaleras → barras. */
const GROUP_ORDER = Object.keys(DEST_GROUPS);

/**
 * Ordena una lista de destinos según GROUP_ORDER (los destinos sin grupo al
 * final, orden estable). El orden de envío = orden de enqueue = orden de
 * ejecución con el semáforo global del arrangerClient.
 * Acepta ids app (VWN) o Arranger (VW-Norte): normaliza vía toArranger.
 */
function sortDestinationsByGroup(dests) {
  const groupIndex = new Map();
  let seq = 0;
  for (const group of GROUP_ORDER) {
    for (const dest of DEST_GROUPS[group]) groupIndex.set(dest, seq++);
  }
  const rankOf = (dest) => {
    const canonical = toArranger(dest);
    return groupIndex.has(canonical) ? groupIndex.get(canonical) : Number.MAX_SAFE_INTEGER;
  };
  return [...dests].sort((a, b) => rankOf(a) - rankOf(b));
}

/** Convierte un id de app a nomenclatura Arranger (VWN → VW-Norte). Ids no-VW pasan iguales. */
function toArranger(id) {
  return VW_FORWARD[id] || id;
}

/** Convierte un id Arranger a nomenclatura app (VW-Norte → VWN). Ids no-VW pasan iguales. */
function toApp(id) {
  return VW_REVERSE[id] || id;
}

/** True si el id (app o Arranger) es un destino válido de la matriz. */
function isDestination(id) {
  if (!id || typeof id !== "string") return false;
  return MATRIX_DESTINATIONS.includes(toArranger(id));
}

module.exports = {
  TV_IDS,
  VW_ARRANGER,
  VW_APP,
  TVRACK_ID,
  ZONA_FUERA_IDS,
  MATRIX_DESTINATIONS,
  VW_FORWARD,
  VW_REVERSE,
  DEST_GROUPS,
  GROUP_ORDER,
  sortDestinationsByGroup,
  toArranger,
  toApp,
  isDestination,
  DEFAULT_SOURCE: "DTV1",
};
