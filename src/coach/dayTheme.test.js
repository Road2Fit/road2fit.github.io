// 4.36 : thème de séance choisi pour un jour (haut, bas, pousser, tirer, complet), par la personne ou par le coach IA.
import { describe, expect, it } from 'vitest';
import { coachOverview } from './advice';
import { coachPlanWeek } from './planning';
import { setDayType, dayTypeOf } from './dayTheme';
import { normalizeAction, applyAction } from '../ai/actions';

const q = (id, name, category) => ({ id, name, category, type: 'strength', unit: 'kg', goalMode: 'sets_reps', level: 1, startValue: 40, currentValue: 40, goalValue: 80, goalSets: 3, goalReps: 8, setDetails: [8, 8, 8], history: [] });
const QUESTS = [
  q('sq', 'Squat Barre', 'Jambes'), q('rdl', 'Soulevé de Terre Roumain', 'Jambes'), q('lp', 'Presse à Cuisses', 'Jambes'),
  q('bp', 'Développé Couché Barre', 'Pectoraux'), q('inc', 'Développé Incliné Haltères', 'Pectoraux'),
  q('row', 'Rowing Barre Buste Penché', 'Dos'), q('pu', 'Tirage Vertical Poulie Haute', 'Dos'),
  q('ohp', 'Développé Militaire', 'Épaules & Bras'), q('curl', 'Curl Biceps Barre EZ', 'Épaules & Bras'), q('tri', 'Extension Triceps Poulie Haute (Corde)', 'Épaules & Bras'),
];
const slot = { start: '18:00', end: '19:30' };
const TODAY = '2026-11-09'; // lundi
const base = (extra = {}) => ({ quests: QUESTS, userWeightKg: 80, coach: { sessionsPerWeek: 3, sessionMinutes: 60, volleyDays: [], sport: '', matchDates: [], gymSlots: { 1: slot, 3: slot, 5: slot }, ...extra } });
const ids = s => s.exercises.map(e => e.questId);

describe('thème de séance choisi', () => {
  it('setDayType : un thème par jour, les jours passés sont retirés, null = le coach décide', () => {
    let m = setDayType({ dayTypes: { '2026-11-01': 'PUSH' } }, '2026-11-10', 'PULL', TODAY);
    expect(m).toEqual({ '2026-11-10': 'PULL' });
    m = setDayType({ dayTypes: m }, '2026-11-10', null, TODAY);
    expect(m).toEqual({});
    expect(dayTypeOf({ dayTypes: { x: 'NOPE' } }, 'x')).toBeNull();
  });

  it('pousser : seulement pectoraux, épaules, triceps ; tirer : dos et biceps', () => {
    const first = coachOverview(base(), TODAY).first.iso;
    const push = coachOverview(base({ dayTypes: { [first]: 'PUSH' } }), TODAY).session;
    expect(push.type).toBe('PUSH');
    expect(push.chosenType).toBe('PUSH');
    expect(ids(push)).toEqual(expect.arrayContaining(['bp']));
    ids(push).forEach(id => expect(['row', 'pu', 'curl', 'sq', 'rdl', 'lp']).not.toContain(id));
    const pull = coachOverview(base({ dayTypes: { [first]: 'PULL' } }), TODAY).session;
    expect(pull.type).toBe('PULL');
    expect(ids(pull)).toEqual(expect.arrayContaining(['row']));
    ids(pull).forEach(id => expect(['bp', 'inc', 'ohp', 'tri', 'sq', 'rdl', 'lp']).not.toContain(id));
  });

  it('haut / bas du corps', () => {
    const first = coachOverview(base(), TODAY).first.iso;
    const up = coachOverview(base({ dayTypes: { [first]: 'UPPER' } }), TODAY).session;
    ids(up).forEach(id => expect(['sq', 'rdl', 'lp']).not.toContain(id));
    const low = coachOverview(base({ dayTypes: { [first]: 'LEGS' } }), TODAY).session;
    expect(ids(low).length).toBeGreaterThan(0);
    ids(low).forEach(id => expect(['bp', 'inc', 'row', 'pu', 'ohp', 'curl', 'tri']).not.toContain(id));
  });

  it('le planning de la semaine affiche le thème choisi', () => {
    const st = base({ dayTypes: { '2026-11-11': 'PULL' } });
    const w = coachPlanWeek(st, TODAY, TODAY);
    expect(w.planned).toContain('2026-11-11');
    expect(w.days.find(d => d.iso === '2026-11-11').type).toBe('PULL');
  });

  it('coach IA : « demain je veux une séance de tirer » (jour sans séance prévue : ajoutée)', () => {
    const st = base();
    const a = normalizeAction({ type: 'day_theme', label: 'Tirer demain', args: JSON.stringify({ dates: ['2026-11-10'], theme: 'pull' }) }, st, TODAY);
    expect(a).toBeTruthy();
    const next = applyAction(st, a, TODAY);
    expect(next.coach.dayTypes).toEqual({ '2026-11-10': 'PULL' });
    expect(next.coach.gymExtra).toContain('2026-11-10');
    expect(coachPlanWeek(next, TODAY, TODAY).days.find(d => d.iso === '2026-11-10').type).toBe('PULL');
    const back = applyAction(next, normalizeAction({ type: 'day_theme', label: 'Auto', args: JSON.stringify({ dates: ['2026-11-10'], theme: 'auto' }) }, next, TODAY), TODAY);
    expect(back.coach.dayTypes).toEqual({});
  });
});
