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
    expect(a.args).toEqual({ gymDays: [0, 1, 4], sessionMinutes: 45, sessionsPerWeek: 3 });
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
