// La dictée de séance se voit partout : Coach, Exercices, Journal, et en premier dans le bouton « + ».
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const voiceOpen = h => /Dictée vocale|Micro Magique/.test(h.doc.body.textContent);

describe('dictée de séance bien visible', () => {
  it('un bouton dans le Coach, les Exercices et le Journal, qui ouvre la dictée', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    for (const [tab, id] of [['coach', 'voice-callout-coach'], ['quests', 'voice-callout-quests'], ['journal', 'voice-callout-journal']]) {
      await clickEl(h, h.doc.querySelector(`[data-tab="${tab}"]`));
      const el = h.doc.querySelector(`[data-testid="${id}"]`);
      expect(el, tab).toBeTruthy();
      expect(el.textContent).toContain('Dicter ma séance');
    }
    expect(voiceOpen(h)).toBe(false);
    await clickEl(h, [...h.doc.querySelectorAll('[data-testid="voice-callout-journal"] button')][0]);
    await advance(h, 200);
    expect(voiceOpen(h)).toBe(true);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('en premier dans le bouton « + »', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, h.doc.querySelector('button[aria-label="Ajouter"]'));
    const items = [...h.doc.querySelectorAll('button')].filter(b => /Dicter ma séance|Nouvel exercice|Activité|Minuteur/.test(b.textContent) && b.closest('.fixed'));
    expect(items[0].textContent).toContain('Dicter ma séance');
  }, 120000);
});
