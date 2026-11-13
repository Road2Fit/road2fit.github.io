// Comptes dans l'application (édition amis) : créer un compte, sauvegarde automatique, nouvel appareil, un autre compte sur le même appareil.
import { afterEach, describe, expect, it } from 'vitest';
import { SUPABASE_URL, advance, clickEl, fakeSupabase, launch, pageText, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const STORAGE = { __classic: '1', 'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }) };
const byTest = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const next = async h => { await clickEl(h, byTest(h, 'ob-next')); if (byTest(h, 'ob-avatar')) await clickEl(h, byTest(h, 'ob-next')); }; // l'étape avatar (4.44) est passée
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const start = async (srv, extra = {}) => { const h = await launch({ empty: true, storage: { ...STORAGE, ...extra }, fetchImpl: srv.fetch }); open.push(h); await advance(h, 300); return h; };

async function toBackupStep(h, name = 'Léa') {
  await setInput(h, h.doc.getElementById('ob-name'), name);
  await next(h);
  await setInput(h, h.doc.getElementById('ob-w'), '70');
  for (let i = 0; i < 5; i++) await next(h);
}
async function signUp(h, email, password, invite) {
  await setInput(h, byTest(h, 'acc-email'), email);
  await setInput(h, byTest(h, 'acc-password'), password);
  await setInput(h, byTest(h, 'acc-invite'), invite);
  // 4.47 : sans l'accord (politique de confidentialité), le bouton reste grisé
  expect(byTest(h, 'acc-submit').disabled).toBe(true);
  await clickEl(h, byTest(h, 'acc-consent'));
  await clickEl(h, byTest(h, 'acc-submit'));
  await advance(h, 2500);
}
async function signIn(h, email, password) {
  await clickEl(h, byTest(h, 'tab-signin'));
  await setInput(h, byTest(h, 'acc-email'), email);
  await setInput(h, byTest(h, 'acc-password'), password);
  await clickEl(h, byTest(h, 'acc-submit'));
  await advance(h, 2500);
}

describe('compte dans l’application', () => {
  it('l’assistant propose un compte (pas de GitHub) quand le service est réglé ; mauvais code d’invitation refusé', async () => {
    const srv = fakeSupabase();
    const h = await start(srv);
    await toBackupStep(h);
    const t = byTest(h, 'ob-backup').textContent;
    expect(t).toContain('Ton compte');
    expect(t).not.toContain('github_pat');
    await signUp(h, 'lea@example.fr', 'motdepasse1', 'MAUVAIS');
    expect(byTest(h, 'acc-msg').textContent).toContain('code d’invitation incorrect');
    expect(srv.users.size).toBe(0);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('créer un compte lance la sauvegarde automatique : les données partent dans SA ligne, sans jeton GitHub', async () => {
    const srv = fakeSupabase();
    const h = await start(srv);
    await toBackupStep(h);
    await signUp(h, 'lea@example.fr', 'motdepasse1', 'MOTSECRET');
    expect(byTest(h, 'account-email').textContent).toBe('lea@example.fr');
    await advance(h, 3000);
    expect(byTest(h, 'account-status').textContent).toContain('Sauvegarde automatique activée');
    // 4.47 : l'accord donné à l'inscription (politique de confidentialité) est la première donnée : il part dans SA ligne
    expect(srv.saves.size).toBeLessThanOrEqual(1);
    if (srv.saves.size) expect([...srv.saves.values()][0].data.privacyConsent.version).toBeTruthy();
    expect(h.w.localStorage.getItem('rondoufit:github')).toBeNull();
    expect(h.w.localStorage.getItem('rondoudou_save_v1')).not.toContain('motdepasse1');
    // une modification part toute seule, sans bouton
    await next(h); // « Terminé »
    await clickEl(h, byTest(h, 'ob-finish'));
    await advance(h, 4000);
    const row2 = [...srv.saves.values()][0];
    expect(row2.version).toBeGreaterThanOrEqual(1);
    expect(row2.data.onboarded).toBe(true);
    expect(row2.data.userWeightKg).toBe(70);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('nouveau téléphone : on se connecte avec le même compte et on retrouve tout, sans rien écraser', async () => {
    const srv = fakeSupabase();
    const h1 = await start(srv);
    await toBackupStep(h1);
    await signUp(h1, 'lea@example.fr', 'motdepasse1', 'MOTSECRET');
    await next(h1);
    await clickEl(h1, byTest(h1, 'ob-finish'));
    await advance(h1, 4000);
    const avant = JSON.stringify([...srv.saves.values()][0].data);

    const h2 = await start(srv);
    expect(byTest(h2, 'onboarding')).toBeTruthy(); // appareil neuf : l'assistant s'ouvre
    await toBackupStep(h2, 'Autre');
    await signIn(h2, 'lea@example.fr', 'motdepasse1');
    await advance(h2, 4000);
    expect(JSON.stringify([...srv.saves.values()][0].data)).toBe(avant); // rien d'écrasé
    expect(byTest(h2, 'onboarding')).toBeNull(); // la sauvegarde existante a été reprise : plus besoin de l'assistant
    expect(saved(h2).onboarded).toBe(true);
    expect(saved(h2).userWeightKg).toBe(70);
    expect(h2.errors).toEqual([]);
  }, TIMEOUT);

  it('un autre compte sur le même téléphone : jamais de mélange (copie de sécurité, départ à neuf)', async () => {
    const srv = fakeSupabase();
    const h = await start(srv);
    await toBackupStep(h, 'Léa');
    await signUp(h, 'lea@example.fr', 'motdepasse1', 'MOTSECRET');
    await next(h);
    await clickEl(h, byTest(h, 'ob-finish'));
    await advance(h, 4000);
    expect(saved(h).heroName).toBe('Léa');

    // déconnexion (⚙️ → Mon compte), puis un autre ami crée son compte sur le même téléphone
    const gear = [...h.doc.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Réglages et données');
    await clickEl(h, gear);
    const compte = [...h.doc.querySelectorAll('button')].find(b => b.textContent.includes('Mon compte et ma sauvegarde'));
    await clickEl(h, compte);
    await clickEl(h, byTest(h, 'account-signout'));
    await advance(h, 500);
    expect(h.w.localStorage.getItem('rondoufit:account')).toBeNull();
    await signUp(h, 'paul@example.fr', 'autremdp12', 'MOTSECRET');
    await advance(h, 4000);
    expect(srv.users.size).toBe(2);
    const paulId = srv.users.get('paul@example.fr').id;
    const leaId = srv.users.get('lea@example.fr').id;
    const paulRow = srv.saves.get(paulId);
    // les données de Léa ne sont pas allées dans le compte de Paul
    expect(!paulRow || JSON.stringify(paulRow.data).indexOf('"heroName": "Léa"') === -1).toBe(true);
    expect(JSON.stringify(srv.saves.get(leaId).data)).toContain('Léa');
    expect(saved(h).heroName).not.toBe('Léa');
    expect(h.w.localStorage.getItem('rondoufit:safetyCopy')).toContain('Léa'); // copie de sécurité gardée
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('mauvais mot de passe : message clair ; session expirée : demande de se reconnecter, données gardées', async () => {
    const srv = fakeSupabase();
    srv.users.set('lea@example.fr', { id: 'u1', password: 'motdepasse1' });
    const h = await start(srv);
    await toBackupStep(h);
    await signIn(h, 'lea@example.fr', 'faux-mot-de-passe');
    expect(byTest(h, 'acc-msg').textContent).toContain('E-mail ou mot de passe incorrect');
    await signIn(h, 'lea@example.fr', 'motdepasse1');
    expect(byTest(h, 'account-connected')).toBeTruthy();
    // la session stockée expire et le serveur refuse le renouvellement
    const acc = JSON.parse(h.w.localStorage.getItem('rondoufit:account'));
    acc.session.expires_at = 1;
    h.w.localStorage.setItem('rondoufit:account', JSON.stringify(acc));
    srv.expireAll = true;
    await advance(h, 65000);
    await advance(h, 500);
    await advance(h, 500);
    expect(JSON.parse(h.w.localStorage.getItem('rondoufit:account')).expired).toBe(true);
    expect(pageText(h)).toContain('reconnecte');
    expect(saved(h).heroName).toBeDefined();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('versions précédentes : une copie est gardée à chaque mise à jour et on peut la restaurer', async () => {
    const srv = fakeSupabase();
    const h = await start(srv);
    await toBackupStep(h, 'Léa');
    await signUp(h, 'lea@example.fr', 'motdepasse1', 'MOTSECRET');
    await next(h);
    await clickEl(h, byTest(h, 'ob-finish'));
    await advance(h, 4000);
    expect(saved(h).soundEnabled).toBe(true);
    // une modification (on coupe les sons) part en ligne : l'ancienne version est gardée dans l'historique
    const gear = [...h.doc.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Réglages et données');
    await clickEl(h, gear);
    await clickEl(h, [...h.doc.querySelectorAll('button')].find(b => b.textContent.includes('Sons :')));
    await clickEl(h, h.doc.querySelector('button[aria-label="Fermer"]'));
    await advance(h, 4000);
    expect(saved(h).soundEnabled).toBe(false);
    const hist = [...srv.history.values()][0];
    expect(hist.length).toBeGreaterThanOrEqual(1);
    // restauration depuis « Mon compte »
    await clickEl(h, gear);
    await clickEl(h, byTest(h, 'open-account'));
    await clickEl(h, byTest(h, 'versions-toggle'));
    await advance(h, 500);
    await clickEl(h, byTest(h, `restore-${hist[hist.length - 1].id}`));
    await advance(h, 4000);
    expect(saved(h).soundEnabled).toBe(true); // la version précédente est revenue
    expect(h.w.localStorage.getItem('rondoufit:safetyCopy')).toBeTruthy(); // et une copie de sécurité a été gardée
    expect([...srv.saves.values()][0].data.soundEnabled).toBe(true); // puis sauvegardée en ligne
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('la sauvegarde ne propose aucune suppression : aucun appel DELETE n’est jamais envoyé sur la sauvegarde principale', async () => {
    const srv = fakeSupabase();
    const h = await start(srv);
    await toBackupStep(h);
    await signUp(h, 'lea@example.fr', 'motdepasse1', 'MOTSECRET');
    await next(h);
    await clickEl(h, byTest(h, 'ob-finish'));
    await advance(h, 4000);
    expect(srv.calls.filter(x => x.startsWith('DELETE /rest/v1/saves'))).toEqual([]);
    expect(pageText(h)).not.toMatch(/github/i);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
