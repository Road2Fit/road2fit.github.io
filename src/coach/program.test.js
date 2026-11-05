import { describe, expect, it } from 'vitest';
import { DEMO_STATE } from '../../tests/ui/demo';
import { analyzeProgram, parseProgramLine, programLine, programNext, programSession, programWeek, sessionKey } from './program';

const Q = DEMO_STATE.quests;
const id = name => Q.find(q => q.name.includes(name)).id;
const bench = id('Développé Couché');
const squat = id('Squat');
const pull = id('Tractions');

// programme de 4 semaines : charge +2,5 kg/semaine au développé, répétitions +1 au squat, semaine 4 allégée
const ex = (questId, sets, reps, load = null, assist = null) => ({ questId, sets, reps: Array(sets).fill(reps), load, assist });
const week = (b, sq, pl) => ({ sessions: [
  { id: 'A', name: 'Séance A', dow: 1, exercises: [ex(bench, 4, 8, b), ex(pull, 3, 6, null, pl)] },
  { id: 'B', name: 'Séance B', dow: 4, exercises: [ex(squat, 4, sq, 60)] },
] });
const PROGRAM = { name: 'Programme de Max', startDate: '2026-10-05', weeks: [week(40, 6, 15), week(42.5, 7, 12.5), week(45, 8, 10), { sessions: [
  { id: 'A', name: 'Séance A', dow: 1, exercises: [ex(bench, 3, 8, 40), ex(pull, 2, 6, null, 15)] },
  { id: 'B', name: 'Séance B', dow: 4, exercises: [ex(squat, 3, 6, 54)] },
] }], log: {} };
const state = (program = PROGRAM) => ({ ...DEMO_STATE, coach: { ...(DEMO_STATE.coach || {}), program } });

describe('programme d’un coach extérieur', () => {
  it('lit une ligne : exercice, séries × répétitions, charge, aide, durée', () => {
    const a = parseProgramLine('Développé couché 4x8 62,5kg', Q);
    expect(a).toMatchObject({ ok: true, questId: bench, sets: 4, reps: [8, 8, 8, 8], load: 62.5 });
    const b = parseProgramLine('Tractions 3x6 aide 10kg', Q);
    expect(b).toMatchObject({ ok: true, questId: pull, sets: 3, assist: 10, load: null });
    const c = parseProgramLine('Squat 5 5 5 3', Q);
    expect(c.reps).toEqual([5, 5, 5, 3]);
    expect(c.load).toBeNull(); // pas de charge écrite : le coach de l'appli la choisira
    expect(parseProgramLine('Curl haltères 3x10 10kg', Q).name).toMatch(/halt/i); // le nom complet passe avant « curl » tout court
    const d = parseProgramLine('Leg extension 3x12', []);
    expect(d.ok && d.catalogId).toBeTruthy(); // reconnu dans le catalogue, l'exercice sera créé
    expect(parseProgramLine('blabla', Q).ok).toBe(false);
  });

  it('analyse : progression par la charge, par les répétitions, par l’aide, semaine allégée', () => {
    const an = analyzeProgram(PROGRAM, state());
    expect(an.deloads.has(3)).toBe(true);
    expect(an.deloadEvery).toBe(4);
    expect(an.trends[`0:${bench}`]).toMatchObject({ pattern: 'load', loadStep: 2.5 });
    expect(an.trends[`1:${squat}`]).toMatchObject({ pattern: 'reps', repStep: 1 });
    expect(an.trends[`0:${pull}`]).toMatchObject({ pattern: 'assist', assistStep: 2.5 });
    expect(an.summary.join(' ')).toMatch(/charge.*Développé/);
    expect(an.summary.join(' ')).toMatch(/allégée en semaine 4/);
  });

  it('suite : la progression continue depuis la dernière semaine normale, puis une semaine allégée au même rythme', () => {
    const w5 = programWeek(PROGRAM, state(), 4);
    expect(w5.suite).toBe(true);
    const b5 = w5.sessions[0].exercises.find(e => e.questId === bench);
    expect(b5.load).toBe(47.5); // 45 (semaine 3) + 2,5
    const s5 = w5.sessions[1].exercises.find(e => e.questId === squat);
    expect(s5.reps[0]).toBe(9); // 8 + 1
    const p5 = w5.sessions[0].exercises.find(e => e.questId === pull);
    expect(p5.assist).toBe(7.5);
    const w8 = programWeek(PROGRAM, state(), 7);
    expect(w8.deload).toBe(true); // semaines 4 et 8
    const b8 = w8.sessions[0].exercises.find(e => e.questId === bench);
    expect(b8.load).toBeLessThan(programWeek(PROGRAM, state(), 6).sessions[0].exercises.find(e => e.questId === bench).load);
  });

  it('prochaine séance : dans l’ordre, en sautant celles faites ; puis la suite proposée', () => {
    let n = programNext(state(), '2026-10-05');
    expect(n.key).toBe(sessionKey(0, 0));
    const log = {};
    for (let w = 0; w < 4; w++) for (let s = 0; s < 2; s++) log[sessionKey(w, s)] = '2026-10-10';
    n = programNext(state({ ...PROGRAM, log }), '2026-11-02');
    expect(n.suite).toBe(true);
    expect(n.weekIdx).toBe(4);
    const g = programSession(state({ ...PROGRAM, log }), n);
    expect(g.exercises.length).toBe(2);
    expect(g.exercises[0].reason).toMatch(/Suite proposée/);
    expect(g.program.key).toBe(sessionKey(4, 0));
  });

  it('séance du programme : séries, répétitions et charge du coach', () => {
    const n = programNext(state(), '2026-10-05');
    const g = programSession(state(), n);
    const b = g.exercises.find(e => e.questId === bench);
    expect(b).toMatchObject({ sets: 4, targetReps: [8, 8, 8, 8], load: 40, change: 'program' });
    expect(b.reason).toMatch(/Prévu par ton coach/);
  });
});

describe('programme réel d’un ami (lest, muscle-up, noms précis)', () => {
  it('lit le lest, choisit les bons exercices, signale les inconnus et les lignes incertaines', () => {
    const r = l => parseProgramLine(l, []);
    expect(r('Dips lestés 3x8-10 +52,5 kg, dernière série RIR 1')).toMatchObject({ ok: true, catalogId: 'dips', sets: 3, assist: -52.5, load: null });
    expect(r('Dips lestés top set 1x2 +87,5 kg RIR 2')).toMatchObject({ sets: 1, reps: [2], assist: -87.5 });
    expect(r('Traction lestée back-off 3x8 +42,5 kg RIR 2, dernière série RIR 0-1')).toMatchObject({ catalogId: 'pullups', assist: -42.5 });
    expect(r('Curl biceps poulie (biset) 2x10-15 22,5 kg RIR 0-1').catalogId).toBe('fp_cable_curl');
    expect(r('Mollets machine assise 3x12-15 30 kg RIR 0-1').catalogId).toBe('fp_calf_seated');
    // le muscle-up est maintenant dans le catalogue (calisthénie, 05/11/2026)
    expect(r('Muscle-up technique 3x2 poids de corps').ok).toBe(false); // « technique » : nom pas assez couvert, le coach intelligent vérifiera
    expect(r('Muscle-up 3x3')).toMatchObject({ ok: true, catalogId: 'cal_muscle_up' }); // pas le muscle snatch
    expect(r('Muscle-up lesté top set 1x2 +17,5 kg RIR 2')).toMatchObject({ ok: true, catalogId: 'cal_muscle_up', assist: -17.5 });
    expect(r('Croix de fer anneaux 3x3s').ok).toBe(false); // exercice inconnu
    expect(r('Isométrie lockout traction 2x5s +50 kg').ok).toBe(false); // des secondes sur un exercice en répétitions : autre exercice
    expect(r('Rowing appui poitrine 3x8-12 85 kg, dernière série RIR 1').uncertain).toBe(true);
    expect(r('Développé couché 3x8-10 70 kg').uncertain).toBe(false);
    // exercice imposé (trouvé ou créé par le coach intelligent)
    expect(parseProgramLine('Muscle-up lesté top set 1x2 +17,5 kg RIR 2', [], { pick: 'chinups' })).toMatchObject({ ok: true, catalogId: 'chinups', assist: -17.5, sets: 1 });
    // la ligne réécrite garde le lest
    expect(programLine({ reps: [8, 8, 8], load: null, assist: -52.5 }, { name: 'Dips', unit: 'reps' })).toBe('Dips 3x8 +52,5kg');
  });
});
