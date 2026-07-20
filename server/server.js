const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security: Helmet (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.) ──
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: [
          "'self'",
          "http://localhost:5173",          // Vite dev server
          "http://192.168.2.254",           // Arranger matrix
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", "http://192.168.2.254"],
      },
    },
    crossOriginEmbedderPolicy: false,       // Allow Arranger iframe embeds
  }),
);

// ── CORS: restringido a orígenes conocidos (antes era *) ──
const allowedOrigins = [
  "http://localhost:5173",                  // Vite dev
  "http://localhost:3000",                  // Express self
  "http://127.0.0.1:5173",
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
