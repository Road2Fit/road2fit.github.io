// 4.22 : s'entraîner chez soi (lieu + matériel), douleurs signalées, rappel de séance, bilan sur 4 semaines, lexique « Les bases ».
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, findByText, clickText, launch, pageText } from './harness';
import { doableAtHome } from '../../src/coach/equipment';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const qa = (h, id) => [...h.doc.querySelectorAll(`[data-testid="${id}"]`)];
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const settings = async h => { await clickEl(h, q(h, 'coach-page-reglages')); };

describe('chez soi, douleurs, rappel, bilan', () => {
  it('« Chez moi » sans matériel : exercices infaisables listés, remplaçants ajoutés, la séance ne garde que du faisable', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await settings(h);
    expect(q(h, 'coach-place')).toBeTruthy();
    expect(q(h, 'equip-list')).toBeNull(); // en salle : pas de liste de matériel
    await clickEl(h, q(h, 'place-home'));
    expect(q(h, 'equip-list')).toBeTruthy();
    expect(saved(h).coach.place).toBe('home');
    const undo = q(h, 'place-undoable');
    expect(undo).toBeTruthy();
    expect(undo.textContent).toMatch(/matériel de salle|barre/);
    const before = saved(h).quests.length;
    await clickEl(h, q(h, 'place-swap'));
    const s = saved(h);
    expect(s.quests.length).toBeGreaterThan(before);
    // les exercices ajoutés sont faisables sans matériel, les anciens sont toujours là (historique gardé)
    const added = s.quests.slice(before);
    for (const x of added) expect(doableAtHome(x, s.coach), x.name).toBe(true);
    // prochaine séance : uniquement des exercices faisables chez soi
    await clickEl(h, q(h, 'coach-page-seance'));
    const names = qa(h, 'next-ex').map(el => el.querySelector('p').textContent);
    expect(names.length).toBeGreaterThan(0);
    for (const el of qa(h, 'next-ex')) {
      const name = el.querySelector('p').textContent.trim();
      const quest = s.quests.find(x => name.includes(x.name));
      expect(quest, name).toBeTruthy();
      expect(doableAtHome(quest, s.coach), name).toBe(true);
    }
    // avec des haltères, plus d'exercices deviennent faisables
    await settings(h);
    await clickEl(h, q(h, 'equip-dumbbells'));
    expect(saved(h).coach.equipment).toEqual(['dumbbells']);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('douleur signalée : exercices marqués « à ménager », rappel dans la séance guidée, retirable', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await settings(h);
    // genou + épaule : quel que soit le premier exercice de la séance (squat ou tractions), une zone est sollicitée
    await clickEl(h, q(h, 'pain-knee-right'));
    await clickEl(h, q(h, 'pain-shoulder-left'));
    expect(saved(h).coach.pains.map(p => p.zone + ':' + p.side)).toEqual(['knee:right', 'shoulder:left']);
    // schéma des muscles : vert par défaut, rouge une fois touché (triceps droit, vu de dos)
    const tri = q(h, 'painmap-m:Triceps-right-back');
    expect(tri.getAttribute('fill')).toBe('#10b981');
    await clickEl(h, tri);
    expect(q(h, 'painmap-m:Triceps-right-back').getAttribute('fill')).toBe('#f43f5e');
    expect(q(h, 'painmap-m:Triceps-left-back').getAttribute('fill')).toBe('#10b981');
    expect(q(h, 'pain-summary').textContent).toMatch(/triceps droit/);
    await clickEl(h, q(h, 'painmap-m:Triceps-right-back'));
    expect(saved(h).coach.pains.length).toBe(2);
    await clickEl(h, q(h, 'coach-page-seance'));
    expect(qa(h, 'ex-pain').length).toBeGreaterThan(0);
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    expect(q(h, 'set-pain').textContent).toMatch(/(Genou droit|Épaule gauche|w+) sensible/);
    // depuis le menu de la séance : « J'ai mal quelque part » → on retire le genou, on ajoute le coude
    await clickEl(h, q(h, 'guided-menu'));
    await clickEl(h, q(h, 'pain-open'));
    await clickEl(h, q(h, 'pain-knee-right'));
    await clickEl(h, q(h, 'pain-elbow-left'));
    expect(saved(h).coach.pains.map(p => p.zone + ':' + p.side)).toEqual(['shoulder:left', 'elbow:left']);
    await clickEl(h, q(h, 'guided-lexicon'));
    expect(q(h, 'lexicon').textContent).toMatch(/Répétition \(rep\)/);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('séance exceptionnellement à la maison : seulement des exercices faisables, retour en salle d’un geste', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, q(h, 'coach-page-seance'));
    const before = qa(h, 'next-ex').map(el => el.querySelector('p').textContent.trim());
    await clickEl(h, q(h, 'home-once'));
    const s = saved(h);
    expect(s.coach.place).toBe('gym');
    expect(s.coach.homeDays.length).toBe(1);
    expect(q(h, 'home-once-on')).toBeTruthy();
    const names = qa(h, 'next-ex').map(el => el.querySelector('p').textContent.trim());
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const quest = s.quests.find(x => name.includes(x.name));
      expect(doableAtHome(quest, s.coach), name).toBe(true);
    }
    // exercices ajoutés pour la maison : réservés aux séances à la maison
    const n0 = saved(h).quests.length;
    await clickEl(h, q(h, 'home-once-add'));
    const added = saved(h).quests.slice(n0);
    expect(added.length).toBeGreaterThan(0);
    for (const x of added) { expect(x.homeOnly).toBe(true); expect(doableAtHome(x, saved(h).coach), x.name).toBe(true); }
    expect(saved(h).coach.homeDays.length).toBe(1);
    const atHome = qa(h, 'next-ex').map(el => el.querySelector('p').textContent.trim());
    expect(added.some(x => atHome.some(t => t.includes(x.name)))).toBe(true);
    await clickEl(h, q(h, 'home-once-off'));
    expect(saved(h).coach.homeDays).toEqual([]);
    expect(qa(h, 'next-ex').map(el => el.querySelector('p').textContent.trim())).toEqual(before);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('bilan : les 4 dernières semaines en tête ; rappel de séance : réglage et agenda', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await settings(h);
    expect(q(h, 'coach-reminders')).toBeTruthy();
    expect(q(h, 'reminder-calendar')).toBeTruthy();
    // sans notifications possibles (faux navigateur) : message clair, réglage non activé
    await clickEl(h, q(h, 'reminder-toggle'));
    await advance(h, 50);
    expect(q(h, 'reminder-msg')).toBeTruthy();
    expect(!!saved(h).coach.reminders).toBe(false);
    // avec les notifications autorisées
    h.w.Notification = { permission: 'granted', requestPermission: async () => 'granted' };
    await clickEl(h, q(h, 'reminder-toggle'));
    await advance(h, 50);
    expect(saved(h).coach.reminders).toBe(true);
    // bilan (par le profil)
    await clickEl(h, q(h, 'profile-button'));
    await clickText(h, 'Bilan');
    expect(q(h, 'progress-card')).toBeTruthy();
    expect(q(h, 'progress-headline').textContent).toMatch(/séances? sur \d+ prévues?/);
    expect(pageText(h)).toContain('Bilan de la semaine');
    expect(h.errors).toEqual([]);
  }, 120000);
});
