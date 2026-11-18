import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { videosApi } from './tools/videos-api.mjs';

export default defineConfig({
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // slayt görselleri kendi klasörlerinde: mobil set service worker önbelleğine alınmaz (mobilde slayt yok)
        assetFileNames: (info: { originalFileNames?: string[]; names?: string[] }) => {
          const src = info.originalFileNames?.[0] ?? '';
          const m = /src\/slides\/(web|mobile)\//.exec(src);
          return m ? `assets/slides/${m[1]}/[name]-[hash][extname]` : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  plugins: [
    videosApi(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Piyalepaşa Sahne',
        short_name: 'Piyalepaşa',
        description: 'Piyalepaşa Sahne programı',
        lang: 'tr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // ana ekrandan açıldığında telefonda ekran dönmez (masaüstü / tablet etkilenmez)
        orientation: 'portrait',
        theme_color: '#ECEBE8',
        background_color: '#2A2D31',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['img/**', 'assets/slides/mobile/**'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // tam ekran videoları (YouTube, Vimeo, mp4): service worker önbelleğe almaz
            urlPattern: ({ url }) =>
              /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|ggpht\.com|vimeo\.com|vimeocdn\.com)$/.test(url.hostname) ||
              /\.(mp4|m4v|webm)$/i.test(url.pathname),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/img/'),
            handler: 'CacheFirst',
            options: { cacheName: 'img', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('typekit.net'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts' },
          },
        ],
      },
    }),
  ],
});
