export function RankUpModal({ celebration, onClose }) {
  const { level, rank, nextRank } = celebration;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex px-4 pt-14 sm:py-4 overflow-y-auto">
      <div className="m-auto bg-slate-900 border-2 border-amber-400/70 rounded-3xl max-w-sm w-full p-7 shadow-2xl shadow-amber-500/20 text-center space-y-4">
        <div className={`mx-auto w-28 h-28 rounded-3xl bg-gradient-to-br ${rank.color} flex items-center justify-center text-6xl shadow-xl animate-bounce`}>
          {rank.badge}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">Nouveau rang débloqué !</p>
          <h3 className="text-2xl font-black text-white">{rank.title}</h3>
          <p className="text-sm font-bold text-pink-300">Niveau {level}</p>
        </div>
        <p className="text-xs text-slate-400">
          {nextRank
            ? `Prochain rang : ${nextRank.badge} ${nextRank.title} au niveau ${nextRank.minLevel}.`
            : 'Tu as atteint le plus haut rang. Bravo, Maître !'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950"
        >
          Continuer l’aventure
        </button>
      </div>
    </div>
  );
}
