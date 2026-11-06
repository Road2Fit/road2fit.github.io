// Plus → Importer depuis Hevy ou Strong : aperçu, import, copie de sécurité.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });

const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Push","15 Jan 2026, 18:30","15 Jan 2026, 19:40","","Bench Press (Barbell)","","","1","normal","80","6","","","8"
"Push","15 Jan 2026, 18:30","15 Jan 2026, 19:40","","Bench Press (Barbell)","","","2","normal","80","6","","","8"
"Push","15 Jan 2026, 18:30","15 Jan 2026, 19:40","","Mystery Move","","","0","normal","20","8","","",""`;
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('import depuis Hevy / Strong', () => {
  it('aperçu puis import des séances', async () => {
    const h = await launch({ storage: { __classic: '1' }, empty: true });
    open.push(h);
    await advance(h, 300);
    const skip = [...h.doc.querySelectorAll('button')].find(b => /Passer l’assistant/.test(b.textContent));
    if (skip) { await clickEl(h, skip); await advance(h, 300); }
    await clickEl(h, h.doc.querySelector('[data-tab="more"]') || [...h.doc.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Réglages et données'));
    await clickEl(h, q(h, 'open-csv-import'));
    const input = q(h, 'csv-file');
    const file = new h.w.File([HEVY], 'hevy.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new h.w.Event('change', { bubbles: true }));
    for (let k = 0; k < 20 && !q(h, 'csv-preview'); k++) await advance(h, 50);
    expect(q(h, 'csv-preview').textContent).toContain('Hevy');
    expect(q(h, 'csv-preview').textContent).toContain('Mystery Move');
    await clickEl(h, q(h, 'csv-go'));
    await advance(h, 300);
    const bench = saved(h).quests.find(x => x.catalogId === 'bench_press');
    expect(bench.history.some(e => e.date === '2026-01-15' && e.note === 'Importé de Hevy')).toBe(true);
    expect(h.w.localStorage.getItem('rondoufit:safetyCopy')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);
});
