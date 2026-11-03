// Formes de séries (pyramides, dégressives…) dans la prochaine séance et la séance guidée ; objectif donné au coach.
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_STATE } from './demo';
import { advance, clickEl, launch, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const byTest = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const many = n => Array.from({ length: n }, (_, i) => ({ id: `hx${i}`, date: `2026-09-${String(10 + i).padStart(2, '0')}`, value: 40, sets: 3, reps: 8, setDetails: [8, 8, 8] }));

describe('formes de séries', () => {
  it('dégressive imposée : visible dans la prochaine séance et la séance guidée, enregistrée avec le type de chaque série', async () => {
    const quests = DEMO_STATE.quests.map(q => (q.id === 'q_bench_3x8' ? { ...q, coachMethod: 'drop_set', history: [...many(8), ...q.history] } : q));
    const h = await launch({ openCoach: true, storage: { rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, quests }) } });
    open.push(h);
    await advance(h, 300);
    const chips = [...h.doc.querySelectorAll('[data-testid="method-chip"]')].map(c => c.textContent).join(' ');
    expect(chips).toContain('Série dégressive');
    const start = [...h.doc.querySelectorAll('button')].find(b => /Lancer cette séance guidée|Lancer ma séance/.test(b.textContent));
    await clickEl(h, start);
    for (let k = 0; k < 6 && !/Série dégressive/.test(byTest(h, 'guided-method')?.textContent || ''); k++) {
      const next = [...h.doc.querySelectorAll('button')].find(b => /Exercice suivant|Suivant/.test(b.textContent));
      if (!next) break;
      await clickEl(h, next);
    }
    expect(byTest(h, 'guided-method').textContent).toContain('Série dégressive');
    expect(h.doc.body.textContent).toContain('Dégressive 1');
    expect(h.errors).toEqual([]);
  }, 120000);

  it('objectif donné au coach : force sur un exercice, progression et sources affichées', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, byTest(h, 'goal-add'));
    await setInput(h, byTest(h, 'goal-kind'), 'strength');
    await setInput(h, byTest(h, 'goal-quest'), 'q_squat_3x6');
    await setInput(h, byTest(h, 'goal-target'), '100');
    await clickEl(h, byTest(h, 'goal-save'));
    await advance(h, 300);
    expect(saved(h).coach.mainGoal).toMatchObject({ kind: 'strength', questId: 'q_squat_3x6', target: 100 });
    expect(byTest(h, 'coach-goal')).toBeNull(); // rempli : il quitte le haut de la page pour les réglages
    await clickEl(h, [...h.doc.querySelectorAll('button')].find(b => b.textContent.includes('Réglages et détails du coach')));
    const card = byTest(h, 'coach-goal').textContent;
    expect(card).toContain('Squat Barre');
    expect(card).toContain('Comment le coach t’y emmène');
    expect(card).toContain('Robinson et al. 2024');
    expect(byTest(h, 'goal-progress').textContent).toMatch(/Max estimé/);
    expect(h.errors).toEqual([]);
  }, 120000);
});

describe('forme personnalisée', () => {
  it('je règle chaque série moi-même : le coach la retient et la reprend', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    const why = [...h.doc.querySelectorAll('button')].find(b => b.textContent.includes('Pourquoi ? / Ajuster'));
    await clickEl(h, why);
    await setInput(h, byTest(h, 'method-select'), 'custom');
    const ed = byTest(h, 'custom-editor');
    expect(ed).toBeTruthy();
    const n0 = ed.querySelectorAll('[data-testid="custom-row"]').length;
    await clickEl(h, byTest(h, 'custom-add'));
    const rows = () => [...byTest(h, 'custom-editor').querySelectorAll('[data-testid="custom-row"]')];
    expect(rows()).toHaveLength(n0 + 1);
    const last = rows()[rows().length - 1];
    await setInput(h, last.querySelector('[data-testid="custom-reps"]'), '15');
    await setInput(h, last.querySelector('[data-testid="custom-kind"]'), 'drop');
    await setInput(h, last.querySelector('[data-testid="custom-rest"]'), '0');
    const load = last.querySelector('[data-testid="custom-load"]');
    if (load) await setInput(h, load, String(Math.round(Number(load.value) * 0.5)));
    await clickEl(h, byTest(h, 'custom-save'));
    await advance(h, 300);
    const q = saved(h).quests.find(x => x.coachMethod === 'custom');
    expect(q).toBeTruthy();
    expect(q.coachCustom).toHaveLength(n0 + 1);
    expect(q.coachCustom.at(-1)).toMatchObject({ reps: 15, kind: 'drop', rest: 0 });
    const chips = [...h.doc.querySelectorAll('[data-testid="method-chip"]')].map(c => c.textContent).join(' ');
    expect(chips).toContain('Personnalisée');
    expect(byTest(h, 'custom-edit')).toBeTruthy(); // « Modifier mes séries »
    expect(h.errors).toEqual([]);
  }, 120000);
});
