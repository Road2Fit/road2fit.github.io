import { useState } from 'react';
import { AccountForm } from '../components/AccountForm';
import { X } from '../icons';

const NAME_MAX = 30;
const visibleName = n => (/^Dresseur/i.test(n || '') ? '' : n || ''); // le nom par défaut de l'édition Rondoudou n'est pas un prénom

// Fenêtre « Mon compte » : prénom ou pseudo, créer un compte, se connecter, se déconnecter (sauvegarde automatique).
export function AccountModal({ sync, recovery, heroName = '', onRenameHero, onClose }) {
  const [name, setName] = useState(visibleName(heroName));
  const [saved, setSaved] = useState(false);
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  const unchanged = clean === visibleName(heroName).trim();
  const save = e => {
    e.preventDefault();
    if (!onRenameHero || unchanged) return;
    onRenameHero(clean);
    setName(clean);
    setSaved(true);
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex px-4 pt-14 sm:py-4 overflow-y-auto" role="dialog" aria-label="Mon compte">
      <div className="m-auto bg-slate-900 border border-pink-500/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white">Mon compte et ma sauvegarde</h3>
            <p className="text-xs text-slate-400 mt-0.5">Avec un compte, tes données sont sauvegardées automatiquement et se retrouvent sur tous tes appareils.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
        </div>
        {onRenameHero && (
          <form onSubmit={save} className="space-y-1.5 border-b border-slate-800 pb-4" data-testid="hero-name-form">
            <label htmlFor="hero-name" className="block text-xs font-bold text-slate-400">Mon prénom ou pseudo</label>
            <div className="flex gap-2">
              <input
                id="hero-name"
                data-testid="hero-name-input"
                value={name}
                maxLength={NAME_MAX}
                onChange={e => { setName(e.target.value); setSaved(false); }}
                placeholder="Ex : Gabin, ou un pseudo"
                autoComplete="off"
                className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white placeholder:text-slate-600"
              />
              <button type="submit" disabled={unchanged} data-testid="hero-name-save" className="px-4 py-2.5 rounded-xl text-sm font-black bg-sky-600 text-white disabled:bg-slate-800 disabled:text-slate-600">Enregistrer</button>
            </div>
            <p className="text-xs text-slate-500" data-testid="hero-name-hint">{saved ? '✓ Enregistré : ce nom s’affiche en haut de l’appli et chez tes amis.' : 'Ce nom s’affiche en haut de l’appli et chez les amis qui ont ton code.'}</p>
          </form>
        )}
        <AccountForm sync={sync} recovery={recovery} onDone={onClose} />
      </div>
    </div>
  );
}
