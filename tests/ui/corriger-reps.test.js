// 4.33 : après une série, pendant le repos, on peut corriger le nombre de reps faites (avec ou sans vidéo).
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickText, findByText, launch, clickEl, runGuided } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

const entry = (id, date, sets, value) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 0, goalSets: 3, goalReps: 12, assistanceKg: 0, rpe: 8, calories: 80, note: '' });
const bench = {
  id: 'q_bench', catalogId: 'bench_press', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 1, icon: '🏋️', startValue: 40, currentValue: 50, goalValue: 100, goalSets: 3, goalReps: 12, setDetails: [12, 12, 12],
  history: [entry('h0', '2026-10-17', [12, 12, 12], 50)],
};
const SAVE = { xp: 100, quests: [bench], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('corriger les reps de la série faite', () => {
  it('pendant le repos : − / + change le nombre enregistré', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    const planned = Number(q(h, 'set-reps').textContent.match(/\d+/)[0]);
    await clickEl(h, q(h, 'set-done'));
    await advance(h, 0);
    // repos : la série faite est affichée et corrigeable
    expect(q(h, 'guided-rest')).toBeTruthy();
    expect(q(h, 'last-set-reps').textContent).toContain(String(planned));
    await clickEl(h, q(h, 'last-set-minus'));
    await clickEl(h, q(h, 'last-set-minus'));
    expect(q(h, 'last-set-reps').textContent).toContain(String(planned - 2));
    await clickEl(h, q(h, 'last-set-plus'));
    expect(q(h, 'last-set-reps').textContent).toContain(String(planned - 1));
    // échauffement : pas de série de travail à corriger
    expect(await runGuided(h)).toBe('summary');
    await clickText(h, 'Enregistrer la séance');
    await clickText(h, 'Super, merci coach');
    const e = saved(h).quests[0].history.find(x => x.date === '2026-10-21');
    expect(e.setDetails[0]).toBe(planned - 1);
    expect(h.errors).toEqual([]);
  }, 120000);
});
