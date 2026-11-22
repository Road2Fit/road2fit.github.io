// 4.54 : le coach IA règle tous les paramètres de la personne (vérifiés un par un).
import { describe, it, expect } from 'vitest';
import { applyActions, normalizeActions, undoSnapshot, applyUndo } from './actions';
import { INITIAL_STATE } from '../data/initialState';
import { maxTestReadiness } from '../coach/maxTest';

const today = '2026-11-22';
const S = { ...INITIAL_STATE, quests: [{ id: 'q1', name: 'Tractions', type: 'strength', unit: 'reps', catalogId: 'pullups', history: [] }, { id: 'q2', name: 'Développé', type: 'strength', unit: 'kg', catalogId: 'bench_press', history: [] }] };
const act = (type, args) => ({ type, label: '', args: JSON.stringify(args) });

describe('action settings', () => {
  it('garde seulement les champs valides, applique, et s’annule', () => {
    const [a] = normalizeActions([act('settings', { place: 'home', equipment: ['dumbbells', 'tank'], pains: [{ zone: 'knee', side: 'left' }, { zone: 'nope' }], gymSlots: { 4: { start: '18:00', end: '19:30' }, 9: { start: 'x' } }, level: 'expert', maxTest1rm: true, sound: false, name: '  Gab  ', hack: 1 })], S, today);
    expect(a.args).toEqual({ place: 'home', equipment: ['dumbbells'], pains: [{ zone: 'knee', side: 'left', since: today }], gymSlots: { 4: { start: '18:00', end: '19:30' } }, level: 'expert', maxTest1rm: true, sound: false, name: 'Gab' });
    const snap = undoSnapshot(S, [a]);
    const n = applyActions(S, [a], today);
    expect(n.coach.place).toBe('home');
    expect(n.coach.experience.level).toBe('expert');
    expect(n.soundEnabled).toBe(false);
    expect(n.heroName).toBe('Gab');
    expect(maxTestReadiness(n, today).ok).toBe(true);
    const back = applyUndo(n, snap);
    expect(back.coach.place).toBe(S.coach && S.coach.place);
    expect(normalizeActions([act('settings', { place: 'lune' })], S, today)).toEqual([]);
  });
});

describe('action exercise', () => {
  it('pause, record réel, réglage du test de max ; refuse un exercice inconnu', () => {
    const acts = normalizeActions([act('exercise', { questId: 'q1', paused: true, maxTestAssist: 0 }), act('exercise', { questId: 'q2', record: { kg: 95 }, maxTestLoad: 100 }), act('exercise', { questId: 'zz', paused: true })], S, today);
    expect(acts).toHaveLength(2);
    const n = applyActions(S, acts, today);
    expect(n.quests[0]).toMatchObject({ paused: true, maxTestAssist: 0 });
    expect(n.quests[1].maxTestLoad).toBe(100);
    expect(n.maxRecords.q2).toEqual({ kg: 95, date: today });
  });
});
