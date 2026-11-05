// La dictée de séance : un micro rond, de la taille du « + », juste au-dessus, partout.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const voiceOpen = h => /Dictée vocale|Micro Magique/.test(h.doc.body.textContent);

describe('dictée de séance bien visible', () => {
  it('le micro au-dessus du « + » ouvre la dictée, sur chaque onglet ; plus de bandeau', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    for (const tab of ['coach', 'quests', 'journal']) {
      await clickEl(h, h.doc.querySelector(`[data-tab="${tab}"]`));
      const mic = h.doc.querySelector('[data-testid="fab-voice"]');
      expect(mic, tab).toBeTruthy();
      expect(mic.className).toContain('w-14 h-14'); // même taille que le « + »
      expect(h.doc.querySelector('[data-testid^="voice-callout"]')).toBeNull();
    }
    expect(voiceOpen(h)).toBe(false);
    await clickEl(h, h.doc.querySelector('[data-testid="fab-voice"]'));
    await advance(h, 200);
    expect(voiceOpen(h)).toBe(true);
    expect(h.errors).toEqual([]);
  }, 120000);
});
