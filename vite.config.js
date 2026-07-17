import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Development server configuration
  server: {
    port: 5173,
    host: true, // Allow external connections
    open: true, // Auto-open browser
    cors: true,
    proxy: {
      // Device status endpoint → Express (must come before the generic /api rule)
      "/api/device/": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // State persistence endpoint → Express (must come before the generic /api rule)
      "/api/state": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // Proxy API calls to avoid CORS issues during development
      "/api": {
        target: "http://192.168.2.254",
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
    sourcemap: false, // Set to true for debugging production
    minify: "esbuild",
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          forms: ["formik", "react-hook-form"],
          ui: ["styled-components", "react-select"],
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
    __ARRANGER_API__: JSON.stringify("http://192.168.2.254/api/command"),
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
      "styled-components",
      "react-select",
    ],
  },

  // Environment variables prefix
  envPrefix: "VITE_",
});
