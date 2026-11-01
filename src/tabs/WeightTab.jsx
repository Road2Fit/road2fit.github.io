import { cleanText } from '../edition';
import { Scale, Trash2 } from '../icons';

export function WeightTab({
  gameState, handleAddWeightEntry, handleDeleteWeightEntry, newWeightDate, newWeightInput,
  newWeightNote, setGameState, setNewWeightDate, setNewWeightInput, setNewWeightNote,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-pink-400" />
              <span>Nouvelle pesée</span>
            </h3>
            <p className="text-xs text-slate-400">
              Suis l’évolution de ton poids (+25 EXP par pesée).
            </p>
          </div>
        </div>

        <form onSubmit={handleAddWeightEntry} className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <label className="block text-xs font-bold text-slate-300">
              Poids du jour (kg)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setNewWeightInput(w => +(Math.max(35, Number(w) - 0.5)).toFixed(1))
                }
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
              >
                -0.5
              </button>
              <input
                type="number"
                step="0.1"
                min="35"
                max="250"
                value={newWeightInput}
                onChange={e => setNewWeightInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-pink-500/40 rounded-xl py-2 text-center text-lg font-black text-white"
              />
              <button
                type="button"
                onClick={() =>
                  setNewWeightInput(w => +(Number(w) + 0.5).toFixed(1))
                }
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
              >
                +0.5
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Date de la pesée
              </label>
              <input
                type="date"
                value={newWeightDate}
                onChange={e => setNewWeightDate(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
              />
            </div>

            <div className="bg-slate-950 border border-pink-500/30 rounded-xl p-3">
              <label className="block text-xs font-bold text-pink-300 mb-1">
                Poids cible (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="35"
                max="220"
                value={gameState.targetWeightKg}
                onChange={e =>
                  setGameState(prev => ({
                    ...prev,
                    targetWeightKg: Math.max(35, Number(e.target.value) || 75)
                  }))
                }
                className="w-full bg-transparent text-sm font-black text-pink-300 focus:outline-none"
              />
            </div>
          </div>

          <input
            type="text"
            placeholder="Note (ex: À jeun le matin, après séance...)"
            value={newWeightNote}
            onChange={e => setNewWeightNote(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
          />

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl font-black text-xs bg-pink-600 hover:bg-pink-500 text-white shadow-lg"
          >
            Enregistrer la pesée (+25 EXP)
          </button>
        </form>
      </div>

      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <span className="text-xs font-bold uppercase text-slate-400 block">
              Départ
            </span>
            <span className="text-base font-black text-slate-200">
              {gameState.weightHistory?.[0]?.weightKg ?? gameState.startWeightKg} kg
            </span>
          </div>
          <div className="bg-pink-950/30 border border-pink-500/40 rounded-xl p-3">
            <span className="text-xs font-bold uppercase text-pink-300 block">
              Actuel
            </span>
            <span className="text-base font-black text-white">
              {gameState.userWeightKg} kg
            </span>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3">
            <span className="text-xs font-bold uppercase text-emerald-300 block">
              Objectif Cible
            </span>
            <span className="text-base font-black text-emerald-300">
              {gameState.targetWeightKg} kg
            </span>
          </div>
        </div>

        {(() => {
          const wHist = gameState.weightHistory || [];
          if (wHist.length === 0) return null;
          const weights = wHist.map(w => Number(w.weightKg) || 75);
          const targetW = Number(gameState.targetWeightKg) || 75;
          const minW = Math.min(...weights, targetW) - 2;
          const maxW = Math.max(...weights, targetW) + 2;
          const width = window.innerWidth < 640 ? 340 : 620;
          const height = 200;
          const padX = 45;
          const padY = 30;

          const getX = i =>
            wHist.length === 1
              ? width / 2
              : padX + (i / (wHist.length - 1)) * (width - padX * 2);
          const getY = val =>
            height -
            padY -
            ((val - minW) / Math.max(1, maxW - minW)) * (height - padY * 2);

          const pts = wHist.map((w, i) => `${getX(i)},${getY(w.weightKg)}`).join(' ');
          const targetY = getY(targetW);
          const trend = weights.map((_, i) => {
            const sl = weights.slice(Math.max(0, i - 6), i + 1);
            return sl.reduce((x, y) => x + y, 0) / sl.length;
          });
          const trendPts = trend.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
          const eta = (() => {
            const rc = wHist.slice(-8);
            if (rc.length < 3) return null;
            const t0 = Date.parse(rc[0].date + 'T00:00:00Z');
            const xs = rc.map(w => (Date.parse(w.date + 'T00:00:00Z') - t0) / 86400000);
            const ys = rc.map(w => Number(w.weightKg) || 0);
            const n = xs.length;
            const mx = xs.reduce((x, y) => x + y, 0) / n;
            const my = ys.reduce((x, y) => x + y, 0) / n;
            const den = xs.reduce((x, v) => x + (v - mx) ** 2, 0);
            if (den === 0) return null;
            const slope = xs.reduce((x, v, i) => x + (v - mx) * (ys[i] - my), 0) / den;
            const cur = ys[n - 1];
            if (cur <= targetW) return { done: true };
            if (slope >= -0.005) return { stalled: true };
            const days = Math.ceil((cur - targetW) / -slope);
            const d = new Date();
            d.setDate(d.getDate() + days);
            return { perWeek: Math.round(slope * 7 * 100) / 100, days, date: d.toLocaleDateString('fr-FR') };
          })();

          return (
            <div className="w-full overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl p-3">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
                <line
                  x1={padX}
                  y1={targetY}
                  x2={width - padX}
                  y2={targetY}
                  stroke="#10b981"
                  strokeDasharray="6 4"
                  strokeWidth="1.5"
                />
                <text
                  x={width - padX}
                  y={targetY - 6}
                  textAnchor="end"
                  className="fill-emerald-400 text-xs font-bold"
                >
                  Cible : {targetW} kg
                </text>

                {wHist.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="3"
                    points={pts}
                  />
                )}
                {wHist.length > 1 && (
                  <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="2 5" strokeLinecap="round" points={trendPts} />
                )}

                {wHist.map((w, idx) => (
                  <g key={w.id || idx}>
                    <circle
                      cx={getX(idx)}
                      cy={getY(w.weightKg)}
                      r="5"
                      className="fill-pink-500 stroke-slate-950 stroke-2"
                    />
                    <text
                      x={getX(idx)}
                      y={getY(w.weightKg) - 10}
                      textAnchor="middle"
                      className="fill-white text-xs font-bold"
                    >
                      {w.weightKg} kg
                    </text>
                    <text
                      x={getX(idx)}
                      y={height - 6}
                      textAnchor="middle"
                      className="fill-slate-400 text-[12px]"
                    >
                      {w.date?.slice(5)}
                    </text>
                  </g>
                ))}
              </svg>
              <p className="text-xs text-slate-400 mt-2">
                <span className="text-sky-300 font-bold">- - -</span> Tendance (moyenne glissante sur 7 pesées).{' '}
                {eta === null && 'Ajoute au moins 3 pesées pour obtenir une estimation.'}
                {eta && eta.done && 'Objectif de poids atteint !'}
                {eta && eta.stalled && 'Poids stable ou en hausse : pas d’estimation possible pour l’instant.'}
                {eta && eta.days && `Au rythme actuel (${eta.perWeek} kg/sem.), objectif estimé vers le ${eta.date} (~${eta.days} j).`}
              </p>
            </div>
          );
        })()}

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {[...(gameState.weightHistory || [])].reverse().map(item => (
            <div
              key={item.id}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-400">{item.date}</span>
                <span className="font-black text-pink-300 text-sm">
                  {item.weightKg} kg
                </span>
                <span className="text-slate-400">{cleanText(item.note)}</span>
              </div>
              <button
                onClick={() => handleDeleteWeightEntry(item.id)}
                className="text-slate-500 hover:text-rose-400 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
