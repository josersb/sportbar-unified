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
 *
 * ── Hotfix 3 instrumentación ──────────────────────────────────────────────
 * Logger opcional activado por `import.meta.env.DEV` (default en dev) o por
 * `localStorage.sportbarLog === "1"` (toggle manual sin rebuild). Expone un
 * ring buffer en `window.__brokerLog` (últimos 50 eventos SSE y operaciones
 * optimistic) para inspección desde DevTools console sin scroll.
 */

export const SYNC_STATES = ["synced", "stale", "out_of_sync", "offline"];

export const DOMAIN_KEYS = ["tvs", "tvrack", "zonasFuera", "presets"];

/** Ring buffer de los últimos N eventos SSE + operaciones optimistic. */
const LOG_BUFFER_SIZE = 50;
const logBuffer = { events: [], optimistic: [] };

function isLoggingEnabled() {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage && window.localStorage.getItem("sportbarLog") === "1") return true;
  } catch {
    // localStorage puede tirar en modo privado o SSR
  }
  // Vite expone import.meta.env.DEV; en runtime está en window.__vite_dev
  // o derivable de la URL. Default ON en dev para que el bug sea visible
  // apenas el developer abre DevTools console.
  try {
    if (typeof __DEV__ !== "undefined" && __DEV__) return true;
  } catch {
    /* noop */
  }
  // Heurística final: si el bundle tiene el flag de Vite lo respeta.
  // (El bundle de prod lo trae en false.)
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production") return true;
  return false;
}

/** Empuja una entrada al ring buffer y lo expone en window para inspección. */
function pushLog(buffer, entry) {
  buffer.push({ ts: Date.now(), ...entry });
  if (buffer.length > LOG_BUFFER_SIZE) buffer.shift();
  if (typeof window !== "undefined") {
    window.__brokerLog = window.__brokerLog || { lastEvents: [], lastOptimistic: [] };
    if (buffer === logBuffer.events) {
      window.__brokerLog.lastEvents = buffer.slice();
    } else {
      window.__brokerLog.lastOptimistic = buffer.slice();
    }
  }
}

function clientLog(...args) {
  // eslint-disable-next-line no-console
  if (isLoggingEnabled()) console.debug("[BROKER-CLIENT]", ...args);
}

/** Helper exportado para módulos que quieran loggear con la misma política. */
export function isBrokerLoggingEnabled() {
  return isLoggingEnabled();
}

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
 *
 * El snapshot ES la verdad del server: descarta el overlay optimista (los
 * deltas/polls posteriores vuelven a limpiarlo por dominio).
 */
export function applySnapshot(prev, snapshot) {
  if (!snapshot || typeof snapshot !== "object") return prev;
  const versions = snapshot.versions || deriveVersions(snapshot.domains) || {};
  // Hotfix 3 observability: log del snapshot entrante (llega del SSE connect
  // inicial o de un poll versionado). Resumen del payload por dominio.
  if (isLoggingEnabled()) {
    const domainSummary = {};
    for (const [d, v] of Object.entries(snapshot.domains || {})) {
      const repKeys = v && v.reported ? Object.keys(v.reported).length : 0;
      domainSummary[d] = `v${v?.version ?? "?"} (${repKeys} keys)`;
    }
    pushLog(logBuffer.events, { kind: "snapshot", versions, domains: domainSummary });
    clientLog("snapshot", domainSummary);
  }
  return {
    ...prev,
    schemaVersion: snapshot.schemaVersion ?? prev.schemaVersion,
    sync: snapshot.sync || prev.sync,
    versions,
    domains: snapshot.domains || prev.domains || {},
    appOnly: snapshot.appOnly || prev.appOnly || {},
    optimistic: {},
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
 * presets — se hace MERGE por clave sobre el estado existente (nunca replace):
 * un evento parcial (ej. {video} en tvrack, {Z1} en zonasFuera) no pisa las
 * claves que no trae (fix real-hardware B: el link toggle no revierte).
 *
 * El link es app-only pero viaja en el payload incremental: se extrae a
 * appOnly (tvrack / por zona) y SIEMPRE se limpia del overlay optimista
 * (estado autoritativo del server, sin lag de hardware). El resto de las
 * claves del payload solo se limpia del overlay cuando su valor COINCIDE
 * con el optimistic (confirmación real del write). Si difiere, el evento
 * trae un valor stale (one-join-lag del firmware / broadcast previo al
 * confirm del propio write) y la clave optimista se RETIENE hasta que la
 * confirmación llegue; snapshot/poll posteriores descartan el overlay si
 * el write fracasó (hotfix 4: evita la oscilación por toggle de link).
 */
export function applyStateEvent(prev, evt) {
  if (!evt || !evt.domain || !DOMAIN_KEYS.includes(evt.domain)) return prev;
  const domain = evt.domain;
  const cur = prev.domains?.[domain] || { desired: {}, reported: {}, version: 0, lastUpdated: null };
  const key = domain === "presets" ? "desired" : "reported";
  const payload = evt.payload && typeof evt.payload === "object" ? evt.payload : {};
  const nextAppOnly = { ...(prev.appOnly || {}) };
  const optimistic = { ...(prev.optimistic || {}) };
  const domainOpt = { ...(optimistic[domain] || {}) };

  // Hotfix 3 observability: log de cada evento SSE `state` recibido.
  // Comparamos cada clave del payload contra el optimistic actual: si coincide
  // es confirmación (se limpia del overlay); si difiere es retención (el server
  // trae un valor stale o parcial distinto al optimistic local).
  if (isLoggingEnabled()) {
    const eventLog = {
      kind: "state",
      domain,
      version: evt.version,
      payloadKeys: Object.keys(payload),
      optimisticBefore: domainOpt,
    };
    pushLog(logBuffer.events, eventLog);
    const payloadPreview = Object.keys(payload).length > 15 ? `(${Object.keys(payload).length} keys)` : JSON.stringify(payload);
    clientLog(`evento ${domain} v${evt.version}`, payloadPreview);
  }

  // Link app-only: se extrae a appOnly y se limpia del overlay optimista.
  let cleanPayload = {};
  if (domain === "tvrack" && Object.prototype.hasOwnProperty.call(payload, "link")) {
    const { link, ...reported } = payload;
    cleanPayload = reported;
    nextAppOnly.tvrack = { ...(nextAppOnly.tvrack || {}), link: !!link };
    delete domainOpt.link;
  } else if (domain === "zonasFuera") {
    const zonasFuera = { ...(nextAppOnly.zonasFuera || {}) };
    for (const [zoneId, zonePayload] of Object.entries(payload)) {
      if (zonePayload && typeof zonePayload === "object") {
        const { link, ...reported } = zonePayload;
        cleanPayload[zoneId] = reported;
        if (Object.prototype.hasOwnProperty.call(zonePayload, "link")) {
          zonasFuera[zoneId] = { ...(zonasFuera[zoneId] || {}), link: !!link };
          // link es app-only y autoritativo del server (sin lag de
          // hardware): siempre se limpia del overlay optimista de la zona.
          if (domainOpt[zoneId] && typeof domainOpt[zoneId] === "object") {
            const zoneOpt = { ...domainOpt[zoneId] };
            delete zoneOpt.link;
            if (Object.keys(zoneOpt).length > 0) domainOpt[zoneId] = zoneOpt;
            else delete domainOpt[zoneId];
          }
        }
      } else {
        cleanPayload[zoneId] = zonePayload;
      }
    }
    nextAppOnly.zonasFuera = zonasFuera;
  } else {
    cleanPayload = payload;
  }

  // Merge por clave (nunca reemplaza el estado completo del dominio)
  const prevState = cur[key] && typeof cur[key] === "object" ? cur[key] : {};
  let mergedPayload;
  if (domain === "zonasFuera") {
    mergedPayload = { ...prevState };
    for (const [zoneId, zonePayload] of Object.entries(cleanPayload)) {
      if (zonePayload && typeof zonePayload === "object") {
        mergedPayload[zoneId] = { ...(mergedPayload[zoneId] || {}), ...zonePayload };
        // Solo la clave CONFIRMADA se limpia del overlay (valor del evento
        // == valor optimistic). Si difiere, el evento trae un valor stale y
        // la clave optimista se RETIENE (hotfix 4). Conserva las no tocadas.
        const zoneOpt = { ...(domainOpt[zoneId] || {}) };
        for (const k of Object.keys(zonePayload)) {
          if (
            !Object.prototype.hasOwnProperty.call(zoneOpt, k) ||
            zoneOpt[k] === zonePayload[k]
          ) {
            delete zoneOpt[k];
          }
        }
        if (Object.keys(zoneOpt).length > 0) domainOpt[zoneId] = zoneOpt;
        else delete domainOpt[zoneId];
      } else {
        mergedPayload[zoneId] = zonePayload;
        delete domainOpt[zoneId];
      }
    }
  } else {
    mergedPayload = { ...prevState, ...cleanPayload };
    // Solo la clave CONFIRMADA se limpia del overlay (valor del evento ==
    // valor optimistic). Si difiere, el evento trae un valor stale (lag del
    // firmware o broadcast previo al confirm) y la clave optimista se
    // RETIENE hasta la confirmación real (hotfix 4: sin oscilación).
    for (const k of Object.keys(cleanPayload)) {
      if (
        !Object.prototype.hasOwnProperty.call(domainOpt, k) ||
        domainOpt[k] === cleanPayload[k]
      ) {
        delete domainOpt[k];
      }
    }
  }

  if (Object.keys(domainOpt).length > 0) optimistic[domain] = domainOpt;
  else delete optimistic[domain];

  // Hotfix 3 observability: log de limpieza/retención del overlay optimista.
  // Comparamos cada clave del evento contra el optimistic ANTES del merge
  // (prev.optimistic?.[domain]). Si la clave del payload coincide con el
  // optimistic, se limpia. Si difiere, se RETIENE — exactamente donde
  // sospechamos el bug de oscilación.
  if (isLoggingEnabled()) {
    const optBefore = prev.optimistic?.[domain];
    if (optBefore && (domain === "tvs" || domain === "tvrack" || domain === "zonasFuera")) {
      const compareKeys = (optValue, payloadValue, k) => {
        if (optValue === payloadValue) return { action: "limpiar", k, opt: optValue, evt: payloadValue };
        if (optValue != null && payloadValue != null && optValue !== payloadValue) {
          return { action: "RETENER", k, opt: optValue, evt: payloadValue };
        }
        return null;
      };
      const comparisons = [];
      if (domain === "zonasFuera") {
        for (const [zoneId, zoneOpt] of Object.entries(optBefore)) {
          const evtZone = cleanPayload?.[zoneId];
          if (evtZone && typeof evtZone === "object") {
            for (const [k, v] of Object.entries(zoneOpt)) {
              const c = compareKeys(v, evtZone[k], `${zoneId}.${k}`);
              if (c) comparisons.push(c);
            }
          }
        }
      } else {
        for (const [k, v] of Object.entries(optBefore)) {
          const c = compareKeys(v, cleanPayload?.[k], k);
          if (c) comparisons.push(c);
        }
      }
      for (const c of comparisons) {
        if (c.action === "limpiar") {
          clientLog(`OPTIMISTIC limpiar ${domain}.${c.k} (confirmado por v${evt.version})`);
        } else {
          // Hotfix 4: la retención ahora es REAL — la clave queda en el
          // overlay hasta que la confirmación llegue (antes el log decía
          // RETENER pero el código borraba la clave igual: oscilación).
          clientLog(`OPTIMISTIC RETENER ${domain}.${c.k} (evento trae "${c.evt}" ≠ optimistic "${c.opt}", retención activa hasta confirmación)`);
        }
      }
      pushLog(logBuffer.optimistic, { domain, version: evt.version, comparisons });
    }
  }

  return {
    ...prev,
    domains: {
      ...prev.domains,
      [domain]: { ...cur, [key]: mergedPayload, version: evt.version, lastUpdated: evt.lastUpdated },
    },
    appOnly: nextAppOnly,
    optimistic,
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
 * Aplica un overlay optimista al snapshot local (SOLO cliente; no viaja al
 * server ni a otros clientes). Se usa al disparar un write (fix real-hardware
 * A: feedback visual INMEDIATO sin esperar el POST ni el SSE). El evento SSE
 * del broker (confirmación real) o un snapshot/poll posterior lo confirman y
 * limpian (applyStateEvent/applyPollBody/applySnapshot).
 *
 * Parches soportados:
 *   - tvs:        { TV01: "DTV3" }
 *   - tvrack:     { video: "DTV3" } | { audio: "DTV3" } | { link: true }
 *   - zonasFuera: { aVip-Barra-Centro: { video: "DTV3", link: true } }
 *
 * MERGE por clave (hotfix 4): el patch se mergea sobre el overlay existente
 * del dominio, NUNCA lo reemplaza — togglear link convive con el video
 * optimista pendiente (evidencia #908). Un patch vacío ({}) no modifica el
 * overlay. El overlay solo se descarta por confirmación (applyStateEvent,
 * clave por clave), snapshot o poll.
 */
export function applyOptimistic(prev, domain, patch) {
  if (!domain || !DOMAIN_KEYS.includes(domain)) return prev;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return prev;
  const optimistic = { ...(prev.optimistic || {}) };
  if (domain === "zonasFuera") {
    const zoneOpt = { ...(optimistic.zonasFuera || {}) };
    for (const [zoneId, zonePatch] of Object.entries(patch)) {
      if (zonePatch && typeof zonePatch === "object" && !Array.isArray(zonePatch)) {
        zoneOpt[zoneId] = { ...(zoneOpt[zoneId] || {}), ...zonePatch };
      }
    }
    if (Object.keys(zoneOpt).length > 0) optimistic.zonasFuera = zoneOpt;
    else delete optimistic.zonasFuera;
  } else {
    const domainOpt = { ...(optimistic[domain] || {}), ...patch };
    if (Object.keys(domainOpt).length > 0) optimistic[domain] = domainOpt;
    else delete optimistic[domain];
  }
  // Hotfix 3 observability + hotfix 4 auditoría: distinguir apply nuevo vs
  // MERGE sobre claves ya presentes en el overlay del dominio (evidencia
  // #908: el toggle de link debe convivir con el video pendiente del mismo
  // dominio, nunca reemplazarlo). El caso "merge" queda auditado en el ring
  // buffer para la próxima verificación contra hardware real.
  if (isLoggingEnabled()) {
    const prevDomain = prev.optimistic?.[domain] || {};
    const mergedKeys = [];
    if (domain === "zonasFuera") {
      for (const [zoneId, zonePatch] of Object.entries(patch)) {
        if (zonePatch && typeof zonePatch === "object" && !Array.isArray(zonePatch)) {
          for (const k of Object.keys(zonePatch)) {
            if (prevDomain[zoneId] && Object.prototype.hasOwnProperty.call(prevDomain[zoneId], k)) {
              mergedKeys.push(`${zoneId}.${k}`);
            }
          }
        }
      }
    } else {
      for (const k of Object.keys(patch)) {
        if (Object.prototype.hasOwnProperty.call(prevDomain, k)) mergedKeys.push(k);
      }
    }
    const overlay = optimistic[domain] || {};
    const overlayKeys = domain === "zonasFuera"
      ? Object.keys(optimistic.zonasFuera || {}).reduce((acc, z) => acc + Object.keys(optimistic.zonasFuera[z] || {}).length, 0)
      : Object.keys(overlay).length;
    pushLog(logBuffer.optimistic, {
      kind: mergedKeys.length > 0 ? "merge" : "apply",
      domain,
      patch,
      overlayKeys,
      mergedKeys,
    });
    if (mergedKeys.length > 0) {
      clientLog(`OPTIMISTIC merge ${domain}: claves actualizadas sobre overlay existente (${mergedKeys.join(", ")}) (overlay: ${overlayKeys} claves)`);
    } else {
      clientLog(`OPTIMISTIC aplicar ${domain}=${JSON.stringify(patch)} (overlay: ${overlayKeys} claves)`);
    }
  }
  return { ...prev, optimistic };
}

/**
 * Revierte un patch aplicado por applyOptimistic — rollback del optimistic
 * update cuando el POST del write responde error (429/5xx/network, hotfix 5:
 * evidencia #908, 168 respuestas 429 con la UI mostrando cambios que nunca
 * ocurrieron). Restaura las claves del patch a su valor PREVIO en el overlay
 * (`prevOverlay`, capturado por el handler justo antes del applyOptimistic):
 * las claves que no estaban se eliminan del overlay; las que tenían otro
 * valor (otro write pendiente a la misma clave) se restauran a ese valor.
 * Las claves ajenas al patch NO se tocan — otros writes pendientes del mismo
 * dominio sobreviven (mismo merge-por-clave de applyOptimistic).
 *
 * La UI vuelve al valor reported/desired del snapshot local (el write fue
 * rechazado ANTES de procesarse: el server nunca cambió su store, así que el
 * snapshot local sigue siendo la verdad).
 */
export function revertOptimistic(prev, domain, patch, prevOverlay) {
  if (!domain || !DOMAIN_KEYS.includes(domain)) return prev;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return prev;
  const before = prevOverlay && typeof prevOverlay === "object" ? prevOverlay : {};
  const optimistic = { ...(prev.optimistic || {}) };
  if (domain === "zonasFuera") {
    const zoneOpt = { ...(optimistic.zonasFuera || {}) };
    for (const [zoneId, zonePatch] of Object.entries(patch)) {
      if (!zonePatch || typeof zonePatch !== "object" || Array.isArray(zonePatch)) continue;
      const restored = { ...(zoneOpt[zoneId] || {}) };
      const beforeZone = before[zoneId] && typeof before[zoneId] === "object" ? before[zoneId] : {};
      for (const k of Object.keys(zonePatch)) {
        if (Object.prototype.hasOwnProperty.call(beforeZone, k)) restored[k] = beforeZone[k];
        else delete restored[k];
      }
      if (Object.keys(restored).length > 0) zoneOpt[zoneId] = restored;
      else delete zoneOpt[zoneId];
    }
    if (Object.keys(zoneOpt).length > 0) optimistic.zonasFuera = zoneOpt;
    else delete optimistic.zonasFuera;
  } else {
    const domainOpt = { ...(optimistic[domain] || {}) };
    for (const k of Object.keys(patch)) {
      if (Object.prototype.hasOwnProperty.call(before, k)) domainOpt[k] = before[k];
      else delete domainOpt[k];
    }
    if (Object.keys(domainOpt).length > 0) optimistic[domain] = domainOpt;
    else delete optimistic[domain];
  }
  // Auditoría (mismo ring buffer que applyOptimistic).
  if (isLoggingEnabled()) {
    pushLog(logBuffer.optimistic, { kind: "revert", domain, patch });
    clientLog(`OPTIMISTIC revert ${domain}=${JSON.stringify(patch)} (write falló: rollback al overlay previo)`);
  }
  return { ...prev, optimistic };
}

/**
 * Mensaje de error para toasts de escritura fallida (hotfix 5): distingue
 * rate limit (429, formato estándar de express-rate-limit), error del server
 * (5xx) y network/otros. El handler detecta el 429 por `err.status === 429`
 * (las funciones de arrangerApi lo exponen).
 *
 * @param {Error} err - error del POST (con .status cuando el server respondió)
 * @param {string} [action] - etiqueta de la acción ("video DTV3 → TVRACK")
 * @returns {string} mensaje para el operador
 */
export function writeErrorMessage(err, action = "") {
  const label = action ? ` ${action}` : "";
  if (err && err.status === 429) {
    return `Error al enviar${label}: la orden no fue procesada (rate limit). Reintentá en unos segundos.`;
  }
  if (err && typeof err.status === "number" && err.status >= 500) {
    return `Error al enviar${label}: el servidor no pudo procesar la orden (${err.status}).`;
  }
  return `Error al enviar${label}: la orden no fue procesada.`;
}

/**
 * Merge de una respuesta de poll versionado: solo trae dominios con version
 * mayor que `since`, más sync/versions/appOnly frescos. El poll trae la verdad
 * del server: descarta el overlay optimista de los dominios presentes (los no
 * presentes conservan el suyo).
 */
export function applyPollBody(prev, body) {
  if (!body || typeof body !== "object") return prev;
  const next = applySnapshot(prev, body);
  if (body.domains) {
    next.domains = { ...prev.domains, ...body.domains };
    const optimistic = { ...(prev.optimistic || {}) };
    for (const domain of Object.keys(body.domains)) delete optimistic[domain];
    next.optimistic = optimistic;
    // Hotfix 3 observability: poll trae la verdad del server → descarta
    // overlay de los dominios presentes.
    if (isLoggingEnabled()) {
      const cleared = Object.keys(body.domains).filter((d) => prev.optimistic?.[d]);
      if (cleared.length > 0) {
        clientLog(`OPTIMISTIC limpiar (poll) ${cleared.join(", ")}`);
        pushLog(logBuffer.optimistic, { kind: "poll-clear", domains: cleared });
      }
    }
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
 * El overlay optimista (`snapshot.optimistic`, fix real-hardware A) gana
 * sobre reported: da feedback inmediato tras un write hasta que el evento SSE
 * del broker confirma/corrige (y lo limpia).
 *
 * @returns {{ tvs: object, tvrackState: {video, audio, link}, zonasFueraState: object }}
 */
export function deriveUiState(snapshot) {
  const domains = snapshot?.domains || {};
  const appOnly = snapshot?.appOnly || {};
  const optimistic = snapshot?.optimistic || {};

  // tvs: reported gana sobre desired; overlay optimista gana sobre ambos
  const tvsDomain = domains.tvs || {};
  const tvs = { ...(tvsDomain.desired || {}) };
  Object.assign(tvs, tvsDomain.reported || {});
  Object.assign(tvs, optimistic.tvs || {});

  // tvrack
  const tvr = domains.tvrack || {};
  const optTvrack = optimistic.tvrack || {};
  const tvrackState = {
    video: optTvrack.video ?? tvr.reported?.video ?? tvr.desired?.video ?? "DTV1",
    audio: optTvrack.audio ?? tvr.reported?.audio ?? tvr.desired?.audio ?? "DTV1",
    link: optTvrack.link ?? !!(appOnly.tvrack && appOnly.tvrack.link),
  };

  // zonasFuera
  const zf = domains.zonasFuera || {};
  const zfReported = zf.reported || {};
  const optZonas = optimistic.zonasFuera || {};
  const zonasFueraState = {};
  for (const [zoneId, desired] of Object.entries(zf.desired || {})) {
    const rep = zfReported[zoneId] || {};
    const opt = optZonas[zoneId] || {};
    zonasFueraState[zoneId] = {
      video: opt.video ?? rep.video ?? desired.video ?? "DTV1",
      audio: opt.audio ?? rep.audio ?? desired.audio ?? "DTV1",
      link: opt.link ?? !!(appOnly.zonasFuera && appOnly.zonasFuera[zoneId] && appOnly.zonasFuera[zoneId].link),
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
