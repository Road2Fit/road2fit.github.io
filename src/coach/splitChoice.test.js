// 4.37 : rythme choisi (cas réel d'un ami : « push pull legs, 3 séances par semaine » → le coach proposait n'importe quoi).
import { describe, expect, it } from 'vitest';
import { coachOverview } from './advice';
import { coachPlanWeek } from './planning';
import { chosenRotation } from './settings';
import { normalizeAction, applyAction } from '../ai/actions';
import { addDaysISO } from '../lib/dates';

const q = (id, name, category) => ({ id, name, category, type: 'strength', unit: 'kg', goalMode: 'sets_reps', level: 1, startValue: 40, currentValue: 40, goalValue: 80, goalSets: 3, goalReps: 8, setDetails: [8, 8, 8], history: [] });
const QUESTS = [
  q('sq', 'Squat Barre', 'Jambes'), q('rdl', 'Soulevé de Terre Roumain', 'Jambes'), q('lp', 'Presse à Cuisses', 'Jambes'),
  q('bp', 'Développé Couché Barre', 'Pectoraux'), q('inc', 'Développé Incliné Haltères', 'Pectoraux'),
  q('row', 'Rowing Barre Buste Penché', 'Dos'), q('pu', 'Tirage Vertical Poulie Haute', 'Dos'),
  q('ohp', 'Développé Militaire', 'Épaules & Bras'), q('curl', 'Curl Biceps Barre EZ', 'Épaules & Bras'), q('tri', 'Extension Triceps Poulie Haute (Corde)', 'Épaules & Bras'),
];
const slot = { start: '18:00', end: '19:30' };
const MONDAY = '2026-11-16';
const st = (coach = {}) => ({ quests: QUESTS, userWeightKg: 80, coach: { sessionsPerWeek: 3, sessionMinutes: 60, volleyDays: [], sport: '', matchDates: [], gymSlots: { 1: slot, 3: slot, 5: slot }, splitMode: 'auto', ...coach } });
const types = w => w.planned.map(d => w.plannedTypes[d]);

describe('rythme choisi : push / pull / legs, haut / bas', () => {
  it('push / pull / legs avec 3 séances : une de chaque, chaque semaine', () => {
    for (let k = 0; k < 4; k++) {
      const ws = addDaysISO(MONDAY, 7 * k);
      const w = coachPlanWeek(st({ splitMode: 'ppl' }), ws, ws);
      expect(w.planned).toHaveLength(3);
      expect(types(w).slice().sort()).toEqual(['LEGS', 'PULL', 'PUSH']);
    }
  });

  it('push / pull / legs avec 2 séances : la suite continue d’une semaine à l’autre', () => {
    const seen = [];
    for (let k = 0; k < 3; k++) seen.push(...chosenRotation('ppl', 2, addDaysISO(MONDAY, 7 * k)));
    expect(seen.filter(t => t === 'PUSH')).toHaveLength(2);
    expect(seen.filter(t => t === 'PULL')).toHaveLength(2);
    expect(seen.filter(t => t === 'LEGS')).toHaveLength(2);
  });

  it('haut / bas avec 4 séances', () => {
    const w = coachPlanWeek(st({ splitMode: 'upperlower', sessionsPerWeek: 4, gymSlots: { 1: slot, 2: slot, 4: slot, 5: slot } }), MONDAY, MONDAY);
    expect(types(w).slice().sort()).toEqual(['LEGS', 'LEGS', 'UPPER', 'UPPER']);
  });

  it('la séance de poussée ne contient que de la poussée', () => {
    const ov = coachOverview(st({ splitMode: 'ppl' }), MONDAY);
    const s = ov.session;
    expect(['PUSH', 'PULL', 'LEGS']).toContain(s.type);
    const allowed = { PUSH: ['bp', 'inc', 'ohp', 'tri'], PULL: ['row', 'pu', 'curl'], LEGS: ['sq', 'rdl', 'lp'] }[s.type];
    s.exercises.forEach(e => expect(allowed).toContain(e.questId));
  });

  it('coach IA : « push pull legs, 3 séances par semaine » règle bien le rythme (avant : nombre ramené à 2 ou 3, aucun split)', () => {
    const s0 = st({ sessionsPerWeek: 2 });
    const a = normalizeAction({ type: 'schedule', label: 'Push pull legs', args: JSON.stringify({ sessionsPerWeek: 3, split: 'ppl', gymDays: [1, 3, 5] }) }, s0, MONDAY);
    const s1 = applyAction(s0, a, MONDAY);
    expect(s1.coach.splitMode).toBe('ppl');
    expect(s1.coach.sessionsPerWeek).toBe(3);
    expect(types(coachPlanWeek(s1, MONDAY, MONDAY)).slice().sort()).toEqual(['LEGS', 'PULL', 'PUSH']);
    const b = normalizeAction({ type: 'schedule', label: '5 séances', args: JSON.stringify({ sessionsPerWeek: 5 }) }, s0, MONDAY);
    expect(applyAction(s0, b, MONDAY).coach.sessionsPerWeek).toBe(5);
  });
});
