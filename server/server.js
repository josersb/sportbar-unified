const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON (debe ir antes de las rutas)
app.use(express.json());

// Load lowdb and initialize state database
let stateDb;
(async () => {
  const { JSONFilePreset } = await import("lowdb/node");
  stateDb = await JSONFilePreset(path.join(__dirname, "state.json"), {
    state: null,
  });
})();

// GET /api/state — returns persisted state from server/state.json
app.get("/api/state", (req, res) => {
  if (!stateDb) {
    return res.json({ state: null });
  }
  res.json({ state: stateDb.data.state });
});

// POST /api/state — persists state to server/state.json
app.post("/api/state", async (req, res) => {
  if (!stateDb) {
    return res.status(503).json({ error: "Database not ready" });
  }
  const { state } = req.body;
  if (!state) {
    return res.status(400).json({ error: "Missing state" });
  }
  stateDb.data.state = state;
  await stateDb.write();
  res.json({ ok: true });
});

// Middleware para servir archivos estáticos desde dist (build de producción)
app.use(express.static(path.join(__dirname, "../dist")));

// Headers para CORS (necesario para las llamadas a la matriz Arranger)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Proxy endpoint: relay get status a Arranger (server-to-server, sin CORS)
// En dev, Vite redirige /api/device/ a este servidor Express.
app.get("/api/device/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const url = `http://192.168.2.254/api/command/get status ${id}/TOKEN_REMOVED`;
    const response = await fetch(url);
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
