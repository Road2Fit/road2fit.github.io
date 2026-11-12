// 4.39 : avatar des animations. Le personnage par défaut ne change pas ; chaque option se dessine dans toutes les vues.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Figure } from './Figure';
import { movementFor, animatedList } from './resolve';
import { poseAt } from './skeleton';
import { AVATAR_DEFAULT, BODIES, BOTTOMS, HAIRS, SKINS, TOPS, cleanAvatar, lookFor, setAvatar } from './avatar';

const OLD = { skin: '#e8b48f', skinFar: '#c98f6b', shirt: '#2f6fb5', shirtFar: '#24578f', shorts: '#4a5160', shortsFar: '#363b46', shoe: '#d9483b', shoeFar: '#a8362c', hair: '#4a3426', eye: '#1f2328', line: '#1d4a7a' };
const draw = (scene, avatar, u = 0.5) => renderToStaticMarkup(createElement(Figure, { scene, pose: poseAt(scene.keys, u), avatar, muscleText: 'Pectoraux, triceps' }));

// une scène de chaque vue : profil, face, dos, dessus
function scenes() {
  const out = {};
  for (const { id } of animatedList()) {
    const mv = movementFor(id);
    [mv.scene, ...(mv.alts || []).map(a => a.scene)].forEach(sc => {
      const k = sc.view === 'top' ? 'top' : sc.view === 'front' ? (sc.back ? 'back' : 'front') : 'side';
      if (!out[k]) out[k] = sc;
    });
    if (Object.keys(out).length === 4) break;
  }
  return out;
}

describe('avatar des animations', () => {
  it('sans avatar : exactement le personnage d’avant', () => {
    const L = lookFor(null);
    Object.entries(OLD).forEach(([k, v]) => expect(L[k], k).toBe(v));
    expect(lookFor(AVATAR_DEFAULT)).toEqual(L);
    const sc = movementFor('squat').scene;
    setAvatar(null);
    expect(draw(sc, null)).toBe(draw(sc, AVATAR_DEFAULT));
  });

  it('valeurs inconnues ou absentes → défaut', () => {
    expect(cleanAvatar({ skin: 'zzz', hair: 'scarf' })).toEqual({ ...AVATAR_DEFAULT, hair: 'scarf' });
    expect(cleanAvatar(null)).toEqual(AVATAR_DEFAULT);
  });

  it('chaque option se dessine dans les 4 vues (profil, face, dos, dessus)', () => {
    const sc = scenes();
    expect(Object.keys(sc).sort()).toEqual(['back', 'front', 'side', 'top']);
    const opts = [
      ...SKINS.map(x => ({ skin: x.id })), ...BODIES.map(x => ({ body: x.id })), ...HAIRS.map(x => ({ hair: x.id })),
      ...TOPS.map(x => ({ top: x.id })), ...BOTTOMS.map(x => ({ bottom: x.id })),
    ];
    for (const o of opts) {
      const a = { ...AVATAR_DEFAULT, ...o };
      for (const [k, s] of Object.entries(sc)) {
        const svg = draw(s, a);
        expect(svg, `${JSON.stringify(o)} ${k}`).toMatch(/<svg/);
        expect(svg).not.toMatch(/NaN/);
      }
    }
  });

  it('les couleurs choisies apparaissent dans le dessin', () => {
    const sc = movementFor('squat').scene;
    const svg = draw(sc, { ...AVATAR_DEFAULT, skin: 's6', topColor: 'lime', bottomColor: 'pink', shoeColor: 'white', hairColor: 'plum' });
    ['#6b4129', '#84cc16', '#db5c9a', '#e5e7eb', '#7e2a5e'].forEach(c => expect(svg).toContain(c));
    expect(svg).not.toContain('#2f6fb5');
  });

  it('legging et manches longues couvrent bras et jambes ; brassière laisse le ventre en peau', () => {
    const sc = movementFor('squat').scene;
    const count = (svg, c) => svg.split(c).length - 1;
    const tee = draw(sc, AVATAR_DEFAULT);
    const long = draw(sc, { ...AVATAR_DEFAULT, top: 'long', bottom: 'leggings' });
    expect(count(long, '#2f6fb5')).toBeGreaterThan(count(tee, '#2f6fb5'));
    expect(count(long, '#4a5160')).toBeGreaterThan(count(tee, '#4a5160'));
    const bra = draw(sc, { ...AVATAR_DEFAULT, top: 'bra' });
    expect(count(bra, '#e8b48f')).toBeGreaterThan(count(tee, '#e8b48f'));
  });
});
