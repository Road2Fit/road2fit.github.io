import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from '../data/catalog';
import { FINE_GROUPS } from '../data/muscles';
import { PAIN_MUSCLES, muscleZone, painAdvice, painFor, painLabel, painsLine, painsOf, togglePain, zonesOf } from './pains';

const byId = id => { const c = EXERCISE_CATALOG.find(x => x.id === id); return { catalogId: c.id, name: c.name, category: c.category }; };
describe('douleurs signalées', () => {
  it('zones sollicitées par un exercice : articulations et muscles', () => {
    expect(zonesOf(byId('bench_press'))).toEqual(expect.arrayContaining(['shoulder', 'elbow', 'wrist', 'm:Pectoraux']));
    expect(zonesOf(byId('squat'))).toEqual(expect.arrayContaining(['knee', 'hip', 'lowback', 'm:Quadriceps']));
    expect(zonesOf(byId('deadlift'))).toEqual(expect.arrayContaining(['lowback', 'hip']));
    expect(zonesOf(byId('barbell_curl'))).toEqual(expect.arrayContaining(['elbow', 'm:Biceps']));
    expect(zonesOf(byId('leg_press'))).toContain('knee');
    expect(zonesOf(byId('fp_plank'))).not.toContain('knee');
    expect(zonesOf(byId('fp_lateral_db'))).toEqual(expect.arrayContaining(['shoulder', 'm:Épaules']));
  });
  it('chaque muscle suivi peut être signalé (les lombaires = bas du dos)', () => {
    const zones = new Set([...PAIN_MUSCLES.map(m => muscleZone(m.muscle)), 'lowback']);
    for (const g of FINE_GROUPS) expect(zones.has(muscleZone(g.id)), g.id).toBe(true);
  });
  it('côté droit / gauche dans le texte, accordé', () => {
    expect(painLabel({ zone: 'm:Triceps', side: 'right' })).toBe('Triceps droit');
    expect(painLabel({ zone: 'shoulder', side: 'left' })).toBe('Épaule gauche');
    expect(painLabel({ zone: 'm:Ischio-jambiers', side: 'right' })).toBe('Ischio-jambiers droits');
    expect(painLabel({ zone: 'lowback', side: null })).toBe('Bas du dos');
  });
  it('un exercice est signalé seulement si sa zone ou son muscle est douloureux', () => {
    const coach = { pains: [{ zone: 'knee', side: 'left', since: '2026-11-11' }] };
    expect(painFor(byId('squat'), coach)).toMatchObject({ zone: 'knee', side: 'left' });
    expect(painFor(byId('bench_press'), coach)).toBe(null);
    expect(painFor(byId('squat'), {})).toBe(null);
    expect(painAdvice(painFor(byId('squat'), coach))).toMatch(/Genou gauche sensible/);
    const tri = { pains: [{ zone: 'm:Triceps', side: 'right', since: '2026-11-12' }] };
    expect(painFor(byId('fp_skull'), tri)).toMatchObject({ zone: 'm:Triceps', side: 'right' });
    expect(painFor(byId('barbell_curl'), tri)).toBe(null);
  });
  it('ajouter / retirer un côté, ancienne douleur sans côté = les deux côtés, ligne pour le coach IA', () => {
    let pains = togglePain({}, 'm:Triceps', 'right', '2026-11-12');
    expect(pains).toEqual([{ zone: 'm:Triceps', side: 'right', since: '2026-11-12' }]);
    pains = togglePain({ pains }, 'm:Triceps', 'left', '2026-11-12');
    expect(pains.map(p => p.side)).toEqual(['right', 'left']);
    expect(painsLine({ coach: { pains } })).toMatch(/triceps droit \(depuis le 2026-11-12\)/);
    pains = togglePain({ pains }, 'm:Triceps', 'right', '2026-11-13');
    expect(pains).toEqual([{ zone: 'm:Triceps', side: 'left', since: '2026-11-12' }]);
    expect(painsOf({ pains: [{ zone: 'knee', since: '2026-11-11' }] }).map(p => p.side)).toEqual(['right', 'left']);
    expect(painsOf({ pains: [{ zone: 'neck', since: '2026-11-11' }] })).toEqual([{ zone: 'neck', side: null, since: '2026-11-11' }]);
    expect(painsLine({ coach: { pains: [] } })).toBe('');
  });
});
