// Photos entre amis : ma dernière photo de séance (si je l'active) visible dans mon profil chez mes amis ;
// taguer un ami MUTUEL sur une photo → elle apparaît dans ses Souvenirs, avec une pastille jusqu'à ce qu'il les ouvre.
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_STATE } from './demo';
import { SUPABASE_URL, advance, clickEl, clickText, fakeSupabase, launch, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const IMG = 'data:image/jpeg;base64,/9j/AAAA';

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
  if (q(h, 'friends-enable')) await clickEl(h, q(h, 'friends-enable'));
  await advance(h, 800);
  return h;
}
const addFriend = async (h, code) => { await setInput(h, q(h, 'friend-input'), code); await clickEl(h, q(h, 'friend-add')); await advance(h, 600); };
// ajoute une photo comme « Restaurer » dans Souvenirs (fichier JSON de photos), puis revient sur l'onglet Amis si besoin
async function addPhoto(h, photo, back = true) {
  await clickText(h, 'Souvenirs');
  await advance(h, 300);
  const input = h.doc.querySelector('input[type=file][accept*=json]');
  const file = new h.w.File([JSON.stringify({ rondoufitPhotos: 1, photos: [photo] })], 'photos.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new h.w.Event('change', { bubbles: true }));
  for (let i = 0; i < 6; i++) await advance(h, 200);
  if (back) { await clickText(h, 'Amis'); await advance(h, 300); }
}

describe('photos entre amis', () => {
  it('dernière photo : rien tant que ce n’est pas activé, puis visible dans mon profil chez mon ami', async () => {
    const srv = fakeSupabase();
    const ua = srv.addUser('a@x.fr');
    const a = await logIn(srv, ua, 'Max');
    const codeA = q(a, 'my-code').textContent;
    const b = await logIn(srv, srv.addUser('b@x.fr'), 'Léa');
    await addFriend(b, codeA);
    // A a une photo, mais n'a pas activé le partage : rien n'est envoyé
    srv.sharedPhotos = srv.sharedPhotos || new Map();
    await addPhoto(a, { id: 'ph_1', date: '2026-10-21', img: IMG, label: 'Séance', note: 'Top séance', createdAt: 1 });
    await advance(a, 500);
    expect(srv.sharedPhotos.size).toBe(0);
    expect(q(a, 'photo-share-toggle').checked).toBe(false);
    await clickEl(a, q(a, 'photo-share-toggle'));
    await advance(a, 800);
    expect(srv.sharedPhotos.get(`${ua.id}:last:last`)).toMatchObject({ date: '2026-10-21', data: IMG });
    // chez B : profil de Max → sa dernière photo
    await clickEl(b, [...b.doc.querySelectorAll('[data-testid^="friend-u"]')][0]);
    await advance(b, 500);
    expect(q(b, 'friend-last-photo')).toBeTruthy();
    expect(q(b, 'friend-last-photo').textContent).toContain('Top séance');
    // A désactive : la photo est retirée du serveur
    await clickEl(a, q(a, 'photo-share-toggle'));
    await advance(a, 800);
    expect(srv.sharedPhotos.has(`${ua.id}:last:last`)).toBe(false);
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
  }, TIMEOUT);

  it('taguer un ami mutuel : la photo apparaît dans ses Souvenirs avec une pastille', async () => {
    const srv = fakeSupabase();
    const ua = srv.addUser('a@x.fr');
    const ub = srv.addUser('b@x.fr');
    const a = await logIn(srv, ua, 'Max');
    const b = await logIn(srv, ub, 'Léa');
    await addFriend(a, q(b, 'my-code').textContent);
    await addFriend(b, q(a, 'my-code').textContent); // amis mutuels
    await addPhoto(a, { id: 'ph_7', date: '2026-10-21', img: IMG, label: 'Séance', note: 'Avec Léa', createdAt: 1 });
    // A : Souvenirs → jour → Taguer un ami → Léa
    await clickText(a, 'Souvenirs');
    await advance(a, 600);
    await clickEl(a, a.doc.querySelector('[data-day="2026-10-21"]'));
    await clickEl(a, q(a, 'photo-tag-ph_7'));
    await advance(a, 300);
    await clickEl(a, q(a, `tag-friend-${ub.id}`));
    await clickEl(a, q(a, 'tag-save'));
    await advance(a, 500);
    expect(q(a, 'tag-msg').textContent).toContain('Photo envoyée');
    expect([...srv.sharedPhotos.values()].find(r => r.kind === 'tag').tagged).toEqual([ub.id]);
    // B : la pastille apparaît au retour sur l'appli
    b.w.dispatchEvent(new b.w.Event('focus'));
    await advance(b, 600);
    expect(q(b, 'badge-photos') || q(b, 'badge-plus')).toBeTruthy();
    await clickText(b, 'Souvenirs');
    await advance(b, 600);
    expect(q(b, 'tagged-photos').textContent).toContain('Max');
    await clickEl(b, b.doc.querySelector('[data-day="2026-10-21"]'));
    expect(q(b, 'tagged-photo').textContent).toContain('Max');
    expect(q(b, 'badge-photos')).toBeNull(); // vue : plus de pastille
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
  }, TIMEOUT);

  it('on ne peut pas taguer quelqu’un qui ne m’a pas ajouté', async () => {
    const srv = fakeSupabase();
    const ub = srv.addUser('b@x.fr');
    const a = await logIn(srv, srv.addUser('a@x.fr'), 'Max');
    const b = await logIn(srv, ub, 'Léa');
    await addFriend(a, q(b, 'my-code').textContent); // A a ajouté B, pas l'inverse
    await addPhoto(a, { id: 'ph_9', date: '2026-10-21', img: IMG, label: 'Séance', note: '', createdAt: 1 });
    await clickText(a, 'Souvenirs');
    await advance(a, 600);
    await clickEl(a, a.doc.querySelector('[data-day="2026-10-21"]'));
    await clickEl(a, q(a, 'photo-tag-ph_9'));
    await advance(a, 300);
    expect(q(a, 'tag-picker').textContent).toContain('ajoutés tous les deux');
    expect(q(a, `tag-friend-${ub.id}`)).toBeNull();
    expect(a.errors).toEqual([]);
  }, TIMEOUT);
});
