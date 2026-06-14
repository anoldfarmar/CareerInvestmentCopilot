import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
            return "vendor-react";
          }
          if (id.includes("antd-mobile")) {
            return "vendor-antd-mobile";
          }
          if (id.includes("@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("zod") || id.includes("react-hook-form") || id.includes("@hookform")) {
            return "vendor-form";
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
