import { Art } from '../components/Art';
import NEON_COLORS from '../data/neonColors.json';
const NEON_NAMES = { lime: 'vert citron', yellow: 'jaune', orange: 'orange', red: 'rouge', magenta: 'magenta', violet: 'violet', blue: 'bleu', cyan: 'cyan' };
import { useState } from 'react';
import { PLUS_TABS } from '../components/TabBar';
import { readSafetyCopy } from '../lib/safetyCopy';
import { readUiPrefs, saveUiPrefs } from '../lib/uiPrefs';

// « Plus » : pages secondaires, réglages et données (remplace les boutons Exporter / Importer / Réinitialiser de l'en-tête)
const row = 'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-left text-sm font-bold text-slate-100 hover:border-slate-600';

export function MoreSheet({ activeTab, gameState, importInputRef, levelInfo, onClose, onExport, onGoTab, onOpenOnboarding, onOpenLexicon, onOpenRewards, onOpenSync, onOpenTrial, trialRank, onReset, onRestore, setGameState, syncStatus }) {
  const close = fn => () => { onClose(); fn(); };
  const [prefs, setPrefs] = useState(readUiPrefs);
  const safety = readSafetyCopy();
  const toggleBigText = () => { const p = { ...prefs, bigText: !prefs.bigText }; setPrefs(p); saveUiPrefs(p); };
  const setNeon = id => { const p = { ...prefs, neon: id, theme: 'neon' }; setPrefs(p); saveUiPrefs(p); };
  const toggleTheme = () => { const p = { ...prefs, theme: prefs.theme === 'neon' ? 'classic' : 'neon' }; setPrefs(p); saveUiPrefs(p); };
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl p-4 pb-8 sm:pb-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white">Plus</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-black" aria-label="Fermer">✕</button>
        </div>
          {prefs.theme === 'neon' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 space-y-2" data-testid="neon-colors">
              <p className="text-sm font-bold text-slate-200">Couleur du néon</p>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(NEON_COLORS).map(([id, hex]) => (
                  <button key={id} type="button" onClick={() => setNeon(id)} aria-label={`Néon ${NEON_NAMES[id] || id}`} aria-pressed={(prefs.neon || 'lime') === id} data-testid={`neon-${id}`}
                    className="tap-free w-9 h-9 rounded-full border-2" style={{ backgroundColor: hex, borderColor: (prefs.neon || 'lime') === id ? '#ffffff' : 'transparent', boxShadow: `0 0 12px ${hex}88` }} />
                ))}
              </div>
            </div>
          )}

        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-pink-300">Pages</p>
          {PLUS_TABS.map(t => (
            <button key={t.id} onClick={close(() => onGoTab(t.id))} className={`${row} ${activeTab === t.id ? 'border-pink-500/60' : ''}`}>
              <Art name={t.art} size={22} bare />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-pink-300">Progression</p>
          <button onClick={close(() => window.dispatchEvent(new Event('rondoufit-patchnotes')))} className={row} data-testid="open-patchnotes">
            <Art name="sparkle" size={22} bare />
            <span>Nouveautés</span>
          </button>
          <button onClick={close(onOpenRewards)} className={row}>
            <Art name="gift" size={22} bare />
            <span>Récompenses</span>
          </button>
          {trialRank && (
            <button onClick={close(onOpenTrial)} className={row}>
              <Art name={levelInfo && levelInfo.locked ? 'lock' : 'swords'} size={22} bare />
              <span>Épreuve de rang</span>
            </button>
          )}
        </div>

        <details className="space-y-2" data-testid="more-settings">
          <summary className="text-sm font-black text-slate-200 py-2">Réglages et données</summary>
          <div className="space-y-2 pt-1">
          <button onClick={() => setGameState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))} className={row}>
            <Art name={gameState.soundEnabled ? 'sound' : 'mute'} size={22} bare />
            <span>Sons : {gameState.soundEnabled ? 'activés' : 'coupés'}</span>
          </button>
          <button onClick={() => setGameState(prev => ({ ...prev, muscleMode: prev.muscleMode === 'optimized' ? 'simple' : 'optimized' }))} className={row} data-testid="toggle-muscle-mode" aria-pressed={gameState.muscleMode === 'optimized'}>
            <Art name="dna" size={22} bare />
            <span>
              Suivi des muscles : {gameState.muscleMode === 'optimized' ? 'optimisé (14 muscles)' : 'simplifié (5 grands groupes)'}
              <span className="block text-xs font-semibold text-slate-400">{gameState.muscleMode === 'optimized' ? 'Biceps, triceps, avant-bras, quadriceps, ischios, fessiers… Touche pour revenir au mode simplifié.' : 'Touche pour passer en mode optimisé : le coach suit chaque muscle séparément.'}</span>
            </span>
          </button>
          <button onClick={toggleTheme} className={row} data-testid="toggle-theme">
            <Art name="bolt" size={22} bare />
            <span>Style : {prefs.theme === 'neon' ? 'néon de salle' : 'classique'}</span>
          </button>
          <button onClick={toggleBigText} className={row}>
            <Art name="text" size={22} bare />
            <span>Texte : {prefs.bigText ? 'grand' : 'normal'}</span>
          </button>
          <button onClick={close(onOpenLexicon)} className={row} data-testid="open-lexicon">
            <Art name="book" size={22} bare />
            <span>Lexique de la salle (DC, RDL, top set, pump…)</span>
          </button>
          <button onClick={close(onOpenOnboarding)} className={row} data-testid="open-onboarding">
            <Art name="compass" size={22} bare />
            <span>Assistant d’accueil (régler le coach)</span>
          </button>
          <button onClick={close(onOpenSync)} className={row} data-testid="open-account">
            <Art name="cloud" size={22} bare />
            <span>Mon compte et ma sauvegarde{syncStatus === 'off' ? ' (non connecté)' : ''}</span>
          </button>
          <button onClick={close(onExport)} className={row} title="Exporter une sauvegarde (JSON)">
            <Art name="save" size={22} bare />
            <span>Exporter mes données</span>
          </button>
          <button onClick={close(() => importInputRef.current && importInputRef.current.click())} className={row} title="Importer une sauvegarde (JSON)">
            <Art name="download" size={22} bare />
            <span>Importer une sauvegarde</span>
          </button>
          </div>
        <div className="pt-1 mt-2 border-t border-slate-800 space-y-2">
          {safety && (
            <button onClick={close(onRestore)} className={row}>
              <Art name="repeat" size={22} bare />
              <span>Retrouver mes données {safety.reason} <span className="block text-xs font-semibold text-slate-400">copie du {new Date(safety.savedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span></span>
            </button>
          )}
          <button onClick={close(onReset)} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-rose-950/30 border border-rose-900/60 text-left text-sm font-bold text-rose-200" title="Réinitialiser l'aventure à zéro">
            <Art name="reset" size={22} bare />
            <span>Tout réinitialiser</span>
          </button>
        </div>
        </details>
      </div>
    </div>
  );
}
