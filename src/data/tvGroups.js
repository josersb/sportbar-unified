/**
 * Grupos físicos de TVs del bar (hotfix 6 — ordenamiento de batch).
 *
 * Mapa liviano de destino → grupo físico, usado por MatrizVideo para ordenar
 * los writes del submit de "Enviar": pantallas relacionadas cambian juntas,
 * video wall primero. El orden de envío = orden de enqueue = orden de
 * ejecución con el semáforo global del server (arrangerClient).
 *
 * ⚠ DUPLICADO INTENCIONAL: el server tiene su propia copia en
 * server/broker/destinations.js (DEST_GROUPS / GROUP_ORDER / 
 * sortDestinationsByGroup, CommonJS). Este módulo es ES puro, sin dependencias
 * del server — el cliente no puede importar módulos CommonJS del broker.
 * AMBOS ARCHIVOS DEBEN MANTENERSE SINCRONIZADOS: si se re-ubica una TV física
 * o se agrega un grupo, actualizar los DOS y sus verifies (verify-destinations
 * del server + verify-broker-core del cliente).
 */

// Esquema físico del bar (misma estructura que DEST_GROUPS del server).
export const TV_GROUPS = {
  "video-wall": ["VWN", "VWC", "VWS"],
  "escaleras-norte": ["TV23", "TV24", "TV25", "TV26"],
  "escaleras-centro": ["TV19", "TV20", "TV21", "TV22"],
  "escaleras-sur": ["TV15", "TV16", "TV17", "TV18"],
  "barra-libertador": ["TV01", "TV02", "TV03"],
  "barra-sur": ["TV04", "TV05", "TV06", "TV07"],
  "barra-pista": ["TV08", "TV09", "TV10"],
  "barra-norte": ["TV11", "TV12", "TV13", "TV14"],
};

/** Orden de grupos para el batch: video-wall → escaleras → barras. */
export const GROUP_ORDER = Object.keys(TV_GROUPS);

/**
 * Ordena una lista de destinos según GROUP_ORDER (los destinos sin grupo al
 * final, orden estable). Función pura, testeable — misma semántica que
 * sortDestinationsByGroup del server (nomenclatura app: VWN/VWC/VWS).
 */
export function sortTvsByGroup(dests) {
  const groupIndex = new Map();
  let seq = 0;
  for (const group of GROUP_ORDER) {
    for (const dest of TV_GROUPS[group]) groupIndex.set(dest, seq++);
  }
  const rankOf = (dest) =>
    groupIndex.has(dest) ? groupIndex.get(dest) : Number.MAX_SAFE_INTEGER;
  return [...dests].sort((a, b) => rankOf(a) - rankOf(b));
}
