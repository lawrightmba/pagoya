import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
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
      name: "static-landing-pages",
      configureServer(server) {
        const STATIC_PAGES = [
          "pagar-cfe-monterrey",
          "pagar-cfe-cdmx",
          "pagar-agua-guadalajara",
          "pagar-cfe-guadalajara",
          "pagar-cfe-desde-usa",
        ];
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url ?? "").split("?")[0].replace(/\/$/, "");
          const slug = pathname.replace(/^\//, "");
          if (STATIC_PAGES.includes(slug)) {
            const filePath = path.resolve(import.meta.dirname, "public", slug, "index.html");
            try {
              const html = fs.readFileSync(filePath, "utf-8");
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              res.setHeader("Cache-Control", "public, max-age=3600");
              res.statusCode = 200;
              res.end(html);
            } catch {
              next();
            }
          } else {
            next();
          }
        });
      },
      configurePreviewServer(server) {
        const STATIC_PAGES = [
          "pagar-cfe-monterrey",
          "pagar-cfe-cdmx",
          "pagar-agua-guadalajara",
          "pagar-cfe-guadalajara",
          "pagar-cfe-desde-usa",
        ];
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url ?? "").split("?")[0].replace(/\/$/, "");
          const slug = pathname.replace(/^\//, "");
          if (STATIC_PAGES.includes(slug)) {
            const filePath = path.resolve(import.meta.dirname, "public", slug, "index.html");
            try {
              const html = fs.readFileSync(filePath, "utf-8");
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              res.setHeader("Cache-Control", "public, max-age=3600");
              res.statusCode = 200;
              res.end(html);
            } catch {
              next();
            }
          } else {
            next();
          }
        });
      },
    },
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
        manualChunks: {
          "vendor-stripe": [
            "@stripe/react-stripe-js",
            "@stripe/stripe-js",
          ],
          "vendor-tanstack": [
            "@tanstack/react-query",
          ],
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
