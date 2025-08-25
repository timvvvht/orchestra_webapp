import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isTauri = process.env.VITE_TAURI === '1';

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    hmr: { overlay: false },
    proxy: {
      // Proxy ACS APIs during local dev to ensure same-origin cookies
      '/api/v1': {
        target: process.env.VITE_ACS_BASE_URL || 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/acs': {
        target: process.env.VITE_ACS_BASE_URL || 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: isTauri ? [] : [
      { find: "@tauri-apps/api/core", replacement: "/src/tauri-shims/tauri.core.web.ts" },
      { find: "@tauri-apps/api/event", replacement: "/src/tauri-shims/tauri.event.web.ts" },
      { find: "@tauri-apps/plugin-dialog", replacement: "/src/tauri-shims/tauri.plugin-dialog.web.ts" },
      { find: "@tauri-apps/plugin-shell", replacement: "/src/tauri-shims/tauri.plugin-shell.web.ts" },
      { find: "@tauri-apps/api/webviewWindow", replacement: "/src/tauri-shims/tauri.webviewWindow.web.ts" },
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    dedupe: ["react", "react-dom"],
  },
});
