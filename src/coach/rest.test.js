import { describe, expect, it } from 'vitest';
import { restFor, restText } from './rest';

const sec = (name, reps, extra = {}) => restFor({ name, reps, ...extra }).sec;

describe('repos selon l’exercice et la charge', () => {
  it('tractions à 8 reps : 3 min (gros exercice, charge assez lourde)', () => {
    expect(sec('Tractions Pronation', 8)).toBe(180);
    expect(sec('Tractions Pronation', 5)).toBe(210);
  });
  it('plus lourd = plus long ; gros exercice de jambes encore plus long', () => {
    expect(sec('Squat Barre', 5)).toBeGreaterThan(sec('Squat Barre', 10));
    expect(sec('Squat Barre', 8)).toBeGreaterThan(sec('Développé Couché Barre', 8));
    expect(sec('Soulevé de Terre', 5)).toBe(240);
  });
  it('isolation et petits muscles : plus court, jamais moins de 60 s', () => {
    expect(sec('Curl Biceps Haltères', 10)).toBe(75);
    expect(sec('Élévations Latérales', 15)).toBe(60);
    expect(sec('Mollets à la Presse', 20, { compound: true })).toBe(60);
    expect(sec('Leg Extension', 10, { compound: false })).toBe(105);
  });
  it('exercice tenu : 1 min ; texte lisible', () => {
    expect(sec('Gainage Planche', 45, { timed: true })).toBe(60);
    expect(restText(150)).toBe('2 min 30');
    expect(restText(180)).toBe('3 min');
    expect(restText(45)).toBe('45 s');
  });
  it('le coach donne ce repos dans la séance', async () => {
    const { computeExerciseTarget } = await import('./targets');
    const q = { id: 'q', name: 'Tractions Pronation', category: 'Dos', type: 'strength', unit: 'reps', goalSets: 4, goalReps: 8, setDetails: [8, 8, 8, 8], currentValue: 8, startAssistanceKg: 0, history: [] };
    expect(computeExerciseTarget(q, { today: '2026-11-05' }).restSec).toBeGreaterThanOrEqual(150);
  });
});
