// 4.52 : box jump noté en hauteur de caisse (cm), plus en lest ni en aide élastique.
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_STATE } from './demo';
import { advance, clickEl, clickText, launch, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const byTest = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const BOX = { id: 'q_box', catalogId: 'ply_box_jump', name: 'Box Jump (Saut sur Caisse)', icon: '🚀', type: 'strength', unit: 'reps', category: 'Jambes', goalMode: 'sets_reps', goalSets: 4, goalReps: 4, goalValue: 4, startValue: 3, currentValue: 4, level: 1, history: [] };

describe('box jump en hauteur', () => {
  it('« Noter la séance » demande la hauteur de la caisse, pas l’aide ; la fiche montre la prochaine hauteur', async () => {
    const h = await launch({ storage: { __classic: '1', rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, quests: [...DEMO_STATE.quests, BOX] }) } });
    open.push(h);
    await clickText(h, 'Exercices');
    await advance(h, 200);
    await clickEl(h, [...h.doc.querySelectorAll('[data-testid="quest-tile"]')].find(b => b.getAttribute('aria-label') === BOX.name));
    expect(byTest(h, 'quest-perf').textContent).toMatch(/caisse/i);
    await clickText(h, 'Noter la séance');
    await advance(h, 200);
    expect(byTest(h, 'log-perf')).toBeTruthy();
    expect(h.doc.body.textContent).not.toMatch(/Aide élastique \(kg\)/);
    await setInput(h, byTest(h, 'log-perf-input'), '65');
    await clickEl(h, h.doc.querySelector('form button[type="submit"]'));
    await advance(h, 400);
    const q = saved(h).quests.find(x => x.id === 'q_box');
    expect(q.history[q.history.length - 1].perfCm).toBe(65);
    expect(h.errors).toEqual([]);
  }, 120000);
});
