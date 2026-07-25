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

// ─── Per-page SEO metadata ─────────────────────────────────────────────────
interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  geo?: { region: string; placename: string };
  structuredData?: object[];
}

const PAGE_META: Record<string, PageMeta> = {
  "pagar-agua-monterrey": {
    title: "Pagar Agua Monterrey en Línea | PagoYa",
    description: "Consulta y paga tu recibo de agua de Monterrey (SADM) en línea, sin cuenta bancaria. Acepta OXXO y tarjeta.",
    canonical: "https://pagoyamx.com/pagar-agua-monterrey",
    ogType: "article",
    geo: { region: "MX-NL", placename: "Monterrey, Nuevo León" },
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
          { "@type": "ListItem", "position": 2, "name": "Pagar Agua Monterrey", "item": "https://pagoyamx.com/pagar-agua-monterrey" },
        ],
      },
    ],
  },
  "pagar-agua-cdmx": {
    title: "Pagar Agua CDMX en Línea | PagoYa",
    description: "Paga tu recibo de agua de la Ciudad de México en línea, sin cuenta bancaria. Rápido y sencillo desde tu celular.",
    canonical: "https://pagoyamx.com/pagar-agua-cdmx",
    ogType: "article",
    geo: { region: "MX-CMX", placename: "Ciudad de México" },
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
          { "@type": "ListItem", "position": 2, "name": "Pagar Agua CDMX", "item": "https://pagoyamx.com/pagar-agua-cdmx" },
        ],
      },
    ],
  },
  "pagar-cfe": {
    title: "Pagar CFE en Línea | PagoYa",
    description: "Consulta y paga tu recibo de luz CFE en línea desde cualquier parte de México. Sin cuenta bancaria, con OXXO o tarjeta.",
    canonical: "https://pagoyamx.com/pagar-cfe",
    ogType: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
          { "@type": "ListItem", "position": 2, "name": "Pagar CFE", "item": "https://pagoyamx.com/pagar-cfe" },
        ],
      },
    ],
  },
  "pagar-izzi-sin-cuenta-bancaria": {
    title: "Pagar Izzi Sin Cuenta Bancaria | PagoYa",
    description: "Paga tu servicio Izzi sin necesidad de una cuenta bancaria. Acepta OXXO y tarjeta. Guía paso a paso.",
    canonical: "https://pagoyamx.com/pagar-izzi-sin-cuenta-bancaria",
    ogType: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
          { "@type": "ListItem", "position": 2, "name": "Pagar Izzi sin cuenta bancaria", "item": "https://pagoyamx.com/pagar-izzi-sin-cuenta-bancaria" },
        ],
      },
    ],
  },
  "mejores-apps-pagar-servicios-mexico": {
    title: "Mejores Apps para Pagar Servicios en México | PagoYa",
    description: "Comparamos las mejores apps para pagar luz, agua e internet en México sin cuenta bancaria.",
    canonical: "https://pagoyamx.com/mejores-apps-pagar-servicios-mexico",
    ogType: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
          { "@type": "ListItem", "position": 2, "name": "Mejores apps para pagar servicios en México", "item": "https://pagoyamx.com/mejores-apps-pagar-servicios-mexico" },
        ],
      },
    ],
  },
  "sadm-pago-en-linea": {
    title: "SADM Pago en Línea: Cómo Pagar tu Recibo | PagoYa",
    description: "Paga tu recibo SADM (agua Monterrey) en línea sin cuenta bancaria. Guía completa paso a paso, métodos de pago y preguntas frecuentes.",
    canonical: "https://pagoyamx.com/sadm-pago-en-linea",
    ogType: "article",
    geo: { region: "MX-NL", placename: "Monterrey, Nuevo León" },
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
          { "@type": "ListItem", "position": 2, "name": "Pagar servicios", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
          { "@type": "ListItem", "position": 3, "name": "Pagar agua Monterrey", "item": "https://pagoyamx.com/pagar-agua-monterrey" },
          { "@type": "ListItem", "position": 4, "name": "SADM Pago en Línea", "item": "https://pagoyamx.com/sadm-pago-en-linea" },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "SADM Pago en Línea: Cómo Pagar tu Recibo de Agua de Monterrey",
        "description": "Guía completa para pagar el recibo SADM (agua Monterrey) en línea sin cuenta bancaria.",
        "url": "https://pagoyamx.com/sadm-pago-en-linea",
        "datePublished": "2026-07-24",
        "dateModified": "2026-07-24",
        "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
        "inLanguage": "es-MX",
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "¿Cómo pago el SADM en línea sin cuenta bancaria?", "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa puedes pagar tu recibo SADM desde tu celular sin necesitar una cuenta bancaria. Recarga tu billetera con efectivo en cualquier OXXO, selecciona SADM, ingresa tu número de contrato y confirma el pago." } },
          { "@type": "Question", "name": "¿Qué número necesito para el pago SADM en línea?", "acceptedAnswer": { "@type": "Answer", "text": "Necesitas tu número de cuenta o contrato SADM. Lo encuentras en la parte superior de tu recibo bimestral o en el portal sadm.mx." } },
          { "@type": "Question", "name": "¿Cuánto cobra PagoYa por pagar el SADM?", "acceptedAnswer": { "@type": "Answer", "text": "PagoYa cobra una comisión fija de $25 MXN por transacción." } },
        ],
      },
    ],
  },
};

// ─── Meta injection helper ──────────────────────────────────────────────────
function injectPageMeta(html: string, meta: PageMeta): string {
  // Title
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
  // Description
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${meta.description}" />`,
  );
  // OG title
  html = html.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${meta.title}" />`,
  );
  // OG description
  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${meta.description}" />`,
  );
  // OG url
  html = html.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${meta.canonical}" />`,
  );
  // OG type
  if (meta.ogType) {
    html = html.replace(
      /<meta property="og:type"[^>]*>/,
      `<meta property="og:type" content="${meta.ogType}" />`,
    );
  }
  // Twitter title
  html = html.replace(
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${meta.title}" />`,
  );
  // Twitter description
  html = html.replace(
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${meta.description}" />`,
  );
  // Geo (replace existing)
  if (meta.geo) {
    html = html.replace(/<meta name="geo\.region"[^>]*>/, `<meta name="geo.region" content="${meta.geo.region}" />`);
    html = html.replace(/<meta name="geo\.placename"[^>]*>/, `<meta name="geo.placename" content="${meta.geo.placename}" />`);
  }
  // Remove global hreflang alternates pointing to homepage root
  html = html.replace(/[ \t]*<link rel="alternate" hreflang="es-MX" href="https:\/\/pagoyamx\.com\/" \/>\n?/, "");
  html = html.replace(/[ \t]*<link rel="alternate" hreflang="x-default" href="https:\/\/pagoyamx\.com\/" \/>\n?/, "");
  // Inject canonical + hreflang before </head>
  const headInjection = [
    `  <link rel="canonical" href="${meta.canonical}" />`,
    `  <link rel="alternate" hreflang="es-MX" href="${meta.canonical}" />`,
    `  <link rel="alternate" hreflang="x-default" href="${meta.canonical}" />`,
  ].join("\n");
  html = html.replace("</head>", `${headInjection}\n</head>`);
  // Inject structured data before </head>
  if (meta.structuredData && meta.structuredData.length > 0) {
    const schemas = meta.structuredData
      .map(sd => `  <script type="application/ld+json">${JSON.stringify(sd)}</script>`)
      .join("\n");
    html = html.replace("</head>", `${schemas}\n</head>`);
  }
  return html;
}

export default defineConfig({
  base: basePath,
  plugins: [
    // ─── SEO: 301 redirects for legacy .html URLs + per-page metadata injection ───
    {
      name: "seo-redirects-and-meta",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          try {
            const rawUrl = req.url ?? "";
            const qStart = rawUrl.indexOf("?");
            const pathname = qStart === -1
              ? rawUrl.replace(/\/$/, "")
              : rawUrl.slice(0, qStart).replace(/\/$/, "");
            const qs = qStart === -1 ? "" : rawUrl.slice(qStart);

            // 1. Genuine HTTP 301 for every legacy .html URL
            if (pathname.endsWith(".html") && !pathname.startsWith("/@") && !pathname.startsWith("/node_modules")) {
              const canonical = pathname.slice(0, -5) || "/";
              res.writeHead(301, {
                "Location": canonical + qs,
                "Cache-Control": "public, max-age=31536000",
                "Content-Type": "text/plain",
              });
              res.end(`Moved Permanently: ${canonical + qs}`);
              return;
            }

            // 2. Per-page metadata injection via Vite's own transform pipeline
            const slug = pathname.replace(/^\//, "");
            const meta = PAGE_META[slug];
            if (meta) {
              const indexPath = path.resolve(import.meta.dirname, "index.html");
              let html = fs.readFileSync(indexPath, "utf-8");
              html = injectPageMeta(html, meta);
              // Use Vite's transform so HMR, module injection, etc. are handled
              html = await server.transformIndexHtml(pathname || "/", html, req.originalUrl);
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              res.statusCode = 200;
              res.end(html);
              return;
            }

            next();
          } catch (e) {
            next(e);
          }
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url ?? "";
          const qStart = rawUrl.indexOf("?");
          const pathname = qStart === -1
            ? rawUrl.replace(/\/$/, "")
            : rawUrl.slice(0, qStart).replace(/\/$/, "");
          const qs = qStart === -1 ? "" : rawUrl.slice(qStart);

          // 1. Genuine HTTP 301 for every legacy .html URL
          if (pathname.endsWith(".html")) {
            const canonical = pathname.slice(0, -5) || "/";
            res.writeHead(301, {
              "Location": canonical + qs,
              "Cache-Control": "public, max-age=31536000",
              "Content-Type": "text/plain",
            });
            res.end(`Moved Permanently: ${canonical + qs}`);
            return;
          }

          // 2. Per-page metadata injection from built index.html
          const slug = pathname.replace(/^\//, "");
          const meta = PAGE_META[slug];
          if (meta) {
            try {
              const distIndex = path.resolve(import.meta.dirname, "dist/public/index.html");
              let html = fs.readFileSync(distIndex, "utf-8");
              html = injectPageMeta(html, meta);
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              res.statusCode = 200;
              res.end(html);
              return;
            } catch {
              next();
              return;
            }
          }

          next();
        });
      },
    },
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
