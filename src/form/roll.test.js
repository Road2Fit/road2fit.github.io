// 4.48.4 : téléphone tenu couché alors que l'écran de l'appli reste en hauteur (personne tournée d'un quart de tour).
import { describe, it, expect } from 'vitest';
import { rollFromGravity, rotateLm, rotateFrames } from './roll';
import { analyzeSet, liveCount } from './analyze';
import { patternFor } from './patterns';
import { timeline, makeFrames, squatBody, pullUpBody } from './synth';

describe('sens du téléphone d’après le capteur', () => {
  it('debout, couché d’un côté ou de l’autre, à l’envers, à plat', () => {
    expect(rollFromGravity({ x: 0.3, y: 9.7, z: 1 })).toBe(0);
    // haut du téléphone vers la gauche : le haut du monde est à droite de l'image → quart de tour à gauche
    expect(rollFromGravity({ x: 9.6, y: 0.5, z: 1 })).toBe(3);
    expect(rollFromGravity({ x: -9.6, y: 0.5, z: 1 })).toBe(1);
    expect(rollFromGravity({ x: 0, y: -9.7, z: 0 })).toBe(2);
    expect(rollFromGravity({ x: 0.5, y: 0.8, z: 9.7 })).toBeNull();
    expect(rollFromGravity(null)).toBeNull();
  });
  it('écran qui a tourné avec le téléphone : l’image est déjà droite', () => {
    expect(rollFromGravity({ x: 9.6, y: 0, z: 0 }, { screenAngle: 90 })).toBe(0);
    expect(rollFromGravity({ x: -9.6, y: 0, z: 0 }, { screenAngle: 270 })).toBe(0);
  });
  it('caméra de face (gauche / droite inversées) et iOS (signes inversés)', () => {
    expect(rollFromGravity({ x: 9.6, y: 0, z: 0 }, { front: true })).toBe(1);
    expect(rollFromGravity({ x: -9.6, y: 0, z: 0 }, { ios: true })).toBe(3);
    expect(rollFromGravity({ x: 0, y: -9.7, z: 0 }, { ios: true })).toBe(0);
  });
  it('quatre quarts de tour = image de départ ; aspect inversé', () => {
    const lm = [{ x: 0.2, y: 0.7, z: 0, visibility: 1 }];
    expect(rotateLm(rotateLm(rotateLm(rotateLm(lm, 1), 1), 1), 1)[0].x).toBeCloseTo(0.2);
    expect(rotateLm(lm, 1)[0]).toMatchObject({ x: 0.30000000000000004, y: 0.2 });
    const r = rotateFrames([{ t: 0, lm, wl: null }], 1, 9 / 16);
    expect(r.aspect).toBeCloseTo(16 / 9);
    const back = rotateFrames(r.frames, 3, r.aspect);
    expect(back.frames[0].lm[0].x).toBeCloseTo(0.2);
    expect(back.frames[0].lm[0].y).toBeCloseTo(0.7);
  });
});

describe('analyse d’une vidéo filmée téléphone couché', () => {
  // la scène vue droite (image en largeur), puis telle que le téléphone couché la filme : image en hauteur, tournée
  const filmed = (fr, roll) => rotateFrames(fr, (4 - roll) % 4, 16 / 9);
  const cases = [
    ['squats', patternFor({ catalogId: 'squat', name: 'Squat' }), makeFrames(timeline({ reps: 6 }), d => squatBody(d), { aspect: 16 / 9 }), 6],
    ['tractions', patternFor({ catalogId: 'pullups', name: 'Tractions' }), makeFrames(timeline({ reps: 7 }), d => pullUpBody(d), { aspect: 16 / 9 }), 7],
  ];
  for (const [name, P, fr, n] of cases) {
    it(`${name} : même compte que filmé droit, dans les deux sens`, () => {
      expect(analyzeSet(fr, P, { aspect: 16 / 9 }).repCount).toBe(n);
      for (const roll of [1, 3]) {
        const v = filmed(fr, roll);
        expect(v.aspect).toBeCloseTo(9 / 16);
        expect(analyzeSet(v.frames, P, { aspect: v.aspect, roll }).repCount).toBe(n);
        expect(liveCount(v.frames, P, { aspect: v.aspect, roll })).toBe(n);
      }
    });
  }
  it('capteur aux signes inversés (côté opposé, ou « à l’envers » pour un téléphone droit) : rattrapé', () => {
    for (const [, P, fr, n] of cases) {
      const v = filmed(fr, 1);
      expect(analyzeSet(v.frames, P, { aspect: v.aspect, roll: 3 }).repCount).toBe(n);
      expect(analyzeSet(fr, P, { aspect: 16 / 9, roll: 2 }).repCount).toBe(n);
    }
  });
  it('tractions sans tenir compte du sens : le comptage se trompait (ce que vivait Gabin)', () => {
    const [, P, fr] = cases[1];
    const v = filmed(fr, 1);
    const res = analyzeSet(v.frames, P, { aspect: v.aspect });
    expect(res.ok && res.repCount === 7).toBe(false);
  });
});
