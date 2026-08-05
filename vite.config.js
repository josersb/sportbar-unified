import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Leer configuración específica del worktree (gitignored)
let wtConfig = { vitePort: 5173, expressPort: 3101 };
try {
  wtConfig = JSON.parse(readFileSync(resolve(__dirname, "worktree.config.json"), "utf-8"));
} catch { /* usar defaults */ }

const ARRANGER_HOST = process.env.ARRANGER_HOST || "192.168.2.254";
const ARRANGER_PORT = process.env.ARRANGER_PORT || "80";
const EXPRESS_URL = `http://localhost:${wtConfig.expressPort}`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Development server configuration
  server: {
    port: wtConfig.vitePort,
    host: true, // Allow external connections
    open: true, // Auto-open browser
    cors: true,
    proxy: {
      // Device status endpoint → Express (must come before the generic /api rule)
      "/api/device/": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      // State persistence endpoint → Express (must come before the generic /api rule)
      "/api/state": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      // TVRACK shared state → Express (must come before the generic /api rule)
      "/api/tvrack": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      // Presets compartidos → Express (must come before the generic /api rule)
      "/api/presets": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      // Zonas Fuera → Express (must come before the generic /api rule)
      "/api/zonas-fuera": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      // Matrix State → Express (must come before the generic /api rule)
      "/api/matrix": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      // Proxy API calls to avoid CORS issues during development
      "/api": {
        target: `http://${ARRANGER_HOST}:${ARRANGER_PORT}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("Proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Proxying request:", req.method, req.url);
          });
        },
      },
    },
  },

  // Preview server (for production testing)
  preview: {
    port: 4173,
    host: true,
    open: true,
  },

  // Build configuration
  build: {
    outDir: "dist",
    assetsDir: "assets",
    assetsInlineLimit: 0, // Emitir todas las imagenes como archivos, nunca inline
    sourcemap: false, // Set to true for debugging production
    minify: "esbuild",
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          forms: ["formik", "react-hook-form"],
          ui: ["react-select"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  // Base path for deployment
  base: "/",

  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __ARRANGER_API__: JSON.stringify(`http://${ARRANGER_HOST}:${ARRANGER_PORT}/api/command`),
  },

  // CSS configuration
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      css: {
        charset: false,
      },
    },
  },

  // Optimization
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "formik",
      "react-hook-form",
      "react-select",
    ],
  },

  // Environment variables prefix
  envPrefix: "VITE_",
});
