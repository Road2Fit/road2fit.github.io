import { describe, expect, it } from 'vitest';
import { lensesFor, nextZoom, zoomLevels, zoomText } from './camZoom';

describe('zoom et objectifs de la caméra (4.30)', () => {
  it('niveaux de zoom d’après les capacités, minimum (grand angle) compris', () => {
    expect(zoomLevels({ min: 0.5, max: 4 })).toEqual([0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 2, 2.5, 3, 4]);
    expect(zoomLevels({ min: 1, max: 1 })).toEqual([]);
    expect(zoomLevels(null)).toEqual([]);
  });
  it('zoomer / dézoomer d’un cran, sans sortir des bornes', () => {
    const L = zoomLevels({ min: 0.6, max: 2 });
    expect(nextZoom(L, 1, -1)).toBe(0.9);
    expect(nextZoom(L, 1, 1)).toBe(1.25);
    expect(nextZoom(L, 0.6, -1)).toBe(0.6);
    expect(nextZoom(L, 2, 1)).toBe(2);
    expect(zoomText(0.6)).toBe('0,6×');
  });
  it('objectifs du bon côté (avant / arrière) d’après leur nom', () => {
    const ds = [
      { kind: 'videoinput', deviceId: 'a', label: 'camera2 0, facing back' },
      { kind: 'videoinput', deviceId: 'b', label: 'camera2 1, facing front' },
      { kind: 'videoinput', deviceId: 'c', label: 'camera2 2, facing back' },
      { kind: 'audioinput', deviceId: 'm', label: 'micro' },
    ];
    expect(lensesFor(ds, 'environment').map(l => l.id)).toEqual(['a', 'c']);
    expect(lensesFor(ds, 'user').map(l => l.id)).toEqual(['b']);
    // noms inconnus : toutes les caméras
    expect(lensesFor([{ kind: 'videoinput', deviceId: 'x', label: '' }, { kind: 'videoinput', deviceId: 'y', label: '' }], 'user')).toHaveLength(2);
  });
});
