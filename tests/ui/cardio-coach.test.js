// Coach cardio : activer le cardio, lancer la séance proposée, passer les étapes, l'enregistrer ; le cœur sur la page Équilibre.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('coach cardio', () => {
  it('activer, lancer, enregistrer, voir le cœur', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    // invitation sur la page Séance (ou réglage dans Réglages)
    if (q(h, 'cardio-invite-yes')) await clickEl(h, q(h, 'cardio-invite-yes'));
    else {
      await clickEl(h, q(h, 'coach-page-reglages'));
      await clickEl(h, q(h, 'cardio-on'));
      await clickEl(h, q(h, 'coach-page-seance'));
    }
    await advance(h, 200);
    expect(saved(h).coach.cardio.on).toBe(true);
    const startBtn = q(h, 'cardio-start') || q(h, 'cardio-next-start');
    expect(startBtn).toBeTruthy();
    await clickEl(h, startBtn);
    await advance(h, 300);
    expect(q(h, 'cardio-session')).toBeTruthy();
    expect(q(h, 'cardio-step').textContent).toContain('Échauffement');
    for (let i = 0; i < 40 && !q(h, 'cardio-end'); i++) { await clickEl(h, q(h, 'cardio-skip')); await advance(h, 600); }
    expect(q(h, 'cardio-end')).toBeTruthy();
    await clickEl(h, q(h, 'cardio-rpe-5'));
    await clickEl(h, q(h, 'cardio-save'));
    await advance(h, 300);
    const entries = saved(h).quests.flatMap(x => x.history || []).filter(e => e.cardioPlan);
    expect(entries).toHaveLength(1);
    expect(entries[0].calories).toBeGreaterThan(0);
    expect(q(h, 'cardio-saved')).toBeTruthy();
    expect(h.w.localStorage.getItem('rondoufit:cardioRun')).toBe(null);
    // le cœur, comme un muscle, sur la page Équilibre
    await clickEl(h, q(h, 'coach-page-equilibre'));
    await advance(h, 200);
    expect(q(h, 'coach-heart')).toBeTruthy();
    expect(q(h, 'map-heart')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);

  it('« Non merci » : l’invitation ne revient pas', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    if (!q(h, 'cardio-invite-no')) return;
    await clickEl(h, q(h, 'cardio-invite-no'));
    await advance(h, 200);
    expect(q(h, 'cardio-invite')).toBe(null);
    expect(saved(h).coach.cardio.on).toBe(false);
    expect(h.errors).toEqual([]);
  }, 120000);
});
