const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { createStore } = require("./broker/store.js");
const { createArrangerClient } = require("./broker/arrangerClient.js");
const { createEventBus } = require("./broker/eventBus.js");
const { createWriteQueue } = require("./broker/writeQueue.js");
const { createReconciler } = require("./broker/reconciler.js");
const {
  ZONA_FUERA_IDS,
  TVRACK_ID,
  toApp,
  toArranger,
  isDestination,
} = require("./broker/destinations.js");

// Leer configuración específica del worktree (gitignored)
let wtConfig = { vitePort: 5173, expressPort: 3101 };
try {
  wtConfig = JSON.parse(require("fs").readFileSync(path.join(__dirname, "..", "worktree.config.json"), "utf-8"));
} catch { /* usar defaults */ }

const PORT = process.env.PORT || wtConfig.expressPort || 3000;
const VITE_URL = `http://localhost:${wtConfig.vitePort}`;

const ARRANGER_HOST = process.env.ARRANGER_HOST || "192.168.2.254";
const ARRANGER_PORT = process.env.ARRANGER_PORT || "80";
const ARRANGER_BASE = `http://${ARRANGER_HOST}:${ARRANGER_PORT}`;

// ── Token único consolidado (gap 2 del spec) ──
// Antes divergían: línea 20 usaba VITE_ARRANGER_TOKEN y la 460 usaba
// ARRANGER_TOKEN || "TOKEN_REMOVED". Ahora UN solo token, fail-fast al arranque.
const ARRANGER_TOKEN = process.env.VITE_ARRANGER_TOKEN || process.env.ARRANGER_TOKEN;

// Intervalo de reconciliación (env var, default 300000 ms = 5 min, post-design)
const RECONCILER_INTERVAL_MS = parseInt(process.env.RECONCILER_INTERVAL_MS || "", 10) || 300000;

// ── Rate limiters rediseñados (spec state-broker) ──
// El presupuesto refleja el patrón nuevo: SSE (conexiones largas, no cuentan
// por evento) y polling versionado contra el broker. `/api/stream` y el proxy
// `/api/command` NO llevan limiter.
const readsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // GETs de polling/respaldo del broker
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
});
const writesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 240, // la serialización del writeQueue acota el tráfico real
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
});

function makeLog(silent) {
  if (silent) return { info: () => {}, warn: () => {}, error: () => {} };
  return {
    info: (m) => console.log(m),
    warn: (m) => console.warn(m),
    error: (m) => console.error(m),
  };
}

/**
 * Composition root del State Broker.
 *
 * Crea el broker completo (client → store v3 → eventBus → writeQueue →
 * reconciler), monta los endpoints del broker y conserva únicamente las
 * escrituras legacy que siguen siendo usadas por IR/serial y controles
 * write-through. El store unificado es el único dueño de state.json. NO
 * escucha: devuelve { app, broker } para que el caller decida (main) o para
 * verificación sin levantar server visible (verify).
 *
 * options: { dbPath, backupPath, token, mock, mockMode, silent,
 *            reconcilerIntervalMs }
 */
async function createServer(options = {}) {
  const log = makeLog(options.silent);
  const token = options.token || ARRANGER_TOKEN;
  if (!token) {
    throw new Error(
      "[broker] FALTA el token del Arranger (fail-fast). Configurá VITE_ARRANGER_TOKEN o ARRANGER_TOKEN " +
        "(env del sistema). El server no arranca sin token.",
    );
  }

  // ── 1. Broker: client → store (migración v3 / fresh-start) → bus → cola → reconciler ──
  const client = createArrangerClient({ token, mock: options.mock, mockMode: options.mockMode, log });
  const store = await createStore({
    dbPath: options.dbPath,
    backupPath: options.backupPath,
    readEncoder: (dest, sub) => client.getEncoder(dest, sub),
    log,
  });
  const bus = createEventBus({ getSnapshot: () => store.getSnapshot(), log });
  const writeQueue = createWriteQueue({ log });
  const reconciler = createReconciler({
    client,
    store,
    bus,
    log,
    intervalMs: options.reconcilerIntervalMs || RECONCILER_INTERVAL_MS,
  });

  // Arranque background + stale: servimos el persistido marcado stale y el
  // reconciler escanea el Arranger en background (spec: UI usable <1s).
  store.setSync("stale", null);
  await store.write();
  reconciler.start();

  const app = express();

  // ── Security: Helmet (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.) ──
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: [
            "'self'",
            VITE_URL,
            `http://localhost:${PORT}`,
            ARRANGER_BASE,
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          frameSrc: ["'self'", ARRANGER_BASE],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── CORS: restringido a orígenes conocidos ──
  const allowedOrigins = [
    VITE_URL,
    `http://localhost:${PORT}`,
    "http://localhost:3000",
    `http://127.0.0.1:${wtConfig.vitePort}`,
    `http://127.0.0.1:${PORT}`,
    "http://127.0.0.1:3000",
    /^http:\/\/192\.168\.2\.\d{1,3}(:\d+)?$/,
  ];
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && allowedOrigins.some((o) => (typeof o === "string" ? o === origin : o.test(origin)))) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // ── Body parser con límite de tamaño ──
  app.use(express.json({ limit: "1mb" }));

  // ── Request logger ──
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      log.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
    });
    next();
  });

  // ══════════════════════════════════════════════════════════════════════
  // HELPERS DEL BROKER
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Flujo de escritura confirmada (spec state-broker):
   * desired → join (según domain/sub/link) → get encoder → reported → persistir.
   * Debe ejecutarse DENTRO de writeQueue.enqueue(dest, ...) para serializar
   * por destino. Devuelve { ok, dest, source, sub, reported, error? }.
   */
  async function executeWrite(dest, source, sub = "video") {
    const domain = dest === TVRACK_ID ? "tvrack" : ZONA_FUERA_IDS.includes(dest) ? "zonasFuera" : "tvs";
    const key = domain === "tvs" ? toApp(dest) : dest;
    const d = store.getDomain(domain);
    // Leer link aquí, dentro de la tarea encolada: nunca capturar una versión
    // obsoleta antes de que la cola FIFO procese la escritura.
    const appOnly = store.getAppOnly();
    const link =
      domain === "tvrack"
        ? !!appOnly.tvrack?.link
        : domain === "zonasFuera"
          ? !!appOnly.zonasFuera?.[dest]?.link
          : false;
    const linked = domain !== "tvs" && link;

    // 1. Intención del operador
    if (domain === "tvs") {
      store.setDesired(domain, key, source);
    } else if (linked && domain === "tvrack") {
      store.setDesired(domain, "video", source);
      store.setDesired(domain, "audio", source);
    } else if (domain === "tvrack") {
      store.setDesired(domain, sub, source);
    } else if (linked) {
      d.desired[key] = { ...(d.desired[key] || {}), video: source, audio: source };
      store.bumpVersion(domain);
    } else {
      d.desired[key] = { ...(d.desired[key] || {}), [sub]: source };
      store.bumpVersion(domain);
    }

    // 2. Comando al Arranger
    const joinResult =
      domain === "tvs" || linked
        ? await client.joinAv(source, dest)
        : sub === "audio"
          ? await client.joinAudio(source, dest)
          : await client.joinVideo(source, dest);
    if (!joinResult.ok) {
      await store.write();
      return { ok: false, dest, source, sub, error: joinResult.error || "join falló" };
    }

    // 3. Lectura post-comando (confirmación)
    const reported = linked
      ? {
          video: await client.getEncoder(dest, "video"),
          audio: await client.getEncoder(dest, "audio"),
        }
      : await client.getEncoder(dest, sub);

    // 4. reported ← solo lecturas confirmadas válidas (null nunca pisa)
    if (linked) {
      if (domain === "tvrack") {
        if (reported.video != null) store.setReported(domain, "video", reported.video);
        if (reported.audio != null) store.setReported(domain, "audio", reported.audio);
      } else {
        if (reported.video != null || reported.audio != null) {
          d.reported[key] = {
            ...(d.reported[key] || {}),
            ...(reported.video != null ? { video: reported.video } : {}),
            ...(reported.audio != null ? { audio: reported.audio } : {}),
          };
          store.bumpVersion(domain);
        }
      }
    } else if (reported != null) {
      if (domain === "tvs") {
        store.setReported(domain, key, reported);
      } else if (domain === "tvrack") {
        store.setReported(domain, sub, reported);
      } else {
        d.reported[key] = { ...(d.reported[key] || {}), [sub]: reported };
        store.bumpVersion(domain);
      }
    }

    await store.write();
    return { ok: true, dest, source, sub, link, reported };
  }

  function validateLinkedSnapshot(snapshot) {
    const errors = [];
    const tvrack = snapshot && typeof snapshot.tvrack === "object" ? snapshot.tvrack : null;
    if (tvrack?.link === true && tvrack.video !== tvrack.audio) {
      errors.push("tvrack.link=true requiere video y audio iguales");
    }
    const zones = snapshot && typeof snapshot.zonasFuera === "object" ? snapshot.zonasFuera : {};
    for (const [zoneId, zone] of Object.entries(zones)) {
      if (zone?.link === true && zone.video !== zone.audio) {
        errors.push(`zonasFuera.${zoneId}.link=true requiere video y audio iguales`);
      }
    }
    return errors.length > 0 ? `Snapshot inconsistente: ${errors.join("; ")}` : null;
  }

  function applySnapshotLinks(snapshot) {
    if (snapshot?.tvrack && typeof snapshot.tvrack === "object") {
      // Los snapshots anteriores no persistían tvrack.link: se interpretan
      // como independientes para no dejar que un toggle previo colapse audio.
      store.setAppOnly("tvrack", "link", snapshot.tvrack.link === true);
    }
    for (const [zoneId, zone] of Object.entries(snapshot?.zonasFuera || {})) {
      if (ZONA_FUERA_IDS.includes(zoneId) && zone && typeof zone === "object") {
        store.setAppOnly("zonasFuera", zoneId, { link: zone.link === true });
      }
    }
  }

  /** Broadcast del estado de un dominio (payload = reported para matriz). */
  function broadcastDomain(domain) {
    const d = store.getDomain(domain);
    if (!d) return;
    const payload = domain === "presets" ? d.desired : d.reported || {};
    bus.publish(domain, payload, d.version, d.lastUpdated);
  }

  /** Snapshot broker (GET /api/broker/state y evento SSE `snapshot`). */
  function buildBrokerSnapshot(storeRef) {
    const snap = storeRef.getSnapshot();
    return {
      schemaVersion: snap.schemaVersion,
      sync: snap.sync,
      versions: {
        tvs: snap.domains.tvs.version,
        tvrack: snap.domains.tvrack.version,
        zonasFuera: snap.domains.zonasFuera.version,
        presets: snap.domains.presets.version,
      },
      domains: snap.domains,
      appOnly: snap.appOnly,
    };
  }

  /** Parsea ?since=tvs:12,zonasFuera:3 (respaldo versionado). */
  function parseSince(raw) {
    const out = {};
    if (!raw || typeof raw !== "string") return out;
    for (const part of raw.split(",")) {
      const [k, v] = part.split(":");
      if (k && v) out[k] = parseInt(v, 10);
    }
    return out;
  }

  /** Respuesta del mock para comandos arbitrarios (dev/verify sin hardware). */
  async function mockCommandResult(command) {
    const cmd = String(command || "");
    const joinMatch = cmd.match(/^join av\s+(\S+)\s+(\S+)/i);
    if (joinMatch) {
      try {
        const r = await client.joinAv(joinMatch[1], joinMatch[2]);
        return r.ok ? r.text : `error: ${r.error}`;
      } catch (e) {
        return `error: ${e.message}`;
      }
    }
    const getMatch = cmd.match(/^get encoder\s+(\S+)(?:\s+(\S+))?/i);
    if (getMatch) {
      const v = await client.getEncoder(getMatch[1], getMatch[2] || "video");
      return v ? `get encoder success ${getMatch[1]} ${v}` : "no encoder connected";
    }
    return `mock: comando no simulado (${command})`;
  }

  // ══════════════════════════════════════════════════════════════════════
  // ENDPOINTS NUEVOS DEL BROKER
  // ══════════════════════════════════════════════════════════════════════

  // SSE: sin limiter (las conexiones largas no cuentan por evento; máx 10 en eventBus)
  app.get("/api/stream", (req, res) => {
    bus.handleConnection(req, res);
  });

  // Respaldo versionado: ?since=tvs:12,zonasFuera:3 → solo dominios cambiados
  app.get("/api/broker/state", readsLimiter, (req, res) => {
    const snap = store.getSnapshot();
    const since = parseSince(req.query.since);
    const body = {
      schemaVersion: snap.schemaVersion,
      sync: snap.sync,
      versions: {},
      domains: {},
      appOnly: snap.appOnly,
    };
    for (const name of ["tvs", "tvrack", "zonasFuera", "presets"]) {
      const d = snap.domains[name];
      body.versions[name] = d.version;
      if (!since[name] || d.version > since[name]) {
        body.domains[name] = d;
      }
    }
    res.json(body);
  });

  // Merge parcial del estado app-only (cliente broker PR 3)
  app.post("/api/app-state", writesLimiter, async (req, res) => {
    const patch = req.body;
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      return res.status(400).json({ error: "Se espera un objeto con el estado app-only" });
    }
    const prev = store.getAppState() && typeof store.getAppState() === "object" ? store.getAppState() : {};
    store.setAppState({ ...prev, ...patch });
    await store.write();
    res.json({ ok: true, appState: store.getAppState() });
  });

  // Escritura de matriz confirmada (spec: desired → join → get encoder → reported → broadcast)
  app.post("/api/tvs/:id/source", writesLimiter, async (req, res) => {
    const { id } = req.params;
    const { source, deviceId } = req.body || {};
    const src = source || deviceId;
    const dest = toArranger(id);
    if (!isDestination(dest)) {
      return res.status(400).json({ error: `Destino inválido: ${id}` });
    }
    if (!src || typeof src !== "string") {
      return res.status(400).json({ error: "source requerido" });
    }

    const result = await writeQueue.enqueue(dest, () => executeWrite(dest, src, "video"));
    if (!result.ok) {
      return res.status(502).json({ ok: false, id, source: src, error: result.error });
    }
    broadcastDomain("tvs");
    const d = store.getDomain("tvs");
    res.json({
      ok: true,
      id,
      source: src,
      dest,
      reported: result.reported,
      version: d.version,
      lastUpdated: d.lastUpdated,
      sync: store.getSync(),
    });
  });

  // Load de preset server-side (sin BATCH de 29 requests cliente): restaura
  // los 3 dominios vía writeQueue, batches de 4 destinos a la vez.
  app.post("/api/presets/:n/load", writesLimiter, async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
    const preset = store.getPreset(n);
    if (!preset) {
      return res.status(404).json({ error: `Preset ${n} vacío` });
    }
    const validationError = validateLinkedSnapshot(preset);
    if (validationError) return res.status(400).json({ error: validationError });

    // El snapshot puede transportar el link app-only. Se persiste antes de
    // encolar, mientras executeWrite vuelve a leerlo dentro de cada tarea.
    applySnapshotLinks(preset);
    await store.write();

    const writes = [];
    for (const [tvKey, source] of Object.entries(preset.tvs || {})) {
      const dest = toArranger(tvKey);
      if (!isDestination(dest) || !source) continue;
      writes.push(() => writeQueue.enqueue(dest, () => executeWrite(dest, source, "video")));
    }
    for (const [zoneId, zone] of Object.entries(preset.zonasFuera || {})) {
      if (!isDestination(zoneId) || !zone) continue;
      if (zone.video) writes.push(() => writeQueue.enqueue(zoneId, () => executeWrite(zoneId, zone.video, "video")));
      if (zone.audio && zone.audio !== zone.video) {
        writes.push(() => writeQueue.enqueue(zoneId, () => executeWrite(zoneId, zone.audio, "audio")));
      }
    }
    const tvrack = preset.tvrack || {};
    if (tvrack.video) writes.push(() => writeQueue.enqueue(TVRACK_ID, () => executeWrite(TVRACK_ID, tvrack.video, "video")));
    if (tvrack.audio && tvrack.audio !== tvrack.video) {
      writes.push(() => writeQueue.enqueue(TVRACK_ID, () => executeWrite(TVRACK_ID, tvrack.audio, "audio")));
    }

    const results = [];
    let failed = 0;
    for (let i = 0; i < writes.length; i += 4) {
      const batchResults = await Promise.allSettled(writes.slice(i, i + 4).map((fn) => fn()));
      for (const r of batchResults) {
        const value = r.status === "fulfilled" ? r.value : { ok: false, error: r.reason && r.reason.message };
        results.push(value);
        if (r.status !== "fulfilled" || !value.ok) failed += 1;
      }
    }

    for (const domain of ["tvs", "tvrack", "zonasFuera"]) broadcastDomain(domain);
    res.json({ ok: failed === 0, applied: results.length - failed, failed, results });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ESCRITURAS LEGACY VIVAS — write-through confirmado
  // ══════════════════════════════════════════════════════════════════════

  // Write-through confirmado (spec: responde el estado confirmado, no fire-and-forget)
  async function tvrackWrite(req, res, sub) {
    const { deviceId, source } = req.body || {};
    const src = source || deviceId;
    if (!src) return res.status(400).json({ error: "deviceId required" });
    const result = await writeQueue.enqueue(TVRACK_ID, () => executeWrite(TVRACK_ID, src, sub));
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    const link = !!store.getAppOnly().tvrack?.link;
    broadcastDomain("tvrack");
    const d = store.getDomain("tvrack");
    res.json({
      video: d.desired.video,
      audio: d.desired.audio,
      link,
      lastUpdated: d.lastUpdated,
    });
  }

  app.post("/api/tvrack/video", writesLimiter, (req, res) => tvrackWrite(req, res, "video"));
  app.post("/api/tvrack/audio", writesLimiter, (req, res) => tvrackWrite(req, res, "audio"));

  app.post("/api/tvrack/link", writesLimiter, async (req, res) => {
    const { linked } = req.body;
    if (!store) return res.status(503).json({ error: "Database not ready" });
    store.setAppOnly("tvrack", "link", !!linked);
    await store.write();
    broadcastDomain("tvrack");
    const d = store.getDomain("tvrack");
    res.json({
      video: d.desired.video,
      audio: d.desired.audio,
      link: !!linked,
      lastUpdated: d.lastUpdated,
    });
  });

  // ── Zonas Fuera — 10 zonas externas ──
  function validateZonaFueraId(req, res, next) {
    const { id } = req.params;
    if (!ZONA_FUERA_IDS.includes(id)) {
      return res.status(400).json({ error: `Invalid zone ID: ${id}. Must be one of ZONAS_FUERA_IDS.` });
    }
    next();
  }

  async function zonaFueraWrite(req, res, sub) {
    const { id } = req.params;
    const { deviceId, source } = req.body || {};
    const src = source || deviceId;
    if (!src) return res.status(400).json({ error: "deviceId required" });
    const result = await writeQueue.enqueue(id, () => executeWrite(id, src, sub));
    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    const link = !!store.getAppOnly().zonasFuera?.[id]?.link;
    broadcastDomain("zonasFuera");
    const d = store.getDomain("zonasFuera");
    res.json({ zoneId: id, ...d.desired[id], link, lastUpdated: d.lastUpdated });
  }

  app.post("/api/zonas-fuera/:id/video", writesLimiter, validateZonaFueraId, (req, res) => zonaFueraWrite(req, res, "video"));
  app.post("/api/zonas-fuera/:id/audio", writesLimiter, validateZonaFueraId, (req, res) => zonaFueraWrite(req, res, "audio"));

  app.post("/api/zonas-fuera/:id/link", writesLimiter, validateZonaFueraId, async (req, res) => {
    const { linked } = req.body;
    if (typeof linked === "undefined") return res.status(400).json({ error: "linked required (boolean)" });
    const { id } = req.params;
    store.setAppOnly("zonasFuera", id, { link: !!linked });
    await store.write();
    broadcastDomain("zonasFuera");
    const d = store.getDomain("zonasFuera");
    res.json({ zoneId: id, ...d.desired[id], link: !!linked, lastUpdated: d.lastUpdated });
  });

  // ── Presets Compartidos ──
  app.get("/api/presets/:n", (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
    res.json({ preset: store.getPreset(n) });
  });

  app.post("/api/presets/:n", writesLimiter, async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
    const validationError = validateLinkedSnapshot(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    store.setPreset(n, req.body);
    await store.write();
    broadcastDomain("presets");
    res.json({ ok: true });
  });

  app.delete("/api/presets/:n", writesLimiter, async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
    store.setPreset(n, null);
    await store.write();
    broadcastDomain("presets");
    res.json({ ok: true });
  });

  // Middleware para servir archivos estáticos desde dist (build de producción)
  app.use(express.static(path.join(__dirname, "../dist")));

  // ── Retry helper con exponential backoff (proxy Arranger) ──
  async function fetchWithRetry(url, retries = 3, baseDelayMs = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok && response.status >= 400 && response.status < 500) {
          return response;
        }
        return response;
      } catch (error) {
        if (attempt === retries) throw error;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        log.info(`[ArrangerProxy] Intento ${attempt}/${retries} falló, reintentando en ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // ── Proxy genérico de comandos del Arranger (único camino, spec) ──
  app.get("/api/command/:command/:token", async (req, res) => {
    try {
      const { command } = req.params;
      if (client.isMock) {
        return res.status(200).send(await mockCommandResult(command));
      }
      const url = `${ARRANGER_BASE}/api/command/${encodeURIComponent(command)}/${encodeURIComponent(req.params.token)}`;
      const response = await fetchWithRetry(url);
      const text = await response.text();
      res.status(response.status).send(text);
    } catch (error) {
      res.status(502).json({ error: "Arranger unreachable", detail: error.message });
    }
  });

  // Ruta para servir la aplicación React (SPA)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist", "index.html"));
  });

  // Manejo de errores
  app.use((err, req, res, next) => {
    log.error(`Error en el servidor: ${err.stack}`);
    res.status(500).send("¡Algo salió mal en el servidor SportBar!");
  });

  return { app, broker: { client, store, bus, writeQueue, reconciler } };
}

// ── Arranque: solo cuando se ejecuta directamente (el verify lo requiere sin listen) ──
if (require.main === module) {
  createServer()
    .then(({ app, broker }) => {
      app.listen(PORT, () => {
        console.log("=".repeat(50));
        console.log("🏆 SERVIDOR SPORTBAR INICIADO");
        console.log("=".repeat(50));
        console.log(`📡 Puerto: ${PORT}`);
        console.log(`🌐 URL: http://localhost:${PORT}`);
        console.log(`📂 Sirviendo archivos desde: dist/`);
        console.log(`⚡ Modo: ${process.env.NODE_ENV || "development"}`);
        console.log(`🔄 Broker: mock=${broker.client.isMock} · reconciler ${broker.reconciler.intervalMs}ms`);
        console.log("=".repeat(50));
        console.log("Sistema de control matriz audiovisual listo");
        console.log("Funcionalidades disponibles:");
        console.log("  ✓ Control de TVs y decodificadores");
        console.log("  ✓ Gestión de canales deportivos");
        console.log("  ✓ Control de audio por zonas");
        console.log("  ✓ Sistema de presets");
        console.log("  ✓ State Broker (SSE /api/stream, writeQueue, reconciler)");
        console.log("=".repeat(50));
      });
    })
    .catch((err) => {
      console.error("FALLO AL ARRANCAR EL SERVIDOR:", err.message);
      process.exit(1);
    });
}

// Manejo graceful del cierre del servidor
process.on("SIGTERM", () => {
  console.log("📴 Cerrando servidor SportBar...");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("\n📴 Cerrando servidor SportBar...");
  process.exit(0);
});

module.exports = { createServer };
