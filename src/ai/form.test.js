// 4.48.1 : points du coach IA reliés aux reps de la vidéo (bouton « Voir »).
import { describe, it, expect } from 'vitest';
import { repsInText, aiPointReps, normalizeFormAi } from './form';

describe('reps citées par le coach IA', () => {
  it('lit les numéros dans le texte', () => {
    expect(repsInText('Rep 3 pas assez ample')).toEqual([2]);
    expect(repsInText('Les reps 2 et 4 sont plus lentes')).toEqual([1, 3]);
    expect(repsInText('reps 3 à 5 : le buste part en avant')).toEqual([2, 3, 4]);
    expect(repsInText('Ta 5e rep a ralenti')).toEqual([4]);
    expect(repsInText('répétition 6 incomplète')).toEqual([5]);
    expect(repsInText('Première rep trop rapide, dernière rep courte')).toEqual([0, 'last']);
    // un nombre de reps n'est pas un numéro de rep
    expect(repsInText('Tu as fait 8 reps propres')).toEqual([]);
    expect(repsInText('Garde 1 à 2 reps en réserve')).toEqual([]);
  });
  it('préfère les numéros donnés par le serveur, limités à la série', () => {
    const ai = normalizeFormAi({ verdict: 'Correct', summary: '', nextSet: '', points: [
      { level: 'warn', title: 'Amplitude', detail: 'Rep 2 courte', fix: '', reps: [3, 9] },
      { level: 'tip', title: 'Fin de série', detail: 'Dernière rep lente', fix: '', reps: [] },
    ] });
    expect(ai.points[0].reps).toEqual([2, 8]);
    expect(aiPointReps(ai.points[0].reps, 6)).toEqual([2]);
    expect(aiPointReps(ai.points[1].reps, 6)).toEqual([5]);
  });
});
