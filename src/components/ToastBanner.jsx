import { X } from '../icons';

export function ToastBanner({ dismissToast, toast }) {
  return (
    <div className="toast-in fixed top-3 inset-x-3 sm:inset-x-auto sm:right-5 sm:top-5 sm:max-w-md z-[70] bg-slate-900/95 border border-pink-400/70 shadow-2xl rounded-2xl p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shrink-0 shadow-inner">
        <span className={toast.badge === '🏅' ? 'inline-block animate-bounce' : ''}>{toast.badge}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2">
          <p className="font-extrabold text-pink-300 text-sm">
            {toast.title}
          </p>
          {toast.xpGain > 0 && (
            <span className="px-2 py-0.5 text-xs font-black rounded-full bg-indigo-500/30 border border-indigo-400 text-indigo-200">
              +{toast.xpGain} EXP
            </span>
          )}
        </div>
        <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{toast.subtitle}</p>
      </div>
      <button
        onClick={dismissToast}
        aria-label="Fermer"
        className="text-slate-400 hover:text-white p-2 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
