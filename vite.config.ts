import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "127.0.0.1", // force to bind only to this IP
    port: 5173,        // force port
    strictPort: true,  // don't fall back to another port
  },
});