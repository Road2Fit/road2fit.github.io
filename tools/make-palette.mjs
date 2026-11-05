// Génère src/palette.css : les couleurs « d'accent » (rose, fuchsia, violet…) et l'ardoise (slate, fonds et bordures)
// passent par des variables CSS.
//  - édition normale : palette Tailwind d'origine (rose / Rondoudou) ;
//  - édition neutre (data-style="neutral") : tons bleu / ardoise ;
//  - thème « néon de salle » (data-theme="neon", choisi dans Plus → Style) : fond presque noir, accent vert citron.
// Usage : node tools/make-palette.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import colors from 'tailwindcss/colors.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const NEUTRAL_OF = { pink: 'sky', fuchsia: 'blue', purple: 'blue', violet: 'blue', indigo: 'slate', slate: 'slate', sky: 'sky', blue: 'blue', cyan: 'cyan', teal: 'teal', emerald: 'emerald' };
// néon : un seul accent (vert citron « surligneur ») ; les teintes secondaires deviennent des gris chauds
const LIME = { 50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#d4ff6b', 400: '#c6ff3d', 500: '#c6ff3d', 600: '#c6ff3d', 700: '#a3e635', 800: '#3f6212', 900: '#365314', 950: '#1a2e05' };
const NEON_OF = { pink: LIME, fuchsia: LIME, purple: colors.stone, violet: colors.stone, indigo: colors.stone, slate: colors.neutral, sky: LIME, blue: LIME, cyan: LIME, teal: LIME, emerald: LIME };

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(' ');
let base = ':root {\n';
let neutral = ':root[data-style="neutral"] {\n';
let neon = ':root[data-theme="neon"] {\n';
for (const [name, to] of Object.entries(NEUTRAL_OF)) {
  for (const s of SHADES) {
    base += `  --${name}-${s}: ${rgb(colors[name][s])};\n`;
    neutral += `  --${name}-${s}: ${rgb(colors[to][s])};\n`;
    neon += `  --${name}-${s}: ${rgb(NEON_OF[name][s])};\n`;
  }
}
// couleurs de néon au choix (Plus → Couleur du néon) : la teinte d'accent remplace le vert citron
const mix = (hex, to, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + parseInt(to.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
const rampOf = hex => ({ 50: mix(hex, '#ffffff', 0.92), 100: mix(hex, '#ffffff', 0.82), 200: mix(hex, '#ffffff', 0.62), 300: mix(hex, '#ffffff', 0.25), 400: hex, 500: hex, 600: hex, 700: mix(hex, '#000000', 0.18), 800: mix(hex, '#000000', 0.62), 900: mix(hex, '#000000', 0.7), 950: mix(hex, '#000000', 0.84) });
export const NEON_COLORS = {
  lime: { hex: '#c6ff3d', rot: 38 }, yellow: { hex: '#ffe23d', rot: 12 }, orange: { hex: '#ff8a1f', rot: -12 }, red: { hex: '#ff3b5c', rot: -46 },
  magenta: { hex: '#ff3df2', rot: 262 }, violet: { hex: '#a66bff', rot: 222 }, blue: { hex: '#3d8bff', rot: 178 }, cyan: { hex: '#22e5ff', rot: 150 },
};
let accents = '';
for (const [id, c] of Object.entries(NEON_COLORS)) {
  const r = rampOf(c.hex);
  accents += `:root[data-theme="neon"][data-neon="${id}"] {\n  --neon: ${c.hex};\n  --neon-rgb: ${rgb(c.hex)};\n  --neon-rot: ${c.rot}deg;\n`;
  for (const name of ['pink', 'fuchsia', 'sky', 'blue', 'cyan', 'teal', 'emerald']) for (const s of SHADES) accents += `  --${name}-${s}: ${rgb(r[s])};\n`;
  accents += '}\n';
}
fs.writeFileSync(path.join(ROOT, 'src/palette.css'), `/* Fichier généré par tools/make-palette.mjs : ne pas modifier à la main. */\n${base}}\n${neutral}}\n${neon}}\n${accents}`);
fs.writeFileSync(path.join(ROOT, 'src/data/neonColors.json'), JSON.stringify(Object.fromEntries(Object.entries(NEON_COLORS).map(([k, v]) => [k, v.hex]))));
fs.writeFileSync(path.join(ROOT, 'palette-colors.json'), JSON.stringify({ names: Object.keys(NEUTRAL_OF), shades: SHADES }));
console.log('palette ok');
