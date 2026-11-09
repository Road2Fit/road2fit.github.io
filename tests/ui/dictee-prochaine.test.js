// Dictée : onglet « Prochaine séance » → la séance dictée (ou collée) remplace la proposition du coach, avec ses charges,
// séries et répétitions ; « Revenir à la proposition du coach » reste possible. Pastille sur le micro jusqu'à l'ouverture
// de cet onglet (tout le monde, anciens comptes compris).
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch, setInput } from './harness';
import { nextSpokenDate } from '../../src/voice/spokenDate';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

describe('date d’une séance à venir', () => {
  it('demain, après-demain, jeudi (le prochain), le 12 novembre (à venir)', () => {
    const today = '2026-10-21'; // mercredi
    expect(nextSpokenDate('demain je fais squat', today).date).toBe('2026-10-22');
    expect(nextSpokenDate('après-demain', today).date).toBe('2026-10-23');
    expect(nextSpokenDate('jeudi développé couché', today).date).toBe('2026-10-22');
    expect(nextSpokenDate('mercredi prochain', today).date).toBe('2026-10-28');
    expect(nextSpokenDate('le 12 novembre', today).date).toBe('2026-11-12');
    expect(nextSpokenDate('le 3 janvier', today).date).toBe('2027-01-03');
    expect(nextSpokenDate('développé couché 4x8', today)).toBeNull();
  });
});

describe('dicter sa prochaine séance : sans élastique et cardio', () => {
  it('« sans élastique » = aucune aide ; le cardio dicté devient la séance de cardio de ce jour, telle quelle', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    await clickEl(h, q(h, 'fab-voice'));
    await clickEl(h, q(h, 'voice-mode-next'));
    await setInput(h, h.doc.querySelector('textarea'), 'samedi tractions 3x5 sans élastique, développé couché 3x8 à 50 kg et 40 minutes de course');
    await advance(h, 300);
    expect(q(h, 'voice-next-cardio').textContent).toContain('samedi');
    await clickEl(h, q(h, 'voice-next-save'));
    await advance(h, 300);
    const s = saved(h);
    const pull = s.quests.find(x => /Traction/.test(x.name));
    expect(s.coach.plan.targets[pull.id]).toMatchObject({ sets: 3, assist: 0 });
    expect(s.coach.cardioCustom).toHaveLength(1);
    expect(s.coach.cardioCustom[0]).toMatchObject({ iso: '2026-10-24', minutes: 40 });
    // le Coach montre ce cardio-là, et on peut revenir à sa proposition
    await clickEl(h, q(h, 'cardio-next-open'));
    expect(q(h, 'cardio-summary').textContent).toContain('40 min');
    await clickEl(h, q(h, 'cardio-custom-remove'));
    expect(saved(h).coach.cardioCustom).toHaveLength(0);
    expect(h.errors).toEqual([]);
  }, 120000);
});

describe('dicter sa prochaine séance', () => {
  it('pastille sur le micro jusqu’à l’onglet « Prochaine séance », puis la séance remplace celle du coach', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    // ancien compte (sans le champ) : la pastille est là
    expect(saved(h).voiceNextSeen).toBeFalsy();
    expect(q(h, 'fab-voice-badge')).toBeTruthy();
    await clickEl(h, q(h, 'fab-voice'));
    await advance(h, 300);
    expect(q(h, 'voice-mode-done').getAttribute('aria-selected')).toBe('true');
    expect(q(h, 'fab-voice-badge')).toBeTruthy(); // ouvrir la dictée ne suffit pas
    await clickEl(h, q(h, 'voice-mode-next'));
    expect(saved(h).voiceNextSeen).toBe(true);
    expect(q(h, 'fab-voice-badge')).toBeNull();

    await setInput(h, h.doc.querySelector('textarea'), 'demain développé couché 4x6 à 55 kg et squat 5x5 à 70 kg');
    await advance(h, 300);
    expect(q(h, 'voice-next-preview')).toBeTruthy();
    expect(q(h, 'voice-next-date-input').value).toBe('2026-10-22');
    await clickEl(h, q(h, 'voice-next-save'));
    await advance(h, 300);
    const s = saved(h);
    expect(s.coach.plan.date).toBe('2026-10-22');
    expect(s.coach.plan.questIds).toHaveLength(2);
    const bench = s.quests.find(x => /Couch/.test(x.name));
    expect(s.coach.plan.targets[bench.id]).toMatchObject({ sets: 4, reps: [6, 6, 6, 6], load: 55 });
    // aucune séance ajoutée à l'historique : c'est une séance à venir
    expect((bench.history || []).some(e => e.date === '2026-10-21' && String(e.note || '').startsWith('Dictée'))).toBe(false);

    // la séance proposée est la sienne, telle quelle
    const sheet = q(h, 'sheet-next');
    const rows = [...sheet.querySelectorAll('[data-testid="next-ex"]')];
    expect(rows).toHaveLength(2);
    const benchRow = rows.find(r => /Couch/.test(r.textContent));
    expect(benchRow.querySelector('[data-testid="ex-line2"]').textContent).toContain('4 × 6 à 55 kg');
    expect(benchRow.querySelector('[data-testid="change-badge"]').title).toBe('Ta séance');
    // on peut toujours revenir à la proposition du coach, puis à sa séance
    await clickEl(h, q(h, 'plan-reset'));
    expect(saved(h).coach.plan).toBeNull();
    await clickEl(h, q(h, 'plan-restore'));
    expect(saved(h).coach.plan.targets[bench.id].load).toBe(55);
    expect(h.errors).toEqual([]);
  }, 120000);
});
