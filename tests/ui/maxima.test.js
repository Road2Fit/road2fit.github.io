// Onglet « Mes maxima » : estimations, record réel saisi à la main, option d'effort ressenti.
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, clickText, launch, pageText, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const entry = (id, date, sets, value, extra = {}) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, rpe: 8, note: '', calories: 60, ...extra });
const quests = [
  { id: 'q_bench', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', icon: '🏋️', level: 1, startValue: 40, currentValue: 75, goalValue: 100, goalSets: 3, goalReps: 6,
    history: [entry('b1', '2026-10-15', [5, 5, 4], 75)] },
  { id: 'q_dips', name: 'Dips Assistés', category: 'Pectoraux', type: 'strength', unit: 'reps', icon: '💪', level: 1, startValue: 6, currentValue: 8, goalValue: 10, goalSets: 3, goalReps: 10,
    startAssistanceKg: 20, currentAssistanceKg: 20, history: [entry('d1', '2026-10-15', [8, 8, 8], 8, { assistanceKg: 20 })] },
  { id: 'q_plank', name: 'Gainage Planche (en secondes)', category: 'Abdominaux', type: 'strength', unit: 'reps', timed: true, icon: '🧱', level: 1, startValue: 40, currentValue: 70, goalValue: 90, goalSets: 3, goalReps: 60,
    history: [entry('p1', '2026-10-17', [80, 70, 65], 80)] },
  { id: 'q_run', name: 'Course à pied (Endurance)', category: 'Course', type: 'cardio', unit: 'km', icon: '🏃', level: 1, startValue: 3, currentValue: 5, goalValue: 10,
    history: [{ id: 'r1', date: '2026-10-17', value: 5, durationMin: 25, calories: 400 }] },
];
const SAVE = { xp: 100, quests, weightHistory: [{ id: 'w', date: '2026-10-01', weightKg: 80, note: '' }], userWeightKg: 80, unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };
const start = async () => {
  const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
  open.push(h);
  await clickText(h, 'Mes maxima');
  return h;
};
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const cardOf = (h, name) => [...h.doc.querySelectorAll('div.rounded-2xl')].filter(d => d.textContent.includes(name) && d.querySelector('form')).pop();

describe('mes maxima', () => {
  it('affiche une estimation pour chaque type d’exercice', async () => {
    const h = await start();
    const t = pageText(h);
    expect(t).toContain('Mes maxima');
    expect(cardOf(h, 'Développé Couché Barre').textContent).toMatch(/≈ \d+,?\d* kg\s*sur 1 répétition/);
    expect(cardOf(h, 'Développé Couché Barre').textContent).toContain('Fiabilité bonne');
    expect(cardOf(h, 'Dips Assistés').textContent).toContain('pour 1 répétition');
    expect(cardOf(h, 'Gainage Planche').textContent).toContain('80 s');
    const run = cardOf(h, 'Course à pied').textContent;
    expect(run).toContain('Semi');
    expect(run).toContain('52 min 07 s'); // 25 min sur 5 km → 10 km
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('enregistre un record réel, le compare à l’estimation et le garde', async () => {
    const h = await start();
    const card = cardOf(h, 'Développé Couché Barre');
    const form = card.querySelector('form');
    await setInput(h, form.querySelector('input[type=number]'), '100');
    form.dispatchEvent(new h.w.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 60));
    expect(saved(h).maxRecords.q_bench.kg).toBe(100);
    expect(saved(h).maxRecords.q_bench.date).toBe('2026-10-21');
    const apres = cardOf(h, 'Développé Couché Barre').textContent;
    expect(apres).toContain('100 kg');
    expect(apres).toContain('dépasse l’estimation');
    expect(apres).toContain('d’après ton record réel'); // les charges de travail partent du record
    // effacer
    const clear = [...cardOf(h, 'Développé Couché Barre').querySelectorAll('button')].find(b => b.textContent === 'Effacer');
    await clickEl(h, clear);
    expect(saved(h).maxRecords.q_bench).toBeUndefined();
  }, TIMEOUT);

  it('record réel cardio : sert de base aux prédictions', async () => {
    const h = await start();
    const form = cardOf(h, 'Course à pied').querySelector('form');
    const [km, min] = form.querySelectorAll('input[type=number]');
    await setInput(h, km, '5');
    await setInput(h, min, '22');
    form.dispatchEvent(new h.w.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 60));
    expect(saved(h).maxRecords.q_run).toMatchObject({ distanceKm: 5, minutes: 22 });
    expect(cardOf(h, 'Course à pied').textContent).toContain('ton record réel');
  }, TIMEOUT);

  it('l’option « effort ressenti » augmente l’estimation', async () => {
    const h = await start();
    const lire = () => Number(cardOf(h, 'Développé Couché Barre').textContent.match(/≈ (\d+(?:,\d)?) kg/)[1].replace(',', '.'));
    const sans = lire();
    await clickEl(h, h.doc.querySelector('input[type=checkbox]'));
    expect(lire()).toBeGreaterThan(sans);
  }, TIMEOUT);
});
