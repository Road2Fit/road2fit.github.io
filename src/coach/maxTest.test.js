// 4.50 : séance « Test de max » (demande de Gabin) : séance sûre, déconseillée trop tôt.
import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from '../data/catalog';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { INITIAL_STATE } from '../data/initialState';
import { addDaysISO } from '../lib/dates';
import { adaptAfterAttempt, maxTestPlan, maxTestReadiness, maxTestWarmup, pickMaxLifts } from './maxTest';
import { coachBuildPlanned } from './sessions';
import { setDayStyle, toggleDayStyle } from './contraction';
import { warmupSets } from './warmup';
import { applyStrengthSession } from '../lib/sessionRecord';

const today = '2026-11-22';
const byId = id => EXERCISE_CATALOG.find(c => c.id === id);
// exercice avec n séances de 5 reps à `kg`, une par semaine jusqu'à aujourd'hui
function quest(id, kg, n) {
  const q = makeQuestFromCatalog(byId(id), { ...INITIAL_STATE, quests: [] }, today).quest;
  const history = Array.from({ length: n }, (_, i) => ({ id: `h${id}${i}`, date: addDaysISO(today, -7 * (n - i)), value: kg, sets: 3, reps: 5, setDetails: [5, 5, 5], rpe: 8 }));
  return { ...q, currentValue: kg, history };
}
const mk = (level, n = 20, extra = {}) => ({
  ...INITIAL_STATE, userWeightKg: 80,
  quests: [quest('squat', 100, n), quest('bench_press', 80, n), quest('deadlift', 120, n), quest('pullups', 0, n)].filter(Boolean),
  coach: { ...(INITIAL_STATE.coach || {}), experience: level ? { level } : undefined, dayStyles: { [today]: 'max' }, ...extra },
});

describe('qui peut faire un vrai 1RM', () => {
  it('pratiquant avec 20 semaines et le geste rodé : oui', () => {
    expect(maxTestReadiness(mk('advanced'), today).ok).toBe(true);
  });
  it('débutant déclaré depuis moins de 12 semaines : non (test de 5 reps à la place)', () => {
    const r = maxTestReadiness(mk('beginner', 6), today);
    expect(r).toMatchObject({ ok: false, why: 'beginner' });
  });
  it('65 ans et plus : non (Pollock 1991)', () => {
    expect(maxTestReadiness(mk('advanced', 20, { profile: { age: 70 } }), today).why).toBe('age');
  });
  it('exercice fait moins de 6 fois : geste pas encore rodé', () => {
    const s = mk('advanced');
    expect(maxTestReadiness(s, today, quest('bench_press', 80, 3))).toMatchObject({ ok: false, why: 'sessions' });
  });
});

describe('séance de test', () => {
  const di = { iso: today, legsOk: true };
  it('jour « Test de max » : 1 à 3 gros exercices en kg, rien d’autre, avec les consignes de sécurité', () => {
    const s = coachBuildPlanned(mk('advanced'), { iso: today, templateIdx: 0 }, di);
    expect(s.style).toBe('max');
    expect(s.exercises.length).toBeGreaterThan(0);
    expect(s.exercises.length).toBeLessThanOrEqual(3);
    expect(s.exercises.every(e => e.method === 'max_test' && e.kind === 'load')).toBe(true);
    expect(s.exercises.every(e => e.maxMode === '1rm')).toBe(true);
    expect(s.notes.join(' ')).toMatch(/Sécurité/);
    expect(s.estMin).toBeGreaterThan(20);
    expect(s.estMin).toBeLessThan(90);
  });
  it('débutant : test de 5 reps, et la note dit pourquoi', () => {
    const s = coachBuildPlanned(mk('beginner', 6), { iso: today, templateIdx: 0 }, di);
    expect(s.exercises.every(e => e.maxMode === '5rm' && e.plan.every(p => p.reps === 5))).toBe(true);
    expect(s.notes.join(' ')).toMatch(/Pas de vrai test à 1 répétition/);
  });
  it('jambes interdites (veille de match) : pas de squat ni de soulevé de terre', () => {
    const lifts = pickMaxLifts(mk('advanced'), { legsOk: false });
    expect(lifts.map(q => q.catalogId)).not.toContain('squat');
    expect(lifts.map(q => q.catalogId)).not.toContain('deadlift');
  });
  it('essais : 95 %, 100 %, puis record ; échauffement en montée, toujours sous le 1er essai', () => {
    const e = { name: 'Développé couché', catalogId: 'bench_press', arena: 'Pectoraux', kind: 'load', load: 100, method: 'max_test', maxMode: '1rm' };
    const plan = maxTestPlan(e, '1rm');
    expect(plan.map(p => p.load)).toEqual([95, 100, 102.5]);
    expect(plan.every(p => p.reps === 1 && p.rest >= 180)).toBe(true);
    const w = warmupSets(e, [{ arena: 'Pectoraux' }]);
    expect(w).toEqual(maxTestWarmup(e));
    expect(w.length).toBeGreaterThanOrEqual(3);
    w.forEach((x, i) => { expect(x.load).toBeLessThan(95); if (i) expect(x.load).toBeGreaterThan(w[i - 1].load); });
  });
  it('essai manqué : le suivant un peu sous l’essai manqué ; deux manqués : on arrête', () => {
    const it0 = { name: 'Développé couché', catalogId: 'bench_press', arena: 'Pectoraux', kind: 'load', load: 100, method: 'max_test' };
    const plan = maxTestPlan(it0, '1rm');
    const it1 = { ...it0, plan };
    const d = { load: 100, loads: plan.map(p => p.load), reps: plan.map(p => p.reps) };
    const a = adaptAfterAttempt(it1, d, 1, 0);
    expect(a.next).toBeLessThan(100);
    expect(a.next).toBeGreaterThanOrEqual(95);
    expect(adaptAfterAttempt(it1, d, 1, 1)).toBeNull();
    const b = adaptAfterAttempt(it1, { ...d, reps: [0, 1, 1] }, 1, 0);
    expect(b.stop).toBe(true);
  });
});

describe('enregistrement et réglages', () => {
  it('le test ne change pas la charge de travail ; un essai manqué ne compte pas', () => {
    const q = quest('bench_press', 80, 10);
    const r = applyStrengthSession(q, { date: today, setDetails: [1, 1, 0], loads: [90, 95, 97.5], rpe: 9, calories: 20, method: 'max_test', kinds: ['max', 'max', 'max'] });
    expect(r.quest.currentValue).toBe(80);
    expect(r.entry.value).toBe(95);
    expect(r.entry.method).toBe('max_test');
  });
  it('« Test de max » se fait seul : il remplace les autres façons de travailler du jour', () => {
    expect(setDayStyle({}, today, ['iso', 'max'], today)).toEqual({ [today]: 'max' });
    expect(toggleDayStyle({ dayStyles: { [today]: 'iso' } }, today, 'max', today)).toEqual({ [today]: 'max' });
    expect(toggleDayStyle({ dayStyles: { [today]: 'max' } }, today, 'iso', today)).toEqual({ [today]: 'iso' });
  });
});
