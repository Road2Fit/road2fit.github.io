import { Plus } from '../icons';
import { formatSetsBreakdown, getSetDetailsArray, isTimedQuest } from '../lib/quests';

export function ChartsTab({ activeChartQuest, gameState, openLogModal, setSelectedChartQuestId }) {
  return (
    <div className="space-y-6">
      <label className="block">
        <span className="block text-xs font-bold text-slate-400 mb-1">Exercice</span>
        <select value={activeChartQuest ? activeChartQuest.id : ''} onChange={e => setSelectedChartQuestId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-sm font-bold text-white">
          {gameState.quests.map(q => <option key={q.id} value={q.id}>{q.name} (niv. {q.level || 1})</option>)}
        </select>
      </label>

      {activeChartQuest && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>{activeChartQuest.icon}</span>
                <span>{activeChartQuest.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Niveau actuel : Niv. {activeChartQuest.level || 1}
              </p>
            </div>

            <button
              onClick={() => openLogModal(activeChartQuest)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Ajouter une séance
            </button>
          </div>

          {(() => {
            const history = activeChartQuest.history || [];
            if (history.length === 0) {
              return (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Aucune séance enregistrée pour cet exercice.
                </div>
              );
            }

            const values = history.map(h => Number(h.value) || 0);
            const goalVal = Number(activeChartQuest.goalValue) || 10;
            const minVal = Math.min(...values, Number(activeChartQuest.startValue) || 0, 0);
            const maxVal = Math.max(...values, goalVal, 10) * 1.15;
            const width = 760;
            const height = 240;
            const padX = 55;
            const padY = 35;

            const getX = i =>
              history.length === 1
                ? width / 2
                : padX + (i / (history.length - 1)) * (width - padX * 2);
            const getY = val =>
              height -
              padY -
              ((val - minVal) / Math.max(1, maxVal - minVal)) *
                (height - padY * 2);

            const points = history.map((h, i) => `${getX(i)},${getY(h.value)}`).join(' ');
            const goalY = getY(goalVal);

            return (
              <div className="w-full overflow-x-auto bg-slate-950/90 border border-slate-800 rounded-xl p-3">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-56 overflow-visible"
                >
                  <line
                    x1={padX}
                    y1={goalY}
                    x2={width - padX}
                    y2={goalY}
                    stroke="#f59e0b"
                    strokeDasharray="6 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={width - padX}
                    y={goalY - 6}
                    textAnchor="end"
                    className="fill-amber-400 text-[13px] font-bold"
                  >
                    Objectif : {goalVal} {activeChartQuest.unit}
                  </text>

                  {history.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="3"
                      points={points}
                    />
                  )}

                  {history.map((h, idx) => {
                    const cx = getX(idx);
                    const cy = getY(h.value);
                    const setsArr =
                      activeChartQuest.type === 'strength'
                        ? getSetDetailsArray(
                            h,
                            activeChartQuest.goalSets || 3,
                            activeChartQuest.goalReps || 6
                          )
                        : [];
                    return (
                      <g key={h.id || idx}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r="5.5"
                          className="fill-pink-500 stroke-slate-950 stroke-2"
                        />
                        <text
                          x={cx}
                          y={cy - 12}
                          textAnchor="middle"
                          className="fill-white text-[13px] font-bold"
                        >
                          {activeChartQuest.type === 'strength'
                            ? `${
                                activeChartQuest.unit === 'kg'
                                  ? `${h.value}kg `
                                  : ''
                              }[${formatSetsBreakdown(setsArr)}]`
                            : `${h.value} ${activeChartQuest.unit}`}
                        </text>
                        {activeChartQuest.unit === 'reps' && !isTimedQuest(activeChartQuest) && (
                          <text
                            x={cx}
                            y={cy + 16}
                            textAnchor="middle"
                            className="fill-violet-300 text-[12px] font-semibold"
                          >
                            {(Number(h.assistanceKg) || 0) > 0
                              ? `Aide ${h.assistanceKg}kg`
                              : 'Strict 0kg'}
                          </text>
                        )}
                        <text
                          x={cx}
                          y={height - 8}
                          textAnchor="middle"
                          className="fill-slate-400 text-[12px]"
                        >
                          {h.date?.slice(5)} • 🔥{h.calories || 45}kcal
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
