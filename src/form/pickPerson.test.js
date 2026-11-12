import { describe, expect, it } from 'vitest';
import { personBox, pickPerson } from './pickPerson';
import { toLandmarks, squatBody } from './synth';

// une personne (repères MediaPipe) placée en x, à une échelle donnée (petite = loin du téléphone)
const person = (x, scale) => toLandmarks(squatBody(0)).map(p => ({ ...p, x: x + (p.x - 0.5) * scale, y: 0.5 + (p.y - 0.5) * scale }));

describe('personne au premier plan (4.31)', () => {
  const front = { lm: person(0.5, 1) }, back = { lm: person(0.2, 0.45) };
  it('taille : la personne proche est plus grande', () => {
    expect(personBox(front.lm).size).toBeGreaterThan(personBox(back.lm).size * 1.8);
  });
  it('avant l’enregistrement : la plus grande, même donnée en second', () => {
    expect(pickPerson([back, front], 9 / 16).pose).toBe(front);
  });
  it('pendant la série : la même personne, même si une autre de taille proche apparaît', () => {
    const me = { lm: person(0.6, 0.8) }, other = { lm: person(0.25, 0.9) };
    const { track } = pickPerson([me], 9 / 16);
    expect(pickPerson([other, me], 9 / 16, track, true).pose).toBe(me);
  });
  it('pendant la série : la personne suivie sort, il ne reste que quelqu’un au fond → rien', () => {
    const { track } = pickPerson([front], 9 / 16);
    expect(pickPerson([back], 9 / 16, track, true).pose).toBeNull();
  });
});
