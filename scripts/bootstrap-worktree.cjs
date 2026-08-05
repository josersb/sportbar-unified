/**
 * bootstrap-worktree.cjs — Genera worktree.config.json para un worktree nuevo.
 *
 * Uso:
 *   node scripts/bootstrap-worktree.cjs --name "feat/mi-feature" --vite-port 5177 --express-port 3105
 *
 * Si no se pasan puertos, busca el siguiente par libre en AGENTS.md.
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

const name = getArg("--name");
const vitePort = parseInt(getArg("--vite-port") || "0", 10);
const expressPort = parseInt(getArg("--express-port") || "0", 10);

if (!name) {
  console.error("❌ --name es requerido. Ej: --name feat/mi-feature");
  process.exit(1);
}

// Buscar siguiente puerto libre si no se pasó
function findNextPort(used, start) {
  let p = start;
  while (used.has(p)) p++;
  return p;
}

const usedVite = new Set();
const usedExpress = new Set();

// Escanear AGENTS.md para puertos en uso
const agentsPath = path.join(__dirname, "..", "AGENTS.md");
if (fs.existsSync(agentsPath)) {
  const content = fs.readFileSync(agentsPath, "utf-8");
  const portRegex = /:(\d{4})/g;
  let m;
  // Contar ocurrencias: cada puerto que aparece 2+ veces está en uso
  const counts = {};
  while ((m = portRegex.exec(content)) !== null) {
    counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  for (const [p, c] of Object.entries(counts)) {
    if (c >= 2) {
      const num = parseInt(p, 10);
      if (num >= 5173 && num <= 5200) usedVite.add(num);
      if (num >= 3101 && num <= 3150) usedExpress.add(num);
    }
  }
}

const finalVitePort = vitePort || findNextPort(usedVite, 5173);
const finalExpressPort = expressPort || findNextPort(usedExpress, 3101);

const config = {
  name,
  vitePort: finalVitePort,
  expressPort: finalExpressPort,
};

const configPath = path.join(__dirname, "..", "worktree.config.json");
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

console.log(`✅ worktree.config.json creado para "${name}"`);
console.log(`   Vite:    http://localhost:${finalVitePort}`);
console.log(`   Express: http://localhost:${finalExpressPort}`);
console.log("");
console.log("⚠️  No olvides:");
console.log(`   1. Actualizar AGENTS.md con los nuevos puertos`);
console.log(`   2. Crear symlink .env → ..\\.env-shared (si no existe)`);
console.log(`   3. pnpm install && cd server && pnpm install --ignore-workspace`);
