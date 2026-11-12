import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from '../data/catalog';
import { painAdvice, painFor, painsLine, togglePain, zonesOf } from './pains';

const byId = id => { const c = EXERCISE_CATALOG.find(x => x.id === id); return { catalogId: c.id, name: c.name, category: c.category }; };
describe('douleurs signalées', () => {
  it('zones sollicitées par un exercice', () => {
    expect(zonesOf(byId('bench_press'))).toEqual(expect.arrayContaining(['shoulder', 'elbow', 'wrist']));
    expect(zonesOf(byId('squat'))).toEqual(expect.arrayContaining(['knee', 'hip', 'lowback']));
    expect(zonesOf(byId('deadlift'))).toEqual(expect.arrayContaining(['lowback', 'hip']));
    expect(zonesOf(byId('barbell_curl'))).toContain('elbow');
    expect(zonesOf(byId('leg_press'))).toContain('knee');
    expect(zonesOf(byId('fp_plank'))).not.toContain('knee');
    expect(zonesOf(byId('fp_lateral_db'))).toEqual(['shoulder']);
  });
  it('un exercice est signalé seulement si sa zone est douloureuse', () => {
    const coach = { pains: [{ zone: 'knee', since: '2026-11-11' }] };
    expect(painFor(byId('squat'), coach)).toBe('knee');
    expect(painFor(byId('bench_press'), coach)).toBe(null);
    expect(painFor(byId('squat'), {})).toBe(null);
    expect(painAdvice('knee')).toMatch(/Genou sensible/);
  });
  it('ajouter / retirer une zone, ligne pour le coach IA', () => {
    let pains = togglePain({}, 'shoulder', '2026-11-11');
    expect(pains).toEqual([{ zone: 'shoulder', since: '2026-11-11' }]);
    expect(painsLine({ coach: { pains } })).toMatch(/épaule \(depuis le 2026-11-11\)/);
    pains = togglePain({ pains }, 'shoulder', '2026-11-12');
    expect(pains).toEqual([]);
    expect(painsLine({ coach: { pains } })).toBe('');
  });
});
