import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from '../data/catalog';
import { coachOn, coachableQuests, doable, doableAtHome, equipmentLine, homeStarters, isHomeDay, missingText, needsOf, placeOn, toggleHomeDay, undoableQuests } from './equipment';

const byId = id => EXERCISE_CATALOG.find(c => c.id === id);
describe('lieu et matériel', () => {
  it('ce que demande un exercice', () => {
    expect(needsOf(byId('pushups'))).toEqual([]);
    expect(needsOf(byId('home_squat'))).toEqual([]);
    expect(needsOf(byId('leg_press'))).toEqual(['gym']);
    expect(needsOf(byId('lat_pulldown'))).toEqual(['gym']);
    expect(needsOf(byId('pullups'))).toEqual(['pullbar']);
    expect(needsOf(byId('dips'))).toEqual(['dipbars']);
    expect(needsOf(byId('fp_bench_dips'))).toEqual(['bench']);
    expect(needsOf(byId('bench_press')).sort()).toEqual(['barbell', 'bench', 'rack']);
    expect(needsOf(byId('deadlift'))).toEqual(['barbell']);
    expect(needsOf(byId('fp_db_bench')).sort()).toEqual(['bench', 'dumbbells']);
    expect(needsOf(byId('fp_lateral_db'))).toEqual(['dumbbells']);
    expect(needsOf({ catalogId: 'squat', name: 'Squat Barre' }).sort()).toEqual(['barbell', 'rack']);
  });
  it('chaque exercice de muscu a une réponse, et il reste de quoi travailler tout le corps sans matériel', () => {
    const coach = { place: 'home', equipment: [] };
    const ok = EXERCISE_CATALOG.filter(c => c.type === 'strength' && doableAtHome(c, coach));
    const cats = new Set(ok.map(c => c.category));
    for (const c of ['Pectoraux', 'Jambes', 'Dos', 'Abdominaux']) expect(cats.has(c), c).toBe(true);
    expect(ok.every(c => !/machine|poulie|presse/i.test(c.name))).toBe(true);
  });
  it('salle : tout est faisable ; maison : selon le matériel', () => {
    expect(doable(byId('leg_press'), { place: 'gym' })).toBe(true);
    expect(doable(byId('leg_press'), {})).toBe(true);
    expect(doable(byId('leg_press'), { place: 'both', equipment: [] })).toBe(true);
    expect(doable(byId('leg_press'), { place: 'home', equipment: ['dumbbells'] })).toBe(false);
    expect(doable(byId('fp_lateral_db'), { place: 'home', equipment: ['dumbbells'] })).toBe(true);
    expect(missingText(byId('pullups'), { place: 'home', equipment: [] })).toBe('barre de traction');
    expect(missingText(byId('leg_press'), { place: 'home', equipment: [] })).toBe('matériel de salle');
    expect(missingText(byId('pushups'), { place: 'home', equipment: [] })).toBe('');
  });
  it('programme de départ chez soi : un exercice par grand mouvement, faisable', () => {
    const none = homeStarters({ place: 'home', equipment: [] });
    expect(none).toEqual(['home_squat', 'fp_glute_bridge', 'home_incline_pushups', 'fp_superman_hold', 'fp_decline_pushups', 'fp_plank']);
    const db = { place: 'home', equipment: ['dumbbells', 'bench', 'pullbar'] };
    const s = homeStarters(db, { beginner: false });
    expect(s).toContain('fp_db_bench');
    expect(s).toContain('fp_db_row');
    for (const id of [...none, ...s]) { expect(byId(id), id).toBeTruthy(); }
    for (const id of s) expect(doableAtHome(byId(id), db), id).toBe(true);
  });
  it('exercices suivis à remplacer, ligne pour le coach IA', () => {
    const state = { coach: { place: 'home', equipment: [] }, quests: [{ id: 'a', type: 'strength', catalogId: 'leg_press', name: 'Presse à Cuisses' }, { id: 'b', type: 'strength', catalogId: 'pushups', name: 'Pompes Classiques' }] };
    expect(undoableQuests(state).map(q => q.id)).toEqual(['a']);
    expect(undoableQuests({ ...state, coach: { place: 'both' } })).toEqual([]);
    expect(equipmentLine(state)).toMatch(/chez soi uniquement.*poids du corps seulement/);
    expect(equipmentLine({ coach: {} })).toMatch(/en salle/);
  });
  it('séance exceptionnellement à la maison : seulement ce jour-là', () => {
    const coach = { place: 'gym', equipment: ['dumbbells'], homeDays: toggleHomeDay({}, '2026-11-14', '2026-11-12') };
    expect(coach.homeDays).toEqual(['2026-11-14']);
    expect(isHomeDay(coach, '2026-11-14')).toBe(true);
    expect(placeOn(coach, '2026-11-14')).toBe('home');
    expect(placeOn(coach, '2026-11-16')).toBe('gym');
    expect(coachOn(coach, '2026-11-14').place).toBe('home');
    const bench = { id: 'q1', type: 'strength', catalogId: 'bench_press', name: byId('bench_press').name };
    const pushups = { id: 'q2', type: 'strength', catalogId: 'pushups', name: byId('pushups').name };
    const state = { coach, quests: [bench, pushups] };
    expect(coachableQuests(state, '2026-11-14').map(q => q.id)).toEqual(['q2']);
    expect(coachableQuests(state, '2026-11-16').map(q => q.id)).toEqual(['q1', 'q2']);
    expect(equipmentLine(state)).toMatch(/Exceptionnellement à la maison le 2026-11-14/);
    // retirer le jour ; les jours passés sont nettoyés
    expect(toggleHomeDay(coach, '2026-11-14', '2026-11-12')).toEqual([]);
    expect(toggleHomeDay({ homeDays: ['2026-11-01'] }, '2026-11-20', '2026-11-12')).toEqual(['2026-11-20']);
  });
});
