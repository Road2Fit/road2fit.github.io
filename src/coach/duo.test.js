// 4.51 : séance à deux (demande de Gabin) : un plan commun, les charges de chacun.
import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from '../data/catalog';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { INITIAL_STATE } from '../data/initialState';
import { addDaysISO } from '../lib/dates';
import { buildDuoPart, duoMissing, duoScheme, duoSession, mergeDuoPlan, syncDuos } from './duo';
import { coachBuildPlanned } from './sessions';

const today = '2026-11-22';
const byId = id => EXERCISE_CATALOG.find(c => c.id === id);
function quest(id, kg, n = 8) {
  const q = makeQuestFromCatalog(byId(id), { ...INITIAL_STATE, quests: [] }, today).quest;
  const history = Array.from({ length: n }, (_, i) => ({ id: `h${id}${i}`, date: addDaysISO(today, -4 * (n - i)), value: kg, sets: 3, reps: 8, setDetails: [8, 8, 8], rpe: 8 }));
  return { ...q, currentValue: kg, history };
}
const person = (ids, coach = {}) => ({ ...INITIAL_STATE, userWeightKg: 80, quests: ids.map(([id, kg]) => quest(id, kg)), coach: { ...(INITIAL_STATE.coach || {}), ...coach } });

const A = person([['squat', 100], ['bench_press', 80], ['lat_pulldown', 60], ['dips', 0]], { workProfile: 'puissance' });
const B = person([['squat', 60], ['leg_press', 120], ['bench_press', 45], ['lat_pulldown', 40]], { workProfile: 'hypertrophie' });

describe('séance à deux', () => {
  it('la part envoyée ne contient ni charges ni historique', () => {
    const part = buildDuoPart(A, today);
    expect(part.ex).toEqual(expect.arrayContaining(['squat', 'bench_press', 'lat_pulldown']));
    expect(JSON.stringify(part)).not.toMatch(/history|currentValue|"kg"|userWeight/);
  });
  it('plan commun : les exercices des deux d’abord, 6 au plus, un entre-deux des objectifs', () => {
    const plan = mergeDuoPlan(B, buildDuoPart(A, today), 'full', today);
    const ids = plan.ex.map(x => x.c);
    expect(ids).toEqual(expect.arrayContaining(['squat', 'bench_press', 'lat_pulldown']));
    expect(ids.length).toBeLessThanOrEqual(6);
    const sq = plan.ex.find(x => x.c === 'squat');
    // puissance (3-5) et hypertrophie (8-12) : entre les deux
    expect(sq.reps).toBeGreaterThan(5);
    expect(sq.reps).toBeLessThan(8);
    expect(duoScheme('puissance', 'hypertrophie', true).reps).toBe(sq.reps);
  });
  it('un exercice douloureux pour l’un n’est jamais proposé', () => {
    const Ahurt = { ...A, coach: { ...A.coach, pains: [{ zone: 'knee', side: 'left' }] } };
    const plan = mergeDuoPlan(B, buildDuoPart(Ahurt, today), 'lower', today);
    expect((plan ? plan.ex : []).map(x => x.c)).not.toContain('squat');
  });
  it('thème « tirer » : que du tirage', () => {
    const plan = mergeDuoPlan(B, buildDuoPart(A, today), 'pull', today);
    expect(plan.ex.map(x => x.c)).toContain('lat_pulldown');
    expect(plan.ex.map(x => x.c)).not.toContain('bench_press');
  });
  it('chacun sa charge, mêmes séries et répétitions', () => {
    const plan = mergeDuoPlan(B, buildDuoPart(A, today), 'full', today);
    const duo = { plan, with: 'Ami' };
    const fill = P => ({ ...P, quests: [...P.quests, ...duoMissing(P, plan).map(id => makeQuestFromCatalog(byId(id), P, today).quest)] });
    const sa = duoSession(fill(A), duo, today);
    const sb = duoSession(fill(B), duo, today);
    const sqA = sa.exercises.find(e => e.catalogId === 'squat');
    const sqB = sb.exercises.find(e => e.catalogId === 'squat');
    expect(sqA.targetReps).toEqual(sqB.targetReps);
    expect(sqA.load).toBeGreaterThan(sqB.load);
    expect(sa.exercises.map(e => e.catalogId)).toEqual(sb.exercises.map(e => e.catalogId));
  });
  it('le jour accepté, la séance prévue devient la séance à deux', () => {
    const plan = mergeDuoPlan(B, buildDuoPart(A, today), 'full', today);
    const st = { ...B, coach: { ...B.coach, duos: { [today]: { id: 'x', with: 'Ami', plan } } } };
    const s = coachBuildPlanned(st, { iso: today, templateIdx: 0 }, { iso: today, legsOk: true });
    expect(s.duo).toBeTruthy();
    expect(s.exercises.every(e => e.duo)).toBe(true);
    expect(s.notes[0]).toMatch(/Séance à deux avec Ami/);
  });
});

describe('séance à deux : synchronisation', () => {
  const plan = { v: 1, theme: 'full', ex: [{ c: 'squat', sets: 4, reps: 7, rest: 150 }, { c: 'leg_press', sets: 3, reps: 9, rest: 90 }] };
  const mk = id => (id ? makeQuestFromCatalog(id, A, today).quest : null);
  it('acceptée : le jour est ajouté, les exercices manquants aussi ; annulée : tout est retiré', () => {
    const rows = [{ id: 'd1', date: '2026-11-26', status: 'accepted', other_name: 'Ami', plan }];
    const s1 = syncDuos(A, rows, today, mk);
    expect(s1.coach.duos['2026-11-26']).toMatchObject({ id: 'd1', with: 'Ami', extra: true });
    expect(s1.coach.gymExtra).toContain('2026-11-26');
    expect(s1.quests.some(q => q.catalogId === 'leg_press')).toBe(true);
    expect(syncDuos(s1, rows, today, mk)).toBe(s1);
    const s2 = syncDuos(s1, [{ ...rows[0], status: 'cancelled' }], today, mk);
    expect(s2.coach.duos).toEqual({});
    expect(s2.coach.gymExtra || []).not.toContain('2026-11-26');
  });
});

describe('séance à deux : coach IA', () => {
  it('action duo comprise (ami, date, thème), sans rien changer aux réglages', async () => {
    const { normalizeActions, applyActions } = await import('../ai/actions');
    const acts = normalizeActions([{ type: 'duo', label: '', args: JSON.stringify({ friend: 'Paul', date: '2026-11-26', theme: 'push' }) }], A, today);
    expect(acts[0]).toMatchObject({ type: 'duo', args: { friend: 'Paul', date: '2026-11-26', theme: 'push' } });
    expect(acts[0].label).toMatch(/Inviter Paul/);
    expect(applyActions(A, acts, today)).toEqual(A);
    expect(normalizeActions([{ type: 'duo', args: JSON.stringify({ friend: 'Paul', date: '2020-01-01' }) }], A, today)).toEqual([]);
  });
});

describe('séance à deux : plan reçu malveillant', () => {
  it('éléments invalides, doublons, cardio, valeurs folles, trop d’exercices : filtrés sans planter', async () => {
    const { cleanDuoPlan } = await import('./duo');
    const bad = { theme: '__proto__', ex: [null, 5, 'x', { c: 'toString' }, { c: 'squat', sets: 99, reps: -3, rest: 1e9 }, { c: 'squat' }, ...EXERCISE_CATALOG.filter(c => c.type === 'strength').slice(0, 40).map(c => ({ c: c.id }))] };
    const p = cleanDuoPlan(bad);
    expect(p.theme).toBe('auto');
    expect(p.ex.length).toBeLessThanOrEqual(6);
    expect(p.ex[0]).toEqual({ c: 'squat', sets: 6, reps: 1, rest: 600 });
    expect(new Set(p.ex.map(x => x.c)).size).toBe(p.ex.length);
    expect(cleanDuoPlan({ ex: [null] })).toBeNull();
    const s1 = syncDuos(A, [{ id: 'z', date: '2026-11-27', status: 'accepted', plan: bad }], today, c => makeQuestFromCatalog(c, A, today).quest);
    expect(s1.quests.length - A.quests.length).toBeLessThanOrEqual(6);
    expect(() => syncDuos(A, [{ id: 'y', date: '2026-11-27', status: 'accepted', plan: { ex: [null] } }], today, () => null)).not.toThrow();
  });
});
