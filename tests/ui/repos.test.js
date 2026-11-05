// Séance guidée plein écran : écran de repos avec la série suivante, puis « Série suivante ».
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickText, findByText, launch, pageText, clickEl, guidedStep, runGuided } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const click = async (h, el) => { el.dispatchEvent(new h.w.MouseEvent('click', { bubbles: true })); await advance(h); };
const by = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const lancer = async h => {
  await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
  const [b] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
  await clickText(h, b.textContent.trim().slice(0, 30));
};

describe('séance guidée : un écran par série', () => {
  it('plein écran ; « Série faite » ouvre le repos avec la série suivante ; « Série suivante » revient à la série', async () => {
    const h = await launch();
    open.push(h);
    const events = [];
    h.w.addEventListener('rondoufit-rest', e => events.push(e.detail));
    await lancer(h);
    expect(by(h, 'guided')).toBeTruthy();
    expect(h.doc.body.style.overflow).toBe('hidden'); // la page derrière ne défile pas
    expect(by(h, 'guided-feel')).toBeTruthy(); // 1re page : comment te sens-tu ?
    while (by(h, 'warm-done') || by(h, 'feel-ok')) await guidedStep(h); // échauffement passé
    expect(by(h, 'set-label').textContent).toContain('Série 1');
    await click(h, by(h, 'set-done'));
    expect(events).toHaveLength(1);
    expect(events[0].sec).toBeGreaterThan(30);
    expect(events[0].next).toMatch(/^Série 2\//);
    expect(by(h, 'guided-rest')).toBeTruthy();
    expect(by(h, 'rest-next').textContent).toBe(events[0].next);
    expect(by(h, 'guided-next').textContent).toBe('Série suivante');
    await click(h, by(h, 'guided-next'));
    expect(by(h, 'set-label').textContent).toContain('Série 2');
    // la flèche réduit la séance
    await click(h, by(h, 'guided-minimize'));
    expect(by(h, 'guided')).toBeNull();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('fin de séance : pas de repos', () => {
  it('la dernière série de la séance ne lance pas le minuteur et ouvre le résumé', async () => {
    const h = await launch();
    open.push(h);
    let stops = 0;
    await lancer(h);
    h.w.addEventListener('rondoufit-rest-stop', () => { stops++; });
    expect(await runGuided(h)).toBe('summary');
    expect(by(h, 'guided-rest')).toBeNull();
    expect(stops).toBeGreaterThanOrEqual(1);
    expect(pageText(h)).toContain('Résumé de la séance');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('exercice déjà terminé', () => {
  it('y revenir montre le résumé de ce qui a été fait (séries, total, ressenti)', async () => {
    const h = await launch();
    open.push(h);
    await lancer(h);
    await guidedStep(h); // comment te sens-tu ?
    // on termine le 1er exercice : toutes ses séries, puis on revient dessus
    const first = h.doc.querySelector('[data-testid="guided"] h2')?.textContent || '';
    for (let k = 0; k < 40; k++) {
      if (by(h, 'set-done') && h.doc.querySelector('[data-testid="guided"] h2').textContent !== first) break;
      if ((await guidedStep(h)) === 'summary') break;
    }
    await click(h, h.doc.querySelector('[data-testid="guided"] button[aria-label="' + first + '"]'));
    const recap = by(h, 'exercise-recap');
    expect(recap).toBeTruthy();
    expect(recap.textContent).toContain('Série 1');
    expect(recap.textContent).toMatch(/\d+ reps/);
    expect(recap.textContent).toContain('ressenti');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
