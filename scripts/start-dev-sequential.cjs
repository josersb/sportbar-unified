/**
 * start-dev-sequential.cjs
 *
 * Arranca Express primero, espera que esté listo (polling a :PORT),
 * luego arranca Vite. Cero errores ECONNREFUSED en consola.
 *
 * Uso: node scripts/start-dev-sequential.cjs
 *      PORT=3103 node scripts/start-dev-sequential.cjs
 */

const { spawn } = require("child_process");
const http = require("http");

const EXPRESS_PORT = process.env.PORT || 3103;
const EXPRESS_URL = `http://localhost:${EXPRESS_PORT}`;
const POLL_INTERVAL = 500; // ms entre reintentos
const MAX_WAIT = 60000; // timeout máximo (60s)
const MAX_RETRIES = Math.floor(MAX_WAIT / POLL_INTERVAL);

let expressProcess = null;
let viteProcess = null;
let pollTimer = null;
let retries = 0;

// ── Cleanup ──────────────────────────────────────────────────────────
function cleanup() {
  if (pollTimer) clearInterval(pollTimer);
  if (viteProcess) viteProcess.kill("SIGTERM");
  if (expressProcess) expressProcess.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", () => {
  if (viteProcess) viteProcess.kill("SIGTERM");
  if (expressProcess) expressProcess.kill("SIGTERM");
});

// ── Step 1: Start Express ────────────────────────────────────────────
console.log("[sequential] Iniciando servidor Express...");

expressProcess = spawn("node", ["server.js"], {
  cwd: require("path").join(__dirname, "..", "server"),
  stdio: "inherit",
  env: { ...process.env, PORT: String(EXPRESS_PORT) },
  shell: true,
});

expressProcess.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[sequential] Express terminó con código ${code}`);
    cleanup();
  }
});

// ── Step 2: Poll until Express responds ──────────────────────────────
function pollExpress() {
  retries++;
  const req = http.get(EXPRESS_URL, (res) => {
    // Cualquier respuesta (incluso 404) significa que está escuchando
    res.resume();
    console.log(`[sequential] Express listo en ${EXPRESS_URL} (${retries * POLL_INTERVAL}ms)`);
    clearInterval(pollTimer);
    startVite();
  });

  req.on("error", () => {
    if (retries >= MAX_RETRIES) {
      console.error(`[sequential] Timeout: Express no respondió en ${MAX_WAIT / 1000}s`);
      cleanup();
    }
  });

  req.setTimeout(2000, () => {
    req.destroy();
  });
}

pollTimer = setInterval(pollExpress, POLL_INTERVAL);

// ── Step 3: Start Vite ───────────────────────────────────────────────
function startVite() {
  console.log("[sequential] Iniciando Vite...");
  viteProcess = spawn("npx", ["vite"], {
    cwd: require("path").join(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  viteProcess.on("exit", (code) => {
    console.log(`[sequential] Vite terminó (código ${code})`);
    cleanup();
  });
}
