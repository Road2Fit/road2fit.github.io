// Dictée : « hier, 2 heures de volley » est noté à la date d'hier.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('dictée dans le passé', () => {
  it('hier : la séance va à la date d’hier', async () => {
    const h = await launch();
    open.push(h);
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-voice'));
    await advance(h, 300);
    await setInput(h, h.doc.querySelector('textarea[placeholder^="Dicte toute"]'), 'hier j’ai fait 2 heures de volley');
    await advance(h, 300);
    const today = new h.w.Date();
    const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const iso = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    expect(h.doc.querySelector('[data-testid="voice-date-input"]').value).toBe(iso);
    await clickEl(h, [...h.doc.querySelectorAll('button')].find(b => b.textContent.includes('Valider toute la séance')));
    await advance(h, 300);
    const e = saved(h).quests.flatMap(q => q.history || []).find(x => String(x.note || '').startsWith('Dictée') && x.durationMin === 120);
    expect(e && e.date).toBe(iso);
    expect(h.errors).toEqual([]);
  }, 120000);
});
