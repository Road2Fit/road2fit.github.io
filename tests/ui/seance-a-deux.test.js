// 4.51 : séance à deux : Léa invite Max (amis mutuels), Max accepte ; les deux coachs construisent la même séance.
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_STATE } from './demo';
import { SUPABASE_URL, advance, clickEl, clickText, fakeSupabase, launch, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const byTest = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

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
  if (byTest(h, 'friends-enable')) await clickEl(h, byTest(h, 'friends-enable'));
  await advance(h, 2600); // profil publié (prénom)
  return h;
}
async function addFriend(h, code) {
  await setInput(h, byTest(h, 'friend-input'), code);
  await clickEl(h, byTest(h, 'friend-add'));
  await advance(h, 600);
}

describe('séance à deux', () => {
  it('invitation, acceptation, même plan chez les deux', async () => {
    const srv = fakeSupabase();
    const a = await logIn(srv, srv.addUser('a@x.fr'), 'Léa');
    const b = await logIn(srv, srv.addUser('b@x.fr'), 'Max');
    await addFriend(a, byTest(b, 'my-code').textContent);
    await addFriend(b, byTest(a, 'my-code').textContent);
    // Léa ouvre le profil de Max et l'invite demain
    await clickEl(a, [...a.doc.querySelectorAll('[data-testid^="friend-u"]')][0]);
    await clickEl(a, byTest(a, 'duo-open'));
    await clickEl(a, byTest(a, 'duo-theme-full'));
    await clickEl(a, byTest(a, 'duo-send'));
    await advance(a, 600);
    expect(byTest(a, 'duo-invite-msg').textContent).toMatch(/Invitation envoyée/);
    expect(srv.duos).toHaveLength(1);
    expect(JSON.stringify(srv.duos[0].part)).not.toMatch(/history|currentValue/);
    // Max la voit et l'accepte
    await advance(b, 9000);
    expect(byTest(b, 'duo-in').textContent).toMatch(/Léa t’invite/);
    await clickEl(b, byTest(b, 'duo-accept'));
    await advance(b, 2500);
    expect(srv.duos[0].status).toBe('accepted');
    const date = srv.duos[0].date;
    expect(saved(b).coach.duos[date].plan.ex.length).toBeGreaterThan(0);
    // Léa reçoit le plan
    await advance(a, 9000);
    await advance(a, 2000);
    expect(saved(a).coach.duos[date].plan).toEqual(saved(b).coach.duos[date].plan);
    expect(saved(a).coach.gymExtra || []).toContain(date);
    // Max annule : retiré chez les deux
    await clickEl(b, byTest(b, 'duo-cancel'));
    await advance(b, 2500);
    await advance(a, 9000);
    await advance(a, 2000);
    expect(saved(a).coach.duos[date]).toBeUndefined();
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
  }, 180000);
});
