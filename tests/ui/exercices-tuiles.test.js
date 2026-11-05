// Onglet Exercices : logos + noms ; un toucher ouvre la fiche ; record battu = une coupe qui ouvre la validation.
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, launch, pageText } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const entry = (id, date, sets, value) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 3, goalSets: 3, goalReps: 6, assistanceKg: 0, rpe: 8, calories: 80, note: '' });
const quest = (id, name, cur, goal, sets) => ({
  id, catalogId: 'bench_press', name, category: 'Pectoraux', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 1, icon: '🏋️', startValue: 40, currentValue: cur, goalValue: goal, goalSets: 3, goalReps: 6, setDetails: sets,
  history: [entry(id + 'h', '2026-10-17', sets, cur)],
});
const SAVE = { xp: 100, quests: [quest('q1', 'Développé Couché Barre', 60, 100, [6, 6, 6]), quest('q2', 'Développé Incliné', 50, 50, [6, 6, 6])], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };
const by = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

describe('exercices en tuiles', () => {
  it('logo + nom seulement ; la fiche s’ouvre au toucher ; coupe sur le record battu', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
    open.push(h);
    const tiles = [...h.doc.querySelectorAll('[data-testid="quest-tile"]')];
    expect(tiles).toHaveLength(2);
    expect(pageText(h)).not.toContain('Noter la séance');
    // une seule coupe : celle de l'exercice dont l'objectif est atteint
    const cups = [...h.doc.querySelectorAll('[data-testid="quest-record"]')];
    expect(cups).toHaveLength(1);
    expect(cups[0].getAttribute('aria-label')).toContain('Développé Incliné');
    await clickEl(h, cups[0]);
    expect(pageText(h)).toMatch(/niveau 2|Niveau 2|Niv\. 2/);
    // la fiche
    const h2 = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
    open.push(h2);
    await clickEl(h2, h2.doc.querySelector('[data-testid="quest-tile"]'));
    expect(by(h2, 'quest-sheet').textContent).toContain('Noter la séance');
    await clickEl(h2, by(h2, 'quest-sheet').querySelector('button[aria-label="Fermer"]'));
    expect(by(h2, 'quest-sheet')).toBeNull();
    expect(h.errors).toEqual([]);
    expect(h2.errors).toEqual([]);
  }, 120000);
});
