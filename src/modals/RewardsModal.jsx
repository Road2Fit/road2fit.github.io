import { ACCESSORIES, THEMES, TITLES, activeCosmetics } from '../data/rewards';
import { X } from '../icons';
import { pick } from '../edition';

function Choice({ item, selected, unlocked, onPick, children }) {
  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={() => onPick(item.id)}
      className={`p-2.5 rounded-xl border text-left text-xs transition ${
        selected
          ? 'bg-pink-950/40 border-pink-400 shadow-md shadow-pink-500/10'
          : unlocked
            ? 'bg-slate-950/70 border-slate-700 hover:border-slate-500'
            : 'bg-slate-950/40 border-slate-800 opacity-60'
      }`}
    >
      {children}
      <span className="block text-xs mt-1 text-slate-400">
        {unlocked ? (selected ? '✔ Choisi' : 'Débloqué') : `🔒 niveau ${item.level}`}
      </span>
    </button>
  );
}

export function RewardsModal({ gameState, levelInfo, onClose, setGameState }) {
  const level = levelInfo.level;
  const active = activeCosmetics(gameState.cosmetics, level);
  const choose = patch => setGameState(prev => ({ ...prev, cosmetics: { ...(prev.cosmetics || {}), ...patch } }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex p-4 pt-20 pb-24 sm:py-4 overflow-y-auto">
      <div className="m-auto bg-slate-900 border border-pink-500/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white">🎁 Récompenses de niveau</h3>
            <p className="text-xs text-slate-400 mt-0.5">Tu es niveau {level}. Plus tu montes, plus tu débloques de façons de personnaliser {pick('Rondoudou', 'l’appli')}.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <section className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-pink-300">Couleurs</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {THEMES.map(t => (
              <Choice key={t.id} item={t} selected={active.theme.id === t.id} unlocked={level >= t.level} onPick={id => choose({ theme: id })}>
                <span className={`block h-2 rounded-full bg-gradient-to-r ${t.bar}`} />
                <span className="block mt-1.5 font-bold text-white">{t.label}</span>
              </Choice>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-pink-300">{pick('Accessoires de Rondoudou', 'Accessoires')}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ACCESSORIES.map(a => (
              <Choice key={a.id} item={a} selected={active.accessory.id === a.id} unlocked={level >= a.level} onPick={id => choose({ accessory: id })}>
                <span className="block text-xl">{a.icon}</span>
                <span className="block font-bold text-white">{a.label}</span>
              </Choice>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-pink-300">Titres</h4>
          <div className="grid grid-cols-2 gap-2">
            {TITLES.map(t => (
              <Choice key={t.id || 'rang'} item={t} selected={active.title.id === t.id} unlocked={level >= t.level} onPick={id => choose({ title: id })}>
                <span className="block font-bold text-white">{t.label}</span>
              </Choice>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
