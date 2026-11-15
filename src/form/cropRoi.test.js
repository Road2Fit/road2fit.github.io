// 4.47.8 : zoom sur la personne avant la détection (même qualité en vertical et en horizontal).
import { describe, it, expect } from 'vitest';
import { cropFor, cropStillFits, uncrop, cropTracker, CROP_LOST } from './cropRoi';
import { personBox } from './pickPerson';
import { pushUpBody, pullUpBody, toLandmarks } from './synth';

const V = [720, 1280], H = [1280, 720];
// repères d'une personne placée dans l'image (coordonnées 0-1), à partir d'un squelette simulé réduit
const place = (b, vw, vh, { s, x0, y0 }) => toLandmarks(Object.fromEntries(Object.entries(b).map(([k, p]) => [k, { x: x0 + p.x * s, y: y0 + p.y * s }])), { aspect: vw / vh });

describe('zoom sur la personne', () => {
  it('personne allongée en vertical : le morceau est bien plus petit que l’image et la contient', () => {
    const lm = place(pushUpBody(0), ...V, { s: 0.3, x0: 0.05, y0: 0.5 });
    const box = personBox(lm, V[0] / V[1]);
    const c = cropFor(box, ...V);
    expect(c).toBeTruthy();
    expect(c.w * c.h).toBeLessThan(0.5 * V[0] * V[1]);
    for (const p of lm) {
      expect(p.x * V[0]).toBeGreaterThanOrEqual(c.x);
      expect(p.x * V[0]).toBeLessThanOrEqual(c.x + c.w);
      expect(p.y * V[1]).toBeGreaterThanOrEqual(c.y);
      expect(p.y * V[1]).toBeLessThanOrEqual(c.y + c.h);
    }
  });
  it('le morceau reste dans l’image, même personne au bord', () => {
    const c = cropFor({ cx: 0.02, cy: 0.98, size: 0.2 }, ...H);
    expect(c.x).toBe(0);
    expect(c.y + c.h).toBeLessThanOrEqual(H[1]);
  });
  it('personne qui remplit l’image : pas de zoom', () => {
    const lm = place(pullUpBody(0), ...V, { s: 0.9, x0: 0.05, y0: 0.05 });
    expect(cropFor(personBox(lm, V[0] / V[1]), ...V)).toBeNull();
  });
  it('les repères trouvés dans le morceau reviennent à leur place dans l’image entière', () => {
    const c = { x: 100, y: 400, w: 500, h: 500 };
    const [p] = uncrop([{ x: 0.5, y: 0.2, z: 0.1, visibility: 0.9 }], c, ...V);
    expect(p.x * V[0]).toBeCloseTo(350);
    expect(p.y * V[1]).toBeCloseTo(500);
    expect(p.visibility).toBe(0.9);
  });
  it('découpe stable tant que la personne reste au milieu, refaite si elle s’éloigne', () => {
    const box = { cx: 0.3, cy: 0.6, size: 0.25 };
    const c = cropFor(box, ...V);
    expect(cropStillFits(c, { ...box, cx: 0.31 }, ...V)).toBe(true);
    expect(cropStillFits(c, { ...box, cy: 0.85 }, ...V)).toBe(false);
    expect(cropStillFits(c, { ...box, size: 0.4 }, ...V)).toBe(false);
  });
  it('plus personne dans le morceau : retour à l’image entière', () => {
    const t = cropTracker();
    expect(t.next({ cx: 0.3, cy: 0.6, size: 0.25 }, true, ...V)).toBeTruthy();
    for (let k = 1; k < CROP_LOST; k++) expect(t.next(null, false, ...V)).toBeTruthy();
    expect(t.next(null, false, ...V)).toBeNull();
  });
});
