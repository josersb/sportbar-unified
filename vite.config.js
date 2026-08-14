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
      // ── Broker: el cliente solo habla con Express ──
      "/api/stream": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      "/api/broker": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      "/api/tvs": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      "/api/app-state": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      // Presets compartidos → Express (must come before the generic /api rule)
      "/api/presets": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      // Zonas Fuera write-through → Express
      "/api/zonas-fuera": {
        target: EXPRESS_URL,
        changeOrigin: true,
      },
      // Comandos IR/serial/presets de dispositivos: único proxy Arranger
      "/api/command": {
        target: EXPRESS_URL,
        changeOrigin: true,
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
    __ARRANGER_API__: JSON.stringify("/api/command"),
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
