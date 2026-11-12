// Avatar des animations (4.39, demande de Gabin) : chacun habille le personnage des animations d'exercices à son goût.
// gameState.avatar = { skin, body, hair, hairColor, top, topColor, bottom, bottomColor, shoeColor } (null = personnage
// par défaut, identique à avant). Réglé dans le profil → « Mon avatar » (components/AvatarEditor.jsx).
// État GLOBAL du module (comme le mode des muscles) : fixé par useGameState à chaque affichage, lu par Figure.jsx.
// Étape 3 (accessoires gagnés aux niveaux) : plus tard.

import { cleanItems, itemById } from './shop';

const lighten = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * k));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
};
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k))));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

// peau : couleur proche + côté éloigné (plus sombre), du plus clair au plus foncé ; 's3' = le personnage d'avant
export const SKINS = [
  { id: 's1', c: '#f6d3b8', far: '#d9ad8e' },
  { id: 's2', c: '#f0c29e', far: '#cf9c78' },
  { id: 's3', c: '#e8b48f', far: '#c98f6b' },
  { id: 's4', c: '#c98d62', far: '#a36d47' },
  { id: 's5', c: '#9a6440', far: '#7a4c2f' },
  { id: 's6', c: '#6b4129', far: '#52301e' },
];
export const BODIES = [
  { id: 'm', label: 'Silhouette 1' },
  { id: 'f', label: 'Silhouette 2' },
];
export const HAIRS = [
  { id: 'short', label: 'Courts' },
  { id: 'buzz', label: 'Rasés' },
  { id: 'curly', label: 'Bouclés' },
  { id: 'ponytail', label: 'Queue de cheval' },
  { id: 'bun', label: 'Chignon' },
  { id: 'scarf', label: 'Foulard' },
  { id: 'none', label: 'Crâne rasé' },
];
export const HAIR_COLORS = [
  { id: 'brown', c: '#4a3426' }, { id: 'black', c: '#1c1917' }, { id: 'chestnut', c: '#7c4a2a' }, { id: 'blond', c: '#d6a756' },
  { id: 'red', c: '#b4532a' }, { id: 'grey', c: '#9ca3af' }, { id: 'navy', c: '#1e3a8a' }, { id: 'plum', c: '#7e2a5e' },
];
export const TOPS = [
  { id: 'tee', label: 'T-shirt' },
  { id: 'tank', label: 'Débardeur' },
  { id: 'long', label: 'Manches longues' },
  { id: 'bra', label: 'Brassière' },
];
export const BOTTOMS = [
  { id: 'shorts', label: 'Short' },
  { id: 'bike', label: 'Cycliste' },
  { id: 'leggings', label: 'Legging' },
  { id: 'joggers', label: 'Jogging' },
];
export const CLOTH_COLORS = [
  { id: 'blue', c: '#2f6fb5' }, { id: 'graphite', c: '#4a5160' }, { id: 'black', c: '#22252b' }, { id: 'white', c: '#e5e7eb' },
  { id: 'red', c: '#d9483b' }, { id: 'green', c: '#2f8f5b' }, { id: 'lime', c: '#84cc16' }, { id: 'yellow', c: '#eab308' },
  { id: 'orange', c: '#ea7a1e' }, { id: 'pink', c: '#db5c9a' }, { id: 'violet', c: '#7c4dcc' }, { id: 'sky', c: '#38a3d6' },
];

export const AVATAR_DEFAULT = { skin: 's3', body: 'm', hair: 'short', hairColor: 'brown', top: 'tee', topColor: 'blue', bottom: 'shorts', bottomColor: 'graphite', shoeColor: 'red' };

const pick = (list, id, fb) => list.find(x => x.id === id) || list.find(x => x.id === fb);

/** Avatar complet et valide (valeurs inconnues → défaut). */
export function cleanAvatar(a) {
  const src = a && typeof a === 'object' ? a : {};
  const ok = (list, k) => (list.some(x => x.id === src[k]) ? src[k] : AVATAR_DEFAULT[k]);
  return {
    skin: ok(SKINS, 'skin'), body: ok(BODIES, 'body'), hair: ok(HAIRS, 'hair'), hairColor: ok(HAIR_COLORS, 'hairColor'),
    top: ok(TOPS, 'top'), topColor: ok(CLOTH_COLORS, 'topColor'), bottom: ok(BOTTOMS, 'bottom'), bottomColor: ok(CLOTH_COLORS, 'bottomColor'),
    shoeColor: ok(CLOTH_COLORS, 'shoeColor'),
    items: cleanItems(src.items),
  };
}

/** Couleurs et formes lues par Figure.jsx. L'avatar par défaut redonne exactement le personnage d'avant. */
export function lookFor(a) {
  const v = cleanAvatar(a);
  const skin = pick(SKINS, v.skin, 's3');
  const top = pick(CLOTH_COLORS, v.topColor, 'blue').c;
  const bottom = pick(CLOTH_COLORS, v.bottomColor, 'graphite').c;
  const shoe = pick(CLOTH_COLORS, v.shoeColor, 'red').c;
  const isDefault = v.topColor === 'blue' && v.bottomColor === 'graphite' && v.shoeColor === 'red';
  const L = {
    skin: skin.c, skinFar: skin.far,
    shirt: top, shirtFar: isDefault ? '#24578f' : shade(top, 0.78),
    shorts: bottom, shortsFar: isDefault ? '#363b46' : shade(bottom, 0.78),
    shoe: shoe, shoeFar: isDefault ? '#a8362c' : shade(shoe, 0.78),
    hair: pick(HAIR_COLORS, v.hairColor, 'brown').c,
    eye: '#1f2328', line: v.topColor === 'blue' ? '#1d4a7a' : shade(top, 0.55),
    hairStyle: v.hair, top: v.top, bottom: v.bottom, body: v.body,
  };
  // objets de la boutique (4.40)
  const items = {};
  Object.entries(v.items || {}).forEach(([slot, id]) => { items[slot] = itemById(id); });
  if (!Object.keys(items).length) return L;
  L.items = items;
  L.defs = [];
  const pat = (kind, base) => {
    const id = `r2f-${kind}-${base.slice(1)}`;
    if (!L.defs.some(d => d.id === id)) L.defs.push({ id, kind, base, dark: shade(base, 0.72), light: kind === 'camo' ? lighten(base, 0.3) : lighten(base, 0.55) });
    return `url(#${id})`;
  };
  const tp = items.topPattern;
  if (tp && tp.kind !== 'number') { L.shirt = pat(tp.kind, top); L.shirtFar = pat(tp.kind, shade(top, 0.78)); }
  if (tp && tp.kind === 'number') L.numberInk = v.topColor === 'white' || v.topColor === 'yellow' || v.topColor === 'lime' ? '#1f2328' : '#f8fafc';
  const bp = items.bottomPattern;
  if (bp && bp.kind === 'camo') { L.shorts = pat('camo', bottom); L.shortsFar = pat('camo', shade(bottom, 0.78)); }
  const sh = items.shoes;
  if (sh) { L.shoe = sh.c; L.shoeFar = shade(sh.c, 0.78); }
  return L;
}

let current = null;
/** Avatar de la personne (appelé à chaque affichage par useGameState). */
export function setAvatar(a) { current = a || null; }
export const currentLook = () => lookFor(current);
