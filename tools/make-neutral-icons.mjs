// Génère les icônes de l'édition Road2Fit (public/neutral/) : l'« haltère néon » choisi par Gabin le 06/11/2026
// (tube vert citron avec un cœur clair et un halo, sur fond noir légèrement éclairé au centre).
// Dessin calculé pixel par pixel (distance aux traits), sans bibliothèque d'image. Usage : node tools/make-neutral-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/neutral');
fs.mkdirSync(OUT, { recursive: true });

const NEON = [198, 255, 61];
const CORE = [244, 255, 214];
const BG_IN = [28, 31, 23];
const BG_OUT = [10, 10, 10];

// Haltère sur une grille de 512 : traits (segments) et contours de rectangles arrondis
const SEGS = [[86, 216, 86, 296], [426, 216, 426, 296], [196, 256, 316, 256]];
const RECTS = [[128, 170, 68, 172, 20], [316, 170, 68, 172, 20]];
const TUBE = 11; // demi-épaisseur du tube
const CORE_W = 3; // demi-épaisseur du cœur clair

const segDist = (x, y, [x1, y1, x2, y2]) => {
  const dx = x2 - x1; const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
};
// distance au CONTOUR d'un rectangle arrondi
const rectDist = (x, y, [rx, ry, w, h, r]) => {
  const cx = rx + w / 2; const cy = ry + h / 2;
  const qx = Math.abs(x - cx) - (w / 2 - r); const qy = Math.abs(y - cy) - (h / 2 - r);
  const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  return Math.abs(out);
};
const dist = (x, y) => Math.min(...SEGS.map(s => segDist(x, y, s)), ...RECTS.map(r => rectDist(x, y, r)));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp01 = v => Math.max(0, Math.min(1, v));

/** Couleur d'un point (coordonnées de la grille 512) : fond + halo + tube + cœur. */
function shade(x, y) {
  const rr = Math.hypot(x - 256, y - 205) / 362;
  let c = mix(BG_IN, BG_OUT, clamp01(rr));
  const d = dist(x, y);
  const glow = Math.exp(-Math.max(0, d - TUBE) / 26) * 0.55; // halo
  c = mix(c, NEON, glow);
  c = mix(c, NEON, clamp01(TUBE + 0.75 - d)); // tube
  c = mix(c, CORE, clamp01(CORE_W + 0.75 - d)); // cœur clair
  return c;
}

const inRoundSquare = (x, y, size, r) => {
  const cx = Math.min(Math.max(x, r), size - r); const cy = Math.min(Math.max(y, r), size - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

/** size : côté ; scale : taille du dessin (maskable : plus petit, zone sûre d'Android) ; round : coins arrondis transparents. */
function icon(size, { scale = 1, round = true } = {}) {
  const png = new PNG({ width: size, height: size });
  const S = 3; // sur-échantillonnage (bords lisses)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let acc = [0, 0, 0]; let cover = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const fx = px + (sx + 0.5) / S; const fy = py + (sy + 0.5) / S;
        if (round && !inRoundSquare(fx, fy, size, size * 0.22)) continue;
        const gx = 256 + ((fx / size) * 512 - 256) / scale; const gy = 256 + ((fy / size) * 512 - 256) / scale;
        const c = shade(gx, gy);
        acc = acc.map((v, i) => v + c[i]); cover++;
      }
      const idx = (size * py + px) << 2;
      const n = cover || 1;
      png.data[idx] = Math.round(acc[0] / n); png.data[idx + 1] = Math.round(acc[1] / n); png.data[idx + 2] = Math.round(acc[2] / n);
      png.data[idx + 3] = Math.round((cover / (S * S)) * 255);
    }
  }
  return PNG.sync.write(png);
}

fs.writeFileSync(path.join(OUT, 'favicon-32.png'), icon(32, { scale: 1.15 }));
fs.writeFileSync(path.join(OUT, 'favicon-48.png'), icon(48, { scale: 1.15 }));
fs.writeFileSync(path.join(OUT, 'icon-192.png'), icon(192));
fs.writeFileSync(path.join(OUT, 'icon-512.png'), icon(512));
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), icon(512, { scale: 0.78, round: false }));
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), icon(180, { round: false }));
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: 'Road2Fit', short_name: 'Road2Fit', description: 'Suivi de musculation : coach, journal de séances et progression.', lang: 'fr',
  start_url: '../', scope: '../', display: 'standalone', orientation: 'any', background_color: '#0d0d0d', theme_color: '#0d0d0d',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));
console.log('icônes Road2Fit (haltère néon) ok');
