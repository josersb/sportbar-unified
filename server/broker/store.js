"use strict";

/**
 * Store del State Broker — lowdb v3, CommonJS.
 *
 * Schema v3 (versionado por dominio):
 *   {
 *     schemaVersion: 3,
 *     domains: {
 *       tvs:        { desired: {TV01: src, VWN: src, ...}, reported: {...}, version, lastUpdated },
 *       tvrack:     { desired: {video, audio},             reported: {video, audio}, version, lastUpdated },
 *       zonasFuera: { desired: {zoneId: {video, audio}},   reported: {...},          version, lastUpdated },
 *       presets:    { desired: {preset1..5},               reported: null,           version, lastUpdated },
 *     },
 *     appOnly: {            // estado sin arbitraje del Arranger (link, Tesira, etc.)
 *       tvrack: { link: false },
 *       zonasFuera: { zoneId: { link: false } },
 *     },
 *     sync: { status: "stale"|"synced"|"out_of_sync"|"offline", lastSync: ISO|null },
 *   }
 *
 * desired  = intención del operador (lo que el usuario pide).
 * reported = lectura confirmada del hardware (get encoder) — solo lectura
 *            válida; null/blip nunca pisa desired.
 * presets  = snapshot completo { tvs, zonasFuera, tvrack } — app-only, sin reported.
 *
 * Migración v2→v3 con backup (state.backup.json), precedente v2 server.js.
 * Fresh-start: state.json envenenado → matriz reconstruida desde Arranger
 * (readEncoder), presets migrados, app-only conservado.
 */

const fs = require("fs");
const path = require("path");
const {
  TV_IDS,
  VW_APP,
  TVRACK_ID,
  ZONA_FUERA_IDS,
  MATRIX_DESTINATIONS,
  toApp,
  DEFAULT_SOURCE,
} = require("./destinations");

const SCHEMA_VERSION = 3;
const PRESET_KEYS = ["preset1", "preset2", "preset3", "preset4", "preset5"];
const TV_APP_KEYS = [...TV_IDS, ...VW_APP]; // claves de dominio tvs (nomenclatura app)

function isoNow() {
  return new Date().toISOString();
}

/** Valores por defecto del estado de matriz (desired y reported base). */
function defaultMatrix() {
  const tvs = {};
  for (const key of TV_APP_KEYS) tvs[key] = DEFAULT_SOURCE;
  const zonasFuera = {};
  for (const zoneId of ZONA_FUERA_IDS) zonasFuera[zoneId] = { video: DEFAULT_SOURCE, audio: DEFAULT_SOURCE };
  return { tvs, tvrack: { video: DEFAULT_SOURCE, audio: DEFAULT_SOURCE }, zonasFuera };
}

function defaultAppOnly() {
  const zonasFuera = {};
  for (const zoneId of ZONA_FUERA_IDS) zonasFuera[zoneId] = { link: false };
  return { tvrack: { link: false }, zonasFuera };
}

function defaultPresets() {
  const presets = {};
  for (const key of PRESET_KEYS) presets[key] = null;
  return presets;
}

/** Schema v3 vacío (fresco, sin escanear). */
function defaultSchemaV3() {
  const matrix = defaultMatrix();
  const now = isoNow();
  return {
    schemaVersion: SCHEMA_VERSION,
    domains: {
      tvs: { desired: matrix.tvs, reported: {}, version: 1, lastUpdated: now },
      tvrack: { desired: matrix.tvrack, reported: {}, version: 1, lastUpdated: now },
      zonasFuera: { desired: matrix.zonasFuera, reported: {}, version: 1, lastUpdated: now },
      presets: { desired: defaultPresets(), reported: null, version: 1, lastUpdated: now },
    },
    appOnly: defaultAppOnly(),
    sync: { status: "stale", lastSync: null },
  };
}

/**
 * Migra un preset de formato viejo (solo tvs / v2 con zonasFueraState) al
 * snapshot completo { tvs, zonasFuera, tvrack }. Rellena defaults.
 */
function migratePreset(preset) {
  if (!preset || typeof preset !== "object") return null;
  // Formato nuevo ya (v3)
  if (preset.tvs && preset.zonasFuera && preset.tvrack && (preset._version || 0) >= 3) {
    return { ...preset, _version: 3 };
  }
  const tvs = preset.tvs && typeof preset.tvs === "object" ? { ...preset.tvs } : {};
  const legacyZones = preset.zonasFueraState || preset.zonasFuera || {};
  const zonasFuera = {};
  for (const zoneId of ZONA_FUERA_IDS) {
    const z = legacyZones[zoneId];
    if (typeof z === "string") {
      zonasFuera[zoneId] = { video: z, audio: z, link: true };
    } else if (z && typeof z === "object") {
      zonasFuera[zoneId] = {
        video: z.video || DEFAULT_SOURCE,
        audio: z.audio || z.video || DEFAULT_SOURCE,
        link: z.link !== undefined ? !!z.link : true,
      };
    } else {
      zonasFuera[zoneId] = { video: DEFAULT_SOURCE, audio: DEFAULT_SOURCE, link: false };
    }
  }
  const tvrack =
    preset.tvrack && typeof preset.tvrack === "object" && preset.tvrack.video
      ? { video: preset.tvrack.video, audio: preset.tvrack.audio || preset.tvrack.video }
      : { video: DEFAULT_SOURCE, audio: DEFAULT_SOURCE };
  return { tvs, zonasFuera, tvrack, _version: 3 };
}

/** Clasifica el archivo legacy: "v2" | "unknown". */
function detectLegacySchema(data) {
  if (data && typeof data === "object" && data.state && typeof data.state === "object") return "v2";
  return "unknown";
}

/**
 * Migración v2 → v3. Extrae la matriz de state.tvs a desired.*, elimina keys
 * legacy, conserva app-only y migra presets. reported queda vacío: lo
 * reconstruye el scan de arranque (reconciler).
 */
function migrateV2ToV3(v2, now = isoNow()) {
  const v3 = defaultSchemaV3();
  v3.domains = {
    tvs: { desired: {}, reported: {}, version: 1, lastUpdated: now },
    tvrack: { desired: { video: DEFAULT_SOURCE, audio: DEFAULT_SOURCE }, reported: {}, version: 1, lastUpdated: now },
    zonasFuera: { desired: {}, reported: {}, version: 1, lastUpdated: now },
    presets: { desired: defaultPresets(), reported: null, version: 1, lastUpdated: now },
  };
  v3.appOnly = defaultAppOnly();

  // 1. Matriz desde state.tvs (claves app; descarta legacy Tvs* y no-destinos)
  const legacyTvs = v2.state.tvs && typeof v2.state.tvs === "object" ? v2.state.tvs : {};
  for (const [key, value] of Object.entries(legacyTvs)) {
    if (value == null) continue;
    if (TV_APP_KEYS.includes(key)) {
      v3.domains.tvs.desired[key] = value;
    } else if (key === TVRACK_ID) {
      v3.domains.tvrack.desired.video = value;
      v3.domains.tvrack.desired.audio = value;
    } else if (ZONA_FUERA_IDS.includes(key)) {
      v3.domains.zonasFuera.desired[key] = {
        video: typeof value === "string" ? value : value.video || DEFAULT_SOURCE,
        audio: typeof value === "string" ? value : value.audio || value.video || DEFAULT_SOURCE,
      };
    }
    // keys legacy (TvsBarra*, TvsEscalera*, etc.) → descartadas
  }

  // 2. TVRACK (top-level v2) + link app-only
  if (v2.tvrack && typeof v2.tvrack === "object") {
    v3.domains.tvrack.desired.video = v2.tvrack.video || DEFAULT_SOURCE;
    v3.domains.tvrack.desired.audio = v2.tvrack.audio || v2.tvrack.video || DEFAULT_SOURCE;
    v3.appOnly.tvrack.link = !!v2.tvrack.link;
  }

  // 3. Zonas fuera (top-level v2) + links app-only
  if (v2.zonasFuera && typeof v2.zonasFuera === "object") {
    for (const [zoneId, zone] of Object.entries(v2.zonasFuera)) {
      const video = typeof zone === "string" ? zone : zone.video || DEFAULT_SOURCE;
      const audio = typeof zone === "string" ? zone : zone.audio || zone.video || DEFAULT_SOURCE;
      v3.domains.zonasFuera.desired[zoneId] = { video, audio };
      v3.appOnly.zonasFuera[zoneId] = { link: !!(zone && zone.link) };
    }
  }

  // 4. Presets migrados (solo-tvs → snapshot completo)
  if (v2.presets && typeof v2.presets === "object") {
    for (const pKey of PRESET_KEYS) {
      if (v2.presets[pKey]) v3.domains.presets.desired[pKey] = migratePreset(v2.presets[pKey]);
    }
  }

  return v3;
}

/**
 * Fresh-start: reconstruye desired Y reported de la matriz desde el Arranger
 * (readEncoder). Presets migrados y app-only conservados del archivo legacy si
 * era parseable (null si no). Sincrónico para el desired (defaults); reported
 * se llena solo con lecturas confirmadas válidas (null → queda sin reported).
 */
async function freshStartV3(readEncoder, legacy, now = isoNow()) {
  const v3 = defaultSchemaV3();
  v3.domains = {
    tvs: { desired: {}, reported: {}, version: 1, lastUpdated: now },
    tvrack: { desired: { video: DEFAULT_SOURCE, audio: DEFAULT_SOURCE }, reported: {}, version: 1, lastUpdated: now },
    zonasFuera: { desired: {}, reported: {}, version: 1, lastUpdated: now },
    presets: { desired: defaultPresets(), reported: null, version: 1, lastUpdated: now },
  };
  v3.appOnly = defaultAppOnly();

  // Conservar presets y app-only del archivo previo si era parseable
  if (legacy && typeof legacy === "object") {
    if (detectLegacySchema(legacy) === "v2") {
      const migrated = migrateV2ToV3(legacy, now);
      v3.domains.presets = migrated.domains.presets;
      v3.appOnly = migrated.appOnly;
    } else if (legacy.schemaVersion === SCHEMA_VERSION && legacy.domains && legacy.appOnly) {
      v3.domains.presets = legacy.domains.presets;
      v3.appOnly = legacy.appOnly;
    } else {
      // Schema desconocido: conservar lo migrable (presets en formato presetN,
      // tvrack/zonasFuera con link como app-only).
      if (legacy.presets && typeof legacy.presets === "object") {
        for (const pKey of PRESET_KEYS) {
          if (legacy.presets[pKey]) v3.domains.presets.desired[pKey] = migratePreset(legacy.presets[pKey]);
        }
      }
      if (legacy.tvrack && typeof legacy.tvrack === "object" && legacy.tvrack.video) {
        v3.domains.tvrack.desired.video = legacy.tvrack.video;
        v3.domains.tvrack.desired.audio = legacy.tvrack.audio || legacy.tvrack.video;
        v3.appOnly.tvrack.link = !!legacy.tvrack.link;
      }
      if (legacy.zonasFuera && typeof legacy.zonasFuera === "object") {
        for (const [zoneId, zone] of Object.entries(legacy.zonasFuera)) {
          if (zone && typeof zone === "object" && zone.video) {
            v3.domains.zonasFuera.desired[zoneId] = { video: zone.video, audio: zone.audio || zone.video };
            v3.appOnly.zonasFuera[zoneId] = { link: !!zone.link };
          }
        }
      }
    }
  }

  // Matriz reconstruida desde el Arranger (batch 4 como el scan)
  if (typeof readEncoder !== "function") return v3;

  const BATCH = 4;
  for (let i = 0; i < MATRIX_DESTINATIONS.length; i += BATCH) {
    const batch = MATRIX_DESTINATIONS.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (arrDest) => {
        const subVideo = await readEncoder(arrDest, "video");
        const subAudio = await readEncoder(arrDest, "audio");
        if (arrDest === TVRACK_ID) {
          v3.domains.tvrack.desired.video = subVideo || DEFAULT_SOURCE;
          v3.domains.tvrack.desired.audio = subAudio || DEFAULT_SOURCE;
          if (subVideo) v3.domains.tvrack.reported.video = subVideo;
          if (subAudio) v3.domains.tvrack.reported.audio = subAudio;
        } else if (ZONA_FUERA_IDS.includes(arrDest)) {
          v3.domains.zonasFuera.desired[arrDest] = {
            video: subVideo || DEFAULT_SOURCE,
            audio: subAudio || DEFAULT_SOURCE,
          };
          if (subVideo) {
            v3.domains.zonasFuera.reported[arrDest] = { video: subVideo, audio: subAudio };
          }
        } else {
          // tvs: MATRIX_DESTINATIONS viene en nomenclatura Arranger (VW-Norte);
          // la clave de dominio usa nomenclatura app (VWN/VWC/VWS) → toApp.
          const tvsKey = toApp(arrDest);
          v3.domains.tvs.desired[tvsKey] = subVideo || DEFAULT_SOURCE;
          if (subVideo) v3.domains.tvs.reported[tvsKey] = subVideo;
        }
      }),
    );
  }

  return v3;
}

/**
 * Crea el store. options: { dbPath, backupPath, readEncoder, log }.
 * Returns: Promise<store>. Lanza si no puede escribir el backup (migración).
 */
async function createStore(options = {}) {
  const dbPath = options.dbPath || path.join(__dirname, "..", "state.json");
  const backupPath = options.backupPath || path.join(path.dirname(dbPath), "state.backup.json");
  const readEncoder = options.readEncoder;
  const log = options.log || console;

  const { Low } = await import("lowdb");
  const { JSONFile } = await import("lowdb/node");

  let legacy = null;
  let poisoned = false;

  // Clasificar archivo existente
  if (fs.existsSync(dbPath)) {
    const raw = fs.readFileSync(dbPath, "utf-8");
    try {
      legacy = JSON.parse(raw);
    } catch {
      poisoned = true;
    }
  }

  let seed;
  if (poisoned) {
    log.warn(`[store] state.json envenenado (JSON inválido). Backup y fresh-start.`);
    await fs.promises.copyFile(dbPath, backupPath).catch(() => {});
    seed = await freshStartV3(readEncoder, null);
  } else if (legacy == null) {
    seed = defaultSchemaV3();
  } else if (legacy.schemaVersion === SCHEMA_VERSION) {
    seed = legacy; // ya v3 — usar tal cual
  } else if (detectLegacySchema(legacy) === "v2") {
    log.info(`[store] Migración v2→v3 detectada. Backup → ${backupPath}`);
    await fs.promises.copyFile(dbPath, backupPath);
    seed = migrateV2ToV3(legacy);
  } else {
    // Estructura desconocida pero parseable → fresh-start conservando lo migrable
    log.warn(`[store] Schema desconocido (v${legacy && legacy.schemaVersion}). Fresh-start.`);
    seed = await freshStartV3(readEncoder, legacy);
  }

  const adapter = new JSONFile(dbPath);
  const db = new Low(adapter, seed);
  db.data = seed;
  await db.write();

  function bumpVersion(domain) {
    const d = db.data.domains[domain];
    if (!d) throw new Error(`[store] Dominio inválido: ${domain}`);
    d.version += 1;
    d.lastUpdated = isoNow();
    return d;
  }

  function setDesired(domain, key, value) {
    const d = db.data.domains[domain];
    if (!d) throw new Error(`[store] Dominio inválido: ${domain}`);
    if (domain === "presets") {
      d.desired[key] = value;
    } else {
      d.desired[key] = value;
    }
    bumpVersion(domain);
  }

  function setReported(domain, key, value) {
    const d = db.data.domains[domain];
    if (!d) throw new Error(`[store] Dominio inválido: ${domain}`);
    if (value == null) return d; // null/blip nunca pisa reported
    d.reported[key] = value;
    bumpVersion(domain);
  }

  /** Reemplaza reported completo de un dominio con un objeto de lecturas válidas. */
  function setReportedAll(domain, readings) {
    const d = db.data.domains[domain];
    if (!d) throw new Error(`[store] Dominio inválido: ${domain}`);
    const next = {};
    for (const [key, value] of Object.entries(readings)) {
      if (value != null) next[key] = value;
    }
    d.reported = next;
    bumpVersion(domain);
  }

  function getSnapshot() {
    return JSON.parse(JSON.stringify(db.data));
  }

  function getDomain(name) {
    return db.data.domains[name] || null;
  }

  function getSync() {
    return { ...db.data.sync };
  }

  function setSync(status, lastSync = isoNow()) {
    db.data.sync = { status, lastSync };
  }

  function getAppOnly() {
    return JSON.parse(JSON.stringify(db.data.appOnly));
  }

  function setAppOnly(area, key, value) {
    if (!db.data.appOnly[area]) db.data.appOnly[area] = {};
    db.data.appOnly[area][key] = value;
  }

  /**
   * Estado app legacy completo (POST/GET /api/state del cliente v1). Es
   * app-only: el server es dueño, sin arbitraje del Arranger. Se conserva en
   * appOnly.appState para que los endpoints legacy sigan funcionando durante
   * la coexistencia (PR 2) sin un segundo dueño de state.json.
   */
  function getAppState() {
    return db.data.appOnly.appState ?? null;
  }

  function setAppState(state) {
    db.data.appOnly.appState = state;
  }

  function getPreset(n) {
    return db.data.domains.presets.desired[`preset${n}`] || null;
  }

  function setPreset(n, preset) {
    db.data.domains.presets.desired[`preset${n}`] = migratePreset(preset);
    bumpVersion("presets");
  }

  async function write() {
    await db.write();
  }

  return {
    get data() { return db.data; },
    getSnapshot,
    getDomain,
    setDesired,
    setReported,
    setReportedAll,
    bumpVersion,
    write,
    getSync,
    setSync,
    getAppOnly,
    setAppOnly,
    getAppState,
    setAppState,
    getPreset,
    setPreset,
    migratePreset,
    detectLegacySchema,
    freshStartV3,
    SCHEMA_VERSION,
  };
}

module.exports = {
  createStore,
  defaultSchemaV3,
  migratePreset,
  migrateV2ToV3,
  freshStartV3,
  detectLegacySchema,
  SCHEMA_VERSION,
  PRESET_KEYS,
};
