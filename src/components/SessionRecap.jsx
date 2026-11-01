import { useEffect } from 'react';
import { SessionPhoto } from './photos/SessionPhoto';
import { getTodayISODate } from '../lib/dates';
import { usePhotos } from '../lib/photos';

export function SessionRecap({ recap, onClose }) {
  const hasPhotos = usePhotos();
  useEffect(() => {
    try { navigator.vibrate && navigator.vibrate([150, 80, 150]); } catch (e) {}
  }, []);
  const diff = recap.prevTonnage > 0 ? Math.round(((recap.tonnage - recap.prevTonnage) / recap.prevTonnage) * 100) : null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/80 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-slate-900 border border-pink-500/40 rounded-2xl p-5 space-y-4">
          <div className="text-center">
            <p className="text-3xl">🎉</p>
            <h2 className="text-xl font-black text-white">Bilan de la séance</h2>
            <p className="text-xs text-slate-400">{recap.minutes} min · ≈ {recap.kcal} kcal · +{recap.xp} XP</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <p className="text-xs uppercase font-bold text-slate-400">Records battus</p>
              <p className="text-lg font-black text-amber-300">{recap.prs} 🏅</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <p className="text-xs uppercase font-bold text-slate-400">Tonnage (charges)</p>
              <p className="text-lg font-black text-white">{recap.tonnage} kg</p>
              {diff !== null && <p className={`text-xs font-bold ${diff >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>{diff >= 0 ? '+' : ''}{diff} % vs dernière fois</p>}
            </div>
          </div>
          <div className="space-y-2">
            {recap.rows.map((r, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <p className="font-extrabold text-white text-sm">{r.icon} {r.name}</p>
                <p className="text-xs text-slate-300">Aujourd’hui : {r.summary}</p>
                {r.pr && <p className="text-xs font-bold text-amber-300">🏅 {r.pr}</p>}
                <p className="text-xs text-pink-300">Prochaine cible : {r.next}</p>
              </div>
            ))}
          </div>
          <SessionPhoto date={recap.date || getTodayISODate()} label={recap.title || ''} highlight />
          <button onClick={() => {
            const d = recap.date || getTodayISODate();
            const has = hasPhotos.some(p => p.date === d);
            if (!has && !window.confirm('📸 Tu n’as pas encore pris ta photo de fin de séance. Fermer quand même ?')) return;
            onClose();
          }} className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black text-sm">Super, merci coach</button>
        </div>
      </div>
    </div>
  );
}
