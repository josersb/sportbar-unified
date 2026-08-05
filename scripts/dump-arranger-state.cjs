/**
 * dump-arranger-state.cjs
 *
 * Consulta el estado real de la matriz Arranger usando get encoder
 * para cada destino y guarda el resultado en un archivo JSON.
 *
 * Uso:
 *   node scripts/dump-arranger-state.cjs [video|audio]
 *
 * Requiere:
 *   VITE_ARRANGER_TOKEN en variable de entorno de Windows (User)
 *   ARRANGER_HOST en .env-shared o variable de entorno (default: 192.168.2.254)
 */

const fs = require("fs");
const path = require("path");

// ── Configuración ──
const ARRANGER_HOST = process.env.ARRANGER_HOST || "192.168.2.254";
const ARRANGER_PORT = process.env.ARRANGER_PORT || "80";
const TOKEN = process.env.VITE_ARRANGER_TOKEN;
const SUBSCRIPTION = process.argv[2] || "video";
const BATCH_SIZE = 8;
const TIMEOUT_MS = 10000;
const GLOBAL_TIMEOUT_MS = 120000; // 2 minutos máximo total
const ARRANGER_BASE = `http://${ARRANGER_HOST}:${ARRANGER_PORT}/api/command`;

// ── Salvaguarda 0: token ──
if (!TOKEN) {
  console.error("\n❌ VITE_ARRANGER_TOKEN no está definido.");
  console.error('   Configuralo: [Environment]::SetEnvironmentVariable(\'VITE_ARRANGER_TOKEN\',\'<token>\',\'User\')');
  process.exit(1);
}

// ── Destinos a consultar ──
const DESTINATIONS = [
  // TVs principales
  "TV01","TV02","TV03","TV04","TV05","TV06","TV07","TV08","TV09","TV10",
  "TV11","TV12","TV13","TV14","TV15","TV16","TV17","TV18","TV19","TV20",
  "TV21","TV22","TV23","TV24","TV25","TV26",
  // Video Wall
  "VWN","VWC","VWS",
  // Rack
  "TVRACK",
  // Zonas fuera de sportbar
  "aVip-Barra-Centro","aVip-Lobby-Batacazo","aVip-Bar-Boveda",
  "RACK-VIP-PANTALLABATACA","aMas-15-Barra",
  "a-Menos1-Escenario","a-Menos1-Escenario2",
  "a-QMR75-Menos1-TV1","a-QMR75-Menos1-TV2","a-QMC65-Menos1-TV2",
];

// ── Helpers ──
async function arrangerFetch(command) {
  const url = `${ARRANGER_BASE}/${encodeURIComponent(command)}/${TOKEN}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return { ok: response.ok, status: response.status, text: (await response.text()).trim() };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error(`Timeout (${TIMEOUT_MS / 1000}s): ${command}`);
    throw new Error(`Red/HTTP: ${err.message}`);
  }
}

// ── Salvaguarda 1: pre-flight ping ──
async function preflightPing() {
  process.stdout.write("  [1/3] Ping al Arranger... ");
  try {
    const { ok } = await arrangerFetch("get devices all");
    if (!ok) throw new Error("HTTP " + (await arrangerFetch("get devices all")).status);
    console.log("✅ accesible");
    return true;
  } catch (err) {
    console.log(`❌\n\n  No se pudo contactar al Arranger en ${ARRANGER_HOST}:${ARRANGER_PORT}`);
    console.log(`  Error: ${err.message}`);
    return false;
  }
}

// ── Salvaguarda 2: validar token ──
async function preflightToken() {
  process.stdout.write("  [2/3] Validando token... ");
  try {
    const command = `get encoder TVRACK ${SUBSCRIPTION}`;
    const { text } = await arrangerFetch(command);
    if (text.toLowerCase().includes("invalid security key")) {
      console.log("❌\n\n  Token inválido o expirado. Verificá VITE_ARRANGER_TOKEN.");
      return false;
    }
    console.log("✅ válido");
    return true;
  } catch (err) {
    console.log(`❌\n\n  Error validando token: ${err.message}`);
    return false;
  }
}

// ── Core: get encoder para un destino ──
async function getEncoder(decoder, subscription) {
  const command = `get encoder ${decoder} ${subscription}`;
  const { text } = await arrangerFetch(command);

  if (text.toLowerCase().includes("no encoder connected")) return null;
  if (text.toLowerCase().includes("error") || text.toLowerCase().includes("invalid") || text.toLowerCase().includes("not found")) {
    throw new Error(text);
  }

  const match = text.match(/get encoder success (.+)/i);
  return match ? match[1] : text;
}

// ── Core: reconstruir estado ──
async function reconstructState(destinations, subscription, filePath) {
  const results = {};
  let completed = 0;
  const globalStart = Date.now();

  for (let i = 0; i < destinations.length; i += BATCH_SIZE) {
    // Salvaguarda 3: timeout global
    if (Date.now() - globalStart > GLOBAL_TIMEOUT_MS) {
      console.log(`\n  ⚠️  Timeout global (${GLOBAL_TIMEOUT_MS / 1000}s) — guardando lo recolectado...`);
      break;
    }

    const batch = destinations.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (dest) => {
        try {
          return { dest, encoder: await getEncoder(dest, subscription) };
        } catch (err) {
          return { dest, encoder: null, error: err.message };
        }
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results[r.value.dest] = r.value.encoder;
      } else {
        results[`ERROR:${r.reason?.dest || `batch_${i}`}`] = null;
      }
      completed++;
    }

    // ── Salvaguarda 4: guardado incremental ──
    const output = {
      timestamp: new Date().toISOString(),
      host: `${ARRANGER_HOST}:${ARRANGER_PORT}`,
      subscription: SUBSCRIPTION,
      destinations_total: DESTINATIONS.length,
      destinations_completed: completed,
      state: results,
    };
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));

    // Progress
    const pct = Math.round((completed / destinations.length) * 100);
    process.stdout.write(`\r  ${completed}/${destinations.length} (${pct}%)`);
  }

  console.log(""); // newline after progress
  return results;
}

// ── Main ──
(async () => {
  const start = Date.now();

  console.log(`\n🔍 Arranger State Dump — ${SUBSCRIPTION}`);
  console.log(`   Host:  ${ARRANGER_HOST}:${ARRANGER_PORT}`);
  console.log(`   Token: ${TOKEN.slice(0, 6)}...${TOKEN.slice(-4)}`);
  console.log(`   Batch: ${BATCH_SIZE} | Timeout: ${TIMEOUT_MS / 1000}s | Global: ${GLOBAL_TIMEOUT_MS / 1000}s`);
  console.log(`   Destinos: ${DESTINATIONS.length}\n`);

  // ── Pre-flight ──
  if (!(await preflightPing())) process.exit(1);
  if (!(await preflightToken())) process.exit(1);

  // ── Archivo de salida ──
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `arranger-state-${SUBSCRIPTION}-${timestamp}.json`;
  const filePath = path.join(__dirname, "..", filename);
  console.log(`  [3/3] Archivo: ${filename}\n`);

  // ── Reconstruir ──
  const state = await reconstructState(DESTINATIONS, SUBSCRIPTION, filePath);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // ── Guardado final ──
  const connected = Object.entries(state).filter(([k, v]) => v !== null && !k.startsWith("ERROR")).length;
  const disconnected = DESTINATIONS.length - connected;

  const finalOutput = {
    timestamp: new Date().toISOString(),
    host: `${ARRANGER_HOST}:${ARRANGER_PORT}`,
    subscription: SUBSCRIPTION,
    destinations: DESTINATIONS.length,
    connected,
    disconnected,
    elapsedSeconds: parseFloat(elapsed),
    state,
  };
  fs.writeFileSync(filePath, JSON.stringify(finalOutput, null, 2));

  // ── Resumen ──
  console.log(`\n   Conectados: ${connected} | Sin conexión: ${disconnected} | Tiempo: ${elapsed}s\n`);
  console.log("─── Estado ───");
  for (const [dest, encoder] of Object.entries(state)) {
    const icon = encoder ? "✅" : "❌";
    console.log(`  ${icon} ${dest.padEnd(28)} → ${encoder || "—"}`);
  }
  console.log(`\n📄 ${filename}`);
})();
