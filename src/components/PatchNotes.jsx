import { useEffect, useState } from 'react';
import { CURRENT_VERSION, PATCH_NOTES } from '../data/patchNotes';
import { Art } from './Art';
import { X } from '../icons';

const SEEN_KEY = 'rondoufit:seenVersion';
const readSeen = () => { try { return localStorage.getItem(SEEN_KEY); } catch (e) { return null; } };
const writeSeen = v => { try { localStorage.setItem(SEEN_KEY, v); } catch (e) { /* sans mémoire : rien de grave */ } };
const dateFr = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function Note({ n, first, fresh = false }) {
  return (
    <section className={`space-y-1.5 ${first ? '' : 'pt-3 border-t border-slate-800'}`}>
      <p className="text-xs text-slate-500">{fresh && <span className="mr-1.5 px-1.5 rounded-full bg-rose-500 text-white font-black">nouveau</span>}Version {n.version} · {dateFr(n.date)}</p>
      <h4 className="font-black text-white">{n.title}</h4>
      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
        {n.items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </section>
  );
}

/**
 * Fenêtre « Nouveautés » : s'ouvre toute seule une fois après une mise à jour (version vue différente de la version actuelle),
 * ou à la demande (événement rondoufit-patchnotes, menu Plus) avec tout l'historique.
 * Première ouverture de l'appli : rien à montrer, on retient juste la version.
 */
/** Une nouvelle version n'a pas encore été lue (pastille sur l'engrenage et sur « Nouveautés »). */
export const hasUnreadNotes = () => { const s = readSeen(); return s !== null && s !== CURRENT_VERSION; };
export function useUnreadNotes() {
  const [unread, setUnread] = useState(hasUnreadNotes);
  useEffect(() => {
    const on = () => setUnread(hasUnreadNotes());
    window.addEventListener('rondoufit-notes-seen', on);
    return () => window.removeEventListener('rondoufit-notes-seen', on);
  }, []);
  return unread;
}

export function PatchNotes() {
  const [mode, setMode] = useState(null); // null | 'all'
  useEffect(() => {
    // première ouverture de l'appli : rien à lire, on retient la version ; après une mise à jour : pastille (plus de fenêtre automatique)
    if (readSeen() === null) writeSeen(CURRENT_VERSION);
    const all = () => setMode('all');
    window.addEventListener('rondoufit-patchnotes', all);
    return () => window.removeEventListener('rondoufit-patchnotes', all);
  }, []);
  if (!mode) return null;
  const close = () => { writeSeen(CURRENT_VERSION); setMode(null); try { window.dispatchEvent(new Event('rondoufit-notes-seen')); } catch (e) { /* rien */ } };
  const seen = readSeen();
  // après une mise à jour : toutes les versions publiées depuis la dernière vue (au moins la plus récente)
  const idx = PATCH_NOTES.findIndex(n => n.version === seen);
  const list = PATCH_NOTES;
  const unreadCount = seen && seen !== CURRENT_VERSION ? (idx > 0 ? idx : 1) : 0;
  return (
    <div className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-sm flex px-4 pt-14 sm:py-4 overflow-y-auto" role="dialog" aria-label="Nouveautés">
      <div className="m-auto bg-slate-900 border border-pink-500/40 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-black text-white"><Art name="sparkle" size={22} />Nouveautés</h3>
          <button type="button" onClick={close} aria-label="Fermer" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3" data-testid="patch-notes">
          {list.map((n, i) => <Note key={n.version} n={n} first={i === 0} fresh={i < unreadCount} />)}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={close} className="flex-1 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black text-sm">Compris</button>
        </div>
      </div>
    </div>
  );
}
