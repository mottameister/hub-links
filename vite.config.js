import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const staticEntries = [
  'status',
  'coruja-shop',
  'coruja-cup',
  'prompts',
  'propostas',
  'media-kit',
  'honey',
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
  plugins: [react(), copyLegacyStaticRoutes()]
});
