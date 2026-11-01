// Runtime JSX de l'appli : tout emoji affiché (texte du code, données du catalogue, anciennes sauvegardes) devient le logo maison.
// Là où un dessin ne peut pas s'afficher (<option>, infobulles, <text> de graphique), l'emoji est simplement retiré.
import { Fragment, jsx as rawJsx, jsxs as rawJsxs } from 'react/jsx-runtime';
import { EMOJI_ART } from './emoji-map';

export { Fragment };

const keys = Object.keys(EMOJI_ART).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const RE = new RegExp(`(${keys.join('|')})[\\uFE0E\\uFE0F]?`, 'gu');
const NO_SVG = new Set(['option', 'optgroup', 'title', 'text', 'tspan', 'textarea', 'style', 'script']);
const TEXT_PROPS = ['title', 'placeholder', 'aria-label'];

// Sur globalThis : en développement Vite charge ce fichier en deux exemplaires
const slot = () => globalThis.__artEmoji;
/** Enregistré par components/Art.jsx (évite un import circulaire). */
export const setEmojiRenderer = r => { globalThis.__artEmoji = r; };

export const stripEmoji = s => s.replace(RE, '').replace(/^\s+/, '');

function split(str, out) {
  RE.lastIndex = 0;
  let last = 0;
  let m;
  while ((m = RE.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index));
    out.push(slot()(EMOJI_ART[m[1]]));
    last = m.index + m[0].length;
  }
  if (last < str.length) out.push(str.slice(last));
}

const hasEmoji = s => typeof s === 'string' && (RE.lastIndex = 0, RE.test(s));

function fix(type, props) {
  if (typeof type !== 'string' || !props) return [props, false];
  let p = props;
  for (const k of TEXT_PROPS) if (hasEmoji(p[k])) { if (p === props) p = { ...props }; p[k] = stripEmoji(p[k]); }
  const ch = p.children;
  if (ch === undefined || ch === null) return [p, false];
  if (NO_SVG.has(type)) {
    if (hasEmoji(ch)) return [{ ...p, children: stripEmoji(ch) }, false];
    if (Array.isArray(ch) && ch.some(hasEmoji)) return [{ ...p, children: ch.map(c => (hasEmoji(c) ? stripEmoji(c) : c)) }, Array.isArray(ch)];
    return [p, false];
  }
  if (!slot()) return [p, false];
  if (hasEmoji(ch)) { const out = []; split(ch, out); return [{ ...p, children: out }, true]; }
  if (Array.isArray(ch) && ch.some(hasEmoji)) {
    const out = [];
    ch.forEach(c => { if (hasEmoji(c)) split(c, out); else out.push(c); });
    return [{ ...p, children: out }, true];
  }
  return [p, false];
}

export function jsx(type, props, key) {
  const [p, isStatic] = fix(type, props);
  return isStatic ? rawJsxs(type, p, key) : rawJsx(type, p, key);
}
export function jsxs(type, props, key) {
  const [p] = fix(type, props);
  return rawJsxs(type, p, key);
}
