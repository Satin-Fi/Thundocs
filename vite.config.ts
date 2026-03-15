import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server/index.ts";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ['.ngrok-free.app'], // ✅ Add this line
  },
  build: {
    outDir: "dist/spa",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist') || id.includes('pdf-lib')) return 'pdf-engine';
            if (id.includes('tesseract.js') || id.includes('opencv.js')) return 'ai-engine';
            if (id.includes('three') || id.includes('fiber') || id.includes('drei')) return 'three-visuals';
            if (id.includes('framer-motion')) return 'animations';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('xlsx') || id.includes('jspdf') || id.includes('jszip')) return 'doc-utils';
            return 'vendor';
          }
        },
      },
    },
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(server) {
      const app = createServer();
      server.middlewares.use(app);
    },
  };
}
