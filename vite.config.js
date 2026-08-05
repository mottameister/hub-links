import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const staticEntries = [
  'status',
  'coruja-shop/assets',
  'coruja-shop/admin',
  'coruja-shop/coruja-shop.js',
  'coruja-shop/coruja-shop.css',
  'coruja-cup/admin',
  'coruja-cup/controls.js',
  'coruja-cup/coruja-cup.js',
  'coruja-cup/coruja-cup.css',
  'prompts',
  'propostas',
  'honey',
  'gt-engineer',
  'mottafit',
  'profile.jpeg',
  'preview.png',
  'site-controls.js',
  'site-controls.css',
  'site.webmanifest',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png'
];

function copyLegacyStaticRoutes() {
  return {
    name: 'copy-legacy-static-routes',
    closeBundle() {
      const outputDir = resolve('dist');
      mkdirSync(outputDir, { recursive: true });

      for (const entry of staticEntries) {
        const source = resolve(entry);
        if (!existsSync(source)) continue;
        cpSync(source, resolve(outputDir, entry), { recursive: true });
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyLegacyStaticRoutes()],
  build: {
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        mediaKit: resolve('media-kit/index.html'),
        gtEngineer: resolve('gt-engineer/index.html'),
        mottafit: resolve('mottafit/index.html'),
        corujaShop: resolve('coruja-shop/index.html'),
        corujaCup: resolve('coruja-cup/index.html')
      }
    }
  }
});
