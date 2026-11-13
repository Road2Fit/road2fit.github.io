// 4.42 : concentrique, excentrique, isométrique, pliométrique : formes de séries, séance axée sur une façon de travailler,
// pliométrie (bloc de sauts, jours de la semaine), coach IA.
import { describe, expect, it } from 'vitest';
import { coachOverview } from './advice';
import { coachPlanWeek } from './planning';
import { buildPlan, methodFits, withMethod } from './methods';
import { computeExerciseTarget } from './targets';
import { capPlyoBlock, dayStyleOf, dayStylesOf, holdPoint, isPlyo, missingPlyo, pickMixed, plyoWeekDays, setDayStyle, toggleDayStyle } from './contraction';
import { coachableQuests } from './equipment';
import { applyAction, normalizeAction } from '../ai/actions';
import { EXERCISE_CATALOG } from '../data/catalog';
import { SPORTS } from '../data/sports';
import { SPORT_PERF } from '../data/sportPerf';

const q = (id, name, category, extra = {}) => ({ id, name, category, type: 'strength', unit: 'kg', goalMode: 'sets_reps', level: 1, startValue: 40, currentValue: 40, goalValue: 80, goalSets: 3, goalReps: 8, setDetails: [8, 8, 8], history: [], ...extra });
const ply = (id, cat) => { const c = EXERCISE_CATALOG.find(x => x.id === cat); return q(id, c.name, c.category, { catalogId: cat, unit: 'reps', goalReps: c.defaultGoalReps || 5, goalSets: 3, currentValue: 5, startValue: 5, goalValue: 8 }); };
const QUESTS = [
  q('sq', 'Squat Barre', 'Jambes'), q('rdl', 'Soulevé de Terre Roumain', 'Jambes'), q('lp', 'Presse à Cuisses', 'Jambes'),
  q('bp', 'Développé Couché Barre', 'Pectoraux'), q('row', 'Rowing Barre Buste Penché', 'Dos'),
  q('pu', 'Tractions', 'Dos', { unit: 'reps', currentAssistanceKg: 20, startAssistanceKg: 30, goalAssistanceKg: 0, currentValue: 8 }),
  q('ohp', 'Développé Militaire', 'Épaules & Bras'), q('curl', 'Curl Biceps Barre EZ', 'Épaules & Bras'),
];
const PLYO = [ply('j1', 'ply_cmj'), ply('j2', 'ply_pogo'), ply('j3', 'ply_box_jump'), ply('j4', 'ply_clap_pushup')];
const slot = { start: '18:00', end: '19:30' };
const TODAY = '2026-11-09'; // lundi
const base = (extra = {}, quests = QUESTS) => ({ quests, userWeightKg: 80, coach: { sessionsPerWeek: 3, sessionMinutes: 60, volleyDays: [], sport: '', matchDates: [], gymSlots: { 1: slot, 3: slot, 5: slot }, ...extra } });
const target = (st, id) => computeExerciseTarget(st.quests.find(x => x.id === id), { today: TODAY });

describe('façons de faire travailler le muscle', () => {
  it('position à tenir selon l’exercice (tractions : en haut, menton au-dessus de la barre)', () => {
    expect(holdPoint({ name: 'Tractions' })).toMatch(/en haut, menton au-dessus de la barre/);
    expect(holdPoint({ name: 'Squat Barre' })).toMatch(/en bas/);
    expect(holdPoint({ name: 'Curl Biceps Barre EZ' })).toMatch(/90°/);
    expect(holdPoint({ name: 'Leg Curl Allongé' })).toMatch(/genoux pliés/);
    expect(holdPoint({ name: 'Machin inconnu' })).toMatch(/point le plus difficile/);
  });

  it('pause isométrique aux tractions : moins de reps, tenue en haut à chaque rep, un peu plus d’aide', () => {
    const e = target(base(), 'pu');
    const p = buildPlan('iso_pause', e);
    expect(p.length).toBe(e.sets);
    p.forEach(s => {
      expect(s.reps).toBeLessThan(e.targetReps[0]);
      expect(s.hold).toBeGreaterThanOrEqual(3);
      expect(s.holdEach).toBe(true);
      expect(s.label).toMatch(/tiens \d s en haut, menton au-dessus de la barre/);
      expect(s.assist).toBe(e.assist + 5);
      expect(s.kind).toBe('iso');
    });
  });

  it('tenue isométrique, excentrique (négatives aux tractions), explosif', () => {
    const st = base();
    const sq = target(st, 'sq');
    const hold = buildPlan('iso_hold', sq);
    expect(hold.every(s => s.reps === 1 && s.hold === 20 && s.kind === 'hold')).toBe(true);
    const ecc = buildPlan('eccentric', sq);
    expect(ecc.every(s => s.ecc === 4 && s.load < sq.load + 0.01 && /descente en 4 s/.test(s.label))).toBe(true);
    const neg = buildPlan('eccentric', target(st, 'pu'));
    expect(neg[0].label).toMatch(/négatives/);
    expect(neg[0].assist).toBe(Math.max(0, target(st, 'pu').assist - 10));
    const ex = buildPlan('explosive', sq);
    expect(ex.every(s => s.reps <= sq.targetReps[0] - 3 && s.kind === 'expl' && s.rest >= 120)).toBe(true);
  });

  it('la pliométrie ne vaut que pour les sauts, et les sauts gardent leur forme', () => {
    expect(methodFits('plyo', { kind: 'reps', catalogId: 'ply_cmj' })).toBe(true);
    expect(methodFits('plyo', { kind: 'reps', catalogId: 'fp_pushups' })).toBe(false);
    expect(methodFits('iso_pause', { kind: 'reps', catalogId: 'ply_cmj' })).toBe(false);
    expect(methodFits('iso_pause', { kind: 'load' })).toBe(true);
    expect(isPlyo({ catalogId: 'ply_pogo' })).toBe(true);
  });

  it('une séance d’isométrie ne fait pas reculer la charge habituelle', () => {
    const hist = [
      { id: 'h1', date: '2026-11-02', value: 60, sets: 3, setDetails: [8, 8, 8], rpe: 7 },
      { id: 'h2', date: '2026-11-05', value: 51, sets: 3, setDetails: [5, 5, 5], rpe: 9, method: 'iso_pause', setKinds: ['iso', 'iso', 'iso'] },
      { id: 'h3', date: '2026-11-07', value: 51, sets: 3, setDetails: [5, 5, 5], rpe: 9, method: 'iso_pause', setKinds: ['iso', 'iso', 'iso'] },
    ];
    const qq = q('x', 'Squat Barre', 'Jambes', { currentValue: 60, history: hist });
    const e = computeExerciseTarget(qq, { today: TODAY });
    expect(e.load).toBeGreaterThanOrEqual(60);
  });
});

describe('séance axée sur une façon de travailler', () => {
  it('setDayStyle : un style par jour, jours passés retirés, null = normal', () => {
    let m = setDayStyle({ dayStyles: { '2026-11-01': 'iso' } }, '2026-11-10', 'ecc', TODAY);
    expect(m).toEqual({ '2026-11-10': 'ecc' });
    expect(setDayStyle({ dayStyles: m }, '2026-11-10', null, TODAY)).toEqual({});
    expect(dayStyleOf({ dayStyles: { x: 'nope' } }, 'x')).toBeNull();
  });

  it('« aujourd’hui je veux de l’isométrie » : tous les exercices passent en pause isométrique', () => {
    const first = coachOverview(base(), TODAY).first.iso;
    const s = coachOverview(base({ dayStyles: { [first]: 'iso' } }), TODAY).session;
    expect(s.style).toBe('iso');
    expect(s.notes.join(' ')).toMatch(/Pauses isométriques/);
    const strength = s.exercises.filter(e => !e.timed);
    expect(strength.length).toBeGreaterThan(0);
    strength.forEach(e => expect(e.method).toBe('iso_pause'));
  });

  it('séance excentrique choisie dans « Ma semaine »', () => {
    const st = base({ dayStyles: { '2026-11-11': 'ecc' } });
    const w = coachPlanWeek(st, TODAY, TODAY);
    expect(w.days.find(d => d.iso === '2026-11-11').style).toBe('ecc');
  });
});

describe('séance mixte (4.43)', () => {
  it('toggleDayStyle : plusieurs façons pour un jour, ancienne valeur (texte) comprise', () => {
    let m = toggleDayStyle({ dayStyles: { '2026-11-10': 'iso' } }, '2026-11-10', 'expl', TODAY);
    expect(m['2026-11-10']).toEqual(['iso', 'expl']);
    expect(dayStylesOf({ dayStyles: m }, '2026-11-10')).toEqual(['iso', 'expl']);
    expect(dayStyleOf({ dayStyles: m }, '2026-11-10')).toBe('iso');
    m = toggleDayStyle({ dayStyles: m }, '2026-11-10', 'iso', TODAY);
    expect(m['2026-11-10']).toBe('expl');
  });

  it('pickMixed : explosif réservé aux gros exercices, sinon alternance', () => {
    expect(pickMixed(['iso_pause', 'explosive'], false, 0)).toBe('iso_pause');
    expect(pickMixed(['iso_pause', 'explosive'], false, 1)).toBe('iso_pause');
    expect([0, 1].map(k => pickMixed(['iso_pause', 'explosive'], true, k))).toEqual(['iso_pause', 'explosive']);
    expect(pickMixed(['explosive'], false, 0)).toBe('explosive');
  });

  it('iso + explosif + excentrique : les façons sont réparties entre les exercices', () => {
    const first = coachOverview(base(), TODAY).first.iso;
    const s = coachOverview(base({ dayStyles: { [first]: ['iso', 'expl', 'ecc'] } }), TODAY).session;
    const used = new Set(s.exercises.filter(e => !e.timed).map(e => e.method));
    expect(used.size).toBeGreaterThanOrEqual(2);
    [...used].forEach(m => expect(['iso_pause', 'explosive', 'eccentric']).toContain(m));
    s.exercises.filter(e => e.method === 'explosive').forEach(e => expect(e.compound).toBeTruthy());
    expect(s.notes.join(' ')).toMatch(/Pauses isométriques \+ Excentrique.*\+ Explosif/);
  });
});

describe('pliométrie', () => {
  it('les sauts REMPLACENT un ou deux exercices (la séance garde sa durée)', () => {
    const first = coachOverview(base(), TODAY).first.iso;
    const normal = coachOverview(base({}, [...QUESTS, ...PLYO]), TODAY).session;
    const s = coachOverview(base({ dayStyles: { [first]: 'plyo' } }, [...QUESTS, ...PLYO]), TODAY).session;
    const jumps = s.exercises.filter(e => /^j/.test(e.questId)).length;
    const strength = s.exercises.length - jumps;
    expect(strength).toBeGreaterThanOrEqual(Math.min(3, normal.exercises.length));
    expect(strength).toBeLessThan(normal.exercises.length);
    expect(s.notes.join(' ')).toMatch(/laissés? de côté aujourd’hui pour faire place aux sauts/);
  });

  it('les sauts ne sont jamais programmés dans une séance normale', () => {
    const st = base({}, [...QUESTS, ...PLYO]);
    expect(coachableQuests(st).some(isPlyo)).toBe(false);
    const s = coachOverview(st, TODAY).session;
    expect(s.exercises.some(e => /^j/.test(e.questId))).toBe(false);
  });

  it('jour « Pliométrie » : 3 exercices de sauts au plus, en premier, sous le nombre de contacts', () => {
    const first = coachOverview(base(), TODAY).first.iso;
    const st = base({ dayStyles: { [first]: 'plyo' } }, [...QUESTS, ...PLYO]);
    const s = coachOverview(st, TODAY).session;
    const jumps = s.exercises.filter(e => /^j/.test(e.questId));
    expect(jumps.length).toBeGreaterThan(0);
    expect(jumps.length).toBeLessThanOrEqual(3);
    expect(s.exercises.slice(0, jumps.length).every(e => /^j/.test(e.questId))).toBe(true);
    expect(jumps.reduce((n, e) => n + e.sets * e.targetReps[0], 0)).toBeLessThanOrEqual(60);
    jumps.forEach(e => { expect(e.method).toBe('plyo'); expect(e.restSec).toBeGreaterThanOrEqual(90); });
    expect(s.notes.join(' ')).toMatch(/Pliométrie : les sauts d’abord/);
  });

  it('capPlyoBlock respecte le nombre de contacts', () => {
    const t = [{ questId: 'a', sets: 3, targetReps: [10, 10, 10] }, { questId: 'b', sets: 3, targetReps: [5, 5, 5] }];
    const out = capPlyoBlock(t, 40);
    expect(out.reduce((n, e) => n + e.sets * e.targetReps[0], 0)).toBeLessThanOrEqual(40);
  });

  it('2 séances de sauts par semaine : jours où les jambes peuvent travailler, jamais deux jours de suite', () => {
    const planned = ['2026-11-09', '2026-11-10', '2026-11-12'];
    const info = planned.map(iso => ({ iso, legsOk: true }));
    expect(plyoWeekDays({ plyo: { perWeek: 2 } }, planned, info)).toEqual(['2026-11-09', '2026-11-12']);
    const noLegs = [{ iso: '2026-11-09', legsOk: false }, { iso: '2026-11-10', legsOk: true }, { iso: '2026-11-12', legsOk: true }];
    expect(plyoWeekDays({ plyo: { perWeek: 2 } }, planned, noLegs)).toEqual(['2026-11-10', '2026-11-12']);
    const st = base({ plyo: { perWeek: 2 } }, [...QUESTS, ...PLYO]);
    expect(coachPlanWeek(st, TODAY, TODAY).plyoDays.length).toBe(2);
  });

  it('chaque sport de l’appli a son programme : exercices existants, au moins une étude, sauts seulement si conseillés', () => {
    for (const sp of SPORTS) {
      const p = SPORT_PERF[sp.id];
      expect(p, sp.id).toBeTruthy();
      expect(p.focus.length, sp.id).toBeGreaterThan(5);
      expect(p.sources.length, sp.id).toBeGreaterThan(0);
      p.sources.forEach(x => { expect(x.url.startsWith('https:'), sp.id).toBe(true); expect(['✔', '◐']).toContain(x.mark); });
      p.pack.forEach(id => expect(EXERCISE_CATALOG.some(c => c.id === id), `${sp.id} : ${id}`).toBe(true));
      if (p.perWeek === 0) expect(p.pack.some(id => /^ply_/.test(id)), sp.id).toBe(false);
      else expect(p.pack.some(id => /^ply_/.test(id)), sp.id).toBe(true);
    }
  });

  it('coach IA : programme d’un sport sans sauts (escalade : force des doigts)', () => {
    const st = base({ sport: 'escalade' });
    const a = normalizeAction({ type: 'plyo', args: JSON.stringify({ perWeek: 0, sport: 'escalade', add: true }) }, st, TODAY);
    expect(a.args.add).toEqual(expect.arrayContaining(['fp_dead_hang']));
    const s2 = applyAction(st, a, TODAY);
    expect(s2.quests.some(x => x.catalogId === 'fp_dead_hang')).toBe(true);
    expect(s2.coach.plyo.perWeek).toBe(0);
  });

  it('pack du volley : saut d’attaque et de contre', () => {
    const m = missingPlyo({ quests: [] }, 'volley');
    expect(m).toEqual(expect.arrayContaining(['ply_approach_jump', 'ply_block_jump', 'ply_cmj']));
  });
});

describe('coach IA', () => {
  it('day_style : « aujourd’hui séance axée sur l’isométrie »', () => {
    const st = base();
    const a = normalizeAction({ type: 'day_style', label: 'Isométrie', args: JSON.stringify({ dates: [TODAY], style: 'iso' }) }, st, TODAY);
    expect(a.args).toEqual({ dates: [TODAY], style: 'iso' });
    const s2 = applyAction(st, a, TODAY);
    expect(s2.coach.dayStyles[TODAY]).toBe('iso');
    expect(normalizeAction({ type: 'day_style', args: JSON.stringify({ dates: [TODAY], style: 'magique' }) }, st, TODAY)).toBeNull();
  });

  it('plyo : « fais-moi des entraînements pour progresser au volley »', () => {
    const st = base({ sport: 'volley' });
    const a = normalizeAction({ type: 'plyo', args: JSON.stringify({ perWeek: 2, sport: 'volley', add: true }) }, st, TODAY);
    expect(a.args.perWeek).toBe(2);
    expect(a.args.add).toEqual(expect.arrayContaining(['ply_approach_jump']));
    const s2 = applyAction(st, a, TODAY);
    expect(s2.coach.plyo.perWeek).toBe(2);
    expect(s2.quests.filter(isPlyo).length).toBe(a.args.add.length);
  });

  it('method iso_pause accepté sur un exercice, plyo refusé hors sauts', () => {
    const st = base();
    expect(normalizeAction({ type: 'method', args: JSON.stringify({ questId: 'pu', method: 'iso_pause' }) }, st, TODAY).args.method).toBe('iso_pause');
    expect(normalizeAction({ type: 'method', args: JSON.stringify({ questId: 'sq', method: 'plyo' }) }, st, TODAY)).toBeNull();
  });

  it('withMethod garde les répétitions et la tenue dans le plan', () => {
    const e = withMethod(target(base(), 'curl'), 'iso_pause', '');
    expect(e.method).toBe('iso_pause');
    expect(e.plan[0].hold).toBeGreaterThan(0);
  });
});
