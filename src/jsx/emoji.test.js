// Tout emoji présent dans le code doit avoir un logo maison, et ce logo doit exister.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART_NAMES, LINE_NAMES } from '../components/Art';
import { EMOJI_ART } from './emoji-map';

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const clean = e => e.replace(/\uFE0F/g, '');

describe('logos maison', () => {
  it('aucun emoji sans logo', () => {
    const manquants = new Set();
    for (const f of walk('src').filter(x => /\.jsx?$/.test(x) && !x.endsWith('emoji-map.js') && !x.includes('.test.'))) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*/gu)) {
        if (!EMOJI_ART[clean(m[0])] && !['©', '®', '™'].includes(m[0])) manquants.add(m[0] + ' ' + f);
      }
    }
    expect([...manquants]).toEqual([]);
  });
  it('chaque logo annoncé est dessiné', () => {
    expect(Object.values(EMOJI_ART).filter(n => !ART_NAMES.includes(n))).toEqual([]);
  });
  it('chaque logo a sa version au trait (thème néon)', () => {
    expect(ART_NAMES.filter(n => !LINE_NAMES.includes(n))).toEqual([]);
  });
});
