// Édition « amis » (neutre) : interface sobre sans Rondoudou, assistant d'accueil, sauvegarde automatique guidée.
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_STATE } from './demo';
import { advance, clickEl, clickText, launch, pageText, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const NEUTRAL = { __classic: '1' }; // lien public : version classique
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const ob = h => h.doc.querySelector('[data-testid="onboarding"]');
const byTest = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const next = async h => clickEl(h, byTest(h, 'ob-next'));
const fill = async (h, id, v) => setInput(h, h.doc.getElementById(id), v);

describe('édition neutre pour les amis', () => {
  it('aucun mot de Rondoudou à l’écran, couleurs et avatar sobres', async () => {
    const h = await launch({ empty: true, storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ onboarded: true, xp: 0, quests: [], weightHistory: [] }) } });
    open.push(h);
    await advance(h, 300);
    const t = pageText(h);
    for (const mot of ['Rondoudou', 'Grosdoudou', 'Dresseur', 'Arène', 'Pokédex', 'Pokéball']) expect(t, mot).not.toContain(mot);
    expect(h.doc.documentElement.dataset.style).toBe('neutral');
    expect(h.doc.title).toBe('Road2Fit');
    expect(h.doc.querySelector('h1').textContent).toBe('Road2Fit'); // sans prénom : le titre reste Road2Fit
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('l’édition normale (Gabin) reste inchangée et n’affiche pas l’assistant', async () => {
    const h = await launch({ empty: true });
    open.push(h);
    await advance(h, 300);
    expect(ob(h)).toBeNull();
    expect(pageText(h)).toContain('From Grosdoudou to Rondoudou');
    expect(h.doc.documentElement.dataset.style).toBe('fun');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('l’assistant règle le coach, le poids, les exercices, les records et le sport régulier', async () => {
    const h = await launch({ empty: true, storage: NEUTRAL });
    open.push(h);
    await advance(h, 300);
    expect(ob(h)).toBeTruthy();
    await fill(h, 'ob-name', 'Léa');
    await clickEl(h, byTest(h, 'level-advanced'));
    await next(h);
    await fill(h, 'ob-age', '28'); await fill(h, 'ob-h', '168'); await fill(h, 'ob-w', '64'); await fill(h, 'ob-t', '60');
    await next(h);
    await clickEl(h, byTest(h, 'goal-force'));
    await next(h);
    await next(h); // organisation : valeurs par défaut (3 séances, 60 min)
    await clickEl(h, byTest(h, 'ex-bench_press'));
    await setInput(h, byTest(h, 'kg-bench_press'), '60');
    await clickEl(h, byTest(h, 'ex-squat'));
    await next(h);
    await clickEl(h, byTest(h, 'sport-football'));
    await clickEl(h, byTest(h, 'sportday-2'));
    await clickEl(h, byTest(h, 'sportday-4'));
    await next(h);
    expect(byTest(h, 'ob-backup')).toBeTruthy();
    await next(h); // « Plus tard »
    expect(byTest(h, 'ob-done').textContent).toContain('Tout est prêt, Léa');
    await clickEl(h, byTest(h, 'ob-finish'));
    await advance(h, 300);
    expect(ob(h)).toBeNull();
    const s = saved(h);
    expect(s.onboarded).toBe(true);
    expect(s.heroName).toBe('Léa');
    expect(s.userWeightKg).toBe(64);
    expect(s.targetWeightKg).toBe(60);
    expect(s.coach.workProfile).toBe('puissance');
    expect(s.coach.volleyDays).toEqual([2, 4]);
    expect(s.coach.sport).toBe('football');
    expect(s.coach.profile).toMatchObject({ heightCm: 168, age: 28, sex: 'm' });
    const bench = s.quests.find(q => q.catalogId === 'bench_press');
    expect(bench).toBeTruthy();
    expect(s.maxRecords[bench.id].kg).toBe(60);
    expect(bench.startValue).toBeGreaterThan(45); // puissance : ~85 % du max
    expect(bench.startValue).toBeLessThanOrEqual(55);
    expect(s.quests.find(q => q.catalogId === 'squat')).toBeTruthy();
    expect(s.weightHistory).toHaveLength(1);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('débutant : l’assistant choisit les exercices de départ ; expert : séance type, détails et réglages du coach', async () => {
    const h = await launch({ empty: true, storage: NEUTRAL });
    open.push(h);
    await advance(h, 300);
    expect(byTest(h, 'level-beginner').getAttribute('aria-pressed')).toBe('true');
    await next(h);
    await fill(h, 'ob-w', '70');
    await next(h); await next(h); await next(h);
    expect(byTest(h, 'ex-leg_press').checked).toBe(true); // machines choisies par le coach
    expect(byTest(h, 'kg-leg_press')).toBeNull(); // pas de charge à saisir pour un débutant
    for (let i = 0; i < 4 && !byTest(h, 'ob-finish'); i++) await next(h);
    await clickEl(h, byTest(h, 'ob-finish'));
    await advance(h, 300);
    let st = saved(h);
    expect(st.coach.experience.level).toBe('beginner');
    expect(st.quests.length).toBeGreaterThanOrEqual(6);
    expect(st.quests.every(q => !q.known)).toBe(true);
    h.close(); open.pop();

    const x = await launch({ empty: true, storage: NEUTRAL });
    open.push(x);
    await advance(x, 300);
    await clickEl(x, byTest(x, 'level-expert'));
    await next(x);
    await fill(x, 'ob-w', '80');
    await next(x); await next(x); await next(x);
    expect(byTest(x, 'ex-leg_press').checked).toBe(false); // rien de coché pour un expert : il coche ce qu'il a pratiqué
    await clickEl(x, byTest(x, 'ex-squat'));
    await setInput(x, byTest(x, 'kg-squat'), '140');
    await setInput(x, byTest(x, 'wsets-squat'), '4');
    await setInput(x, byTest(x, 'wreps-squat'), '6');
    await setInput(x, byTest(x, 'wkg-squat'), '115');
    await next(x);
    expect(byTest(x, 'ob-expert')).toBeTruthy();
    await setInput(x, byTest(x, 'xp-years'), '8');
    await setInput(x, byTest(x, 'xp-sets'), '15');
    await clickEl(x, byTest(x, 'xp-rir'));
    await clickEl(x, byTest(x, 'xp-method-myo_reps'));
    await setInput(x, byTest(x, 'xp-deload'), '5');
    await setInput(x, byTest(x, 'xp-limits'), 'épaule droite fragile');
    for (let i = 0; i < 4 && !byTest(x, 'ob-finish'); i++) await next(x);
    await clickEl(x, byTest(x, 'ob-finish'));
    await advance(x, 300);
    st = saved(x);
    expect(st.coach.experience).toMatchObject({ level: 'expert', years: 8, weeklySets: 15, rir: true, methods: ['myo_reps'], deloadEvery: 5 });
    expect(st.coach.cycleWeeks).toBe(5);
    expect(st.coach.memory.some(m => m.text.includes('épaule droite'))).toBe(true);
    const sq = st.quests.find(q => q.catalogId === 'squat');
    expect(sq.known).toBe(true);
    expect(sq.startValue).toBe(115); // séance type
    expect(sq.history[0].setDetails).toEqual([6, 6, 6, 6]);
    expect(st.maxRecords[sq.id].kg).toBe(140);
    expect(x.errors).toEqual([]);
  }, TIMEOUT);

  it('l’étape sauvegarde propose de créer un compte (aucune trace de GitHub)', async () => {
    const h = await launch({ empty: true, storage: NEUTRAL });
    open.push(h);
    await advance(h, 300);
    await next(h);
    await fill(h, 'ob-w', '70');
    for (let i = 0; i < 5; i++) await next(h);
    const t = byTest(h, 'ob-backup').textContent;
    expect(t).toContain('Ton compte');
    expect(t).toMatch(/Créer un compte/);
    expect(pageText(h)).not.toMatch(/github/i);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('le menu ⚙️ propose de refaire l’assistant et de changer d’apparence', async () => {
    const h = await launch({ empty: true, storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ onboarded: true, xp: 0, quests: [], weightHistory: [] }) } });
    open.push(h);
    await advance(h, 300);
    const gear = [...h.doc.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Réglages et données');
    await clickEl(h, gear);
    expect(byTest(h, 'toggle-style')).toBeNull(); // aucun moyen de passer en Rondoudou depuis les options
    await clickEl(h, byTest(h, 'open-onboarding'));
    expect(ob(h)).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('avec des données : aucun terme Pokémon / Rondoudou dans aucun onglet ni dans les récompenses', async () => {
    // données de démonstration, sans les notes qui parlent de Rondoudou (ce sont des données, pas l’interface)
    const demo = JSON.parse(JSON.stringify(DEMO_STATE).replace(/Dresseur Rondoudou/g, 'moi').replace(/Rondoudou/g, 'moi').replace(/Dresseur/g, 'moi').replace(/Grosdoudou/g, 'moi'));
    const h = await launch({ storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify(demo) } });
    open.push(h);
    await advance(h, 300);
    const interdits = /Rondoudou|Grosdoudou|Toudoudou|Grodoudou|Dresseur|Arène|Poké|Pokéball|berceuse|Smash du|Évolution d’Arène/i;
    for (const onglet of ['Coach', 'Exercices', 'Journal', 'Courbes', 'Mes maxima', 'Poids', 'Souvenirs', 'Bilan', 'Trophées']) {
      await clickText(h, onglet);
      await advance(h, 200);
      { const t = pageText(h).replace('abdos de Rondoudou', ''); const m = t.match(interdits); expect(m && m[0], onglet).toBeNull(); } // (la note de démonstration est une donnée, pas l’interface)
    }
    await clickText(h, 'Récompenses');
    await advance(h, 200);
    { const t = pageText(h).replace('abdos de Rondoudou', ''); const m = t.match(interdits); expect(m && t.slice(Math.max(0, m.index - 50), m.index + 50), 'récompenses').toBeNull(); }
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('le coach affiche la phrase « preuves » et les études du sport choisi', async () => {
    const save = { onboarded: true, xp: 0, quests: [], weightHistory: [], coach: { sport: 'handball', volleyDays: [4], sessionsPerWeek: 3 } };
    const h = await launch({ empty: true, storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify(save) } });
    open.push(h);
    await advance(h, 300);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    await advance(h, 300);
    await clickEl(h, [...h.doc.querySelectorAll('button')].find(b => b.textContent.includes('Réglages et détails du coach')));
    await advance(h, 300);
    expect(byTest(h, 'sport-evidence').textContent).toContain('Preuves mitigées');
    await clickEl(h, byTest(h, 'sport-sources-toggle'));
    expect(byTest(h, 'sport-sources').textContent).toContain('Andersson');
    expect(byTest(h, 'sport-sources').querySelector('a[href^="https://"]')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('le lien normal est en version classique ; seul le lien privé ?rondoudou ouvre Rondoudou, sans aucune option pour y passer', async () => {
    const classique = await launch({ empty: true, storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ onboarded: true, xp: 0, quests: [], weightHistory: [] }) } });
    open.push(classique);
    await advance(classique, 300);
    expect(classique.doc.documentElement.dataset.style).toBe('neutral');
    expect(classique.doc.title).toBe('Road2Fit');
    expect(pageText(classique)).not.toMatch(/Rondoudou|Grosdoudou/);
    const gear = [...classique.doc.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Réglages et données');
    await clickEl(classique, gear);
    expect(pageText(classique)).not.toMatch(/Apparence|Rondoudou/);
    // mémoire : même après être passé par le lien privé, le lien normal reste classique (aucune trace gardée)
    const prive = await launch({ empty: true });
    open.push(prive);
    await advance(prive, 300);
    expect(prive.doc.documentElement.dataset.style).toBe('fun');
    expect(prive.doc.title).toBe('Road2Fit'); // onglet / favoris neutres même sur le lien privé
    expect(prive.w.localStorage.getItem('rondoufit:style')).toBeNull();
    expect(prive.errors).toEqual([]);
    expect(classique.errors).toEqual([]);
  }, TIMEOUT);
});

describe('en-tête', () => {
  it('le prénom est le grand titre, Road2Fit s’affiche à côté de l’écrou des réglages', async () => {
    const h = await launch({ empty: true, storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ onboarded: true, heroName: 'Léa', xp: 0, quests: [], weightHistory: [] }) } });
    open.push(h);
    await advance(h, 300);
    expect(h.doc.querySelector('h1').textContent).toBe('Léa');
    expect(byTest(h, 'app-title').textContent).toBe('Road2Fit');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('version neutre : plus aucune trace de Rondoudou, même dans les anciennes notes', () => {
  it('pesée initiale, notes de séance et de journal nettoyées à l’affichage', async () => {
    const state = {
      onboarded: true, heroName: 'Léa', xp: 0, userWeightKg: 82, targetWeightKg: 75, startWeightKg: 84,
      weightHistory: [
        { id: 'w_1', date: '2026-10-20', weightKg: 84.0, note: 'Pesée initiale (Mode Grosdoudou)' },
        { id: 'w_2', date: '2026-10-21', weightKg: 82.0, note: 'Premiers kilos perdus, en route vers Rondoudou Fit !' },
      ],
      quests: [],
    };
    const h = await launch({ empty: true, storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify(state) } });
    open.push(h);
    await advance(h, 300);
    await clickText(h, 'Poids');
    await advance(h, 300);
    const t = pageText(h);
    expect(t).toContain('Pesée initiale');
    expect(t).toContain('Premiers kilos perdus');
    expect(t).not.toMatch(/rondou|doudou|pok[eé]|dresseur/i);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
