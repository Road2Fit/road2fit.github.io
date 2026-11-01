import { X } from '../icons';

export function RankTrialModal({ levelInfo, onClose, onValidate, trialEval, trialRank }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex p-4 pt-20 pb-24 sm:py-4 overflow-y-auto">
      <div className="m-auto bg-slate-900 border border-amber-400/50 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white">⚔️ Épreuve de rang</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pour devenir {trialRank.badge} <strong className="text-amber-300">{trialRank.title}</strong> (niveau {trialRank.minLevel}), il ne suffit pas d’avoir assez d’EXP : réussis ces objectifs.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="space-y-2.5">
          {trialEval.tasks.map(t => (
            <li key={t.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className={t.done ? 'text-emerald-300 font-bold' : 'text-slate-200'}>
                  {t.done ? '✅' : '⬜'} {t.label}
                </span>
                <span className="text-slate-400 font-semibold shrink-0">{t.current} / {t.target}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${t.done ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  style={{ width: `${Math.round((t.current / t.target) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>

        {levelInfo.locked ? (
          <p className="text-xs text-amber-300">
            🔒 Ton niveau est bloqué en attendant. L’EXP que tu gagnes continue de s’accumuler : {levelInfo.reserve} EXP en réserve, qui seront comptés dès l’épreuve réussie.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Tu peux réussir l’épreuve à l’avance : le rang s’ouvrira dès que tu auras assez d’EXP.
          </p>
        )}

        <button
          type="button"
          disabled={!trialEval.done}
          onClick={onValidate}
          className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950 disabled:opacity-40"
        >
          {trialEval.done ? '⚔️ Valider l’épreuve' : 'Objectifs pas encore atteints'}
        </button>
      </div>
    </div>
  );
}
