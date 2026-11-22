// Notification de suivi de séance (4.51.2, demande de Gabin) : quand on quitte l'appli pendant une séance guidée, une
// notification rappelle où on en est (exercice, série, charge) et, pendant le repos, le temps qui reste ; elle est tenue
// à jour par le service worker (public/sw.js, messages 'session' / 'session-end') et retirée à la fin de la séance.
// Il faut l'autorisation des notifications (demandée au premier repos). Appli à l'écran : pas de notification.
import { assistText } from './assist';
import { assistsOf, loadsOf } from './setLoads';

const sw = () => (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) || null;
const fmtKg = x => String(Math.round((Number(x) || 0) * 100) / 100).replace('.', ',');

/** Texte de la série en cours (ou de la prochaine) de la séance guidée `g` : { name, set, detail } ou null. */
export function sessionStatusOf(g) {
  if (!g || !Array.isArray(g.items) || !g.items.length) return null;
  const doneAll = it => ((g.data[it.questId] || {}).done || []).every(Boolean);
  let it = g.items[g.idx] || g.items[0];
  if (doneAll(it)) it = g.items.find(x => !doneAll(x)) || it;
  const d = g.data[it.questId];
  if (!d) return null;
  const n = (d.done || []).length;
  const j = Math.max(0, (d.done || []).findIndex(v => !v));
  const reps = (d.reps || [])[j];
  const unit = it.timed ? 's' : 'reps';
  const load = it.kind === 'load' ? ` à ${fmtKg(loadsOf(d)[j])} kg` : it.kind === 'assisted' ? ` · ${assistText(assistsOf(d)[j])}` : '';
  const exDone = g.items.filter(doneAll).length;
  return { name: it.name, set: `Série ${j + 1}/${n}`, detail: `${reps} ${unit}${load}`, progress: `Exercice ${Math.min(g.items.length, exDone + 1)}/${g.items.length}` };
}

/** Envoie l'état de la séance au service worker (qui affiche et met à jour la notification). */
export function pushSessionStatus(g) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !sw()) return false;
    const st = sessionStatusOf(g);
    if (!st) return false;
    const rest = g.rest && g.rest.endAt > Date.now() ? { endAt: g.rest.endAt, next: String(g.rest.next || '').slice(0, 120) } : null;
    sw().postMessage({ type: 'session', startedAt: g.startedAt || Date.now(), ...st, rest });
    return true;
  } catch (e) { return false; }
}

/** Fin (ou abandon) de la séance : la notification de suivi disparaît. */
export function endSessionStatus() {
  try { if (sw()) sw().postMessage({ type: 'session-end' }); } catch (e) { /* rien */ }
}
