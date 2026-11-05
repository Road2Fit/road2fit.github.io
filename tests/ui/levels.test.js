// Niveaux, épreuves de rang, bonus de régularité et récompenses vus depuis l'interface.
import { afterEach, describe, expect, it } from 'vitest';
import { xpForLevel } from '../../src/lib/levels';
import { advance, clickText, findByText, launch, pageText, clickEl } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const entry = (id, date) => ({ id, date, value: 6, sets: 3, reps: 6, setDetails: [6, 6, 6], rpe: 7, note: '', calories: 100 });
const quest = (dates, extra = {}) => ({
  id: 'q1', catalogId: 'pullups', name: 'Tractions', category: 'Dos', type: 'strength', unit: 'reps', goalMode: 'sets_reps',
  level: 1, icon: '🦅', startValue: 4, currentValue: 6, goalValue: 8, goalSets: 3, goalReps: 6, setDetails: [6, 6, 6],
  history: dates.map((d, i) => entry('e' + i, d)), ...extra,
});
const save = (xp, extra = {}) => ({ xp, quests: [], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, ...extra });
const start = async state => {
  const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(state), rondoudou_local_ts: '1' } });
  open.push(h);
  return h;
};
async function ajouterCourse(h) {
  await clickText(h, 'Activité (course, sport…)');
  await clickText(h, 'Ajouter au Bilan du Jour');
}
/** Laisse défiler les messages (ils s'affichent l'un après l'autre) et renvoie tout ce qui a été vu. */
async function toutVoir(h) {
  let vu = pageText(h);
  for (let i = 0; i < 6; i++) { await advance(h, 4600); vu += pageText(h); }
  return vu;
}

describe('niveaux', () => {
  it('affiche le niveau et l’EXP restante sans célébration au démarrage', async () => {
    const h = await start(save(xpForLevel(5) + 100, { rankTrials: [4] }));
    // l'en-tête ne montre que l'icône et sa jauge ; le détail est dans le profil
    expect(pageText(h)).not.toContain('Niv. 5');
    await clickEl(h, h.doc.querySelector('[data-testid="profile-button"]'));
    expect(pageText(h)).toContain('Niv. 5');
    expect(pageText(h)).toContain('Prochain rang');
    expect(pageText(h)).not.toContain('Nouveau rang débloqué');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('simple message quand on monte de niveau sans changer de rang', async () => {
    const h = await start(save(xpForLevel(5) - 20, { rankTrials: [4] }));
    await ajouterCourse(h);
    expect(await toutVoir(h)).toContain('Niveau 5 atteint');
    expect(pageText(h)).not.toContain('Nouveau rang débloqué');
    expect(findByText(h, 'Continuer l’aventure')).toHaveLength(0);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('épreuve de rang', () => {
  it('bloque le niveau tant que l’épreuve n’est pas réussie, puis célèbre le nouveau rang', async () => {
    // assez d'EXP pour le niveau 4 (rang Apprenti), 3 jours d'entraînement : l'épreuve est réalisable
    const h = await start(save(xpForLevel(4) + 50, { quests: [quest(['2026-10-12', '2026-10-14', '2026-10-16'])] }));
    await clickEl(h, h.doc.querySelector('[data-testid="profile-button"]'));
    expect(pageText(h)).toContain('Niv. 3');
    expect(pageText(h)).toContain('Niveau bloqué');
    await clickText(h, 'Épreuve de rang');
    expect(pageText(h)).toContain('Rondoudou Apprenti');
    expect(pageText(h)).toContain('2 / 2'); // 2 jours d'entraînement sur 2
    await clickText(h, 'Valider l’épreuve');
    await advance(h);
    expect(pageText(h)).toContain('Nouveau rang débloqué');
    expect(JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1')).xp).toBeGreaterThan(0);
    expect(JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1')).rankTrials).toEqual([4]);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('refuse de valider tant que les objectifs ne sont pas atteints', async () => {
    const h = await start(save(xpForLevel(4) + 50, { quests: [quest(['2026-10-12'])] }));
    await clickText(h, 'Épreuve de rang');
    expect(pageText(h)).toContain('1 / 2');
    const bouton = findByText(h, 'Objectifs pas encore atteints')[0].closest('button');
    expect(bouton.disabled).toBe(true);
  }, TIMEOUT);
});

describe('bonus de régularité', () => {
  it('+20 % d’EXP après deux semaines d’affilée, affiché dans l’en-tête', async () => {
    // séances les semaines du 5 et du 12 octobre (terminées) ; on est le mercredi 21
    const h = await start(save(1000, { rankTrials: [4], quests: [quest(['2026-10-06', '2026-10-13'])] }));
    await clickEl(h, h.doc.querySelector('[data-testid="profile-button"]'));
    expect(pageText(h)).toContain('+20 % d’EXP');
    await clickEl(h, h.doc.querySelector('[data-testid="profile-sheet"] button[aria-label="Fermer"]'));
    const avant = JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1')).xp;
    await ajouterCourse(h);
    const apres = JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
    // course de 5 km : 85 + 15 % des kcal, majoré de 20 %
    expect(apres.xpDaily.earned).toBeGreaterThan(150); // la course seule (les trophées gagnés ensuite ne comptent pas dans le plafond)
    expect(apres.xp - avant).toBeGreaterThanOrEqual(apres.xpDaily.earned);
    expect(Object.values(apres.xpWeeks).reduce((a, b) => a + b, 0)).toBe(apres.xp - avant);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('récompenses de niveau', () => {
  it('permet de choisir ce qui est débloqué et bloque le reste', async () => {
    const h = await start(save(xpForLevel(6) + 10, { rankTrials: [4] }));
    await clickText(h, 'Récompenses');
    expect(pageText(h)).toContain('niveau 10'); // thème Forêt encore verrouillé
    const foret = findByText(h, 'Forêt')[0].closest('button');
    expect(foret.disabled).toBe(true);
    await clickText(h, 'Océan');
    await clickText(h, 'Casque audio');
    await clickText(h, 'Le Courageux');
    const saved = JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
    expect(saved.cosmetics).toEqual({ theme: 'ocean', accessory: 'casque', title: 'courageux' });
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('affiche la courbe d’EXP dans le Bilan', async () => {
    const h = await start(save(xpForLevel(5), { rankTrials: [4], xpWeeks: { '2026-10-12': 300, '2026-10-19': 500 } }));
    await clickText(h, 'Bilan');
    expect(pageText(h)).toContain('Mon EXP semaine par semaine');
    expect(pageText(h)).toContain('EXP / semaine');
    expect(pageText(h)).toContain('Prochain niveau (6)');
  }, TIMEOUT);
});
