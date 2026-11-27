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

// 4.55 (sécurité) : politique de contenu (CSP) dans la page publiée : un script injecté (pseudo, note, exercice partagé…)
// ne pourrait ni s'exécuter ni envoyer de données ailleurs. Autorisés : l'appli elle-même, Supabase (comptes, coach IA),
// MediaPipe (analyse vidéo : fichiers sur jsDelivr et Google Storage), Google Fonts. GitHub Pages ne permet pas d'en-têtes :
// balise <meta> (frame-ancestors n'y est pas pris en compte).
// Adresses ÉPINGLÉES (relecture architect) : le projet Supabase de l'appli seulement (pas n'importe quel *.supabase.co, où
// un script injecté pourrait envoyer un mot de passe), et seulement les dossiers MediaPipe utilisés (pas tout jsDelivr, d'où
// l'on pourrait charger n'importe quel paquet). Ces adresses doivent rester celles de src/config.js et src/form/pose.js
// (vérifié par src/sync/securite.test.js) ; toute nouvelle adresse extérieure doit être ajoutée ici.
export const CSP_HOSTS = {
  supabase: 'https://vvsmienmspftdzqykhnt.supabase.co',
  mediapipeWasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm/',
  mediapipeModels: 'https://storage.googleapis.com/mediapipe-models/',
};
export const CSP = [
  "default-src 'self'",
  `script-src 'self' ${CSP_HOSTS.mediapipeWasm} 'wasm-unsafe-eval'`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  `connect-src 'self' ${CSP_HOSTS.supabase} ${CSP_HOSTS.mediapipeWasm} ${CSP_HOSTS.mediapipeModels}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
function securityMeta() {
  return {
    name: 'road2fit-csp',
    apply: 'build',
    // en tête de <head> : avant toute feuille de style ou tout script (et sans dépendre du texte exact de index.html)
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
    ],
  };
}

// numéro de la version construite (dernière note) : comparé à version.json en ligne pour savoir s'il y a plus récent
const { PATCH_NOTES: NOTES } = await import(pathToFileURL(path.resolve('src/data/patchNotes.js')).href);

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify((NOTES[0] && NOTES[0].version) || '') },
  plugins: [react({ jsxImportSource: 'art-jsx' }), versionFile(), securityMeta()], // src/jsx : les emojis affichés deviennent les logos maison
  resolve: { alias: { 'art-jsx/jsx-runtime': path.resolve('src/jsx/jsx-runtime.js'), 'art-jsx/jsx-dev-runtime': path.resolve('src/jsx/jsx-dev-runtime.js') } },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 700 },
  server: { host: true },
  test: { environment: 'node', include: ['src/**/*.test.js', 'tests/**/*.test.js'] },
});
