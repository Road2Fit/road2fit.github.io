// Mesure d'un exercice en un seul choix (poids du corps / charge en kg / durée) et charge signée (négatif = aide élastique).
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_STATE } from './demo';
import { advance, clickEl, clickText, launch, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const NEUTRAL = { __classic: '1' };
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const byTest = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const start = () => launch({ storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true }) } });

describe('mesure de l’exercice', () => {
  it('création : trois boutons ; « Charge en kg » donne des champs en kg, pas d’aide élastique', async () => {
    const h = await start();
    open.push(h);
    await advance(h, 300);
    await clickText(h, 'Nouvel exercice');
    await advance(h, 300);
    await clickEl(h, byTest(h, 'pick-fp_back_extension')); // lombaires
    await advance(h, 200);
    for (const m of ['body', 'kg', 'timed']) expect(byTest(h, `measure-${m}`)).toBeTruthy();
    await clickEl(h, byTest(h, 'measure-kg'));
    expect(h.doc.body.textContent).toContain('Charge de départ (kg)');
    expect(byTest(h, 'signed-start')).toBeNull();
    await clickText(h, 'Créer l’exercice');
    await advance(h, 300);
    const q = saved(h).quests.find(x => x.catalogId === 'fp_back_extension');
    expect(q.unit).toBe('kg');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('poids du corps : un seul nombre, −10 = 10 kg d’aide ; un nombre positif est ramené à 0', async () => {
    const h = await start();
    open.push(h);
    await advance(h, 300);
    await clickText(h, 'Nouvel exercice');
    await advance(h, 300);
    await clickEl(h, byTest(h, 'pick-pullups'));
    await advance(h, 200);
    expect(byTest(h, 'measure-body')).toBeTruthy();
    await setInput(h, byTest(h, 'signed-start'), '-12.5');
    await setInput(h, byTest(h, 'signed-goal'), '-2');
    expect(byTest(h, 'signed-hint').textContent).toContain('aide élastique');
    await setInput(h, byTest(h, 'signed-goal'), '5'); // du lest : pas ici, on reste à 0
    expect(byTest(h, 'signed-goal').value).toBe('0'); // ramené tout de suite à 0 (poids du corps seul)
    await clickText(h, 'Créer l’exercice');
    await advance(h, 300);
    const q = saved(h).quests.find(x => x.catalogId === 'pullups' && x.startAssistanceKg === 12.5);
    expect(q).toBeTruthy();
    expect(q.goalAssistanceKg).toBe(0);
    expect(q.unit).toBe('reps');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('un exercice qui a déjà des séances ne peut plus changer de mesure', async () => {
    const h = await start();
    open.push(h);
    await advance(h, 300);
    await clickText(h, 'Ajuster'); // 1re carte : tractions, avec des séances
    await advance(h, 300);
    expect(byTest(h, 'measure-kg').disabled).toBe(true);
    expect(byTest(h, 'measure-body').disabled).toBe(false);
  }, TIMEOUT);
});
