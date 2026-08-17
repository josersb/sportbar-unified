/**
 * brokerClientCore.js — Lógica pura del cliente broker (sin DOM).
 *
 * Extraída de useBrokerState.js para ser verificable con node (task 3.11):
 * parser SSE incremental, reducers de snapshot/deltas, polling versionado,
 * backoff y derivación del estado de UI desde el snapshot del broker.
 *
 * Contrato del broker (server PR 2):
 *   GET  /api/broker/state?since=tvs:12,...  → { schemaVersion, sync, versions, domains, appOnly }
 *   GET  /api/stream                         → SSE: `snapshot` | `state` {domain,payload,version,lastUpdated} | `sync` {status,lastSync} | heartbeat 25s
 */

export const SYNC_STATES = ["synced", "stale", "out_of_sync", "offline"];

export const DOMAIN_KEYS = ["tvs", "tvrack", "zonasFuera", "presets"];

/**
 * Parser SSE incremental, puro (sin EventSource): permite ver comentarios
 * (`: heartbeat`) que el EventSource nativo oculta y alimenta el watchdog de
 * degradación del design.
 *
 * @param {object} handlers - { onEvent(name, data), onHeartbeat(comment), onRetry(ms) }
 * @returns {{ push(chunk: string): void, close(): void }}
 */
export function createSseParser({ onEvent, onHeartbeat, onRetry } = {}) {
  let buffer = "";
  let eventName = null;
  let dataLines = [];

  function dispatch() {
    if (dataLines.length === 0) {
      eventName = null;
      return;
    }
    const data = dataLines.join("\n");
    const name = eventName || "message";
    dataLines = [];
    eventName = null;
    if (typeof onEvent === "function") onEvent(name, data);
  }

  return {
    push(chunk) {
      if (!chunk) return;
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
        if (line === "") {
          dispatch();
          continue;
        }
        // Comentario SSE (heartbeat): `: heartbeat 12345`
        if (line.startsWith(":")) {
          if (typeof onHeartbeat === "function") onHeartbeat(line.slice(1).trim());
          continue;
        }
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") eventName = value;
        else if (field === "data") dataLines.push(value);
        else if (field === "retry" && typeof onRetry === "function") onRetry(parseInt(value, 10) || 0);
        // id / otros campos: ignorados (sin replay, snapshot en cada connect)
      }
    },
    close() {
      if (dataLines.length > 0) dispatch();
    },
  };
}

/**
 * Query `since` para el polling de respaldo versionado.
 * @param {object} versions - { tvs: 12, zonasFuera: 3, ... }
 * @returns {string} "tvs:12,zonasFuera:3" (vacío si no hay versiones)
 */
export function buildSinceQuery(versions = {}) {
  const parts = [];
  for (const [domain, v] of Object.entries(versions)) {
    if (typeof v === "number" && v > 0) parts.push(`${domain}:${v}`);
  }
  return parts.join(",");
}

/**
 * Aplica un snapshot completo (evento SSE `snapshot` o respuesta de poll).
 * Reemplaza los dominios; los deltas posteriores se mergean sobre esto.
 * Si el snapshot no trae `versions` top-level (el evento SSE del store raw no
 * la construye), las deriva de los dominios.
 */
export function applySnapshot(prev, snapshot) {
  if (!snapshot || typeof snapshot !== "object") return prev;
  const versions = snapshot.versions || deriveVersions(snapshot.domains) || {};
  return {
    ...prev,
    schemaVersion: snapshot.schemaVersion ?? prev.schemaVersion,
    sync: snapshot.sync || prev.sync,
    versions,
    domains: snapshot.domains || prev.domains || {},
    appOnly: snapshot.appOnly || prev.appOnly || {},
  };
}

/**
 * Deriva `versions` (tvs/tvrack/zonasFuera/presets) desde los dominios.
 * El GET /api/broker/state incluye `versions`; el evento SSE `snapshot`
 * (store raw) no — el cliente la construye para el polling versionado.
 */
export function deriveVersions(domains) {
  if (!domains || typeof domains !== "object") return null;
  const versions = {};
  for (const [domain, d] of Object.entries(domains)) {
    if (d && typeof d.version === "number") versions[domain] = d.version;
  }
  return Object.keys(versions).length > 0 ? versions : null;
}

/**
 * Aplica un evento incremental `state` {domain, payload, version, lastUpdated}.
 * El payload del broker es `reported` para dominios de matriz y `desired` para
 * presets — reemplaza esa key del dominio (el snapshot ya trajo el resto).
 */
export function applyStateEvent(prev, evt) {
  if (!evt || !evt.domain || !DOMAIN_KEYS.includes(evt.domain)) return prev;
  const domain = evt.domain;
  const cur = prev.domains?.[domain] || { desired: {}, reported: {}, version: 0, lastUpdated: null };
  const key = domain === "presets" ? "desired" : "reported";
  const payload = evt.payload && typeof evt.payload === "object" ? evt.payload : {};
  const nextAppOnly = { ...(prev.appOnly || {}) };
  let cleanPayload = payload;

  // Link is app-only, but travels in the incremental domain payload so a
  // toggle is reflected immediately without waiting for a snapshot/poll.
  if (domain === "tvrack" && Object.prototype.hasOwnProperty.call(payload, "link")) {
    const { link, ...reported } = payload;
    cleanPayload = reported;
    nextAppOnly.tvrack = { ...(nextAppOnly.tvrack || {}), link: !!link };
  } else if (domain === "zonasFuera") {
    const zonasFuera = { ...(nextAppOnly.zonasFuera || {}) };
    cleanPayload = {};
    for (const [zoneId, zonePayload] of Object.entries(payload)) {
      if (zonePayload && typeof zonePayload === "object" && Object.prototype.hasOwnProperty.call(zonePayload, "link")) {
        const { link, ...reported } = zonePayload;
        cleanPayload[zoneId] = reported;
        zonasFuera[zoneId] = { ...(zonasFuera[zoneId] || {}), link: !!link };
      } else {
        cleanPayload[zoneId] = zonePayload;
      }
    }
    nextAppOnly.zonasFuera = zonasFuera;
  }

  return {
    ...prev,
    domains: {
      ...prev.domains,
      [domain]: { ...cur, [key]: cleanPayload, version: evt.version, lastUpdated: evt.lastUpdated },
    },
    appOnly: nextAppOnly,
  };
}

/**
 * Aplica un evento `sync` {status, lastSync}.
 */
export function applySync(prev, sync) {
  if (!sync || !SYNC_STATES.includes(sync.status)) return prev;
  return { ...prev, sync: { status: sync.status, lastSync: sync.lastSync ?? prev.sync?.lastSync ?? null } };
}

/**
 * Merge de una respuesta de poll versionado: solo trae dominios con version
 * mayor que `since`, más sync/versions/appOnly frescos.
 */
export function applyPollBody(prev, body) {
  if (!body || typeof body !== "object") return prev;
  const next = applySnapshot(prev, body);
  if (body.domains) {
    next.domains = { ...prev.domains, ...body.domains };
  }
  return next;
}

/**
 * Delay de reintento para polling/SSE con backoff exponencial (design: 5s→30s).
 * @param {number} attempt - intento fallido consecutivo (0 = primero)
 * @param {number} [baseMs]
 * @param {number} [maxMs]
 */
export function nextPollDelay(attempt = 0, baseMs = 5000, maxMs = 30000) {
  const delay = baseMs * Math.pow(2, Math.max(attempt, 0)); // 5, 10, 20, 40...
  return Math.min(delay, maxMs); // cap 30s
}

/**
 * Deriva el estado de UI (tvs / tvrackState / zonasFueraState) desde el
 * snapshot del broker. Para matriz la UI muestra `reported` (confirmado por
 * el hardware) con fallback a `desired` (intención) cuando no hay lectura.
 * Links (app-only) viven en appOnly y nunca se arbitran.
 *
 * @returns {{ tvs: object, tvrackState: {video, audio, link}, zonasFueraState: object }}
 */
export function deriveUiState(snapshot) {
  const domains = snapshot?.domains || {};
  const appOnly = snapshot?.appOnly || {};

  // tvs: reported gana sobre desired (reportado es lo confirmado)
  const tvsDomain = domains.tvs || {};
  const tvs = { ...(tvsDomain.desired || {}) };
  Object.assign(tvs, tvsDomain.reported || {});

  // tvrack
  const tvr = domains.tvrack || {};
  const tvrackState = {
    video: tvr.reported?.video ?? tvr.desired?.video ?? "DTV1",
    audio: tvr.reported?.audio ?? tvr.desired?.audio ?? "DTV1",
    link: !!(appOnly.tvrack && appOnly.tvrack.link),
  };

  // zonasFuera
  const zf = domains.zonasFuera || {};
  const zfReported = zf.reported || {};
  const zonasFueraState = {};
  for (const [zoneId, desired] of Object.entries(zf.desired || {})) {
    const rep = zfReported[zoneId] || {};
    zonasFueraState[zoneId] = {
      video: rep.video ?? desired.video ?? "DTV1",
      audio: rep.audio ?? desired.audio ?? "DTV1",
      link: !!(appOnly.zonasFuera && appOnly.zonasFuera[zoneId] && appOnly.zonasFuera[zoneId].link),
    };
  }

  return { tvs, tvrackState, zonasFueraState };
}

/**
 * Diferencias informativas reported≠desired (spec arranger-reconciliation:
 * SyncPanel las muestra SIN acciones Apply/Ignore). Solo destinos con reported
 * confirmado (null/blip no cuenta como diff).
 *
 * @returns {Array<{dest: string, type: string, desired: string, reported: string}>}
 */
export function buildDiffsInfo(snapshot) {
  const diffs = [];
  const domains = snapshot?.domains || {};

  const tvs = domains.tvs || {};
  for (const [dest, desired] of Object.entries(tvs.desired || {})) {
    const reported = tvs.reported?.[dest];
    if (reported != null && reported !== desired) {
      diffs.push({ dest, type: "tv", desired, reported });
    }
  }

  const tvr = domains.tvrack || {};
  for (const sub of ["video", "audio"]) {
    const desired = tvr.desired?.[sub];
    const reported = tvr.reported?.[sub];
    if (reported != null && desired != null && reported !== desired) {
      diffs.push({ dest: "TVRACK", type: `tvrack-${sub}`, desired, reported });
    }
  }

  const zf = domains.zonasFuera || {};
  for (const [zoneId, zone] of Object.entries(zf.desired || {})) {
    for (const sub of ["video", "audio"]) {
      const desired = zone?.[sub];
      const reported = zf.reported?.[zoneId]?.[sub];
      if (reported != null && desired != null && reported !== desired) {
        diffs.push({ dest: zoneId, type: `zona-${sub}`, desired, reported });
      }
    }
  }

  return diffs;
}

// ── Grupos de TVs de MatrizVideo (collapse de TVs individuales) ──

export const GROUP_DEFS = {
  TvsBarraLivertador: ["TV01", "TV02", "TV03"],
  TvsBarraSur: ["TV04", "TV05", "TV06", "TV07"],
  TvsBarraPista: ["TV08", "TV09", "TV10"],
  TvsBarraNorte: ["TV11", "TV12", "TV13", "TV14"],
  TvsEscaleraSur: ["TV15", "TV16", "TV17", "TV18"],
  TvsEscaleraCentro: ["TV19", "TV20", "TV21", "TV22"],
  TvsEscaleraNorte: ["TV23", "TV24", "TV25", "TV26"],
};

/** Patrones de grupo → secuencia de TVs (inverso de los switch de MatrizVideo). */
export const GROUP_PATTERNS = {
  DTV123: ["DTV1", "DTV2", "DTV3"],
  DTV121: ["DTV1", "DTV2", "DTV1"],
  DTV542: ["DTV5", "DTV4", "DTV2"],
  DTV143: ["DTV1", "DTV4", "DTV3"],
  DTV153: ["DTV1", "DTV5", "DTV3"],
  DTV1234: ["DTV1", "DTV2", "DTV3", "DTV4"],
  DTV1212: ["DTV1", "DTV2", "DTV1", "DTV2"],
  DTV1231: ["DTV1", "DTV2", "DTV3", "DTV1"],
  DTV5432: ["DTV5", "DTV4", "DTV3", "DTV2"],
  DTV3254: ["DTV3", "DTV2", "DTV5", "DTV4"],
  DTV1354: ["DTV1", "DTV3", "DTV5", "DTV4"],
};

/**
 * Colapsa TVs individuales a su valor de grupo para el form de MatrizVideo
 * (inverso de la expansión del submit). Sin claves legacy en el estado: los
 * grupos se derivan del estado broker.
 *
 * @param {object} tvs - tvs individuales del broker (TV01..TV26, VWN..)
 * @param {string[]} ids - TVs del grupo (GROUP_DEFS)
 * @returns {string|undefined} patrón (DTV1234), valor único, o undefined si faltan TVs
 */
export function collapseGroup(tvs, ids) {
  if (!tvs || !Array.isArray(ids) || ids.length === 0) return undefined;
  const values = ids.map((id) => tvs[id]);
  if (values.some((v) => v == null)) return undefined;

  for (const [pattern, seq] of Object.entries(GROUP_PATTERNS)) {
    if (seq.length === ids.length && seq.every((v, i) => v === values[i])) return pattern;
  }
  // Todos iguales → valor único
  if (values.every((v) => v === values[0])) return values[0];
  // Mixto no-predeterminado → primer valor (el form lo expandirá igual)
  return values[0];
}
