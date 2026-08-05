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

if (!TOKEN) {
  console.error("❌ VITE_ARRANGER_TOKEN no está definido.");
  console.error("   Configuralo en: [Environment]::SetEnvironmentVariable('VITE_ARRANGER_TOKEN','<token>','User')");
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
async function getEncoder(decoder, subscription) {
  const command = `get encoder ${decoder} ${subscription}`;
  const url = `http://${ARRANGER_HOST}:${ARRANGER_PORT}/api/command/${encodeURIComponent(command)}/${TOKEN}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const text = (await response.text()).trim();

    if (text.includes("no encoder connected")) return null;
    if (text.includes("error") || text.includes("invalid") || text.includes("not found")) {
      throw new Error(text);
    }

    const match = text.match(/get encoder success (.+)/i);
    return match ? match[1] : text;
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`Timeout: ${command}`);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function reconstructState(destinations, subscription) {
  const results = {};
  let completed = 0;

  for (let i = 0; i < destinations.length; i += BATCH_SIZE) {
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
      }
      completed++;
    }

    // Progress
    const pct = Math.round((completed / destinations.length) * 100);
    process.stdout.write(`\r  ${completed}/${destinations.length} (${pct}%)`);
  }

  console.log(""); // newline after progress
  return results;
}

// ── Main ──
(async () => {
  console.log(`\n🔍 Arranger State Dump — ${SUBSCRIPTION}`);
  console.log(`   Host: ${ARRANGER_HOST}:${ARRANGER_PORT}`);
  console.log(`   Destinos: ${DESTINATIONS.length} | Batches: ${BATCH_SIZE} | Timeout: ${TIMEOUT_MS}ms\n`);

  const start = Date.now();
  const state = await reconstructState(DESTINATIONS, SUBSCRIPTION);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // ── Estadísticas ──
  const connected = Object.entries(state).filter(([, v]) => v !== null).length;
  const disconnected = DESTINATIONS.length - connected;
  console.log(`\n   Conectados: ${connected} | Sin conexión: ${disconnected} | Tiempo: ${elapsed}s\n`);

  // ── Tabla ──
  console.log("─── Estado ───");
  for (const [dest, encoder] of Object.entries(state)) {
    console.log(`  ${dest.padEnd(28)} → ${encoder || "—"}`);
  }

  // ── Guardar a archivo ──
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `arranger-state-${SUBSCRIPTION}-${timestamp}.json`;
  const filePath = path.join(__dirname, "..", filename);

  const output = {
    timestamp: new Date().toISOString(),
    host: `${ARRANGER_HOST}:${ARRANGER_PORT}`,
    subscription: SUBSCRIPTION,
    destinations: DESTINATIONS.length,
    connected,
    disconnected,
    elapsedSeconds: parseFloat(elapsed),
    state,
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`\n📄 Guardado: ${filename}`);
})();
