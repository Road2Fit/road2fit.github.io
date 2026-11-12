// Coach intelligent : seules des actions connues et raisonnables passent, et elles changent les bons réglages.
import { describe, expect, it } from 'vitest';
import { DEMO_STATE } from '../../tests/ui/demo';
import { applyActions, normalizeAction, normalizeActions } from './actions';
import { aiDictationItems } from './dictation';
import { coachContext, dictationContext, fromAiDay, toAiDay } from './context';

const today = '2026-10-21';
const S = { ...DEMO_STATE, coach: { ...DEMO_STATE.coach, gymSlots: { 1: { start: '07:00', end: '08:00' } } } };
const act = (type, args, label = '') => ({ type, label, args: JSON.stringify(args) });

describe('actions du coach intelligent', () => {
  it('jours : 1 = lundi … 7 = dimanche, convertis dans le format de l’appli (0 = dimanche)', () => {
    expect(fromAiDay(7)).toBe(0);
    expect(toAiDay(0)).toBe(7);
    const a = normalizeAction(act('schedule', { gymDays: [1, 4, 7], sessionMinutes: 50, sessionsPerWeek: 4 }), S, today);
    expect(a.args).toEqual({ gymDays: [0, 1, 4], sessionMinutes: 45, sessionsPerWeek: 4 }); // 4.37 : 1 à 6 séances (avant : ramené à 3);
    const s = applyActions(S, [a], today);
    expect(Object.keys(s.coach.gymSlots).sort()).toEqual(['0', '1', '4']);
    expect(s.coach.gymSlots[1]).toEqual({ start: '07:00', end: '08:00' }); // créneau gardé
    expect(s.coach.gymSlots[4]).toEqual({ start: '18:00', end: '19:30' });
    expect(s.coach.sessionMinutes).toBe(45);
  });

  it('refuse l’inconnu : type, exercice, sport, date passée, arguments illisibles', () => {
    expect(normalizeAction(act('delete_all', {}), S, today)).toBeNull();
    expect(normalizeAction(act('adjust', { questId: 'nope', load: 50 }), S, today)).toBeNull();
    expect(normalizeAction(act('sport', { sport: 'pétanque' }), S, today)).toBeNull();
    expect(normalizeAction(act('skip', { dates: ['2026-10-01'] }), S, today)).toBeNull();
    expect(normalizeAction({ type: 'goal', args: '{pas du json' }, S, today)).toBeNull();
    expect(normalizeAction(act('body', { heightCm: 900 }), S, today)).toBeNull();
    expect(normalizeActions(Array(10).fill(act('feeling', { level: 'low' })), S, today)).toHaveLength(6);
  });

  it('séance, objectif, forme du jour, mémoire, ajout d’exercice', () => {
    const list = normalizeActions([
      act('session', { date: today, exercises: [{ questId: 'q_squat_3x6', sets: 4 }, { questId: 'q_run_endurance', sets: 2 }, { questId: 'q_bench_3x8' }] }),
      act('adjust', { questId: 'q_bench_3x8', load: 42.5 }),
      act('feeling', { level: 'low' }),
      act('remember', { text: 'Épaule droite sensible au développé' }),
      act('add_exercise', { catalogId: 'pullups' }), // déjà présent : ignoré
      act('goal', { workProfile: 'hypertrophie' }),
    ], S, today);
    expect(list.map(a => a.type)).toEqual(['session', 'adjust', 'feeling', 'remember', 'goal']);
    const s = applyActions(S, list, today);
    expect(s.coach.plan).toEqual({ date: today, questIds: ['q_squat_3x6', 'q_bench_3x8'], sets: { q_squat_3x6: 4, q_bench_3x8: 3 } }); // le cardio n'entre pas dans une séance de muscu
    expect(s.quests.find(q => q.id === 'q_bench_3x8').coachOverride.load).toBe(42.5);
    expect(s.coach.readiness).toEqual({ date: today, level: 'low' });
    expect(s.coach.memory[0].text).toBe('Épaule droite sensible au développé');
    expect(s.coach.workProfile).toBe('hypertrophie');
    const id = s.coach.memory[0].id;
    const s2 = applyActions(s, normalizeActions([act('forget', { id })], s, today), today);
    expect(s2.coach.memory).toEqual([]);
  });

  it('le contexte envoyé ne contient ni prénom, ni notes de pesée, ni photo', () => {
    const st = { ...S, heroName: 'Gabin', weightHistory: [{ id: 'w1', date: '2026-10-20', weightKg: 81, note: 'après le resto' }] };
    const c = coachContext(st, today);
    expect(c).toContain('q_bench_3x8');
    expect(c).toContain('81 kg');
    expect(c).not.toContain('Gabin');
    expect(c).not.toContain('resto');
    expect(dictationContext(st, today)).toContain('Développé Couché Barre');
  });
});

describe('dictée lue par le coach intelligent', () => {
  it('séries, charges par série, aide, ressenti, cardio et exercice du catalogue', () => {
    const items = aiDictationItems({
      items: [
        { kind: 'strength', questId: 'q_bench_3x8', catalogId: '', customName: '', sets: [{ reps: 8, kg: 50, assistKg: 0, seconds: 0 }, { reps: 8, kg: 50, assistKg: 0, seconds: 0 }, { reps: 6, kg: 55, assistKg: 0, seconds: 0 }], durationMin: 0, distanceKm: 0, rpe: 9, note: 'dernière série dure' },
        { kind: 'strength', questId: 'q_pullups_3x6', catalogId: '', customName: '', sets: [{ reps: 6, kg: 0, assistKg: 10, seconds: 0 }, { reps: 5, kg: 0, assistKg: 10, seconds: 0 }], durationMin: 0, distanceKm: 0, rpe: 0, note: '' },
        { kind: 'cardio', questId: 'q_run_endurance', catalogId: '', customName: '', sets: [], durationMin: 26, distanceKm: 4.5, rpe: 0, note: '' },
        { kind: 'strength', questId: '', catalogId: 'squat', customName: '', sets: [{ reps: 10, kg: 70, assistKg: 0, seconds: 0 }], durationMin: 0, distanceKm: 0, rpe: 0, note: '' },
        { kind: 'strength', questId: '', catalogId: '', customName: '', sets: [], durationMin: 0, distanceKm: 0, rpe: 0, note: '' }, // vide : ignoré
      ],
    }, S);
    expect(items).toHaveLength(4);
    const [bench, pull, run, squat] = items;
    expect(bench).toMatchObject({ questId: 'q_bench_3x8', unit: 'kg', weightKg: 55, setDetails: [8, 8, 6], setLoads: [50, 50, 55], rpe: 9, aiNote: 'dernière série dure' });
    expect(pull).toMatchObject({ unit: 'reps', assistanceKg: 10, setDetails: [6, 5] });
    expect(run).toMatchObject({ type: 'cardio', distanceKm: 4.5, durationMin: 26 });
    expect(run.calories).toBeGreaterThan(0);
    expect(squat.catalogRef.id).toBe('squat');
  });
});

describe('jours choisis et annulation', () => {
  it('avec des jours de salle choisis, la séance va au prochain jour choisi (jeudi 5 avant dimanche 8)', async () => {
    const { coachPlanWeek } = await import('../coach/planning');
    const mon = '2026-11-02';
    const st = {
      ...S,
      coach: { ...S.coach, sessionsPerWeek: 2, splitMode: 'auto', volleyDays: [4, 5], gymSlots: { 4: { start: '18:00', end: '19:30' }, 0: { start: '10:00', end: '11:30' } } },
      quests: S.quests.map(q => (q.id === 'q_bench_3x8' ? { ...q, history: [...q.history, { id: 'h_mon', date: mon, value: 45, sets: 3, reps: 8, setDetails: [8, 8, 8] }] } : q)),
    };
    expect(coachPlanWeek(st, mon, mon).planned).toEqual(['2026-11-05']); // une séance déjà faite cette semaine : la suivante jeudi
    const st3 = { ...st, coach: { ...st.coach, sessionsPerWeek: 3 } };
    expect(coachPlanWeek(st3, mon, mon).planned).toEqual(['2026-11-05', '2026-11-08']);
  });

  it('le coach reçoit un calendrier et les séances prévues', () => {
    const c = coachContext(S, '2026-11-02');
    expect(c).toContain('Jeudi 2026-11-05');
    expect(c).toContain('Séances prévues par l\'appli');
  });

  it('« Annuler » remet les réglages, l’objectif et retire l’exercice ajouté', async () => {
    const { undoSnapshot, applyUndo } = await import('./actions');
    const list = normalizeActions([
      act('schedule', { gymDays: [4, 7], sessionsPerWeek: 3 }),
      act('adjust', { questId: 'q_bench_3x8', load: 40 }),
      act('add_exercise', { catalogId: 'deadlift' }),
      act('muscle_mode', { mode: 'optimized' }),
    ], S, today);
    const snap = undoSnapshot(S, list);
    const after = applyActions(S, list, today);
    expect(after.quests.length).toBe(S.quests.length + 1);
    const back = applyUndo(after, snap);
    expect(back.coach.gymSlots).toEqual(S.coach.gymSlots);
    expect(back.coach.sessionsPerWeek).toBe(S.coach.sessionsPerWeek);
    expect(back.quests.map(q => q.id)).toEqual(S.quests.map(q => q.id));
    expect(back.quests.find(q => q.id === 'q_bench_3x8').coachOverride).toBeUndefined();
    expect(back.muscleMode).toBe(S.muscleMode || 'simple');
  });
});

describe('séance en plus, juste une fois', () => {
  it('lundi et dimanche habituels + jeudi en plus : rien d’autre ne change', async () => {
    const { coachPlanWeek } = await import('../coach/planning');
    const mon = '2026-11-02';
    const st = { ...S, coach: { ...S.coach, sessionsPerWeek: 2, splitMode: 'auto', volleyDays: [], gymSlots: { 1: { start: '18:00', end: '19:30' }, 0: { start: '10:00', end: '11:30' } } } };
    expect(coachPlanWeek(st, mon, mon).planned).toEqual(['2026-11-02', '2026-11-08']);
    const [a] = normalizeActions([act('extra_session', { add: ['2026-11-05'] })], st, mon);
    const st2 = applyActions(st, [a], mon);
    expect(st2.coach.gymExtra).toEqual(['2026-11-05']);
    expect(st2.coach.sessionsPerWeek).toBe(2);
    expect(st2.coach.gymSlots).toEqual(st.coach.gymSlots);
    expect(coachPlanWeek(st2, mon, mon).planned).toEqual(['2026-11-02', '2026-11-05', '2026-11-08']);
    expect(coachPlanWeek(st2, '2026-11-09', mon).planned).toEqual(['2026-11-09', '2026-11-15']); // la semaine suivante est normale
    const [r] = normalizeActions([act('extra_session', { remove: ['2026-11-05'] })], st2, mon);
    expect(applyActions(st2, [r], mon).coach.gymExtra).toEqual([]);
  });
});

describe('séance ratée à rattraper', () => {
  it('dimanche prévu et pas fait : proposé lundi ; plus rien une fois rattrapé ou ignoré', async () => {
    const { coachMissedSession } = await import('../coach/advice');
    const strip = st => ({ ...st, quests: st.quests.map(q => ({ ...q, history: (q.history || []).filter(e => e.date < '2026-10-28') })) });
    const st = strip({ ...S, coach: { ...S.coach, volleyDays: [], gymSlots: { 0: { start: '10:00', end: '11:30' }, 4: { start: '18:00', end: '19:30' } } } });
    expect(coachMissedSession(st, '2026-11-02')).toEqual({ iso: '2026-11-01' });
    const done = { ...st, quests: st.quests.map(q => (q.id === 'q_bench_3x8' ? { ...q, history: [...q.history, { id: 'h_x', date: '2026-11-02', value: 45, sets: 3, reps: 8, setDetails: [8, 8, 8] }] } : q)) };
    expect(coachMissedSession(done, '2026-11-02')).toBeNull();
    expect(coachMissedSession({ ...st, coach: { ...st.coach, missedDismissed: ['2026-11-01'] } }, '2026-11-02')).toBeNull();
    expect(coachMissedSession(st, '2026-11-06')).toEqual({ iso: '2026-11-05' }); // la plus récente ratée
  });
});

describe('formes de séries et objectif via le coach intelligent', () => {
  it('forme imposée, style, objectif ; « Annuler » remet tout', async () => {
    const { undoSnapshot, applyUndo } = await import('./actions');
    const list = normalizeActions([
      act('method', { questId: 'q_bench_3x8', method: 'drop_set' }),
      act('method', { questId: 'q_pullups_3x6', method: 'pyramid' }), // pas pour un exercice au poids du corps : refusé
      act('method_style', { style: 'classic' }),
      act('main_goal', { kind: 'strength', questId: 'q_squat_3x6', target: 100, deadline: '2027-03-01', text: '100 kg au squat' }),
    ], S, today);
    expect(list.map(a => a.type)).toEqual(['method', 'method_style', 'main_goal']);
    const snap = undoSnapshot(S, list);
    const s = applyActions(S, list, today);
    expect(s.quests.find(q => q.id === 'q_bench_3x8').coachMethod).toBe('drop_set');
    expect(s.coach.methodStyle).toBe('classic');
    expect(s.coach.mainGoal).toMatchObject({ kind: 'strength', questId: 'q_squat_3x6', target: 100, deadline: '2027-03-01' });
    const back = applyUndo(s, snap);
    expect(back.quests.find(q => q.id === 'q_bench_3x8').coachMethod).toBeUndefined();
    expect(back.coach.mainGoal == null).toBe(true);
  });

  it('dictée : échauffement écarté, série lourde et dégressives gardées avec leur type', () => {
    const [it] = aiDictationItems({ items: [{ kind: 'strength', questId: 'q_bench_3x8', catalogId: '', customName: '', method: 'drop_set', durationMin: 0, distanceKm: 0, rpe: 9, note: '', sets: [
      { reps: 10, kg: 20, assistKg: 0, seconds: 0, kind: 'warmup' },
      { reps: 8, kg: 50, assistKg: 0, seconds: 0, kind: 'work' },
      { reps: 8, kg: 50, assistKg: 0, seconds: 0, kind: 'work' },
      { reps: 6, kg: 40, assistKg: 0, seconds: 0, kind: 'drop' },
    ] }] }, S);
    expect(it.setDetails).toEqual([8, 8, 6]);
    expect(it.setKinds).toEqual(['work', 'work', 'drop']);
    expect(it.method).toBe('drop_set');
    expect(it.summary).toContain('Série dégressive');
  });
});

describe('action cardio du coach intelligent', () => {
  it('active le cardio avec des réglages valides, refuse le reste', () => {
    const a = normalizeAction(act('cardio', { on: true, goal: 'weight', kinds: ['run', 'trampoline'], perWeek: 9, minutes: 33, runner: false }), S, today);
    expect(a.args).toEqual({ on: true, goal: 'weight', kinds: ['run'], minutes: 30, runner: false });
    const state = applyActions(S, [a], today);
    expect(state.coach.cardio).toMatchObject({ on: true, goal: 'weight', kinds: ['run'], minutes: 30, asked: true });
    expect(coachContext(state, today)).toContain('Cardio du coach : objectif Perdre du poids');
    expect(normalizeAction(act('cardio', { goal: 'yoga' }), S, today)).toBe(null);
  });
});

describe('action cardio : jours', () => {
  it('jours au format 1-7 de l’IA → jours de l’appli, et le contexte les liste', () => {
    const a = normalizeAction(act('cardio', { days: [1, 2, 3, 6] }), S, today);
    expect(a.args.days).toEqual([1, 2, 3, 6]);
    const st = applyActions(S, [a], today);
    expect(st.coach.cardio.days).toEqual([1, 2, 3, 6]);
    const ctx = coachContext(st, today);
    expect(ctx).toContain('Jours de cardio choisis : lundi (1), mardi (2), mercredi (3), samedi (6)');
    expect(ctx).toMatch(/Prochaines séances de cardio prévues par l'appli avec ces réglages : (lundi|mardi|mercredi|samedi)/);
    expect(normalizeAction(act('cardio', { days: [7] }), S, today).args.days).toEqual([0]);
  });
});
