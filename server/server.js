const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Leer configuración específica del worktree (gitignored)
let wtConfig = { vitePort: 5173, expressPort: 3101 };
try {
  wtConfig = JSON.parse(require("fs").readFileSync(path.join(__dirname, "..", "worktree.config.json"), "utf-8"));
} catch { /* usar defaults */ }

const app = express();
const PORT = process.env.PORT || wtConfig.expressPort || 3000;

const VITE_URL = `http://localhost:${wtConfig.vitePort}`;

const ARRANGER_HOST = process.env.ARRANGER_HOST || "192.168.2.254";
const ARRANGER_PORT = process.env.ARRANGER_PORT || "80";
const ARRANGER_BASE = `http://${ARRANGER_HOST}:${ARRANGER_PORT}`;

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
          VITE_URL,                             // Vite dev server
          `http://localhost:${PORT}`,           // Express self
          ARRANGER_BASE,                        // Arranger matrix
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", ARRANGER_BASE],
      },
    },
    crossOriginEmbedderPolicy: false,       // Allow Arranger iframe embeds
  }),
);

// ── CORS: restringido a orígenes conocidos (antes era *) ──
const allowedOrigins = [
  VITE_URL,                                   // Vite dev
  `http://localhost:${PORT}`,                 // Express self
  "http://localhost:3000",                    // Express v1 (legacy)
  `http://127.0.0.1:${wtConfig.vitePort}`,
  `http://127.0.0.1:${PORT}`,
  "http://127.0.0.1:3000",
  /^http:\/\/192\.168\.2\.\d{1,3}(:\d+)?$/,  // Red local Arranger
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

// ── Zonas Fuera: 10 dispositivos IPEX5002 externos ──
const ZONAS_FUERA_IDS = [
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

const DEFAULT_ZONA_FUERA = {
  video: "DTV1",
  audio: "DTV1",
  link: false,
  lastUpdated: null,
};

// Load lowdb and initialize state database
let stateDb;
(async () => {
  const { JSONFilePreset } = await import("lowdb/node");
  stateDb = await JSONFilePreset(path.join(__dirname, "state.json"), {
    state: null,
    tvrack: { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
    presets: { preset1: null, preset2: null, preset3: null, preset4: null, preset5: null },
    zonasFuera: {
      "aVip-Barra-Centro": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
      "aVip-Lobby-Batacazo": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
      "aVip-Bar-Boveda": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
      "RACK-VIP-PANTALLABATACA": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
      "aMas-15-Barra": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
      "a-Menos1-Escenario": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
      "a-Menos1-Escenario2": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
      "a-QMR75-Menos1-TV1": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
      "a-QMR75-Menos1-TV2": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
      "a-QMC65-Menos1-TV2": { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null },
    },
  });

  // Migration: ensure presets key exists (state.json from older versions may lack it)
  if (!stateDb.data.presets) {
    stateDb.data.presets = { preset1: null, preset2: null, preset3: null, preset4: null, preset5: null };
    await stateDb.write();
  }

  // Schema integrity: ensure required keys exist
  let repaired = false;
  if (!stateDb.data.presets) {
    stateDb.data.presets = { preset1: null, preset2: null, preset3: null, preset4: null, preset5: null };
    repaired = true;
  }
  if (!stateDb.data.tvrack) {
    stateDb.data.tvrack = { video: "DTV1", audio: "DTV1", link: false, lastUpdated: null };
    repaired = true;
  }
  if (!stateDb.data.zonasFuera) {
    stateDb.data.zonasFuera = {};
    repaired = true;
  }
  if (repaired) await stateDb.write();

  // ── Migration v2: extraer zonas fuera de state.tvs → zonasFuera ──
  await migrateZonasFueraV2();
})();

// ── Migration v2: zonas fuera ──
async function migrateZonasFueraV2() {
  const state = stateDb.data.state;
  if (!state || (state._version || 0) >= 2) return;

  const { writeFile } = await import("fs/promises");

  // 1. Backup antes de migrar
  const backupPath = path.join(__dirname, "state.backup.json");
  await writeFile(backupPath, JSON.stringify(stateDb.data, null, 2));
  console.log(`[Migration v2] Backup creado: ${backupPath}`);

  // 2. Asegurar que zonasFuera existe
  if (!stateDb.data.zonasFuera) {
    stateDb.data.zonasFuera = {};
  }

  // 3. Extraer de state.tvs
  const now = new Date().toISOString();
  for (const zoneId of ZONAS_FUERA_IDS) {
    if (state.tvs && zoneId in state.tvs) {
      const deviceId = state.tvs[zoneId];
      // Conservar valor legacy (string) o parsear si ya es objeto
      const video = typeof deviceId === "string" ? deviceId : deviceId.video || "DTV1";
      stateDb.data.zonasFuera[zoneId] = {
        video,
        audio: video,
        link: true,
        lastUpdated: now,
      };
      delete state.tvs[zoneId];
      console.log(`[Migration v2] Extraído ${zoneId} → ${video} de state.tvs`);
    } else if (!stateDb.data.zonasFuera[zoneId]) {
      stateDb.data.zonasFuera[zoneId] = { ...DEFAULT_ZONA_FUERA, lastUpdated: now };
    }
  }

  // 4. Migrar presets
  const presetKeys = ["preset1", "preset2", "preset3", "preset4", "preset5"];
  for (const pKey of presetKeys) {
    const preset = stateDb.data.presets?.[pKey];
    if (preset && preset.tvs) {
      if (!preset.zonasFueraState) {
        preset.zonasFueraState = {};
      }
      for (const zoneId of ZONAS_FUERA_IDS) {
        if (zoneId in preset.tvs) {
          const deviceId = preset.tvs[zoneId];
          const video = typeof deviceId === "string" ? deviceId : deviceId.video || "DTV1";
          preset.zonasFueraState[zoneId] = {
            video,
            audio: video,
            link: true,
            lastUpdated: now,
          };
          delete preset.tvs[zoneId];
          console.log(`[Migration v2] Extraído ${zoneId} → ${video} de preset.${pKey}.tvs`);
        }
      }
      preset._version = 2;
    }
  }

  state._version = 2;
  await stateDb.write();
  console.log("[Migration v2] Completa: zonas fuera extraídas, _version → 2");
}

// ── Rate limiter para /api/state ──
const stateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // 100 era insuficiente: solo el state polling hace 180/15min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
});

// GET /api/state — returns persisted state from server/state.json
app.get("/api/state", stateLimiter, (req, res) => {
  if (!stateDb) {
    return res.json({ state: null });
  }
  res.json({ state: stateDb.data.state });
});

// POST /api/state — persists state to server/state.json
app.post("/api/state", stateLimiter, async (req, res) => {
  if (!stateDb) {
    return res.status(503).json({ error: "Database not ready" });
  }
  const { state } = req.body;
  if (!state || typeof state !== "object") {
    return res.status(400).json({ error: "Missing or invalid state object" });
  }
  stateDb.data.state = state;
  await stateDb.write();
  res.json({ ok: true });
});

// ── Request logger ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ── TVRACK Shared State (persisted via lowdb) ──

app.get("/api/tvrack/state", (req, res) => {
  if (!stateDb) return res.json({ video: "DTV1", audio: "DTV1", link: false });
  res.json(stateDb.data.tvrack);
});

app.post("/api/tvrack/video", stateLimiter, async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });
  stateDb.data.tvrack.video = deviceId;
  if (stateDb.data.tvrack.link) stateDb.data.tvrack.audio = deviceId;
  stateDb.data.tvrack.lastUpdated = new Date().toISOString();
  await stateDb.write();
  res.json(stateDb.data.tvrack);
});

app.post("/api/tvrack/audio", stateLimiter, async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });
  stateDb.data.tvrack.audio = deviceId;
  if (stateDb.data.tvrack.link) stateDb.data.tvrack.video = deviceId;
  stateDb.data.tvrack.lastUpdated = new Date().toISOString();
  await stateDb.write();
  res.json(stateDb.data.tvrack);
});

app.post("/api/tvrack/link", stateLimiter, async (req, res) => {
  const { linked } = req.body;
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });
  stateDb.data.tvrack.link = !!linked;
  stateDb.data.tvrack.lastUpdated = new Date().toISOString();
  await stateDb.write();
  res.json(stateDb.data.tvrack);
});

// ── Zonas Fuera — 10 zonas externas con control independiente ──

// Validación: zoneId debe estar en ZONAS_FUERA_IDS
function validateZonaFueraId(req, res, next) {
  const { id } = req.params;
  if (!ZONAS_FUERA_IDS.includes(id)) {
    return res.status(400).json({ error: `Invalid zone ID: ${id}. Must be one of ZONAS_FUERA_IDS.` });
  }
  next();
}

app.get("/api/zonas-fuera/state", (req, res) => {
  if (!stateDb) return res.json({});
  res.json(stateDb.data.zonasFuera || {});
});

app.post("/api/zonas-fuera/:id/video", stateLimiter, validateZonaFueraId, async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });

  const { id } = req.params;
  stateDb.data.zonasFuera[id].video = deviceId;
  if (stateDb.data.zonasFuera[id].link) {
    stateDb.data.zonasFuera[id].audio = deviceId;
  }
  stateDb.data.zonasFuera[id].lastUpdated = new Date().toISOString();
  await stateDb.write();
  res.json({ zoneId: id, ...stateDb.data.zonasFuera[id] });
});

app.post("/api/zonas-fuera/:id/audio", stateLimiter, validateZonaFueraId, async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });

  const { id } = req.params;
  stateDb.data.zonasFuera[id].audio = deviceId;
  if (stateDb.data.zonasFuera[id].link) {
    stateDb.data.zonasFuera[id].video = deviceId;
  }
  stateDb.data.zonasFuera[id].lastUpdated = new Date().toISOString();
  await stateDb.write();
  res.json({ zoneId: id, ...stateDb.data.zonasFuera[id] });
});

app.post("/api/zonas-fuera/:id/link", stateLimiter, validateZonaFueraId, async (req, res) => {
  const { linked } = req.body;
  if (typeof linked === "undefined") return res.status(400).json({ error: "linked required (boolean)" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });

  const { id } = req.params;
  stateDb.data.zonasFuera[id].link = !!linked;
  stateDb.data.zonasFuera[id].lastUpdated = new Date().toISOString();
  await stateDb.write();
  res.json({ zoneId: id, ...stateDb.data.zonasFuera[id] });
});

// ── Presets Compartidos ──

app.get("/api/presets/:n", (req, res) => {
  const n = parseInt(req.params.n, 10);
  if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
  if (!stateDb) return res.json({ preset: null });
  res.json({ preset: stateDb.data.presets[`preset${n}`] });
});

app.post("/api/presets/:n", stateLimiter, async (req, res) => {
  const n = parseInt(req.params.n, 10);
  if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });
  stateDb.data.presets[`preset${n}`] = req.body;
  await stateDb.write();
  res.json({ ok: true });
});

app.delete("/api/presets/:n", stateLimiter, async (req, res) => {
  const n = parseInt(req.params.n, 10);
  if (n < 1 || n > 5) return res.status(400).json({ error: "Invalid preset number" });
  if (!stateDb) return res.status(503).json({ error: "Database not ready" });
  stateDb.data.presets[`preset${n}`] = null;
  await stateDb.write();
  res.json({ ok: true });
});

// Middleware para servir archivos estáticos desde dist (build de producción)
app.use(express.static(path.join(__dirname, "../dist")));

// ── Retry helper con exponential backoff ──
async function fetchWithRetry(url, retries = 3, baseDelayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      // No reintentar en respuestas 4xx (error del cliente)
      if (!response.ok && response.status >= 400 && response.status < 500) {
        return response;
      }
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`[ArrangerProxy] Intento ${attempt}/${retries} falló, reintentando en ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Proxy endpoint: relay get status a Arranger (server-to-server, sin CORS)
// En dev, Vite redirige /api/device/ a este servidor Express.
app.get("/api/device/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const token = process.env.ARRANGER_TOKEN || "TOKEN_REMOVED";
    const url = `${ARRANGER_BASE}/api/command/get status ${id}/${token}`;
    const response = await fetchWithRetry(url);
    const text = await response.text();

    // Parsear la respuesta del Arranger para extraer streams activos
    const streams = {
      video: text.includes("VIDEO"),
      audio: text.includes("AUDIO"),
      ir: text.includes("IR"),
      serial: text.includes("SERIAL"),
      usb: text.includes("USB"),
    };

    res.json({ deviceId: id, streams, online: response.ok });
  } catch (error) {
    res.json({
      deviceId: req.params.id,
      streams: {},
      online: false,
      error: error.message,
    });
  }
});

// ── Proxy genérico para todos los comandos del Arranger ──
// GET /api/command/:command/:token → forwardea al Arranger y devuelve la respuesta.
// Express es el único que necesita acceso de red al Arranger (192.168.2.254).
// El navegador nunca más llama al Arranger directamente.
app.get("/api/command/:command/:token", async (req, res) => {
  try {
    const { command, token } = req.params;
    const url = `${ARRANGER_BASE}/api/command/${encodeURIComponent(command)}/${token}`;
    const response = await fetchWithRetry(url);
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (error) {
    res.status(502).json({
      error: "Arranger unreachable",
      detail: error.message,
    });
  }
});

// Ruta para servir la aplicación React (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error("Error en el servidor:", err.stack);
  res.status(500).send("¡Algo salió mal en el servidor SportBar!");
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("🏆 SERVIDOR SPORTBAR INICIADO");
  console.log("=".repeat(50));
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📂 Sirviendo archivos desde: dist/`);
  console.log(`⚡ Modo: ${process.env.NODE_ENV || "development"}`);
  console.log("=".repeat(50));
  console.log("Sistema de control matriz audiovisual listo");
  console.log("Funcionalidades disponibles:");
  console.log("  ✓ Control de TVs y decodificadores");
  console.log("  ✓ Gestión de canales deportivos");
  console.log("  ✓ Control de audio por zonas");
  console.log("  ✓ Sistema de presets");
  console.log("=".repeat(50));
});

// Manejo graceful del cierre del servidor
process.on("SIGTERM", () => {
  console.log("📴 Cerrando servidor SportBar...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n📴 Cerrando servidor SportBar...");
  process.exit(0);
});

module.exports = app;
