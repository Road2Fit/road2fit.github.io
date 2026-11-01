import { defineConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react';

// `base: './'` : l'application fonctionne sous n'importe quel sous-dossier
// (GitHub Pages : https://<compte>.github.io/<depot>/).
export default defineConfig({
  base: './',
  plugins: [react({ jsxImportSource: 'art-jsx' })], // src/jsx : les emojis affichés deviennent les logos maison
  resolve: { alias: { 'art-jsx/jsx-runtime': path.resolve('src/jsx/jsx-runtime.js'), 'art-jsx/jsx-dev-runtime': path.resolve('src/jsx/jsx-dev-runtime.js') } },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 700 },
  server: { host: true },
  test: { environment: 'node', include: ['src/**/*.test.js', 'tests/**/*.test.js'] },
});
