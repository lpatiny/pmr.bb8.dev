import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // autoUpdate makes the new service worker take over immediately
      // (skipWaiting + clientsClaim) so a redeploy is applied without the user
      // having to close every tab.
      registerType: 'autoUpdate',
      /* eslint-disable camelcase -- Web App Manifest keys are snake_case by spec */
      manifest: {
        name: 'Trains accessibles (PMR)',
        short_name: 'Trains PMR',
        description:
          'Trains directs accessibles aux personnes à mobilité réduite et aux vélos, consultables hors ligne.',
        lang: 'fr',
        display: 'standalone',
        theme_color: '#2e7d32',
        background_color: '#eef2f6',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      /* eslint-enable camelcase */
      workbox: {
        // Serve the app shell for any navigation when offline.
        navigateFallback: 'index.html',
        // Drop caches from previous service-worker versions on activation.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // The station list rarely changes: serve it instantly from cache
            // and refresh it in the background when online.
            urlPattern: /\/api\/v1\/stations$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-stations',
              expiration: { maxEntries: 1, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Always try the network first so the timetable stays up to date,
            // but fall back to the last cached answer when offline.
            urlPattern: /\/api\/v1\/trains/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-trains',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 2 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'esnext',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
