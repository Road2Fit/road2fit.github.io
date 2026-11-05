// Aucun emoji à l'écran : partout, les logos maison les remplacent (src/jsx/jsx-runtime.js).
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, clickText, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const EMOJI = /\p{Extended_Pictographic}/u;

function emojisIn(h) {
  const out = [];
  const w = h.doc.createTreeWalker(h.doc.body, 4);
  let n;
  while ((n = w.nextNode())) if (EMOJI.test(n.nodeValue) && !['SCRIPT', 'STYLE'].includes(n.parentElement.tagName)) out.push(n.nodeValue.trim().slice(0, 40));
  h.doc.querySelectorAll('[title],[placeholder],[aria-label]').forEach(e => {
    for (const a of ['title', 'placeholder', 'aria-label']) { const v = e.getAttribute(a); if (v && EMOJI.test(v)) out.push(`@${a} ${v.slice(0, 40)}`); }
  });
  return out;
}

describe('logos maison', () => {
  it('aucun emoji dans les onglets ni dans les fenêtres', async () => {
    const h = await launch({ storage: { __classic: '1' } });
    open.push(h);
    const vus = new Set();
    for (const id of ['coach', 'quests', 'journal', 'photos', 'bilan', 'trophies', 'friends']) {
      await clickEl(h, h.doc.querySelector(`[data-tab="${id}"]`));
      emojisIn(h).forEach(e => vus.add(`${id} : ${e}`));
    }
    await clickEl(h, h.doc.querySelector('[data-tab="quests"]'));
    await clickText(h, 'Noter la séance');
    emojisIn(h).forEach(e => vus.add(`noter : ${e}`));
    expect([...vus]).toEqual([]);
    expect(h.doc.querySelectorAll('main svg').length).toBeGreaterThan(5);
  }, 120000);
});
