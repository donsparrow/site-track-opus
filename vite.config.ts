import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icons/*.png"],
      manifest: {
        name: "GestãoPro",
        short_name: "GestãoPro",
        description: "Sistema de Gestão de Projetos – J&A Engenharia",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#14213D",
        icons: [
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/calendario\/callback/, /^\/api\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "html-cache", networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && /\.(?:js|css|woff2?)$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "asset-cache", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "image-cache", expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
            handler: "NetworkFirst",
            options: { cacheName: "supabase-cache", networkTimeoutSeconds: 6 },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
