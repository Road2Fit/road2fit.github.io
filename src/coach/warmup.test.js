import { describe, expect, it } from 'vitest';
import { warmupSets } from './warmup';
import { warmupCalories } from '../lib/calories';

const load = (extra = {}) => ({ name: 'Développé Couché Barre', arena: 'Pectoraux', kind: 'load', compound: true, load: 80, targetReps: [8, 8, 8], goalReps: 8, ...extra });

describe('échauffement de la séance guidée', () => {
  it('premier exercice lourd : 2 séries progressives, toujours plus légères que le travail', () => {
    const w = warmupSets(load(), []);
    expect(w).toHaveLength(2);
    expect(w[0].load).toBe(40);
    expect(w[0].reps).toBe(8);
    expect(w[1].load).toBe(55); // 70 % de 80 = 56 → pas de 2,5
    expect(w[1].reps).toBe(5);
    expect(w[1].load).toBeGreaterThan(w[0].load);
    expect(w[1].load).toBeLessThan(80);
  });

  it('barre olympique : jamais sous la barre seule (20 kg), pas de doublon', () => {
    const w = warmupSets(load({ load: 30 }), []);
    expect(w.every(s => s.load >= 20)).toBe(true);
    expect(w[0].load).toBe(20);
    const h = warmupSets(load({ name: 'Curl Haltères', compound: false, load: 16 }), []);
    expect(h[0].load).toBeLessThan(20); // haltères : pas concerné
  });

  it('travail lourd (≤ 6 reps ou profil Puissance) : plus proche de la charge, moins de reps', () => {
    const w = warmupSets(load({ targetReps: [4, 4, 4], goalReps: 4, profile: 'puissance' }), []);
    expect(w.map(x => x.reps)).toEqual([8, 3]);
    expect(w[1].load).toBe(65); // 80 % arrondi au pas de 2,5 kg
  });

  it('muscle déjà échauffé par un exercice précédent : une seule série', () => {
    const w = warmupSets(load({ name: 'Écartés', compound: false, load: 30 }), [load()]);
    expect(w).toHaveLength(1);
    expect(w[0].load).toBeLessThan(30);
  });

  it('une autre arène repart à froid : 2 séries', () => {
    const w = warmupSets(load({ arena: 'Dos', name: 'Rowing Barre' }), [load()]);
    expect(w).toHaveLength(2);
  });

  it('accessoire de charge moyenne, premier de son arène : 1 série', () => {
    expect(warmupSets(load({ compound: false, load: 25 }), [])).toHaveLength(1);
  });

  it('charge très légère : 1 série à 50 %, jamais aussi lourde que le travail', () => {
    const w = warmupSets(load({ name: 'Élévations latérales', compound: false, load: 6, targetReps: [12, 12, 12] }), []);
    expect(w).toHaveLength(1);
    expect(w[0].load).toBeLessThan(6);
    expect(warmupSets(load({ load: 0 }), [])).toEqual([]);
  });

  it('suit la charge modifiée dans la séance', () => {
    expect(warmupSets(load(), [], 100)[0].load).toBe(50);
  });

  it('aide élastique : plus d’aide ; poids du corps : moitié du travail ; tenue et abdos : pas d’échauffement', () => {
    const a = warmupSets({ name: 'Tractions', arena: 'Dos', kind: 'assisted', assist: 20, targetReps: [6, 6], goalReps: 6 }, []);
    expect(a).toHaveLength(1);
    expect(a[0].assist).toBe(30);
    expect(a[0].reps).toBe(3);
    const p = warmupSets({ name: 'Pompes', arena: 'Pectoraux', kind: 'reps', targetReps: [15, 15], goalReps: 15 }, []);
    expect(p).toEqual([expect.objectContaining({ reps: 8 })]);
    const t = warmupSets({ name: 'Planche', arena: 'Abdos', kind: 'reps', timed: true, targetReps: [60, 60], goalReps: 60 }, []);
    expect(t).toEqual([]); // planche : rien à afficher
    expect(warmupSets({ name: 'Crunchs', arena: 'Abdominaux', kind: 'reps', targetReps: [15, 15], goalReps: 15 }, [])).toEqual([]);
    expect(warmupSets({ name: 'Relevés de jambes', arena: 'Obliques', kind: 'reps', targetReps: [12], goalReps: 12 }, [])).toEqual([]);
  });
});

describe('calories de l’échauffement', () => {
  it('quelques calories en plus, rien sans série faite', () => {
    const k = warmupCalories({ unit: 'kg', userWeightKg: 80 }, [{ load: 30, reps: 8 }, { load: 45, reps: 5 }]);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(15);
    expect(warmupCalories({ unit: 'kg', userWeightKg: 80 }, [])).toBe(0);
  });
});
