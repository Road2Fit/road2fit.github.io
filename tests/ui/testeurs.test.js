// 4.47, phase « 10 testeurs » : accord sur la confidentialité (comptes existants), page Confidentialité et mentions légales,
// « Signaler un problème / une idée », « Supprimer mon compte » (toutes les données en ligne et sur le téléphone).
import { afterEach, describe, expect, it } from 'vitest';
import { SUPABASE_URL, advance, clickEl, clickText, fakeSupabase, launch, setInput } from './harness';
import { DEMO_STATE } from './demo';
import { scrub, deviceLabel } from '../../src/lib/errorReport';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

async function logged(srv, extraState = {}) {
  const user = srv.addUser('lea@x.fr');
  const h = await launch({
    storage: {
      __classic: '1',
      'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }),
      'rondoufit:account': JSON.stringify({ session: user.session }),
      'rondoufit:lastUser': user.id,
      rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, heroName: 'Léa', ...extraState }),
    },
    fetchImpl: srv.fetch,
  });
  open.push(h);
  await advance(h, 800);
  return { h, user };
}
const openSettings = async h => { await clickEl(h, q(h, 'gear-button') || h.doc.querySelector('[aria-label*="églages"]')); await advance(h, 300); };

describe('phase 10 testeurs', () => {
  it('compte existant : accord demandé une fois, la politique se lit, l’accord est enregistré', async () => {
    const srv = fakeSupabase();
    const { h } = await logged(srv);
    for (let i = 0; i < 10 && !q(h, 'privacy-consent'); i++) await advance(h, 100);
    expect(q(h, 'privacy-consent')).toBeTruthy();
    await clickEl(h, q(h, 'privacy-consent-read'));
    for (let i = 0; i < 10 && !q(h, 'privacy-policy'); i++) await advance(h, 100);
    const t = q(h, 'privacy-policy').textContent;
    ['pas un avis médical', 'Supabase', 'Anthropic', 'Supprimer mon compte', 'CNIL', '15 ans'].forEach(w => expect(t).toContain(w));
    await clickEl(h, q(h, 'privacy-close'));
    await clickEl(h, q(h, 'privacy-consent-accept'));
    expect(saved(h).privacyConsent.version).toBeTruthy();
    expect(q(h, 'privacy-consent')).toBeNull();
    expect(h.errors).toEqual([]);
  }, 120000);

  it('signaler un problème : message envoyé avec la version et le type d’appareil', async () => {
    const srv = fakeSupabase();
    const { h } = await logged(srv, { privacyConsent: { version: 'x', at: '2026-11-13' } });
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-feedback'));
    for (let i = 0; i < 10 && !q(h, 'feedback-modal'); i++) await advance(h, 100);
    await clickEl(h, q(h, 'feedback-kind-idee'));
    expect(q(h, 'feedback-send').disabled).toBe(true);
    await setInput(h, q(h, 'feedback-text'), 'Un mode sombre plus doux serait top');
    await clickEl(h, q(h, 'feedback-send'));
    await advance(h, 300);
    expect(q(h, 'feedback-msg').textContent).toContain('Merci');
    expect(srv.feedback).toHaveLength(1);
    expect(srv.feedback[0]).toMatchObject({ kind: 'idee', message: 'Un mode sombre plus doux serait top' });
    expect(srv.feedback[0].device).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);

  it('supprimer mon compte : mot SUPPRIMER obligatoire, tout est effacé en ligne et sur le téléphone', async () => {
    const srv = fakeSupabase();
    const { h, user } = await logged(srv, { privacyConsent: { version: 'x', at: '2026-11-13' } });
    srv.saves.set(user.id, { data: { quests: [] }, version: 1 }); // sa sauvegarde en ligne
    srv.feedback = [{ kind: 'bug', message: 'vieux', user_id: user.id }];
    await clickText(h, 'Mon compte');
    for (let i = 0; i < 10 && !q(h, 'account-delete-open'); i++) await advance(h, 100);
    await clickEl(h, q(h, 'account-delete-open'));
    expect(q(h, 'account-delete-confirm').disabled).toBe(true);
    await setInput(h, q(h, 'account-delete-word'), 'supprimer');
    expect(q(h, 'account-delete-confirm').disabled).toBe(false);
    await clickEl(h, q(h, 'account-delete-confirm'));
    await advance(h, 300);
    expect(srv.deleted).toEqual([user.id]);
    expect(srv.saves.has(user.id)).toBe(false);
    expect(srv.users.has('lea@x.fr')).toBe(false);
    expect(srv.feedback).toEqual([]);
    expect(h.w.localStorage.getItem('rondoufit:account')).toBeNull();
    expect(Object.keys(h.w.localStorage).filter(k => /^rondou/.test(k) && k !== 'rondoufit:supabase')).toEqual([]);
  }, 120000);

  it('rapports d’erreur : jamais d’e-mail, de jeton ni de paramètre d’adresse ; appareil résumé', () => {
    const s = scrub('Erreur pour lea@x.fr token eyJabc.def.ghi https://x.fr/?code=12345 id 1234567', 500);
    expect(s).not.toMatch(/lea@x\.fr|eyJabc|12345|1234567/);
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/120 Mobile Safari')).toBe('Android · Chrome');
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit Version/17 Mobile Safari/604')).toMatch(/^iPhone\/iPad · Safari/);
  });
});
