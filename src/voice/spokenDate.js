// Date dite dans la dictée : « hier », « avant-hier », « il y a 3 jours », « lundi (dernier) », « le 5 novembre », « le 5/11 ».
// Renvoie { date: 'AAAA-MM-JJ', phrase } ou null. Jamais dans le futur (une séance se note une fois faite).
import { addDaysISO } from '../lib/dates';
import { stripAccents } from '../lib/text';

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const WORDS = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, premier: 1, '1er': 1 };
const num = w => (/^\d+$/.test(w) ? Number(w) : WORDS[w] || 0);
const pad = n => String(n).padStart(2, '0');
const dow = iso => new Date(`${iso}T00:00:00`).getDay();

export function spokenDate(text, today) {
  const t = stripAccents(String(text || '').toLowerCase()).replace(/[’']/g, ' ').replace(/\s+/g, ' ');
  if (!t.trim()) return null;
  const ok = (date, phrase) => (date && date <= today ? { date, phrase } : null);
  let m;
  if ((m = t.match(/\bavant[- ]?hier\b/))) return ok(addDaysISO(today, -2), m[0]);
  if ((m = t.match(/\bhier\b/))) return ok(addDaysISO(today, -1), m[0]);
  if ((m = t.match(/\bil y a (\d+|\w+) jours?\b/)) && num(m[1])) return ok(addDaysISO(today, -num(m[1])), m[0]);
  if ((m = t.match(/\b(?:le )?(\d{1,2}|\w+) (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?: (\d{4}))?\b/)) && num(m[1])) {
    const d = num(m[1]), mo = MONTHS.indexOf(m[2]) + 1;
    let y = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
    if (!m[3] && `${y}-${pad(mo)}-${pad(d)}` > today) y -= 1; // « le 28 décembre » dit en janvier = l'an dernier
    return d <= 31 ? ok(`${y}-${pad(mo)}-${pad(d)}`, m[0]) : null;
  }
  if ((m = t.match(/\ble (\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/))) {
    const d = Number(m[1]), mo = Number(m[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    let y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : Number(today.slice(0, 4));
    if (!m[3] && `${y}-${pad(mo)}-${pad(d)}` > today) y -= 1;
    return ok(`${y}-${pad(mo)}-${pad(d)}`, m[0]);
  }
  if ((m = t.match(new RegExp(`\\b(${DAYS.join('|')})( dernier)?\\b`)))) {
    const target = DAYS.indexOf(m[1]);
    let back = (dow(today) - target + 7) % 7;
    if (back === 0 && m[2]) back = 7; // « lundi dernier » dit un lundi = il y a une semaine
    return ok(addDaysISO(today, -back), m[0]);
  }
  return null;
}
