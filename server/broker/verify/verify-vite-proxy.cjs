"use strict";

/**
 * verify-vite-proxy.cjs
 *
 * Guard de regresión del proxy de DEV de Vite: TODO endpoint `/api/<seg>`
 * consumido por el cliente DEBE estar proxeado hacia el Express del worktree.
 *
 * Contexto (hotfix 2026-09-17): `/api/decos` y `/api/matrix-groups` (WS3/WS4)
 * no estaban en el proxy → en dev el intent de canal devolvía 404 y el IR nunca
 * se enviaba (todos los cambios de canal rotos). Este verify generaliza el
 * chequeo que antes solo miraba `/api/tvrack`.
 *
 * Sin hardware y sin levantar Vite: parsea el config importándolo y escanea el
 * código cliente en busca de literales `/api/...`.
 */

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "../../..");
const SRC = path.join(ROOT, "src");

let failed = 0;
function check(label, condition, detail) {
  console.log(`${condition ? "✓" : "✗"} ${label}${condition || !detail ? "" : ` — ${detail}`}`);
  if (!condition) failed += 1;
}

/** Camina src/ y devuelve todos los segmentos /api/<seg> usados por el cliente. */
function collectClientApiSegments(dir) {
  const segments = new Map(); // seg -> Set(archivos)
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(full);
      } else if (/\.(js|jsx|mjs)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        for (const match of text.matchAll(/["'`](\/api\/[a-zA-Z0-9_-]+)/g)) {
          const seg = match[1];
          if (!segments.has(seg)) segments.set(seg, new Set());
          segments.get(seg).add(path.relative(ROOT, full));
        }
      }
    }
  };
  walk(dir);
  return segments;
}

(async () => {
  const viteConfig = (await import(pathToFileURL(path.join(ROOT, "vite.config.js")).href)).default;

  let expectedExpressPort = 3101;
  try {
    const wtConfig = JSON.parse(fs.readFileSync(path.join(ROOT, "worktree.config.json"), "utf8"));
    expectedExpressPort = wtConfig.expressPort;
  } catch {}

  const proxy = viteConfig.server?.proxy || {};
  const expectedTarget = `http://localhost:${expectedExpressPort}`;

  // 1) Cada entrada del proxy debe apuntar al Express del worktree.
  const proxySegments = new Set();
  for (const [key, value] of Object.entries(proxy)) {
    if (!key.startsWith("/api/")) continue;
    proxySegments.add(key);
    check(
      `proxy ${key} → Express del worktree`,
      value?.target === expectedTarget && value?.changeOrigin === true,
      `target=${value?.target}`
    );
  }

  // 2) Todo segmento /api/<seg> usado por el cliente debe estar cubierto.
  const used = collectClientApiSegments(SRC);
  check("se encontraron usos de /api en src/", used.size > 0, `${used.size} segmentos`);

  const uncovered = [];
  for (const seg of [...used.keys()].sort()) {
    const covered = [...proxySegments].some((key) => key === seg || key.startsWith(`${seg}/`) || seg.startsWith(`${key}/`));
    if (!covered) uncovered.push(`${seg}  (usado en ${[...used.get(seg)].join(", ")})`);
  }

  check(
    `todos los /api usados por el cliente están proxeados (${used.size} usados / ${proxySegments.size} proxeados)`,
    uncovered.length === 0,
    uncovered.length ? `SIN PROXY:\n    ${uncovered.join("\n    ")}` : undefined
  );

  console.log(
    `\n${failed === 0 ? "✓ VITE-PROXY OK (cobertura de proxy dev completa)" : `✗ ${failed} chequeo(s) de proxy fallaron`}`
  );
  process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
  console.error("FALLO:", error);
  process.exit(1);
});
