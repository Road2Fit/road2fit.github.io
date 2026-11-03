// Niveau réel déclaré (débutant / avancé / expert) : effets sur le coach.
import { describe, expect, it } from 'vitest';
import { DEMO_STATE } from '../../tests/ui/demo';
import { applyMethods } from './methodChoice';
import { detrainFactor, entriesBeforeMethods, experienceCoachPatch, isBeginnerForVolume, personalBand } from './experience';
import { applyOnboarding } from '../lib/onboarding';
import { INITIAL_STATE } from '../data/initialState';

const E = { questId: 'q_squat_3x6', catalogId: 'squat', name: 'Squat', kind: 'load', load: 80, assist: 0, sets: 3, targetReps: [6, 6, 6], restSec: 150, arena: 'Jambes', compound: true };
const st = (experience, extra = {}) => ({
  ...DEMO_STATE,
  coach: { ...DEMO_STATE.coach, experience },
  quests: DEMO_STATE.quests.map(q => (q.id === 'q_squat_3x6' ? { ...q, history: (q.history || []).filter(h => /Point de départ/.test(h.note || '')), ...extra } : q)),
});

describe('niveau déclaré', () => {
  it('avancé : formes variées tout de suite sur un exercice connu, 2 séances sur un nouveau ; débutant : 6', () => {
    expect(entriesBeforeMethods(st({ level: 'beginner' }), {})).toBe(6);
    expect(entriesBeforeMethods(st({ level: 'advanced' }), { known: true })).toBe(0);
    expect(entriesBeforeMethods(st({ level: 'expert' }), {})).toBe(2);
    expect(applyMethods(st(null, { known: true }), [E], { iso: '2026-10-21' }).exercises[0].method).toBe('straight');
    const seen = new Set();
    for (let w = 0; w < 8; w++) seen.add(applyMethods(st({ level: 'advanced' }, { known: true }), [E], { iso: `2026-11-${String(2 + w * 3).padStart(2, '0')}` }).exercises[0].method);
    expect(seen.size).toBeGreaterThan(1);
  });
  it('expert : seulement les formes qu’il connaît, une série de plus sur ses muscles prioritaires', () => {
    for (let w = 0; w < 8; w++) {
      const r = applyMethods(st({ level: 'expert', methods: ['top_backoff'], priorities: ['Jambes'] }, { known: true }), [E], { iso: `2026-11-${String(2 + w * 3).padStart(2, '0')}` });
      expect(['straight', 'top_backoff']).toContain(r.exercises[0].method);
      expect(r.exercises[0].sets).toBe(4);
    }
  });
  it('repères de séries : volume habituel de l’expert (+20 %), débutant déclaré', () => {
    const band = { min: 6, good: 10, max: 20 };
    expect(personalBand(band, st({ level: 'expert', weeklySets: 15 }))).toMatchObject({ min: 12, good: 18, max: 22, personal: true });
    expect(personalBand(band, st({ level: 'advanced', weeklySets: 15 }))).toBe(band);
    expect(isBeginnerForVolume(st({ level: 'beginner' }), 40)).toBe(true);
    expect(isBeginnerForVolume(st({ level: 'advanced' }), 0)).toBe(false);
    expect(isBeginnerForVolume(st(null), 5)).toBe(true);
  });
  it('arrêt : charges de départ plus prudentes ; expert par blocs : cycles réglés, limites retenues', () => {
    expect([0, 2, 6, 18].map(detrainFactor)).toEqual([1, 0.95, 0.9, 0.8]);
    const p = experienceCoachPatch({ memory: [] }, { level: 'expert', periodization: 'blocks', deloadEvery: 0, limits: 'genou gauche' }, '2026-11-04');
    expect(p).toMatchObject({ cycleWeeks: 4, cycleStart: '2026-11-02', cycleProfiles: ['hypertrophie', 'puissance'] });
    expect(p.memory[0].text).toBe('Limites physiques : genou gauche');
  });
  it('assistant : un avancé après un an d’arrêt repart 20 % plus bas', () => {
    const base = { weightKg: 80, goal: 'muscle', exercises: [{ catalogId: 'bench_press', kg: 100, reps: 1 }] };
    const a = applyOnboarding(INITIAL_STATE, { ...base, level: 'advanced', experience: { breakMonths: 0 } }, '2026-11-03');
    const b = applyOnboarding(INITIAL_STATE, { ...base, level: 'advanced', experience: { breakMonths: 18 } }, '2026-11-03');
    expect(a.quests[0].known).toBe(true);
    expect(b.quests[0].startValue).toBeLessThan(a.quests[0].startValue * 0.85);
    expect(b.coach.experience).toMatchObject({ level: 'advanced', breakMonths: 18 });
  });
});
