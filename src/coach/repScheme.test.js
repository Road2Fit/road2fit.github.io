// 4.46 : audit de TOUT le catalogue (demande de Gabin après un « 3 × 8 » donné à des sauts). Chaque exercice est ajouté
// avec chaque profil de travail, puis suivi sur 8 séances réussies : rien d'absurde ne doit sortir.
import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG } from '../data/catalog';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { isTimedCatalog } from '../lib/quests';
import { computeExerciseTarget } from './targets';
import { profileOpts } from './profiles';
import { fixRepSchemes, repSchemeOf } from './repScheme';
import { coachIsCompound } from './settings';
import { normalizeState } from '../data/state';

const TODAY = '2026-11-13';
const PROFILES = ['auto', 'hypertrophie', 'puissance', 'endurance'];
const STRENGTH = EXERCISE_CATALOG.filter(c => c.type === 'strength');
const addDays = (d, n) => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

/** Ajoute l'exercice avec ce profil puis enchaîne 8 séances où tout est réussi (ressenti 7). */
function run(c, prof) {
  const state = { quests: [], userWeightKg: 80, coach: { workProfile: prof, sessionsPerWeek: 3 } };
  const q0 = makeQuestFromCatalog(c, state, TODAY).quest;
  let q = { ...q0, history: [...(q0.history || [])] };
  const out = [];
  let date = TODAY;
  for (let k = 0; k < 8; k++) {
    const e = computeExerciseTarget(q, { ...profileOpts({ ...state, quests: [q] }, date), today: date });
    out.push(e);
    const reps = e.targetReps.slice();
    const entry = { id: `h${k}`, date, value: e.kind === 'load' ? e.load : Math.max(...reps), sets: reps.length, reps: Math.max(...reps), setDetails: reps, assistanceKg: e.kind === 'assisted' ? e.assist : 0, rpe: 7, rpeSet: true, calories: 50, note: '' };
    q = { ...q, history: [...q.history, entry], currentValue: entry.value, currentAssistanceKg: entry.assistanceKg, setDetails: reps };
    date = addDays(date, 3);
  }
  return { q0, out };
}

describe('audit du catalogue : forme des séries', () => {
  it('« (en secondes) » = exercice chronométré ; des pompes ne sont jamais une tenue', () => {
    STRENGTH.filter(c => /\(en secondes\)/.test(c.name)).forEach(c => expect(isTimedCatalog(c), c.id).toBe(true));
    STRENGTH.filter(c => /pompes|push.?up/i.test(c.name) && !/\(en secondes\)/.test(c.name)).forEach(c => expect(isTimedCatalog(c), c.id).toBe(false));
  });

  it('sauts, haltérophilie, HYROX, figures, condition physique : forme du catalogue avec TOUS les profils, et jamais plus de répétitions', () => {
    const fixed = STRENGTH.filter(c => repSchemeOf(c));
    expect(fixed.length).toBeGreaterThan(30);
    for (const c of fixed) {
      for (const prof of PROFILES) {
        const { q0, out } = run(c, prof);
        expect(q0.goalSets, `${c.id} ${prof}`).toBe(c.defaultGoalSets);
        expect(q0.goalReps, `${c.id} ${prof}`).toBe(c.defaultGoalReps);
        out.forEach((e, k) => {
          expect(Math.max(...e.targetReps), `${c.id} ${prof} séance ${k + 1}`).toBeLessThanOrEqual(c.defaultGoalReps);
          expect(e.profile, c.id).toBeNull();
        });
      }
    }
  });

  it('profil Puissance : 3-5 reps lourdes seulement sur les exercices poly-articulaires (jamais sur l’isolation ou la prévention)', () => {
    for (const c of STRENGTH.filter(x => !repSchemeOf(x) && !isTimedCatalog(x) && x.unit === 'kg' && !coachIsCompound(x.name))) {
      const { out } = run(c, 'puissance');
      expect(Math.min(...out[0].targetReps), c.id).toBeGreaterThanOrEqual(6);
    }
    const ext = run(EXERCISE_CATALOG.find(x => x.id === 'fp_ext_rotation'), 'puissance').out[0];
    expect(Math.min(...ext.targetReps)).toBeGreaterThanOrEqual(8);
  });

  it('aucune hausse de charge de plus de 10 % d’un coup sans avoir d’abord monté les répétitions (repère ACSM 2 à 10 %)', () => {
    const errs = [];
    for (const c of STRENGTH.filter(x => x.unit === 'kg' && !repSchemeOf(x) && !isTimedCatalog(x))) {
      for (const prof of PROFILES) {
        const { out } = run(c, prof);
        for (let k = 1; k < out.length; k++) {
          const a = out[k - 1]; const b = out[k];
          if (!(a.load > 0) || b.load <= a.load * 1.105) continue;
          // un gros cran n'est permis qu'après des répétitions au-dessus de l'objectif (double progression) ou un changement de fourchette
          const upReps = Math.min(...a.targetReps) > Math.min(...b.targetReps);
          if (!upReps) errs.push(`${c.id} ${prof} : ${a.load} → ${b.load} kg à ${a.targetReps.join('/')} reps`);
        }
      }
    }
    expect(errs).toEqual([]);
  });

  it('sauvegardes existantes : des sauts ajoutés en 3 × 8 sans séance reviennent à la forme du catalogue, une seule fois', () => {
    const c = EXERCISE_CATALOG.find(x => x.id === 'ply_box_jump');
    const old = { id: 'q1', catalogId: c.id, name: c.name, type: 'strength', unit: 'reps', goalSets: 3, goalReps: 8, goalValue: 12, startValue: 3, setDetails: [3, 3, 3], history: [{ id: 's', date: TODAY, isStart: true }] };
    const [fixed] = fixRepSchemes([old]);
    expect([fixed.goalSets, fixed.goalReps, fixed.goalValue]).toEqual([c.defaultGoalSets, c.defaultGoalReps, c.defaultGoal]);
    expect(fixed.schemeFixed).toBe(1);
    // réglé ensuite à la main par la personne : plus jamais touché
    const mine = { ...fixed, goalReps: 6 };
    expect(fixRepSchemes([mine])[0].goalReps).toBe(6);
    // avec déjà une séance : on ne touche pas
    const done = { ...old, history: [...old.history, { id: 'h', date: TODAY, value: 8, setDetails: [8, 8, 8] }] };
    expect(fixRepSchemes([done])[0].goalReps).toBe(8);
    // appliqué au chargement d'une sauvegarde
    expect(normalizeState({ quests: [old] }).quests[0].goalReps).toBe(c.defaultGoalReps);
  });
});
