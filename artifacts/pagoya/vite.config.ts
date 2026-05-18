import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    {
      name: "static-cache-headers",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && /\/(llms\.txt|robots\.txt|sitemap\.xml)(\?.*)?$/.test(req.url)) {
            res.setHeader("Cache-Control", "public, max-age=86400");
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && /\/(llms\.txt|robots\.txt|sitemap\.xml)(\?.*)?$/.test(req.url)) {
            res.setHeader("Cache-Control", "public, max-age=86400");
          }
          next();
        });
      },
    },
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-core";
          }
          if (id.includes("node_modules/@stripe") || id.includes("node_modules/stripe")) {
            return "stripe";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "tanstack";
          }
          if (id.includes("node_modules/react-helmet-async") || id.includes("node_modules/wouter")) {
            return "routing";
          }
          if (id.includes("node_modules/")) {
            return "vendor";
          }
          if (
            id.includes("/pages/PagarCFEGuadalajara") ||
            id.includes("/pages/PagarServiciosGuadalajara") ||
            id.includes("/pages/RecargasGuadalajara")
          ) {
            return "pages-guadalajara";
          }
          if (
            id.includes("/pages/BlogTelmex") ||
            id.includes("/pages/BlogRecargasTelcel") ||
            id.includes("/pages/BlogAguaMexico") ||
            id.includes("/pages/BlogOXXOPay") ||
            id.includes("/pages/GuiaBlog")
          ) {
            return "pages-blog";
          }
          if (
            id.includes("/pages/PagarCFE") ||
            id.includes("/pages/PagarTelmex") ||
            id.includes("/pages/Recargas") ||
            id.includes("/pages/DepositoOXXO") ||
            id.includes("/pages/TerminosCondiciones")
          ) {
            return "pages-seo";
          }
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
