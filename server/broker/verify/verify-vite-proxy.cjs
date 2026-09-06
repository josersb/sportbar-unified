"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const root = path.resolve(__dirname, "../../..");
  const viteConfig = (await import(pathToFileURL(path.join(root, "vite.config.js")).href)).default;
  let expectedExpressPort = 3101;
  try {
    const wtConfig = JSON.parse(fs.readFileSync(path.join(root, "worktree.config.json"), "utf8"));
    expectedExpressPort = wtConfig.expressPort;
  } catch {}

  const proxy = viteConfig.server?.proxy?.["/api/tvrack"];
  const ok = proxy?.target === `http://localhost:${expectedExpressPort}` && proxy.changeOrigin === true;
  console.log(`${ok ? "✓" : "✗"} vite.config.js parsea /api/tvrack hacia Express del worktree`);
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("FALLO:", error);
  process.exit(1);
});
