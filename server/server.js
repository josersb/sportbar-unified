const express = require("express");
const http = require("http");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { WebSocketServer } = require("ws");
const { getAhmBridge } = require("./ahm-bridge");

const app = express();
const PORT = process.env.PORT || 3000;

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
          "http://localhost:5174",          // Vite dev (AHM worktree)
          "http://localhost:5173",          // Vite dev server
          "http://localhost:3102",          // Express self (AHM)
          "http://localhost:3101",          // Express self (v2)
          "http://192.168.2.254",           // Arranger matrix
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", "http://192.168.2.254"],
      },
    },
    crossOriginEmbedderPolicy: false,       // Allow Arranger iframe embeds
  }),
);

// ── CORS: restringido a orígenes conocidos (antes era *) ──
const allowedOrigins = [
  "http://localhost:5174",                  // Vite dev (AHM worktree)
  "http://localhost:5173",                  // Vite dev
  "http://localhost:3102",                  // Express AHM
  "http://localhost:3101",                  // Express v2
  "http://localhost:3000",                  // Express v1 (legacy)
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3102",
  "http://127.0.0.1:3101",
  "http://127.0.0.1:3000",
  /^http:\/\/192\.168\.2\.\d{1,3}(:\d+)?$/, // Red local Arranger
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

// Load lowdb and initialize state database
let stateDb;
(async () => {
  const { JSONFilePreset } = await import("lowdb/node");
  stateDb = await JSONFilePreset(path.join(__dirname, "state.json"), {
    state: null,
  });
})();

// ── Rate limiter para /api/state ──
const stateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
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

// ── TVRACK Shared State ──
const tvrackState = {
  video: "DTV1",
  audio: "DTV1",
  link: false,
  lastUpdated: null,
};

app.get("/api/tvrack/state", (req, res) => {
  res.json(tvrackState);
});

app.post("/api/tvrack/video", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  tvrackState.video = deviceId;
  if (tvrackState.link) tvrackState.audio = deviceId;
  tvrackState.lastUpdated = new Date().toISOString();
  res.json(tvrackState);
});

app.post("/api/tvrack/audio", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  tvrackState.audio = deviceId;
  if (tvrackState.link) tvrackState.video = deviceId;
  tvrackState.lastUpdated = new Date().toISOString();
  res.json(tvrackState);
});

app.post("/api/tvrack/link", (req, res) => {
  const { linked } = req.body;
  tvrackState.link = !!linked;
  tvrackState.lastUpdated = new Date().toISOString();
  res.json(tvrackState);
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
    const url = `http://192.168.2.254/api/command/get status ${id}/${token}`;
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
    const url = `http://192.168.2.254/api/command/${encodeURIComponent(command)}/${token}`;
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

// ── WebSocket Server (AHM-32 bridge) ────────────────────────────────────────
const wss = new WebSocketServer({ noServer: true });

const ahmBridge = getAhmBridge();

// Broadcast helper: send JSON to all connected WS clients
function broadcast(wssInstance, data) {
  const message = JSON.stringify(data);
  wssInstance.clients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
    }
  });
}

// AhmBridge events → broadcast to WS clients
ahmBridge.on("state", (zones) => {
  broadcast(wss, { type: "state", zones });
});

ahmBridge.on("connected", () => {
  console.log("[AhmBridge] Connected event — broadcasting");
  broadcast(wss, { type: "connection", status: "connected" });
});

ahmBridge.on("disconnected", () => {
  console.log("[AhmBridge] Disconnected event — broadcasting");
  broadcast(wss, { type: "connection", status: "disconnected" });
});

ahmBridge.on("error", (err) => {
  console.error("[AhmBridge] Error event:", err.message);
  broadcast(wss, { type: "error", message: err.message });
});

// ── Upgrade HTTP → WS ──────────────────────────────────────────────────────
const server = http.createServer(app);

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/ws/ahm") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");

  // Send current snapshot
  ws.send(JSON.stringify({ type: "state", zones: ahmBridge.lastState.zones }));
  ws.send(
    JSON.stringify({
      type: "connection",
      status: ahmBridge.connected ? "connected" : "disconnected",
    }),
  );

  // Handle incoming commands from browser
  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    // Validate known command types
    const knownTypes = ["setLevel", "setMute"];
    if (!msg.type || !knownTypes.includes(msg.type)) {
      ws.send(JSON.stringify({ type: "error", message: `Unknown command type: ${msg.type}` }));
      return;
    }

    if (msg.zone === undefined || msg.zone < 0 || msg.zone > 2) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid zone (must be 0-2)" }));
      return;
    }

    if (!ahmBridge.connected) {
      ws.send(JSON.stringify({ type: "error", message: "AHM-32 no disponible. Verifique la conexión." }));
      return;
    }

    if (msg.type === "setLevel") {
      const db = typeof msg.value === "number" ? msg.value : parseFloat(msg.value);
      if (isNaN(db)) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid level value" }));
        return;
      }
      const clampedDb = Math.max(-100, Math.min(10, db));
      ahmBridge.setLevel(msg.zone, clampedDb);
    } else if (msg.type === "setMute") {
      const muted = Boolean(msg.value);
      ahmBridge.setMute(msg.zone, muted);
    }
  });

  ws.on("close", () => {
    console.log("[WS] Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("[WS] Client error:", err.message);
  });
});

// ── Start HTTP server ──────────────────────────────────────────────────────
server.listen(PORT, () => {
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

// ── AHM Bridge: auto-connect after server starts ──────────────────────────
const ahmEnabled = process.env.VITE_AHM_ENABLED === "true";
if (ahmEnabled) {
  console.log("[AhmBridge] Feature flag enabled — connecting to AHM-32...");
  ahmBridge.connect();
} else {
  console.log("[AhmBridge] Feature flag disabled (VITE_AHM_ENABLED != true). AHM-32 not connected.");
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n📴 ${signal} — Cerrando servidor SportBar...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log("✓ HTTP server closed");
    });
  }

  // Close WebSocket connections
  if (wss) {
    wss.clients.forEach((client) => client.close());
    console.log("✓ WebSocket connections closed");
  }

  // Disconnect AHM bridge
  ahmBridge.disconnect();
  console.log("✓ AHM bridge disconnected");

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = app;
