import { useState } from 'react';
import { getCoachSettings } from '../../coach/settings';

// 4.53.1 (Gabin : « je n'ai pas trouvé où rentrer ma taille ») : « Mon corps » en haut de Coach → Réglages : taille, âge,
// sexe (coach.profile, les mêmes que l'accueil). La taille sert d'échelle à la vidéo des sauts (hauteur en cm) et aux calories.
const input = 'w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold text-white text-center';

export function CoachBody({ gameState, setGameState }) {
  const p = getCoachSettings(gameState).profile || {};
  const [h, setH] = useState(p.heightCm ? String(p.heightCm) : '');
  const [age, setAge] = useState(p.age ? String(p.age) : '');
  const save = patch => setGameState(prev => {
    const c = getCoachSettings(prev);
    return { ...prev, coach: { ...c, profile: { ...(c.profile || {}), ...patch } } };
  });
  const num = (v, a, b) => { const n = Math.round(Number(String(v).replace(',', '.'))); return n >= a && n <= b ? n : null; };
  const hOk = num(h, 120, 230);
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3" data-testid="coach-body">
      <div>
        <h3 className="font-black text-white">Mon corps</h3>
        <p className="text-xs text-slate-400">Ta taille sert à mesurer la hauteur de tes sauts en vidéo et à estimer tes calories.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-300 space-y-1">
          <span className="block font-bold">Taille (cm)</span>
          <input type="number" inputMode="numeric" min="120" max="230" value={h} placeholder="ex. 182" data-testid="body-height"
            onChange={e => { setH(e.target.value); const n = num(e.target.value, 120, 230); if (n) save({ heightCm: n }); }} className={input} />
        </label>
        <label className="text-xs text-slate-300 space-y-1">
          <span className="block font-bold">Âge</span>
          <input type="number" inputMode="numeric" min="10" max="100" value={age} data-testid="body-age"
            onChange={e => { setAge(e.target.value); const n = num(e.target.value, 10, 100); if (n) save({ age: n }); }} className={input} />
        </label>
        <div className="flex gap-1.5">
          {[['m', 'Homme'], ['f', 'Femme']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => save({ sex: v })} aria-pressed={(p.sex || 'm') === v}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${(p.sex || 'm') === v ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{l}</button>
          ))}
        </div>
      </div>
      {h && !hOk && <p className="text-[11px] text-amber-300">Entre une taille entre 120 et 230 cm.</p>}
    </section>
  );
}
