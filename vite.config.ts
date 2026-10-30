import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'exemplos/geoalt_demo.csv'],
        manifest: {
          name: 'OpenGeoaltitude',
          short_name: 'OpenGeoaltitude',
          description:
            'Conversão de altitudes geométricas (h) em ortométricas (H) com o geóide oficial do IBGE e modelos globais abertos. UTM, datums, ITRF, DEM e serviços abertos — offline.',
          start_url: './',
          scope: './',
          display: 'standalone',
          background_color: '#f8fafc',
          theme_color: '#004a8e',
          lang: 'pt-BR',
          icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
        },
        workbox: {
          navigateFallback: 'index.html',
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          // chunks pesados lazy (plotly ~5 MB, egm96 ~2,8 MB) precisam passar do limite padrão de 2 MiB
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              // chunk do EGM96 (grade NGA): cacheado após o 1º uso — modelo global offline
              urlPattern: /egm96-universal.*\.js$/,
              handler: 'CacheFirst',
              options: { cacheName: 'egm96-grid', expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              // grade EGM2008: baixada sob demanda, fica offline para sempre
              urlPattern: /geoid\/egm2008-10\.bin$/,
              handler: 'CacheFirst',
              options: { cacheName: 'egm2008-grid', expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              urlPattern: /^https:\/\/api\.open-meteo\.com\/v1\/elevation.*/,
              handler: 'CacheFirst',
              options: { cacheName: 'dem-cache', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
