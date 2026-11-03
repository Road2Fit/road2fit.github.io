// Amis : chaque personne a un code aléatoire à 7 caractères ; saisir le code d'un ami l'ajoute à sa liste et permet de consulter son profil.
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_STATE } from './demo';
import { SUPABASE_URL, advance, clickEl, clickText, fakeSupabase, launch, pageText, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const byTest = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

async function logIn(srv, user, heroName) {
  const storage = {
    __classic: '1',
    'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }),
    'rondoufit:account': JSON.stringify({ session: user.session }),
    'rondoufit:lastUser': user.id,
    rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, heroName }),
  };
  const h = await launch({ storage, fetchImpl: srv.fetch });
  open.push(h);
  await advance(h, 600);
  await clickText(h, 'Amis');
  await advance(h, 300);
  if (byTest(h, 'friends-enable')) { await clickEl(h, byTest(h, 'friends-enable')); }
  await advance(h, 800);
  return h;
}
const myCode = h => byTest(h, 'my-code').textContent;
async function addFriend(h, code) {
  await setInput(h, byTest(h, 'friend-input'), code);
  await clickEl(h, byTest(h, 'friend-add'));
  await advance(h, 600);
}

describe('amis : code à 7 caractères', () => {
  it('mon code est aléatoire, 7 caractères sans lettres ambiguës, et différent d’une personne à l’autre', async () => {
    const srv = fakeSupabase();
    const a = await logIn(srv, srv.addUser('a@x.fr'), 'Léa');
    const b = await logIn(srv, srv.addUser('b@x.fr'), 'Max');
    expect(myCode(a)).toMatch(/^[A-HJ-NP-Z2-9]{7}$/);
    expect(myCode(b)).toMatch(/^[A-HJ-NP-Z2-9]{7}$/);
    expect(myCode(a)).not.toBe(myCode(b));
    expect(a.errors).toEqual([]);
  }, TIMEOUT);

  it('saisir le code d’un ami l’ajoute ; son profil montre dernière séance, maxima et exercices', async () => {
    const srv = fakeSupabase();
    const a = await logIn(srv, srv.addUser('a@x.fr'), 'Léa');
    const code = myCode(a);
    const b = await logIn(srv, srv.addUser('b@x.fr'), 'Max');
    expect(pageText(b)).toContain('Pas encore d’ami');
    await addFriend(b, code.toLowerCase()); // saisie en minuscules acceptée
    expect(byTest(b, 'friend-msg').textContent).toContain('Ami ajouté');
    const row = [...b.doc.querySelectorAll('[data-testid^="friend-u"]')][0];
    expect(row.textContent).toContain('Léa');
    await clickEl(b, row);
    const p = byTest(b, 'friend-profile').textContent;
    expect(p).toContain('Léa');
    expect(p).toContain('Dernière séance');
    expect(p).toContain('Tractions Pronation');
    expect(p).toContain('Maxima');
    expect(p).toContain('Ses exercices');
    // jamais le poids ni la sauvegarde complète
    expect(p).not.toMatch(/\d+ kg ➔|poids de départ/i);
    const shared = JSON.stringify([...srv.profiles.values()]);
    expect(shared).not.toContain('weightHistory');
    expect(shared).not.toContain('userWeightKg');
    expect(b.errors).toEqual([]);
  }, TIMEOUT);

  it('le rang de l’ami s’affiche à côté de son nom, et son pseudo se change dans « Mon compte » en direct chez les amis', async () => {
    const srv = fakeSupabase();
    const a = await logIn(srv, srv.addUser('a@x.fr'), 'Léa');
    const b = await logIn(srv, srv.addUser('b@x.fr'), 'Max');
    await addFriend(b, myCode(a));
    const row = () => [...b.doc.querySelectorAll('[data-testid^="friend-u"]')][0];
    const shared = [...srv.profiles.values()][0].summary;
    expect(Number.isInteger(shared.rank)).toBe(true);
    expect(JSON.stringify(shared)).not.toMatch(/Rondoudou|Débutant|Initié/); // on partage la position du rang, pas son nom
    expect(byTest(b, 'friend-rank').textContent).toMatch(/\S/);
    expect(row().textContent).toMatch(/^Léa\s*\S/);
    await clickEl(b, row());
    expect(byTest(b, 'friend-profile-rank').textContent).toMatch(/\S/);
    await clickText(b, 'Mes amis');
    expect(row()).toBeTruthy();

    // Léa change son pseudo dans ⚙️ → Mon compte ; Max le voit sans rien toucher
    const gear = [...a.doc.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Réglages et données');
    await clickEl(a, gear);
    await clickEl(a, [...a.doc.querySelectorAll('button')].find(x => x.textContent.includes('Mon compte et ma sauvegarde')));
    await setInput(a, byTest(a, 'hero-name-input'), 'Lélé la Fusée');
    await clickEl(a, byTest(a, 'hero-name-save'));
    await advance(a, 3000);
    expect(JSON.stringify([...srv.profiles.values()])).toContain('Lélé la Fusée');
    expect(row().textContent).toContain('Léa');
    await advance(b, 9000);
    expect(row().textContent).toContain('Lélé la Fusée');
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
  }, TIMEOUT);

  it('code inconnu, son propre code, et trop d’essais ratés', async () => {
    const srv = fakeSupabase();
    const a = await logIn(srv, srv.addUser('a@x.fr'), 'Léa');
    await addFriend(a, myCode(a));
    expect(byTest(a, 'friend-msg').textContent).toContain('propre code');
    await addFriend(a, 'ZZZZZZZ');
    expect(byTest(a, 'friend-msg').textContent).toContain('Code introuvable');
    for (let i = 0; i < 8; i++) await addFriend(a, `ZZZZZ${i + 2}K`);
    await addFriend(a, 'ZZZZZZY');
    expect(byTest(a, 'friend-msg').textContent).toContain('Trop d’essais');
  }, TIMEOUT);

  it('couper le partage ou changer de code retire l’accès aux amis', async () => {
    const srv = fakeSupabase();
    const a = await logIn(srv, srv.addUser('a@x.fr'), 'Léa');
    const b = await logIn(srv, srv.addUser('b@x.fr'), 'Max');
    await addFriend(b, myCode(a));
    expect(b.doc.querySelectorAll('[data-testid^="friend-u"]').length).toBe(1);
    // Léa change de code : Max ne la voit plus après actualisation, et l'ancien code ne marche plus
    const old = myCode(a);
    a.w.confirm = () => true;
    await clickEl(a, byTest(a, 'regen-code'));
    await advance(a, 400);
    expect(myCode(a)).not.toBe(old);
    await clickText(b, 'Actualiser');
    await advance(b, 400);
    expect(b.doc.querySelectorAll('[data-testid^="friend-u"]').length).toBe(0);
    await addFriend(b, old);
    expect(byTest(b, 'friend-msg').textContent).toContain('Code introuvable');
    await addFriend(b, myCode(a));
    expect(b.doc.querySelectorAll('[data-testid^="friend-u"]').length).toBe(1);
    // partage coupé : introuvable pour de nouveaux amis et invisible pour les anciens
    await clickEl(a, byTest(a, 'share-toggle'));
    await advance(a, 400);
    await clickText(b, 'Actualiser');
    await advance(b, 400);
    expect(b.doc.querySelectorAll('[data-testid^="friend-u"]').length).toBe(0);
  }, TIMEOUT);

  it('rien n’est publié tant que les amis ne sont pas activés', async () => {
    const srv = fakeSupabase();
    const user = srv.addUser('a@x.fr');
    const h = await launch({ storage: { __classic: '1', 'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }), 'rondoufit:account': JSON.stringify({ session: user.session }), 'rondoufit:lastUser': user.id, rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true }) }, fetchImpl: srv.fetch });
    open.push(h);
    await advance(h, 800);
    await clickText(h, 'Amis');
    await advance(h, 600);
    expect(byTest(h, 'friends-intro').textContent).toContain('Jamais ton poids');
    expect(srv.profiles.size).toBe(0);
    expect(srv.calls.some(c => c.includes('/profiles'))).toBe(false);
    await clickEl(h, byTest(h, 'friends-enable'));
    await advance(h, 800);
    expect(srv.profiles.size).toBe(1);
    expect(byTest(h, 'my-code').textContent).toMatch(/^[A-HJ-NP-Z2-9]{7}$/);
  }, TIMEOUT);

  it('sans compte connecté : invitation à se connecter', async () => {
    const srv = fakeSupabase();
    const h = await launch({ storage: { __classic: '1', 'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }), rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true }) }, fetchImpl: srv.fetch });
    open.push(h);
    await advance(h, 600);
    await clickText(h, 'Amis');
    await advance(h, 400);
    expect(byTest(h, 'friends-offline')).toBeTruthy();
  }, TIMEOUT);
});

describe('amis : mises à jour', () => {
  it('amis activés sur un appareil : un autre appareil du même compte publie aussi ses changements', async () => {
    const srv = fakeSupabase();
    const user = srv.addUser('a@x.fr');
    // deuxième appareil : aucune mémoire locale « amis activés », mais l'accord est dans les données du compte
    const h = await launch({ storage: { __classic: '1', 'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }), 'rondoufit:account': JSON.stringify({ session: user.session }), 'rondoufit:lastUser': user.id, rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, friendsOn: true, heroName: 'Léa' }) }, fetchImpl: srv.fetch });
    open.push(h);
    await advance(h, 3500);
    expect(srv.profiles.size).toBe(1);
    expect(JSON.stringify([...srv.profiles.values()][0].summary)).toContain('Léa');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('amis : prénom', () => {
  it('un appareil resté avec un prénom vide n’efface pas le prénom déjà publié, et le remet dans l’appli', async () => {
    const srv = fakeSupabase();
    const user = srv.addUser('a@x.fr');
    const store = name => ({ __classic: '1', 'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }), 'rondoufit:account': JSON.stringify({ session: user.session }), 'rondoufit:lastUser': user.id, 'rondoufit:friends': '1', rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, heroName: name }) });
    const a = await launch({ storage: store('Léa'), fetchImpl: srv.fetch });
    open.push(a);
    await advance(a, 3500);
    expect([...srv.profiles.values()][0].summary.name).toBe('Léa');
    a.close(); open.pop();
    const b = await launch({ storage: store(''), fetchImpl: srv.fetch });
    open.push(b);
    await advance(b, 3500);
    expect([...srv.profiles.values()][0].summary.name).toBe('Léa');
    expect(JSON.parse(b.w.localStorage.getItem('rondoudou_save_v1')).heroName).toBe('Léa');
    expect(b.errors).toEqual([]);
  }, TIMEOUT);
});
