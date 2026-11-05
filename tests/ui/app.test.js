// Parcours complets de l'application dans un faux navigateur.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, clickText, findByText, launch, monkey, pageText, runGuided } from './harness';

const open = [];
const start = async opts => { const h = await launch(opts); open.push(h); return h; };
afterEach(() => { while (open.length) open.pop().close(); });

const TIMEOUT = 120000;

describe('application', () => {
  it('affiche l’accueil sans erreur', async () => {
    const h = await start();
    expect(h.doc.querySelector('h1').textContent).toContain('From Grosdoudou to Rondoudou');
    expect(pageText(h)).toContain('Exercices');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('l’appli s’ouvre sur le Coach, avec la séance du jour', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    expect(pageText(h)).toContain('Prochaine séance');
    expect(pageText(h)).not.toContain('Micro Magique de Rondoudou'); // l'ancienne zone micro a disparu de la page
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('le micro au-dessus du « + » ouvre la dictée', async () => {
    const h = await start();
    const micro = h.doc.querySelector('[data-testid="fab-voice"]');
    expect(micro).toBeTruthy();
    await clickEl(h, micro);
    expect(pageText(h)).toContain('Micro Magique de Rondoudou');
    expect(h.doc.querySelector('textarea')).toBeTruthy();
    const fenetre = h.doc.querySelector('textarea').closest('.fixed');
    await clickEl(h, [...fenetre.querySelectorAll('button')].find(b => b.textContent.trim() === '✕'));
    expect(pageText(h)).not.toContain('Micro Magique de Rondoudou');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('ouvre chaque onglet', async () => {
    const h = await start();
    const attendus = [
      ['Coach', 'Prochaine séance'],
      ['Journal', 'Journal'],
      ['Poids', 'Poids'],
      ['Souvenirs', 'Souvenirs'],
      ['Bilan', 'Bilan'],
      ['Trophées', 'Trophées'],
      ['Exercices', 'Développé'],
    ];
    for (const [onglet, texte] of attendus) {
      await clickText(h, onglet);
      expect(pageText(h), onglet).toContain(texte);
    }
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('séance guidée du coach : toutes les séries validées puis enregistrement', async () => {
    const h = await start();
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    expect(lancer, 'bouton de lancement').toBeTruthy();
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    expect(await runGuided(h)).toBe('summary');
    await clickText(h, 'Enregistrer la séance');
    expect(pageText(h)).toContain('Bilan de la séance');
    await clickText(h, 'Super, merci coach');
    const saved = JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
    const aujourdhui = saved.quests.flatMap(q => q.history).filter(e => e.date === '2026-10-21');
    expect(aujourdhui.length).toBeGreaterThan(0);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('ouvre et ferme chaque fenêtre (noter une séance, objectif, course, valider, réinitialiser)', async () => {
    for (const texte of ['Noter la séance', 'Nouvel exercice', 'Activité (course, sport…)', 'Valider l’objectif', 'Ajuster', 'Tout réinitialiser']) {
      const h = await start();
      await clickText(h, texte);
      expect(h.doc.querySelector('.fixed.inset-0'), texte).toBeTruthy();
      h.close();
      open.pop();
      expect(h.errors, texte).toEqual([]);
    }
  }, TIMEOUT);

  it('résiste à 150 actions au hasard (clics et saisies)', async () => {
    for (const seed of [1, 7]) {
      const h = await start();
      const n = await monkey(h, seed, 150);
      expect(n).toBeGreaterThan(100);
      expect(h.errors).toEqual([]);
      h.close();
      open.pop();
    }
  }, TIMEOUT);
});
