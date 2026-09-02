import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-96x96.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mezzi MRS',
        short_name: 'Mezzi MRS',
        description: 'Gestione parco mezzi aziendali',
        theme_color: '#0d0f14',
        background_color: '#0d0f14',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
  },
  // Build -> wwwroot del backend: un solo processo (Kestrel) serve API + frontend.
  // In sviluppo resta invariato: due server separati con proxy su /api (vedi sotto).
  build: {
    outDir: '../Api/wwwroot',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // Porta dedicata allo sviluppo: evita collisioni con altri backend
      // locali che usano comunemente la 5000.
      "/api": "http://localhost:5050",
      "/hubs": { target: "http://localhost:5050", ws: true },
    },
  }
})
