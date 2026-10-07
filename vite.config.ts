/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// BASE_PATH permite publicar em subpasta (ex.: GitHub Pages em /Nexora-Finance/).
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Bibliotecas de exportação (PDF) são carregadas sob demanda; não entram no precache.
        globIgnores: ['**/jspdf*', '**/html2canvas*', '**/purify*', '**/banks/**'],
      },
      devOptions: { enabled: false, type: 'module' },
      manifest: {
        name: 'Nexora Finance',
        short_name: 'Nexora',
        description: 'Inteligência financeira em um só lugar.',
        lang: 'pt-BR',
        start_url: './app',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#07080c',
        theme_color: '#07080c',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Nova despesa', url: './app/transacoes?nova=expense', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Nova receita', url: './app/transacoes?nova=income', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    // Divisão automática por rota (lazy): cada tela baixa só o que usa.
    // Gráficos, PDF e Excel ficam fora da página inicial.
    target: 'es2022',
    cssMinify: true,
    reportCompressedSize: false,
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'], setupFiles: ['src/test/setup.ts'] },
});
