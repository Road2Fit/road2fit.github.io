import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';

// `base: './'` : l'application fonctionne sous n'importe quel sous-dossier
// (GitHub Pages : https://<compte>.github.io/<depot>/).
// Publie version.json (dernière note de src/data/patchNotes.js) : le bandeau « nouvelle version » en affiche le résumé.
function versionFile() {
  return {
    name: 'road2fit-version',
    async generateBundle() {
      const { PATCH_NOTES } = await import(pathToFileURL(path.resolve('src/data/patchNotes.js')).href + '?t=' + Date.now());
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(PATCH_NOTES[0]) });
    },
  };
}

// numéro de la version construite (dernière note) : comparé à version.json en ligne pour savoir s'il y a plus récent
const { PATCH_NOTES: NOTES } = await import(pathToFileURL(path.resolve('src/data/patchNotes.js')).href);

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify((NOTES[0] && NOTES[0].version) || '') },
  plugins: [react({ jsxImportSource: 'art-jsx' }), versionFile()], // src/jsx : les emojis affichés deviennent les logos maison
  resolve: { alias: { 'art-jsx/jsx-runtime': path.resolve('src/jsx/jsx-runtime.js'), 'art-jsx/jsx-dev-runtime': path.resolve('src/jsx/jsx-dev-runtime.js') } },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 700 },
  server: { host: true },
  test: { environment: 'node', include: ['src/**/*.test.js', 'tests/**/*.test.js'] },
});
