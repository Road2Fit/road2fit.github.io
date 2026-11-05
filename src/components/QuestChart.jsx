import { formatSetsBreakdown, getSetDetailsArray, isTimedQuest } from '../lib/quests';

// Courbe de progression d'un exercice (ancien onglet « Courbes », maintenant dans la fiche de l'exercice).
export function QuestChart({ quest }) {
            const history = quest.history || [];
            if (history.length === 0) {
              return (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Aucune séance enregistrée pour cet exercice.
                </div>
              );
            }

            const values = history.map(h => Number(h.value) || 0);
            const goalVal = Number(quest.goalValue) || 10;
            const minVal = Math.min(...values, Number(quest.startValue) || 0) * 0.8; // pas de départ à 0 : la courbe reste lisible
            const maxVal = Math.max(...values, goalVal, 10) * 1.15;
            const narrow = window.innerWidth < 640;
            const width = narrow ? 340 : 760; // sur téléphone, moins de points étiquetés et des textes à taille réelle
            const labelStep = Math.max(1, Math.ceil(history.length / (narrow ? 3 : 8)));
            const height = 240;
            const padX = narrow ? 38 : 55;
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
                    y={narrow ? goalY + 16 : goalY - 6}
                    textAnchor="end"
                    className="fill-amber-400 text-[13px] font-bold"
                  >
                    Objectif : {goalVal} {quest.unit}
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
                    const showLabel = idx === history.length - 1 || (idx % labelStep === 0 && history.length - 1 - idx >= labelStep);
                    const setsArr =
                      quest.type === 'strength'
                        ? getSetDetailsArray(
                            h,
                            quest.goalSets || 3,
                            quest.goalReps || 6
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
                        {showLabel && <text
                          x={cx}
                          y={cy - 12}
                          textAnchor="middle"
                          className="fill-white text-[13px] font-bold"
                        >
                          {quest.type === 'strength'
                            ? `${
                                quest.unit === 'kg'
                                  ? `${h.value}kg `
                                  : ''
                              }[${formatSetsBreakdown(setsArr)}]`
                            : `${h.value} ${quest.unit}`}
                        </text>}
                        {showLabel && !narrow && quest.unit === 'reps' && !isTimedQuest(quest) && (
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
                        {showLabel && <text
                          x={cx}
                          y={height - 8}
                          textAnchor="middle"
                          className="fill-slate-400 text-[12px]"
                        >
                          {h.date ? `${h.date.slice(8, 10)}/${h.date.slice(5, 7)}` : ''}{narrow ? '' : ` · ${h.calories || 45} kcal`}
                        </text>}
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
}
