import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Configuracao do Vite. O plugin PWA gera o service worker que faz o app
// funcionar offline depois do primeiro carregamento.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icone-192.png', 'icone-512.png'],
      manifest: {
        name: 'Prancha CAA - Comunicacao Alternativa',
        short_name: 'Prancha CAA',
        description: 'Prancha de comunicacao aumentativa e alternativa em portugues do Brasil',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        theme_color: '#1d4ed8',
        categories: ['medical', 'education', 'productivity'],
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Tudo que o app precisa e estatico: cacheamos no primeiro acesso.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webp}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html'
      }
    })
  ]
});
