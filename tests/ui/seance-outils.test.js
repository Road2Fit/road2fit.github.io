// Séance guidée : « la dernière fois », disques, machine prise (changer d'exercice, annulable), record fêté.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const entry = (id, date, sets, value) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 0, goalSets: 3, goalReps: 6, assistanceKg: 0, rpe: 8, calories: 80, note: '' });
const bench = {
  id: 'q_bench', catalogId: 'bench_press', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 1, icon: '🏋️', startValue: 40, currentValue: 60, goalValue: 100, goalSets: 3, goalReps: 6, setDetails: [6, 6, 6],
  history: [entry('h0', '2026-10-17', [6, 6, 6], 60)],
};
const incline = { ...bench, id: 'q_inc', catalogId: 'incline_db_press', name: 'Développé Incliné Haltères', currentValue: 22, history: [entry('h1', '2026-10-15', [10, 10, 10], 22)] };
const SAVE = { xp: 100, quests: [bench, incline], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50], muscleMode: 'simple' };
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

async function toSetScreen(h) {
  for (let k = 0; k < 10 && !q(h, 'set-done'); k++) {
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    else if (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    else if (q(h, 'guided-next')) await clickEl(h, q(h, 'guided-next'));
    await advance(h, 300);
  }
}
async function toBenchSet(h) {
  await clickEl(h, q(h, 'start-today') || q(h, 'start-early'));
  await advance(h, 700);
  await toSetScreen(h);
  // l'exercice en cours doit être le développé couché (sinon passer au suivant)
  for (let k = 0; k < 3 && !/Couché Barre/.test(q(h, 'guided').textContent.split('Série')[0]); k++) {
    await clickEl(h, q(h, 'guided-menu'));
    await clickEl(h, [...h.doc.querySelectorAll('button')].find(b => /Passer l’exercice/.test(b.textContent)));
    await advance(h, 300);
    await toSetScreen(h);
  }
}

describe('outils de la séance guidée', () => {
  it('la dernière fois, les disques, changer de machine puis revenir, record fêté', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' }, openCoach: true });
    open.push(h);
    await toBenchSet(h);
    expect(q(h, 'guided').textContent).toContain('Développé Couché Barre');
    // « La dernière fois » : discret, sous la série
    expect(q(h, 'set-prev').textContent).toContain('La dernière fois : 6 reps à 60 kg');
    // disques pour la barre
    expect(q(h, 'set-plates').textContent).toMatch(/Disques : .* de chaque côté/);

    // machine prise : le menu propose un équivalent du même muscle
    await clickEl(h, q(h, 'guided-menu'));
    await clickEl(h, q(h, 'swap-open'));
    const choice = [...h.doc.querySelectorAll('[data-testid="swap-choice"]')].find(b => /Incliné Haltères/.test(b.textContent));
    expect(choice).toBeTruthy();
    await clickEl(h, choice);
    await advance(h, 300);
    expect(q(h, 'guided').textContent).toContain('Développé Incliné Haltères');
    expect(q(h, 'set-plates')).toBeNull(); // haltères : pas de disques
    // annulable : on revient au développé couché
    await clickEl(h, q(h, 'swap-undo'));
    await advance(h, 300);
    expect(q(h, 'guided').textContent).toContain('Développé Couché Barre');
    expect(q(h, 'swap-undo')).toBeNull();

    // record : plus lourd que tout l'historique → fêté sur l'écran de repos
    const plus = h.doc.querySelector('[aria-label="Charge plus"]');
    for (let k = 0; k < 8; k++) await clickEl(h, plus);
    await clickEl(h, q(h, 'set-done'));
    await advance(h, 300);
    expect(q(h, 'guided-pr').textContent).toContain('Nouveau record');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
