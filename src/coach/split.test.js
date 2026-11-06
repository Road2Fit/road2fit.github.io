// 4 séances ou plus par semaine : le coach passe en split (haut / bas, poussée / tirage / jambes) au lieu de n'en planifier que 2.
import { describe, expect, it } from 'vitest';
import { coachDayInfo, coachPlanWeek } from './planning';
import { coachBuildPlanned } from './sessions';
import { coachOverview } from './advice';
import { COACH_TYPES } from './settings';
import { setMuscleMode } from '../data/muscles';

const q = (id, name, category) => ({ id, name, category, type: 'strength', unit: 'kg', goalMode: 'sets_reps', level: 1, startValue: 40, currentValue: 40, goalValue: 80, goalSets: 3, goalReps: 8, setDetails: [8, 8, 8], history: [] });
const QUESTS = [
  q('sq', 'Squat Barre', 'Jambes'), q('rdl', 'Soulevé de Terre Roumain', 'Jambes'), q('lp', 'Presse à Cuisses', 'Jambes'),
  q('bp', 'Développé Couché Barre', 'Pectoraux'), q('inc', 'Développé Incliné Haltères', 'Pectoraux'),
  q('row', 'Rowing Barre Buste Penché', 'Dos'), q('pu', 'Tirage Vertical Poulie Haute', 'Dos'),
  q('ohp', 'Développé Militaire', 'Épaules & Bras'), q('curl', 'Curl Biceps Barre EZ', 'Épaules & Bras'), q('tri', 'Extension Triceps Poulie Haute (Corde)', 'Épaules & Bras'),
];
const slot = { start: '18:00', end: '19:30' };
const stateFor = (n, days) => ({
  quests: QUESTS, userWeightKg: 80,
  coach: { sessionsPerWeek: n, sessionMinutes: 60, volleyDays: [], sport: '', matchDates: [], splitMode: 'auto', gymSlots: Object.fromEntries(days.map(d => [d, slot])) },
});
const MONDAY = '2026-11-09';
const noClash = w => {
  const p = w.planned.slice().sort();
  for (let i = 1; i < p.length; i++) {
    const gap = (new Date(p[i]) - new Date(p[i - 1])) / 86400000;
    if (gap === 1) {
      const a = COACH_TYPES[w.plannedTypes[p[i - 1]]].groups; const b = COACH_TYPES[w.plannedTypes[p[i]]].groups;
      expect(a.some(x => b.includes(x)), `${p[i - 1]} ${w.plannedTypes[p[i - 1]]} / ${p[i]} ${w.plannedTypes[p[i]]}`).toBe(false);
    }
  }
};

describe('split automatique à partir de 4 séances', () => {
  setMuscleMode('simple');
  it('4 séances lun / mar / jeu / ven : les 4 sont planifiées en haut / bas', () => {
    const w = coachPlanWeek(stateFor(4, [1, 2, 4, 5]), MONDAY, MONDAY);
    expect(w.split).toBe(true);
    expect(w.planned).toEqual(['2026-11-09', '2026-11-10', '2026-11-12', '2026-11-13']);
    expect(w.shortfall).toBe(0);
    const types = w.planned.map(d => w.plannedTypes[d]);
    expect(types.filter(t => t === 'UPPER')).toHaveLength(2);
    expect(types.filter(t => t === 'LEGS')).toHaveLength(2);
    noClash(w);
  });
  it('5 et 6 séances : poussée / tirage / jambes, jamais deux jours de suite sur les mêmes muscles', () => {
    const w5 = coachPlanWeek(stateFor(5, [1, 2, 3, 4, 5, 6]), MONDAY, MONDAY);
    expect(w5.planned).toHaveLength(5);
    expect(w5.shortfall).toBe(0);
    noClash(w5);
    const w6 = coachPlanWeek(stateFor(6, [1, 2, 3, 4, 5, 6]), MONDAY, MONDAY);
    expect(w6.planned).toHaveLength(6);
    expect(w6.planned.map(d => w6.plannedTypes[d]).sort()).toEqual(['LEGS', 'LEGS', 'PULL', 'PULL', 'PUSH', 'PUSH']);
    noClash(w6);
  });
  it('3 séances ou moins : rien ne change (full body, 48 h entre deux séances)', () => {
    const w = coachPlanWeek(stateFor(3, [1, 2, 4, 5]), MONDAY, MONDAY);
    expect(w.split).toBe(false);
    expect(Object.keys(w.plannedTypes)).toHaveLength(0);
  });
  it('les séances poussée et tirage ne prennent que les exercices du bon côté', () => {
    const st = stateFor(6, [1, 2, 3, 4, 5, 6]);
    const ov = coachOverview(st, MONDAY);
    const sessions = ov.plannedAll.filter(p => p.iso < '2026-11-16').map(p => coachBuildPlanned(st, p, coachDayInfo(p.iso, ov.coach), {}));
    const push = sessions.find(s => s.type === 'PUSH');
    const pull = sessions.find(s => s.type === 'PULL');
    if (push) expect(push.exercises.map(e => e.questId)).not.toContain('curl');
    if (pull) {
      expect(pull.exercises.map(e => e.questId)).not.toContain('bp');
      expect(pull.exercises.map(e => e.questId)).not.toContain('tri');
    }
    expect(push || pull).toBeTruthy();
  });
});
