import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/* CSP is injected at build time only — the dev server needs inline scripts
   (react-refresh) and websockets (HMR) that production must not allow. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "connect-src 'self' https://site.api.espn.com https://site.web.api.espn.com https://sports.core.api.espn.com https://generativelanguage.googleapis.com https://api.open-meteo.com https://golazo-api-proxy.pbparthas.workers.dev",
  "img-src 'self' data: https://a.espncdn.com https://media.api-sports.io",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

const injectCsp = () => ({
  name: "inject-csp",
  apply: "build",
  transformIndexHtml(html) {
    return html.replace(
      "<head>",
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`
    );
  },
});

export default defineConfig({
  base: "/wc-tracker/",
  plugins: [
    react(),
    injectCsp(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Golazo — World Cup 2026",
        short_name: "Golazo",
        description: "IST-first FIFA World Cup 2026 tracker: live scores, groups, bracket and stories.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0B1512",
        theme_color: "#0B1512",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname === "site.api.espn.com" ||
              url.hostname === "site.web.api.espn.com" ||
              url.hostname === "sports.core.api.espn.com",
            handler: "NetworkFirst",
            options: {
              cacheName: "espn-api",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 3 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === "api.open-meteo.com",
            handler: "NetworkFirst",
            options: {
              cacheName: "weather",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 3 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === "a.espncdn.com",
            handler: "CacheFirst",
            options: {
              cacheName: "espn-img",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          /* generativelanguage.googleapis.com deliberately has NO rule:
             the service worker must never cache Gemini requests/responses. */
        ],
      },
    }),
  ],
});
