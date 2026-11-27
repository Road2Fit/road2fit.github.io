// 4.56 : façon de travailler choisie exercice par exercice (Gabin : « séance normale, sauf le développé couché où
// j'aimerais faire un test de max »).
import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from '../data/catalog';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { INITIAL_STATE } from '../data/initialState';
import { addDaysISO } from '../lib/dates';
import { coachBuildCustomSession, coachBuildPlanned } from './sessions';
import { exStylesOf, setExStyle } from './contraction';
import { normalizeAction, applyAction, undoSnapshot } from '../ai/actions';

const today = '2026-11-27';
const tomorrow = addDaysISO(today, 1);
const byId = id => EXERCISE_CATALOG.find(c => c.id === id);
function quest(id, kg, n) {
  const q = makeQuestFromCatalog(byId(id), { ...INITIAL_STATE, quests: [] }, today).quest;
  const history = Array.from({ length: n }, (_, i) => ({ id: `h${id}${i}`, date: addDaysISO(today, -7 * (n - i)), value: kg, sets: 3, reps: 8, setDetails: [8, 8, 8], rpe: 8 }));
  return { ...q, currentValue: kg, history };
}
const mk = (extra = {}) => ({
  ...INITIAL_STATE, userWeightKg: 80,
  quests: [quest('bench_press', 40, 20), quest('squat', 80, 20), quest('pullups', 0, 20), quest('lat_pulldown', 50, 20)].filter(q => q && q.catalogId),
  coach: { ...(INITIAL_STATE.coach || {}), experience: { level: 'advanced' }, ...extra },
});
const benchOf = st => st.quests.find(q => q.catalogId === 'bench_press');

describe('réglage exercice par exercice', () => {
  it('choisir, changer, retirer ; les jours passés sont oubliés ; valeurs inconnues ignorées', () => {
    let m = setExStyle({ exStyles: { '2026-11-01': { a: 'iso' } } }, tomorrow, 'b', 'max', today);
    expect(m).toEqual({ [tomorrow]: { b: 'max' } });
    m = setExStyle({ exStyles: m }, tomorrow, 'c', 'ecc', today);
    expect(exStylesOf({ exStyles: m }, tomorrow)).toEqual({ b: 'max', c: 'ecc' });
    m = setExStyle({ exStyles: m }, tomorrow, 'b', null, today);
    expect(m).toEqual({ [tomorrow]: { c: 'ecc' } });
    expect(setExStyle({ exStyles: m }, tomorrow, 'c', 'auto', today)).toEqual({});
    expect(exStylesOf({ exStyles: { [tomorrow]: { x: 'plyo', y: 'magique', z: 'normal' } } }, tomorrow)).toEqual({ z: 'normal' });
  });
});

describe('séance perso : normale, sauf un test de max au développé couché', () => {
  it('le développé couché devient un test, en premier ; le reste ne change pas', () => {
    const st0 = mk();
    const ids = st0.quests.map(q => q.id);
    const b = benchOf(st0);
    const st = { ...st0, coach: { ...st0.coach, exStyles: { [tomorrow]: { [b.id]: 'max' } } } };
    const s = coachBuildCustomSession(st, ids, tomorrow, {});
    expect(s.exercises[0].questId).toBe(b.id);
    expect(s.exercises[0].method).toBe('max_test');
    expect(s.exercises[0].maxMode).toBe('1rm');
    expect(s.exercises.slice(1).every(e => e.method !== 'max_test')).toBe(true);
    expect(s.exercises).toHaveLength(ids.length);
    expect(s.maxTest).toBeFalsy(); // pas une séance « Test de max » entière
    expect(s.notes.join(' ')).toMatch(/Test de max sur .*en premier/);
    expect(s.notes.join(' ')).toMatch(/Sécurité/);
    expect(s.notes.join(' ')).not.toMatch(/rien d’autre aujourd’hui/);
    // l'échauffement conseillé ne porte pas sur le test (il a le sien)
    expect(s.warmup).not.toMatch(/Développé couché/i);
    // séance faite en avance (aujourd'hui) : on reprend les choix du jour PRÉVU
    const early = coachBuildCustomSession(st, ids, today, { exStyles: exStylesOf(st.coach, tomorrow) });
    expect(early.exercises[0].method).toBe('max_test');
  });
  it('autres façons pour un seul exercice ; « Normale » passe avant la façon du jour', () => {
    const st0 = mk({ dayStyles: { [tomorrow]: 'iso' } });
    const ids = st0.quests.map(q => q.id);
    const b = benchOf(st0);
    const sq = st0.quests.find(q => q.catalogId === 'squat');
    const st = { ...st0, coach: { ...st0.coach, exStyles: { [tomorrow]: { [b.id]: 'normal', [sq.id]: 'ecc' } } } };
    const s = coachBuildCustomSession(st, ids, tomorrow, {});
    expect(s.exercises.find(e => e.questId === b.id).method).toBe('straight');
    expect(s.exercises.find(e => e.questId === sq.id).method).toBe('eccentric');
    expect(s.exercises.filter(e => e.questId !== b.id && e.questId !== sq.id && !e.timed).some(e => e.method === 'iso_pause')).toBe(true);
  });
  it('jour « Test de max » : un exercice passé à « Normale » n’est pas testé, il vient après les tests', () => {
    const st0 = mk({ dayStyles: { [tomorrow]: 'max' } });
    const ids = st0.quests.map(q => q.id);
    const b = benchOf(st0);
    const st = { ...st0, coach: { ...st0.coach, exStyles: { [tomorrow]: { [b.id]: 'normal' } } } };
    const s = coachBuildCustomSession(st, ids, tomorrow, {});
    const e = s.exercises.find(x => x.questId === b.id);
    expect(e.method).toBe('straight');
    expect(s.exercises.indexOf(e)).toBe(s.exercises.length - 1);
    expect(s.exercises.filter(x => x.questId !== b.id).every(x => x.method === 'max_test')).toBe(true);
  });
});

describe('séance proposée par le coach', () => {
  it('test de max choisi pour un exercice : il est ajouté s’il manque, testé en premier', () => {
    const st0 = mk();
    const b = benchOf(st0);
    const st = { ...st0, coach: { ...st0.coach, exStyles: { [tomorrow]: { [b.id]: 'max' } } } };
    const s = coachBuildPlanned(st, { iso: tomorrow, type: 'PULL' }, { iso: tomorrow, legsOk: true });
    expect(s.exercises[0].questId).toBe(b.id);
    expect(s.exercises[0].method).toBe('max_test');
    expect(s.exercises.length).toBeGreaterThan(1);
  });
});

describe('coach IA', () => {
  it('« demain séance normale sauf un test de max au développé couché » : appliqué, ajouté à la séance perso, annulable', () => {
    const st0 = mk();
    const b = benchOf(st0);
    const other = st0.quests.find(q => q.catalogId === 'squat');
    const st = { ...st0, coach: { ...st0.coach, plan: { date: tomorrow, questIds: [other.id], sets: {} } } };
    const a = normalizeAction({ type: 'day_style', args: JSON.stringify({ dates: [tomorrow], styles: ['normal'], exercises: { [b.id]: 'max', inconnu: 'max', [other.id]: 'plyo' } }) }, st, today);
    expect(a.args.exercises).toEqual({ [b.id]: 'max' });
    const snap = undoSnapshot(st, [a]);
    const s2 = applyAction(st, a, today);
    expect(exStylesOf(s2.coach, tomorrow)).toEqual({ [b.id]: 'max' });
    expect(s2.coach.dayStyles[tomorrow]).toBe('normal');
    expect(s2.coach.plan.questIds).toEqual([other.id, b.id]);
    expect(snap.coach).toHaveProperty('exStyles');
    expect(snap.coach).toHaveProperty('plan');
    // seulement l'exercice : la façon du jour ne change pas
    const isoDay = { ...st, coach: { ...st.coach, dayStyles: { [tomorrow]: 'iso' } } };
    const only = normalizeAction({ type: 'day_style', args: JSON.stringify({ dates: [tomorrow], exercises: { [b.id]: 'max' } }) }, isoDay, today);
    expect(only.args.style).toBeUndefined();
    expect(applyAction(isoDay, only, today).coach.dayStyles[tomorrow]).toBe('iso');
    // « comme la séance » : retiré
    const off = normalizeAction({ type: 'day_style', args: JSON.stringify({ dates: [tomorrow], exercises: { [b.id]: 'auto' } }) }, s2, today);
    expect(exStylesOf(applyAction(s2, off, today).coach, tomorrow)).toEqual({});
  });
});
