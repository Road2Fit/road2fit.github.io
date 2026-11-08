import { Art } from '../Art';
import { assistText } from '../../lib/assist';
import { METHODS, METHOD_IDS, methodFits } from '../../coach/methods';
import { useState } from 'react';
import { openMovement } from '../../lib/movement';
import { coachSwapOptions } from '../../coach/advice';
import { COACH_CHANGE_BADGES, coachFmt } from '../../coach/labels';
import { PROFILES, activeProfile } from '../../coach/profiles';
import { COACH_ARENAS, coachDayLabel } from '../../coach/settings';
import { coachSuggestExercises } from '../../coach/suggest';
import { restFor, restText } from '../../coach/rest';
import { sessionFocus } from '../../coach/focus';

import { card } from './ui';
import { CustomSetsEditor } from './CustomSetsEditor';
import { sportInfo } from '../../data/sports';
import { hasArena } from '../../data/muscles';

export function CoachNextSession({
  setMethod, setCustom, addSel, adjustTarget, availQuests, coach, doSwap, first, gameState, onAddExercise, onGoTab, onOpenLevelUp,
  onStartGuided, ov, plan, planAdd, planDate, planDayInfo, planMove, planRemove, rating,
  sessionToStart, setAddSel, setShortMode, setSwapFor, shortMode, shownDate, shownSession,
  startCustom, strengthQuests, swapFor, tiredToday, today, todayInfo, updateCoach, preview = false, onTakeOver,
}) {
  // preview : la personne continue sans l'appli après le programme de son coach → on montre la séance, sans rien pour la lancer ni la régler
  // détails d'un exercice (explication du coach + « Tu décides ») : repliés par défaut pour raccourcir la page
  const [openEx, setOpenEx] = useState({});
  const toggleEx = id => setOpenEx(o => ({ ...o, [id]: !o[id] }));
  const [showRating, setShowRating] = useState(false);
  const [customFor, setCustomFor] = useState(null); // exercice dont on règle la forme personnalisée
  const [planEdit, setPlanEdit] = useState(false); // séance perso : jour, groupes, exercices à ajouter (derrière le crayon)
  const backup = !plan && coach && coach.planBackup && coach.planBackup.date >= today ? coach.planBackup : null;
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-white" data-testid="next-session-title"><Art name="dumbbell" />{preview ? 'Aperçu de la séance suivante' : 'Prochaine séance'} {plan ? <span className="text-xs text-pink-300 font-bold">· personnalisée</span> : null}</h3>
        {!plan && ov.hasExercises && !preview && (
          <button onClick={() => { startCustom(); setPlanEdit(true); }} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-100"><Art name="pencil" />Choisir le jour / modifier</button>
        )}
        {backup && (
          <button onClick={() => { updateCoach({ plan: backup, planBackup: null }); setPlanEdit(false); }} data-testid="plan-restore" className="px-3 py-1.5 rounded-lg bg-violet-900/50 border border-violet-500/40 text-xs font-bold text-violet-200"><Art name="repeat" />Revenir à ma séance perso</button>
        )}
        {plan && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPlanEdit(v => !v)} aria-expanded={planEdit} aria-label="Modifier le jour et les exercices" title="Modifier le jour et les exercices" data-testid="plan-edit"
              className={`tap-free w-9 h-9 rounded-xl border flex items-center justify-center ${planEdit ? 'bg-pink-600 border-pink-400' : 'bg-slate-800 border-slate-700'}`}><Art name="pencil" size={18} bare /></button>
            <button onClick={() => { updateCoach({ plan: null, planBackup: plan }); setPlanEdit(false); }} data-testid="plan-reset" className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-100"><Art name="repeat" />Revenir à la proposition du coach</button>
          </div>
        )}
      </div>

      {preview && (
        <div className="bg-slate-950 border border-violet-500/50 rounded-xl p-3 space-y-2" data-testid="coach-preview">
          <p className="text-xs text-slate-300">Tu continues sans l’appli : aperçu de ce que le coach aurait proposé.</p>
          {onTakeOver && <button type="button" onClick={onTakeOver} data-testid="preview-takeover" className="px-3 py-2 rounded-lg bg-pink-600 text-white text-xs font-black">Finalement, aide-moi pour la suite</button>}
        </div>
      )}


      {!ov.hasExercises && !plan && (
        <div className="text-sm text-slate-300 space-y-2">
          <p>Le coach a besoin d’exercices de musculation dans tes objectifs pour te proposer une séance.</p>
          <button onClick={() => onGoTab('quests')} className="px-3 py-2 rounded-lg bg-pink-600 text-white font-bold text-xs">Ajouter des objectifs</button>
        </div>
      )}
      {ov.hasExercises && !first && !plan && (
        <p className="text-sm text-slate-300">
          Aucun créneau libre dans les deux prochaines semaines avec tes contraintes ({sportInfo(coach.sport).label}, matchs). Tu peux quand même choisir un jour toi-même ou lancer une séance maintenant.
        </p>
      )}

      {plan && planEdit && (
        <div className="bg-slate-950 border border-pink-500/30 rounded-xl p-3 space-y-3" data-testid="plan-box">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-300">Jour de la séance :</span>
            <input type="date" min={today} value={plan.date} onChange={e => planDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white" />
            <span className="text-slate-300 font-bold">{coachDayLabel(plan.date)}</span>
            {planDayInfo.isMatch && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">match</span>}
            {planDayInfo.isVolley && <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold">{planDayInfo.sport.icon} {planDayInfo.sport.label}</span>}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-300">Ajouter un groupe musculaire :</p>
            <div className="flex flex-wrap gap-1.5">
              {COACH_ARENAS.map(a => {
                const cands = availQuests.filter(q => hasArena(q, a)).slice(0, a === 'Abdominaux' ? 1 : 2);
                const none = !strengthQuests.some(q => hasArena(q, a));
                return (
                  <button key={a} disabled={!cands.length}
                    onClick={() => planAdd(cands.map(q => q.id))}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${cands.length ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                    + {a}{none ? ' (aucun exo)' : ''}
                  </button>
                );
              })}
            </div>
            {availQuests.length > 0 && (
              <div className="flex gap-2">
                <select value={addSel} onChange={e => setAddSel(e.target.value)} className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white">
                  <option value="">Ajouter un exercice précis…</option>
                  {COACH_ARENAS.map(a => {
                    const list = availQuests.filter(q => hasArena(q, a));
                    return list.length ? (
                      <optgroup key={a} label={a}>
                        {list.map(q => <option key={q.id} value={q.id}>{q.icon} {q.name}</option>)}
                      </optgroup>
                    ) : null;
                  })}
                </select>
                <button disabled={!addSel} onClick={() => { planAdd([addSel]); setAddSel(''); }} className="px-3 py-1.5 rounded-lg bg-pink-600 disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-black">Ajouter</button>
              </div>
            )}
            {COACH_ARENAS.filter(a => !strengthQuests.some(q => hasArena(q, a))).map(a => (
              <div key={a} className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400">Tu n’as pas encore d’exercice de {a} :</span>
                {coachSuggestExercises(gameState, a, 2).map(c => (
                  <button key={c.id} onClick={() => { const id = onAddExercise(c.id); planAdd([id]); }} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold">+ créer « {c.name} »</button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {shownSession && shownSession.exercises.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {preview && <span className="px-2.5 py-1 rounded-full bg-violet-600 text-white font-black">Aperçu</span>}
            <span className="px-2.5 py-1 rounded-full bg-pink-600 text-white font-black">
              {(() => {
                const fc = sessionFocus(shownSession.exercises);
                if (shownSession.program && !plan) return shownSession.templateId;
                const side = shownSession.type === 'PUSH' || shownSession.type === 'PULL' ? ` · ${shownSession.typeLabel.toLowerCase()}` : '';
                return fc ? `${fc.label}${side}` : plan ? 'Séance perso' : `Séance ${shownSession.typeLabel || shownSession.templateId}`;
              })()}
            </span>
            <span className="text-slate-300 font-bold">
              {shownDate === today ? 'Aujourd’hui' : coachDayLabel(shownDate)}
            </span>
            <span className="inline-flex items-center gap-1 text-slate-200 font-bold" title="Durée estimée" data-testid="session-min"><Art name="timer" size={15} bare />{shownSession.estMin} min</span>
            <span className="inline-flex items-center gap-1 text-slate-200 font-bold" title="Calories estimées" data-testid="session-kcal"><Art name="flame" size={15} bare />{shownSession.estKcal} kcal</span>
            {(() => {
              const pf = activeProfile(gameState, shownDate);
              return pf.id ? <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 font-bold">{PROFILES[pf.id].label}</span> : null;
            })()}
          </div>
          <div className="space-y-2">
            {shownSession.exercises.map(e => {
              const b = COACH_CHANGE_BADGES[e.change] || COACH_CHANGE_BADGES.new;
              const uniform = e.targetReps.every(r => r === e.targetReps[0]);
              const ru = e.timed ? 's' : 'reps';
              // forme de séries : détail série par série (« 12 × 50 · 10 × 55 · 8 × 60 kg »)
              const planTxt = e.plan ? e.plan.map(p => `${p.reps}${e.kind === 'load' ? ` × ${coachFmt(p.load)}` : e.kind === 'assisted' ? ` (${assistText(p.assist)})` : ''}`).join(' · ') + (e.kind === 'load' ? ' kg' : '') : '';
              // court pour tenir sur une ligne : « 4 × 8 à 57,5 kg », « 9-9-8-9 à 45 kg », « 3 × 12 reps »
              const unitTxt = e.kind === 'load' && !e.timed ? '' : ` ${ru}`;
              const repsTxt = e.plan ? planTxt : uniform ? `${e.sets} × ${e.targetReps[0]}${unitTxt}` : `${e.targetReps.join('-')}${unitTxt}`;
              const restShort = sec => `${Math.floor(sec / 60)}’${sec % 60 ? String(sec % 60).padStart(2, '0') : ''}`;
              const loadTxt = e.plan ? '' : e.kind === 'load' ? ` à ${coachFmt(e.load)} kg` : e.kind === 'assisted' ? ` · ${assistText(e.assist)}` : '';
              return (
                <div key={e.questId} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2" data-testid="next-ex">
                  {/* deux lignes : nom, puis séries · charge · repos ; tout le reste est sous le crayon */}
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-white text-sm truncate">{e.icon} {e.name}</p>
                      <p className="text-sm flex items-center gap-1 min-w-0 whitespace-nowrap overflow-hidden" data-testid="ex-line2">
                        <span className="shrink-0 inline-flex" title={b[1]} aria-label={b[1]} data-testid="change-badge">{b[0]}</span>
                        <span className="text-pink-300 font-black truncate min-w-0" data-testid={e.plan ? 'method-chip' : undefined}>{e.plan ? `${(METHODS[e.method] || {}).label} · ${e.sets} séries` : `${repsTxt}${loadTxt}`}</span>
                        {e.superset && <span className="shrink-0 text-sky-300 font-bold">· sup. {e.superset.id}</span>}
                        {!e.plan && e.restSec > 0 && <span className="shrink-0 inline-flex items-center gap-0.5 text-slate-400" data-testid="rest-chip" title={`Repos ${restText(e.superset && e.superset.first ? 15 : e.restSec)}`}>· <Art name="timer" size={13} bare />{restShort(e.superset && e.superset.first ? 15 : e.restSec)}</span>}
                      </p>
                    </div>
                    <button type="button" onClick={() => openMovement({ catalogId: e.catalogId, name: e.name })} title="Voir le mouvement" aria-label="Voir le mouvement" className="tap-free shrink-0 w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center"><Art name="film" size={18} bare /></button>
                    {!preview && <button type="button" onClick={() => { toggleEx(e.questId); if (openEx[e.questId] && swapFor === e.questId) setSwapFor(null); }} aria-expanded={!!openEx[e.questId]} title="Pourquoi ? / Ajuster" aria-label="Pourquoi ? / Ajuster" data-testid="ex-adjust"
                      className={`tap-free relative shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${openEx[e.questId] ? 'bg-pink-600 border-pink-400' : 'bg-slate-800 border-slate-700'}`}>
                      <Art name="pencil" size={18} bare />
                      {e.manual && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" title="Modifié par toi" />}
                    </button>}
                  </div>
                  {!preview && openEx[e.questId] && (() => {
                    const q = gameState.quests.find(x => x.id === e.questId) || {};
                    const hasCustom = Array.isArray(q.coachCustom) && q.coachCustom.length > 0;
                    // « Personnalisée » : ouvre le réglage série par série (déjà réglée : on la reprend tout de suite)
                    const pickMethod = id => {
                      if (id === 'custom') { if (hasCustom) setMethod(e.questId, 'custom'); setCustomFor(e.questId); return; }
                      setCustomFor(null);
                      setMethod(e.questId, id);
                    };
                    const pmBtn = 'tap-free w-10 h-10 rounded-xl bg-slate-800 border border-slate-600 text-lg font-black text-white active:bg-slate-700';
                    const stepper = (label, value, minus, plus, testId) => (
                      <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5">
                        <span className="text-xs font-bold text-slate-400 w-20">{label}</span>
                        <button type="button" onClick={minus} aria-label={`${label} moins`} className={pmBtn}>−</button>
                        <span className="flex-1 text-center text-base font-black text-white" data-testid={testId}>{value}</span>
                        <button type="button" onClick={plus} aria-label={`${label} plus`} className={pmBtn}>+</button>
                      </div>
                    );
                    const act = 'tap-free py-2 rounded-xl bg-slate-800 border border-slate-600 text-xs font-bold text-slate-100 flex flex-col items-center gap-0.5 disabled:opacity-40';
                    const idx = shownSession.exercises.findIndex(x => x.questId === e.questId);
                    const last = shownSession.exercises.length - 1;
                    return (
                      <div className="mt-2 space-y-2" data-testid="ex-panel">
                        {/* Tu décides : charge (ou aide), répétitions, séries */}
                        {e.kind === 'load' && !e.plan && stepper('Charge', `${coachFmt(e.load)} kg`, () => adjustTarget(e, 'easier'), () => adjustTarget(e, 'harder'), 'adj-load')}
                        {e.kind === 'assisted' && !e.plan && (e.assist < 0
                          ? stepper('Lest', `+${coachFmt(-e.assist)} kg`, () => adjustTarget(e, 'easier'), () => adjustTarget(e, 'harder'), 'adj-assist')
                          : stepper('Aide', `${coachFmt(e.assist)} kg`, () => adjustTarget(e, 'harder'), () => adjustTarget(e, 'easier'), 'adj-assist'))}
                        {!e.plan && stepper(e.timed ? 'Secondes' : 'Répétitions', uniform ? e.targetReps[0] : e.targetReps.join(' - '), () => adjustTarget(e, 'lessReps'), () => adjustTarget(e, 'moreReps'), 'adj-reps')}
                        {stepper('Séries', e.sets, () => adjustTarget(e, 'lessSets'), () => adjustTarget(e, 'moreSets'), 'adj-sets')}
                        {e.plan && <p className="text-xs text-pink-200 font-bold">{planTxt}</p>}
                        {setMethod && (
                          <label className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-bold">Forme des séries :
                            <select value={customFor === e.questId ? 'custom' : q.coachMethod || 'auto'} onChange={ev => pickMethod(ev.target.value)} data-testid="method-select" className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white">
                              <option value="auto">Le coach choisit</option>
                              {METHOD_IDS.filter(id => methodFits(id, e)).map(id => <option key={id} value={id}>{METHODS[id].label}</option>)}
                            </select>
                            {q.coachMethod === 'custom' && customFor !== e.questId && <button type="button" onClick={() => setCustomFor(e.questId)} className="px-2 py-1 rounded-lg bg-violet-900/60 border border-violet-500/50 text-violet-100" data-testid="custom-edit">Modifier mes séries</button>}
                          </label>
                        )}
                        {customFor === e.questId && setCustom && (
                          <CustomSetsEditor e={e} onCancel={() => setCustomFor(null)} onSave={rows => { setCustom(e, rows); setCustomFor(null); }} />
                        )}
                        {e.canRestore && (
                          <button type="button" onClick={() => adjustTarget(e, 'restore')} className="w-full py-2 rounded-xl bg-violet-900/50 border border-violet-500/40 text-xs font-bold text-violet-200" data-testid="adj-restore">
                            <Art name="repeat" />Revenir à mon réglage
                          </button>
                        )}
                        {e.manual && (
                          <button type="button" onClick={() => adjustTarget(e, 'reset')} className="w-full py-2 rounded-xl bg-violet-900/50 border border-violet-500/40 text-xs font-bold text-violet-200" data-testid="adj-reset">
                            <Art name="repeat" />Revenir à la proposition du coach
                          </button>
                        )}
                        {/* changer, monter / descendre, retirer */}
                        <div className={`grid gap-1.5 ${plan ? 'grid-cols-4' : 'grid-cols-1'}`}>
                          <button type="button" onClick={() => setSwapFor(swapFor === e.questId ? null : e.questId)} aria-expanded={swapFor === e.questId} className={act} data-testid="ex-swap"><Art name="repeat" size={16} bare />Changer</button>
                          {plan && <button type="button" onClick={() => planMove(e.questId, -1)} disabled={idx <= 0} className={act} data-testid="ex-up"><span aria-hidden="true">▲</span>Monter</button>}
                          {plan && <button type="button" onClick={() => planMove(e.questId, 1)} disabled={idx >= last} className={act} data-testid="ex-down"><span aria-hidden="true">▼</span>Descendre</button>}
                          {plan && <button type="button" onClick={() => planRemove(e.questId)} className={`${act} !text-rose-300 !border-rose-500/50`} data-testid="ex-remove"><span aria-hidden="true">✕</span>Retirer</button>}
                        </div>
                        <p className="text-xs text-slate-400"><span className="font-bold text-slate-300">{b[1]} : </span>{e.reason}</p>
                        {!e.plan && e.restSec > 0 && <p className="text-xs text-slate-400">Repos de {restText(e.restSec)} : {restFor({ name: e.name, reps: Math.min(...(e.targetReps || [10])), timed: e.timed, compound: e.compound, arena: e.arena }).why}.</p>}
                        {e.methodWhy && <p className="text-xs text-violet-200">{e.methodWhy}{e.plan ? ` ${(METHODS[e.method] || {}).how}` : ''}</p>}
                      </div>
                    );
                  })()}
                  {swapFor === e.questId && (() => {
                    const opt = coachSwapOptions(gameState, e.questId, shownSession.exercises.map(x => x.questId));
                    return (
                      <div className="mt-2 bg-slate-900 border border-slate-700 rounded-lg p-2 space-y-1.5">
                        <p className="text-xs font-bold text-slate-300">Remplacer par (même groupe : {opt.arena}) :</p>
                        <div className="flex flex-wrap gap-1.5">
                          {opt.own.map(q => (
                            <button key={q.id} onClick={() => doSwap(e.questId, q.id)} className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100">{q.icon} {q.name}</button>
                          ))}
                          {opt.catalog.map(c => (
                            <button key={c.id} onClick={() => { const id = onAddExercise(c.id); doSwap(e.questId, id); }} className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 text-xs font-bold text-slate-300">+ créer « {c.name} »</button>
                          ))}
                          {!opt.own.length && !opt.catalog.length && <span className="text-xs text-slate-500">Aucun équivalent disponible.</span>}
                        </div>
                      </div>
                    );
                  })()}
                  {e.change === 'goal' && (
                    <button
                      onClick={() => { const q = gameState.quests.find(x => x.id === e.questId); if (q) onOpenLevelUp(q); }}
                      className="mt-2 px-2.5 py-1 rounded-lg bg-pink-600 text-white text-xs font-black"
                    >
                      Valider le niveau suivant
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* l'échauffement de chaque exercice est maintenant calculé dans la séance guidée (coach/warmup.js) */}
        </>
      )}
      {plan && shownSession && shownSession.exercises.length === 0 && (
        <p className="text-xs text-slate-400">Ta séance est vide : ajoute un groupe ou un exercice ci-dessus.</p>
      )}

      {rating && !preview && (() => {
        // avis du coach : une note en grand dans une jauge circulaire, le reste au toucher
        const tone = rating.score >= 7.5 ? { ring: 'rgb(var(--pink-400))', txt: 'text-pink-300' } : rating.score >= 5 ? { ring: '#f59e0b', txt: 'text-amber-300' } : { ring: '#f43f5e', txt: 'text-rose-300' };
        const pct = Math.max(0, Math.min(10, Number(rating.score) || 0)) / 10;
        const C = 2 * Math.PI * 22;
        const icon = lv => (lv === 'bad' ? 'warn' : lv === 'warn' ? 'warn' : lv === 'info' ? 'bulb' : 'check');
        return (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 space-y-2" data-testid="coach-rating">
            <button type="button" onClick={() => setShowRating(v => !v)} aria-expanded={showRating} className="w-full flex items-center gap-3 text-left">
              <span className="relative w-14 h-14 shrink-0">
                <svg viewBox="0 0 50 50" className="w-14 h-14 -rotate-90" aria-hidden="true">
                  <circle cx="25" cy="25" r="22" fill="none" stroke="rgb(var(--slate-800))" strokeWidth="4" />
                  <circle cx="25" cy="25" r="22" fill="none" stroke={tone.ring} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xl font-black ${tone.txt}`} data-testid="coach-rating-score">{String(rating.score).replace('.', ',')}</span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-bold text-slate-400">Avis du coach</span>
                <span className="block text-lg font-black text-white leading-tight">{rating.label}</span>
              </span>
              <span className="text-slate-400 font-black">{showRating ? '▾' : `▸ ${rating.items.length}`}</span>
            </button>
            {showRating && shownSession && !preview && shownSession.notes.map((n, i) => (
              <p key={`n${i}`} className="text-xs text-slate-300" data-testid="session-note">{n}</p>
            ))}
            {showRating && shownSession && !plan && !preview && shownSession.fillSuggestions && shownSession.fillSuggestions.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-slate-300">Pour compléter cette séance (≈ {shownSession.estMin} min, objectif {shownSession.target} min) :</p>
                <div className="flex flex-wrap gap-1.5">
                  {shownSession.fillSuggestions.map(c => (
                    <button key={c.id} onClick={() => onAddExercise(c.id)} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-100">+ {c.name} <span className="text-slate-500">({c.arena})</span></button>
                  ))}
                </div>
              </div>
            )}
            {showRating && (
              <ul className="space-y-1.5">
                {rating.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <Art name={icon(it.level)} size={16} bare className="mt-0.5" />
                    <span className="min-w-0">
                      <span className={it.level === 'bad' ? 'text-rose-300 font-bold' : it.level === 'warn' ? 'text-amber-300 font-bold' : 'text-slate-200'}>{it.text}</span>
                      {it.fix && <span className="block text-slate-400">→ {it.fix}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {showRating && <p className="text-xs text-slate-500">Règles de bon sens (récupération, volume, équilibre) inspirées des repères ACSM et Schoenfeld : une aide, pas une vérité exacte.</p>}
          </div>
        );
      })()}

      {sessionToStart && sessionToStart.exercises.length > 0 && (
        <div className="space-y-1.5">
          <button
            onClick={() => onStartGuided(sessionToStart)}
            data-hero
            data-key
            className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black text-sm"
          >
            ▶ {shownDate === today ? 'Lancer la séance guidée' : 'Lancer cette séance guidée maintenant'}
          </button>
        </div>
      )}
    </section>
  );
}
