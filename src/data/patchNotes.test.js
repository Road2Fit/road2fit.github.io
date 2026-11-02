import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION, PATCH_NOTES } from './patchNotes';

describe('notes de version', () => {
  it('la plus récente en premier, versions uniques, dates valides, au moins un point chacune', () => {
    expect(CURRENT_VERSION).toBe(PATCH_NOTES[0].version);
    expect(new Set(PATCH_NOTES.map(n => n.version)).size).toBe(PATCH_NOTES.length);
    for (let i = 0; i < PATCH_NOTES.length; i++) {
      const n = PATCH_NOTES[i];
      expect(n.date, n.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(n.title.length).toBeGreaterThan(3);
      expect(n.items.length).toBeGreaterThan(0);
      if (i > 0) expect(n.date <= PATCH_NOTES[i - 1].date, n.version).toBe(true);
    }
  });
});
