import { describe, expect, it } from 'vitest';
import { PROFILES, activeProfile, coachProfileAt, pctForReps, profileOpts, weightDirection } from './profiles';
import { computeExerciseTarget } from './targets';

const TODAY = '2026-10-21';
const entry = (id, date, sets, value, extra = {}) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, assistanceKg: 0, rpe: 8, calories: 60, note: '', ...extra });
const bench = history => ({
  id: 'q_b', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', level: 1, startValue: 40, currentValue: 60,
  goalValue: 140, goalSets: 3, goalReps: 6, setDetails: [6, 6, 6], history,
});
const curl = history => ({ ...bench(history), id: 'q_c', name: 'Curl Biceps Haltères', category: 'Épaules & Bras', currentValue: 12, goalValue: 30 });

describe('profils : repères et choix par cycle', () => {
  it('pourcentage du max selon les répétitions (tableau NSCA)', () => {
    expect(pctForReps(1)).toBe(100);
    expect(pctForReps(5)).toBe(87);
    expect(pctForReps(10)).toBe(75);
    expect(pctForReps(12)).toBe(67);
    expect(pctForReps(15)).toBeLessThan(67);
    expect(pctForReps(11)).toBeGreaterThan(67); // interpolation
  });

  it('les trois profils ont des fourchettes cohérentes (de plus en plus de reps, de moins en moins de charge et de repos)', () => {
    const { puissance: p, hypertrophie: h, endurance: e } = PROFILES;
    expect(p.hi).toBeLessThan(h.lo);
    expect(h.hi).toBeLessThan(e.lo);
    expect(p.pctStart).toBeGreaterThan(h.pctStart);
    expect(h.pctStart).toBeGreaterThan(e.pctStart);
    expect(p.restCompound).toBeGreaterThan(h.restCompound);
    expect(h.restCompound).toBeGreaterThan(e.restCompound);
  });

  it('profil général, sinon automatique', () => {
    expect(coachProfileAt({ workProfile: 'puissance' }, TODAY)).toMatchObject({ id: 'puissance', fromCycle: false });
    expect(coachProfileAt({ workProfile: 'auto' }, TODAY).id).toBeNull();
    expect(coachProfileAt({ workProfile: 'nimportequoi' }, TODAY).id).toBeNull();
  });

  it('un profil par cycle : le cycle en cours donne le profil, la liste se répète', () => {
    const coach = { workProfile: 'auto', cycleWeeks: 4, cycleStart: '2026-10-05', cycleProfiles: ['hypertrophie', 'puissance', 'auto'] };
    expect(coachProfileAt(coach, '2026-10-21')).toMatchObject({ id: 'hypertrophie', cycleIndex: 0, fromCycle: true }); // semaine 3 du cycle 1
    expect(coachProfileAt(coach, '2026-11-02').id).toBe('puissance'); // cycle 2
    expect(coachProfileAt(coach, '2026-11-30').id).toBeNull(); // cycle 3 = automatique
    expect(coachProfileAt(coach, '2026-12-28').id).toBe('hypertrophie'); // on recommence au premier
    // cycles désactivés : on revient au profil général
    expect(coachProfileAt({ ...coach, cycleWeeks: 0, workProfile: 'endurance' }, TODAY).id).toBe('endurance');
  });

  it('profileOpts transmet le profil du jour et les records réels', () => {
    const state = { coach: { workProfile: 'puissance' }, maxRecords: { q_b: { kg: 100 } } };
    expect(profileOpts(state, TODAY)).toEqual({ profile: 'puissance', maxRecords: { q_b: { kg: 100 } } });
    expect(profileOpts({}, TODAY).profile).toBeNull();
  });
});

describe('profils : objectif d’un exercice', () => {
  it('sans profil : l’ancien calcul est inchangé', () => {
    const q = bench([entry('a', '2026-10-19', [6, 6, 6], 60)]);
    expect(computeExerciseTarget(q, { today: TODAY }).profile).toBeNull();
    expect(computeExerciseTarget(q, { today: TODAY, profile: null }).change).toBe('up');
  });

  it('départ d’un profil : séries, repos et charge calculée d’après le record réel', () => {
    const t = computeExerciseTarget(bench([]), { today: TODAY, profile: 'puissance', maxRecords: { q_b: { kg: 100 } } });
    expect(t.sets).toBe(4);
    expect(t.targetReps).toEqual([3, 3, 3, 3]);
    expect(t.load).toBe(85); // 85 % de 100 kg
    expect(t.restSec).toBe(210); // exercice principal : repos long
    expect(t.repRange).toEqual([3, 5]);
    expect(t.change).toBe('new');
    const h = computeExerciseTarget(bench([]), { today: TODAY, profile: 'hypertrophie', maxRecords: { q_b: { kg: 100 } } });
    expect(h.load).toBe(72.5); // 72 % arrondis au pas de 2,5 kg
    expect(h.restSec).toBe(120);
    const e = computeExerciseTarget(curl([]), { today: TODAY, profile: 'endurance' });
    expect(e.sets).toBe(3);
    expect(e.targetReps).toEqual([15, 15, 15]);
    expect(e.restSec).toBe(45); // exercice d'appoint
  });

  it('dans la fourchette : +1 répétition par série, puis charge supérieure en haut de la fourchette', () => {
    const milieu = computeExerciseTarget(bench([entry('a', '2026-10-19', [10, 10, 10, 10], 60)]), { today: TODAY, profile: 'hypertrophie' });
    expect(milieu.change).toBe('hold');
    expect(milieu.load).toBe(60);
    expect(milieu.targetReps).toEqual([11, 11, 11, 11]);
    const haut = computeExerciseTarget(bench([entry('a', '2026-10-19', [12, 12, 12, 12], 60)]), { today: TODAY, profile: 'hypertrophie' });
    expect(haut.change).toBe('up');
    expect(haut.load).toBeGreaterThan(60);
    expect(haut.targetReps).toEqual([8, 8, 8, 8]); // on repart du bas de la fourchette
  });

  it('très dur en haut de la fourchette : on consolide ; facile : on monte sans attendre le haut', () => {
    const dur = computeExerciseTarget(bench([entry('a', '2026-10-19', [12, 12, 12, 12], 60, { rpe: 10 })]), { today: TODAY, profile: 'hypertrophie' });
    expect(dur.change).toBe('hold');
    expect(dur.load).toBe(60);
    const facile = computeExerciseTarget(bench([entry('a', '2026-10-19', [10, 10, 10, 10], 60, { rpe: 5 })]), { today: TODAY, profile: 'hypertrophie' });
    expect(facile.change).toBe('up');
  });

  it('passage de l’hypertrophie à la puissance : la charge est relevée d’après le max estimé (+15 % maximum)', () => {
    const q = bench([entry('a', '2026-10-19', [10, 10, 10, 10], 60)]); // max estimé ≈ 80 kg
    const t = computeExerciseTarget(q, { today: TODAY, profile: 'puissance' });
    expect(t.change).toBe('profile');
    expect(t.load).toBeGreaterThan(60);
    expect(t.load).toBeLessThanOrEqual(69); // 60 × 1,15
    expect(t.targetReps).toEqual([3, 3, 3, 3]);
    expect(t.reason).toContain('Profil Puissance');
  });

  it('passage de la puissance à l’hypertrophie : la charge baisse', () => {
    const q = bench([entry('a', '2026-10-19', [5, 5, 5, 5], 90)]); // max estimé ≈ 102 kg
    const t = computeExerciseTarget(q, { today: TODAY, profile: 'hypertrophie' });
    expect(t.change).toBe('profile');
    expect(t.load).toBeLessThan(90);
    expect(t.load).toBeGreaterThanOrEqual(72); // jamais plus de 20 % de baisse d'un coup
    expect(t.targetReps[0]).toBe(8);
  });

  it('exercice assisté : trop de répétitions pour la puissance → l’aide diminue', () => {
    const dips = {
      id: 'q_d', name: 'Dips Assistés', category: 'Pectoraux', type: 'strength', unit: 'reps', level: 1, startValue: 6, currentValue: 10,
      goalValue: 10, goalSets: 3, goalReps: 10, startAssistanceKg: 20, currentAssistanceKg: 10, goalAssistanceKg: 0, setDetails: [10, 10, 10],
      history: [entry('a', '2026-10-19', [10, 10, 10, 10], 10, { assistanceKg: 10 })],
    };
    const t = computeExerciseTarget(dips, { today: TODAY, profile: 'puissance' });
    expect(t.change).toBe('profile');
    expect(t.assist).toBe(7.5);
    const dedans = computeExerciseTarget({ ...dips, history: [entry('a', '2026-10-19', [10, 10, 10, 10], 10, { assistanceKg: 10 })] }, { today: TODAY, profile: 'hypertrophie' });
    expect(dedans.change).toBe('hold'); // 10 reps = dans la fourchette 8-12
    expect(dedans.targetReps).toEqual([11, 11, 11, 11]);
  });

  it('exercice chronométré : le profil ne s’applique pas', () => {
    const plank = {
      id: 'q_p', name: 'Gainage Planche (en secondes)', category: 'Abdominaux', type: 'strength', unit: 'reps', timed: true, level: 1, startValue: 40,
      currentValue: 60, goalValue: 90, goalSets: 3, goalReps: 60, setDetails: [60, 60, 60], history: [entry('a', '2026-10-19', [60, 60, 60], 60)],
    };
    expect(computeExerciseTarget(plank, { today: TODAY, profile: 'puissance' }).profile).toBeNull();
  });

  it('semaine allégée : le profil reste mais la charge baisse de 10 % et une série en moins', () => {
    const q = bench([entry('a', '2026-10-19', [10, 10, 10, 10], 60)]);
    const normal = computeExerciseTarget(q, { today: TODAY, profile: 'hypertrophie' });
    const allegee = computeExerciseTarget(q, { today: TODAY, profile: 'hypertrophie', deload: true });
    expect(allegee.sets).toBe(normal.sets - 1);
    expect(allegee.load).toBeLessThan(normal.load);
    expect(allegee.profile).toBe('hypertrophie');
  });
});

describe('profil automatique selon l’objectif de poids', () => {
  const w = (kg, date = '2026-10-20') => ({ id: 'w' + kg, date, weightKg: kg });
  it('sens de l’objectif : perdre, prendre, garder ; rien sans pesée ni objectif', () => {
    expect(weightDirection({ targetWeightKg: 75, userWeightKg: 82, weightHistory: [] })).toBe(null); // valeur par défaut de l'appli
    expect(weightDirection({ targetWeightKg: 75, weightHistory: [w(82)] })).toBe('lose');
    expect(weightDirection({ targetWeightKg: 80, weightHistory: [w(72)] })).toBe('gain');
    expect(weightDirection({ targetWeightKg: 72.5, weightHistory: [w(72)] })).toBe('keep');
    expect(weightDirection({ weightHistory: [], userWeightKg: 90, coach: { mainGoal: { kind: 'weight', target: 80 } } })).toBe('lose');
  });
  it('perdre ou prendre du poids → hypertrophie ; un profil choisi reste prioritaire ; maintenir → réglage d’origine', () => {
    expect(activeProfile({ targetWeightKg: 75, weightHistory: [w(82)] }, TODAY)).toMatchObject({ id: 'hypertrophie', fromWeight: 'lose' });
    expect(activeProfile({ targetWeightKg: 80, weightHistory: [w(72)] }, TODAY)).toMatchObject({ id: 'hypertrophie', fromWeight: 'gain' });
    expect(activeProfile({ targetWeightKg: 75, weightHistory: [w(82)], coach: { workProfile: 'puissance' } }, TODAY).id).toBe('puissance');
    expect(activeProfile({ targetWeightKg: 72, weightHistory: [w(72)] }, TODAY).id).toBe(null);
    expect(profileOpts({ targetWeightKg: 75, weightHistory: [w(82)] }, TODAY).profile).toBe('hypertrophie');
  });
});
