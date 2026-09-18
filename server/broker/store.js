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
 *       channelIntent: { desired: {DTV1: {canalActual, lastSentAt, ack}}, reported: null, version, lastUpdated },
 *       matrixGroups: { desired: {subgroupKey: combo|DTVn|null}, reported: null,      version, lastUpdated },
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
 * channelIntent = intención de canal DTV por deco {canalActual, lastSentAt, ack} —
 *            app-only (CD-1): INTENCIÓN, nunca estado confirmado del deco (la API
 *            V210826 no permite leer el canal; `send ir` solo da ACK del
 *            controlador). reported queda en null SIEMPRE. ack ∈ "pending" |
 *            "accepted" | "rejected" (resultado de `send ir success`).
 * matrixGroups = intención de grupos de la matriz {subgroupKey: valor} — app-only
 *            (MG-1): valor ∈ combo "DTVxyz" | fuente única "DTVn" | null (mixto,
 *            MG-6). El server es dueño: lo setea el submit (POST /api/matrix-groups)
 *            y lo deriva de preset.tvs al cargar presets (MG-2). reported null
 *            SIEMPRE — el estado por pantalla real vive en domains.tvs.
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

/** Dominio app-only channelIntent: intención de canal por deco, reported null. */
function defaultChannelIntent(now = isoNow()) {
  return { desired: {}, reported: null, version: 1, lastUpdated: now };
}

/** Dominio app-only matrixGroups: intención de grupos por subgrupo, reported null. */
function defaultMatrixGroups(now = isoNow()) {
  return { desired: {}, reported: null, version: 1, lastUpdated: now };
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
      channelIntent: defaultChannelIntent(now),
      matrixGroups: defaultMatrixGroups(now),
    },
    appOnly: defaultAppOnly(),
    sync: { status: "stale", lastSync: null },
  };
}

/**
 * Backfill idempotente de un seed v3: agrega dominios faltantes (channelIntent,
 * matrixGroups) con sus defaults sin tocar lo existente. Los archivos v3
 * previos a WS3/WS4b cargan tal cual (T-3.1/T-4b.1): sin backup, sin rescan,
 * sin bump de versiones.
 *
 * Además, rellena las claves de zona faltantes en zonasFuera (desired +
 * appOnly): con v3 existente y 11 zonas canónicas, la zona nueva es visible
 * en el Aside sin esperar el scan del reconciler (vwall-libertador T7).
 */
function normalizeV3(seed, now = isoNow()) {
  if (!seed || typeof seed !== "object" || seed.schemaVersion !== SCHEMA_VERSION) return seed;
  if (!seed.domains || typeof seed.domains !== "object") return seed;
  if (!seed.domains.channelIntent) {
    seed.domains.channelIntent = defaultChannelIntent(now);
  }
  if (!seed.domains.matrixGroups) {
    seed.domains.matrixGroups = defaultMatrixGroups(now);
  }
  // Backfill de zonas fuera faltantes (idempotente: ??= no pisa lo existente).
  const zonas = seed.domains.zonasFuera;
  const desired = zonas && typeof zonas === "object" ? zonas.desired : undefined;
  if (desired && typeof desired === "object") {
    for (const zoneId of ZONA_FUERA_IDS) {
      desired[zoneId] ??= { video: DEFAULT_SOURCE, audio: DEFAULT_SOURCE };
    }
  }
  if (seed.appOnly && typeof seed.appOnly === "object" && seed.appOnly.zonasFuera && typeof seed.appOnly.zonasFuera === "object") {
    const appZonas = seed.appOnly.zonasFuera;
    for (const zoneId of ZONA_FUERA_IDS) {
      appZonas[zoneId] ??= { link: false };
    }
  }
  return seed;
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
      ? {
          video: preset.tvrack.video,
          audio: preset.tvrack.audio || preset.tvrack.video,
          ...(typeof preset.tvrack.link === "boolean" ? { link: preset.tvrack.link } : {}),
        }
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
    channelIntent: defaultChannelIntent(now),
    matrixGroups: defaultMatrixGroups(now),
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
    channelIntent: defaultChannelIntent(now),
    matrixGroups: defaultMatrixGroups(now),
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
      // channelIntent es app-only: conservar la intención si el archivo v3 la traía.
      if (legacy.domains.channelIntent) v3.domains.channelIntent = legacy.domains.channelIntent;
      // matrixGroups es app-only: conservar la intención si el archivo v3 la traía.
      if (legacy.domains.matrixGroups) v3.domains.matrixGroups = legacy.domains.matrixGroups;
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
  let dbPath = options.dbPath || path.join(__dirname, "..", "state.json");
  // Docker: /app/server/state.json es un symlink a /app/data/state.json
  // (filesystem read-only). lowdb escribe su .tmp y el backup JUNTO al
  // path recibido — resolver el symlink al target real para que ambas
  // escrituras caigan en el volumen, el rename atómico sea same-fs y el
  // symlink quede intacto.
  try {
    if (fs.lstatSync(dbPath).isSymbolicLink()) {
      dbPath = path.resolve(path.dirname(dbPath), fs.readlinkSync(dbPath));
    }
  } catch {
    /* el archivo puede no existir aún en primer arranque — usar tal cual */
  }
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

  // T-3.1: backfill idempotente — un archivo v3 anterior a WS3 recibe el
  // dominio channelIntent con defaults (sin backup, sin rescan, sin bump).
  seed = normalizeV3(seed);

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

  /**
   * Reemplaza reported de un dominio con un objeto de lecturas válidas.
   * Para valores objeto (zonasFuera: {video, audio}) hace MERGE por sub-stream:
   * una lectura parcial (ej. solo video; audio dio null/blip en el scan) NUNCA
   * borra sub-streams confirmados previamente — consistente con "null no pisa".
   * Si el resultado es idéntico al reported actual, NO bumpa versión (evita
   * inflar versiones en scans sin novedades).
   */
  function setReportedAll(domain, readings) {
    const d = db.data.domains[domain];
    if (!d) throw new Error(`[store] Dominio inválido: ${domain}`);
    const next = {};
    for (const [key, value] of Object.entries(readings)) {
      if (value == null) continue;
      if (typeof value === "object" && !Array.isArray(value)) {
        const prev = d.reported[key] && typeof d.reported[key] === "object" ? d.reported[key] : {};
        const merged = { ...prev };
        for (const [sub, subVal] of Object.entries(value)) {
          if (subVal != null) merged[sub] = subVal;
        }
        next[key] = merged;
      } else {
        next[key] = value;
      }
    }
    const prevJson = JSON.stringify(d.reported || {});
    const nextJson = JSON.stringify(next);
    if (nextJson === prevJson) return d; // sin cambios reales: no bump
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
   * Estado app-only completo. El server es dueño, sin arbitraje del Arranger,
   * y se conserva en appOnly.appState sin crear un segundo dueño de state.json.
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

  /** Dominio channelIntent completo (o null si el seed no lo tiene). */
  function getChannelIntent() {
    return db.data.domains.channelIntent || null;
  }

  /**
   * Setea/merga la entrada de intención de canal de un deco (patrón presets:
   * app-domain con reported null). `entry` se mergea sobre la entrada existente
   * — un ACK (T-3.3) solo pisa `ack`, conservando canalActual/lastSentAt.
   */
  function setChannelIntentEntry(decoId, entry) {
    const d = db.data.domains.channelIntent;
    if (!d) throw new Error("[store] Dominio inválido: channelIntent");
    if (!decoId || typeof decoId !== "string") throw new Error("[store] decoId requerido");
    const prev = d.desired[decoId] && typeof d.desired[decoId] === "object" ? d.desired[decoId] : {};
    d.desired[decoId] = { ...prev, ...entry };
    bumpVersion("channelIntent");
    return d.desired[decoId];
  }

  /** Dominio matrixGroups completo (o null si el seed no lo tiene). */
  function getMatrixGroups() {
    return db.data.domains.matrixGroups || null;
  }

  /**
   * Setea valores de intención de grupos (patrón app-domain, reported null).
   * MERGE shallow por clave de subgrupo: un submit parcial conserva las
   * entradas de los demás subgrupos; la derivación desde preset escribe las
   * 10 claves y así cubre todo el dominio. Los valores (combo | "DTVn" | null)
   * ya fueron validados contra `optionsFor(size)` por el server (MG-5) —
   * el store no conoce el modelo y no revalida.
   */
  function setMatrixGroups(values) {
    const d = db.data.domains.matrixGroups;
    if (!d) throw new Error("[store] Dominio inválido: matrixGroups");
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new Error("[store] setMatrixGroups: se espera un objeto {subgroupKey: valor}");
    }
    d.desired = { ...d.desired, ...values };
    bumpVersion("matrixGroups");
    return d.desired;
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
    getChannelIntent,
    setChannelIntentEntry,
    getMatrixGroups,
    setMatrixGroups,
    migratePreset,
    detectLegacySchema,
    freshStartV3,
    SCHEMA_VERSION,
  };
}

module.exports = {
  createStore,
  defaultSchemaV3,
  normalizeV3,
  migratePreset,
  migrateV2ToV3,
  freshStartV3,
  detectLegacySchema,
  SCHEMA_VERSION,
  PRESET_KEYS,
};
