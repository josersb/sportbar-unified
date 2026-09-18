/**
 * Zonas fuera de sportbar — fuente única de orden y labels (11 zonas).
 *
 * El Arranger expone 11 zonas fuera del circuito sportbar (IPEX5002). Este
 * módulo define el ORDEN CANÓNICO y los LABELS de display para las dos vistas
 * que las muestran:
 *   - "ZONAS FUERA DE SPORTBAR" (MatrizVideo — mini-cards con controles)
 *   - "Estado de otras zonas" (Aside / ZonasFueraStatus — tabla de estado)
 *
 * Los IDs son LITERALES del Arranger (case-sensitive): un ID inexacto hace
 * que el `join` sea silenciosamente inefectivo. La zona #6
 * (aMas15-Vwall-Libertador, MAC 6C9308710CD2) se verificó en el hardware
 * real (ws1-audit.md).
 *
 * ⚠ DUPLICADO INTENCIONAL: el server tiene su propia lista de ids en
 * server/broker/destinations.js (ZONA_FUERA_IDS, CommonJS). Este módulo es
 * ES puro, sin dependencias del server — el cliente no puede importar
 * módulos CommonJS del broker. AMBOS ARCHIVOS DEBEN MANTENERSE
 * SINCRONIZADOS (mismos ids, mismo orden): si se agrega o re-ubica una zona,
 * actualizar los DOS y sus verifies (verify-destinations del server; el
 * cliente valida orden/labels en zonasFuera.test.js).
 */

/** Las 11 zonas fuera, en orden canónico. */
export const ZONAS_FUERA = [
  { id: "aVip-Lobby-Batacazo", label: "VIP Bar Lobby" },
  { id: "aVip-Bar-Boveda", label: "VIP Bar Bóveda" },
  { id: "aVip-Barra-Centro", label: "VIP Barra Centro" },
  { id: "RACK-VIP-PANTALLABATACA", label: "Rack VIP Bataca" },
  { id: "aMas-15-Barra", label: "Barra Irineo +15" },
  { id: "aMas15-Vwall-Libertador", label: "Led Wall +15" },
  { id: "a-QMR75-Menos1-TV1", label: "QMR75 -1 TV1" },
  { id: "a-QMR75-Menos1-TV2", label: "QMR75 -1 TV2" },
  { id: "a-QMC65-Menos1-TV2", label: "QMC65 -1 TV2" },
  { id: "a-Menos1-Escenario", label: "Escenario -1" },
  { id: "a-Menos1-Escenario2", label: "Escenario -1 (2)" },
];

/** Ids en el mismo orden canónico (consumido por server-contract checks). */
export const ZONA_FUERA_IDS = ZONAS_FUERA.map((zona) => zona.id);

const LABELS_BY_ID = Object.fromEntries(ZONAS_FUERA.map((zona) => [zona.id, zona.label]));

/**
 * Label de display para un id de zona. Canónico si existe; si no (zona
 * server-only aún no catalogada), se deriva del id para que ninguna zona
 * quede invisible.
 */
export const zonaFueraLabel = (id) => {
  if (LABELS_BY_ID[id]) return LABELS_BY_ID[id];
  return id
    .replace(/^a-?/, "")
    .replace(/^RACK-/, "Rack ")
    .replace(/-/g, " ")
    .replace("Vip", "VIP")
    .trim();
};

/**
 * Ids de zonas en orden canónico a partir del estado del broker:
 * las canónicas presentes (en orden) primero, las desconocidas al final
 * (el insertion-order de un state.json viejo no define el orden de la UI).
 */
export const orderedZonaFueraIds = (state = {}) => {
  const keys = Object.keys(state);
  const canonical = ZONA_FUERA_IDS.filter((id) => keys.includes(id));
  const unknown = keys.filter((id) => !LABELS_BY_ID[id]);
  return [...canonical, ...unknown];
};
