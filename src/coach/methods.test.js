// Formes de séries : détail série par série, choix par le coach, progression quelle que soit la forme faite.
import { describe, expect, it } from 'vitest';
import { DEMO_STATE } from '../../tests/ui/demo';
import { METHOD_IDS, buildPlan, methodFits, normalizeForProgress, withMethod } from './methods';
import { applyMethods } from './methodChoice';
import { computeExerciseTarget } from './targets';

const E = { questId: 'q1', catalogId: 'bench_press', name: 'Développé Couché Barre', kind: 'load', load: 60, assist: 0, sets: 3, targetReps: [8, 8, 8], restSec: 150, arena: 'Pectoraux', compound: true };

describe('détail des formes de séries', () => {
  it('chaque forme donne des séries cohérentes (charges arrondies, la base reste la référence)', () => {
    for (const id of METHOD_IDS) {
      const p = buildPlan(id, E);
      expect(p.length, id).toBeGreaterThan(0);
      p.forEach(s => { expect(s.reps).toBeGreaterThan(0); expect(s.load % 0.5).toBe(0); expect(s.load).toBeLessThan(80); });
    }
    const pyr = buildPlan('pyramid', E);
    expect(pyr.map(s => s.reps)).toEqual([12, 10, 8]);
    expect(pyr[2].load).toBe(60);
    expect(pyr[0].load).toBeLessThan(pyr[1].load);
    const rev = buildPlan('reverse_pyramid', E);
    expect(rev[0].load).toBeGreaterThan(60);
    expect(rev[2].load).toBeLessThan(60);
    const top = buildPlan('top_backoff', E);
    expect(top[0]).toMatchObject({ kind: 'top', reps: 5 });
    expect(top.slice(1).every(s => s.kind === 'backoff' && s.load < 60)).toBe(true);
    const drop = buildPlan('drop_set', E);
    expect(drop.map(s => s.kind)).toEqual(['work', 'work', 'work', 'drop', 'drop']);
    expect(drop[2].rest).toBe(10);
    expect(drop[3].load).toBe(47.5);
    const myo = buildPlan('myo_reps', E);
    expect(myo[0].reps).toBe(12);
    expect(myo.filter(s => s.kind === 'mini')).toHaveLength(4);
  });

  it('formes adaptées au type d’exercice (aide élastique, poids du corps, durée)', () => {
    expect(methodFits('pyramid', { kind: 'assisted' })).toBe(false);
    expect(methodFits('drop_set', { kind: 'assisted' })).toBe(true);
    expect(methodFits('rest_pause', { kind: 'reps' })).toBe(true);
    expect(methodFits('myo_reps', { kind: 'reps', timed: true })).toBe(false);
    const a = buildPlan('drop_set', { ...E, kind: 'assisted', load: 0, assist: 10 });
    expect(a.slice(-2).map(s => s.assist)).toEqual([20, 30]);
    expect(withMethod({ ...E, timed: true, kind: 'reps' }, 'pyramid').method).toBe('straight');
  });
});

describe('progression quelle que soit la forme faite', () => {
  it('les dégressives et mini-séries ne jugent pas la progression', () => {
    const e = { date: '2026-10-20', value: 60, setDetails: [8, 8, 8, 6, 5], setLoads: [60, 60, 60, 47.5, 40], setKinds: ['work', 'work', 'work', 'drop', 'drop'], method: 'drop_set' };
    const n = normalizeForProgress(e, 'load', 8);
    expect(n.setDetails).toEqual([8, 8, 8]);
    expect(n.setLoads).toEqual([60, 60, 60]);
  });
  it('pyramide inversée : ramenée à la charge équivalente pour 8 reps ; charge baissée parce que trop dur : inchangé', () => {
    const rev = { date: '2026-10-20', value: 70, setDetails: [6, 8, 10], setLoads: [70, 65, 57.5], method: 'reverse_pyramid' };
    const n = normalizeForProgress(rev, 'load', 8);
    expect(n.setLoads).toBeUndefined();
    expect(n.value).toBeGreaterThan(64);
    expect(n.value).toBeLessThan(70);
    const tooHard = { date: '2026-10-20', value: 20, setDetails: [8, 6, 8], setLoads: [20, 20, 17.5] };
    expect(normalizeForProgress(tooHard, 'load', 8)).toBe(tooHard);
  });
  it('après une pyramide inversée réussie, la charge de base monte (et pas vers la série la plus légère)', () => {
    const q = { id: 'q1', name: 'Développé Couché Barre', catalogId: 'bench_press', type: 'strength', unit: 'kg', goalSets: 3, goalReps: 8, goalValue: 100, currentValue: 70, history: [
      { id: 'a', date: '2026-10-10', value: 60, sets: 3, reps: 8, setDetails: [8, 8, 8] },
      { id: 'b', date: '2026-10-17', value: 70, setDetails: [6, 8, 10], setLoads: [70, 65, 57.5], method: 'reverse_pyramid', rpe: 8 },
    ] };
    const t = computeExerciseTarget(q, { today: '2026-10-21' });
    expect(t.load).toBeGreaterThan(65);
    expect(t.reason).toContain('max estimé');
  });
});

describe('choix de la forme par le coach', () => {
  const many = n => Array.from({ length: n }, (_, i) => ({ id: `h${i}`, date: `2026-09-${String(10 + i).padStart(2, '0')}`, value: 40, sets: 3, reps: 8, setDetails: [8, 8, 8] }));
  const st = (coach = {}, extra = {}) => ({ ...DEMO_STATE, coach: { ...DEMO_STATE.coach, ...coach }, quests: DEMO_STATE.quests.map(q => (q.id === 'q_bench_3x8' ? { ...q, history: many(8), ...extra } : q)) });
  const ex = id => ({ ...E, questId: id });

  it('débutant sur l’exercice : séries classiques ; expérimenté : une forme variée selon la période', () => {
    const r1 = applyMethods(st(), [ex('q_squat_3x6')], { iso: '2026-10-21' });
    expect(r1.exercises[0].method).toBe('straight');
    const seen = new Set();
    for (let w = 0; w < 12; w++) seen.add(applyMethods(st(), [ex('q_bench_3x8')], { iso: `2026-${w < 6 ? '10' : '11'}-${String(1 + (w % 6) * 5).padStart(2, '0')}` }).exercises[0].method);
    expect(seen.size).toBeGreaterThan(1);
  });
  it('« classique » dans les réglages, semaine allégée, forme imposée par la personne, objectif de force', () => {
    expect(applyMethods(st({ methodStyle: 'classic' }), [ex('q_bench_3x8')], { iso: '2026-10-21' }).exercises[0].method).toBe('straight');
    expect(applyMethods(st(), [ex('q_bench_3x8')], { iso: '2026-10-21', deload: true }).exercises[0].method).toBe('straight');
    expect(applyMethods(st({}, { coachMethod: 'myo_reps' }), [ex('q_bench_3x8')], { iso: '2026-10-21' }).exercises[0].method).toBe('myo_reps');
    const g = applyMethods(st({ mainGoal: { kind: 'strength', questId: 'q_bench_3x8', text: '100 kg au développé couché' } }), [ex('q_bench_3x8')], { iso: '2026-10-21' }).exercises[0];
    expect(['top_backoff', 'cluster']).toContain(g.method);
    expect(g.methodWhy).toContain('objectif de force');
  });
  it('objectif « plus de muscle » sur un groupe : une série de plus', () => {
    const r = applyMethods(st({ methodStyle: 'classic', mainGoal: { kind: 'muscle', arena: 'Pectoraux', text: 'plus de pectoraux' } }), [ex('q_bench_3x8')], { iso: '2026-10-21' });
    expect(r.exercises[0].sets).toBe(4);
    expect(r.notes.join(' ')).toContain('une série de plus');
  });
});
