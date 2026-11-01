import { Art } from '../components/Art';
import { useState } from 'react';
import { ExercisePicker, unitLabel } from '../components/ExercisePicker';
import { SignedKgInput } from '../components/SignedKgInput';
import { ARENA_GROUPS } from '../data/arenas';
import { FINE_GROUPS, coarseOf, fineGroupOf, isOptimized, secondGroupOf } from '../data/muscles';
import { SETS_REPS_PRESETS, TIMED_PRESETS } from '../data/presets';
import { Target, X } from '../icons';
import { timedAdvice } from '../lib/quests';
import { pick } from '../edition';

export function QuestFormModal({
  editingQuestId, formCatalogId, formSuggestion, formSwapNote, handleReplaceExercise, isSwapCompatible, swapOther, setSwapOther, openCreateQuestModal, measure, changeMeasure, canChangeMeasure, formCategory, formMuscle, setFormMuscle, formMuscle2, setFormMuscle2, formCustomName, formGoalAssistanceKg, formGoalMode,
  formGoalReps, formGoalSets, formGoalValue, formStartAssistanceKg, formStartValue, formTimed,
  formType, formUnit, handleSaveQuestForm, handleSelectCatalogExercise, setFormCategory,
  setFormCurrentValue, setFormCustomName, setFormGoalAssistanceKg, setFormGoalMode, setFormGoalReps,
  setFormGoalSets, setFormGoalValue, setFormStartAssistanceKg, setFormStartValue, setFormTimed,
  setFormUnit, setQuestModalOpen,
}) {
  const [swapOpen, setSwapOpen] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex px-4 pt-14 sm:py-4 overflow-y-auto">
              <div className="m-auto bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-pink-400" />
                    <span>
                      {editingQuestId
                        ? 'Ajuster l’objectif'
                        : 'Nouvel exercice'}
                    </span>
                  </h3>
                  <button
                    onClick={() => setQuestModalOpen(false)}
                    aria-label="Fermer" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveQuestForm} className="space-y-4">
                  {/* En modification, on vient presque toujours pour l'objectif : nom, muscle, mesure et échange d'exercice sont repliés */}
                  <details open={!editingQuestId} className="space-y-4" data-testid="form-identity">
                  <summary className={editingQuestId ? "text-sm font-bold text-slate-300 py-1" : "hidden"}>Exercice : nom, muscle, mesure, changer d’exercice</summary>
                  <div className="space-y-4 pt-1">
                  {editingQuestId && (
                    <div className="space-y-2">
                      <button type="button" onClick={() => setSwapOpen(o => !o)} aria-expanded={swapOpen} className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-sm font-bold text-indigo-100">
                        <span><Art name="repeat" />Changer d’exercice (garde tout l’historique)</span>
                        <span>{swapOpen ? '▾' : '▸'}</span>
                      </button>
                      {formSwapNote && <p className="text-xs text-emerald-200 bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2">{formSwapNote}</p>}
                      {swapOpen && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-400">Tous les exercices du muscle choisi sont listés. Avec un exercice qui se mesure pareil (charge en kg avec charge en kg, etc.), ta charge, ton objectif et tes séances sont conservés. Les autres sont marqués « Autre unité ».</p>
                          <ExercisePicker value={formCatalogId} onSelect={handleReplaceExercise} accept={c => c.type === formType} compat={isSwapCompatible} onSelectOther={c => setSwapOther(c)} allowCustom={false} />
                          {swapOther && (
                            <div className="text-xs text-amber-200 bg-amber-950/30 border border-amber-500/40 rounded-lg p-2 space-y-1.5" data-testid="swap-other">
                              <p>« {swapOther.name} » se mesure en {unitLabel(swapOther)}, alors que cet exercice se mesure en {formTimed ? 'durée' : formUnit === 'kg' ? 'charge en kg' : 'répétitions'} : l’historique ne peut pas être gardé. Je peux l’ajouter comme <b>nouvel exercice</b> (tu pourras supprimer l’ancien ensuite).</p>
                              <div className="flex gap-2">
                                <button type="button" data-testid="swap-other-create" onClick={() => { const id = swapOther.id; setSwapOther(null); openCreateQuestModal(); handleSelectCatalogExercise(id); }} className="px-3 py-1.5 rounded-lg bg-pink-600 text-white font-black">Ajouter « {swapOther.name} »</button>
                                <button type="button" onClick={() => setSwapOther(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold">Annuler</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!editingQuestId && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        {pick('Choisir un exercice dans le Pokédex', 'Choisir un exercice dans la liste')}
                      </label>
                      <ExercisePicker value={formCatalogId} onSelect={handleSelectCatalogExercise} />
                      {formSuggestion && (
                        <p className="mt-2 text-xs text-sky-200 bg-sky-950/40 border border-sky-500/30 rounded-lg p-2">{formSuggestion}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Nom de l’exercice
                      </label>
                      <input
                        type="text"
                        required
                        value={formCustomName}
                        onChange={e => setFormCustomName(e.target.value)}
                        placeholder="Ex: Tractions Pronation"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        {pick('Arène / Groupe Musculaire', 'Groupe musculaire')}
                      </label>
                      <select
                        value={isOptimized() ? (formMuscle || fineGroupOf({ catalogId: formCatalogId, name: formCustomName, category: formCategory, type: formType })) : formCategory}
                        onChange={e => { const v = e.target.value; if (isOptimized()) { setFormMuscle(FINE_GROUPS.some(g => g.id === v) ? v : ''); setFormCategory(coarseOf(v)); } else setFormCategory(v); }}
                        data-testid="form-group"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white"
                      >
                        {ARENA_GROUPS.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.icon} {g.label}
                          </option>
                        ))}
                      </select>
                      {isOptimized() && (
                        <div className="mt-2">
                          <label className="block text-xs font-bold text-slate-400 mb-1">2ᵉ muscle travaillé (facultatif)</label>
                          <select
                            value={formMuscle2 || secondGroupOf({ catalogId: formCatalogId, name: formCustomName, category: formCategory, type: formType, muscle: formMuscle }) || 'none'}
                            onChange={e => setFormMuscle2(e.target.value)}
                            data-testid="form-group2"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white"
                          >
                            <option value="none">Aucun</option>
                            {FINE_GROUPS.map(g => (
                              <option key={g.id} value={g.id}>{g.icon} {g.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {formType === 'strength' && (
                    <div className="space-y-1.5" data-testid="measure-block">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-300"><Art name="gauge" />Comment se mesure l’exercice ?</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'body', art: 'muscle', title: 'Poids du corps', desc: 'avec aide ou sans' },
                          { id: 'kg', art: 'dumbbell', title: 'Charge en kg', desc: 'barre, haltères, machine' },
                          { id: 'timed', art: 'timer', title: 'Durée', desc: 'gainage, planche…' },
                        ].map(m => (
                          <button key={m.id} type="button" disabled={!canChangeMeasure && measure !== m.id} data-testid={`measure-${m.id}`} onClick={() => changeMeasure(m.id)}
                            className={`p-2 rounded-xl border text-left transition ${measure === m.id ? 'bg-indigo-600 border-indigo-400 text-white shadow' : 'bg-slate-950 border-slate-800 text-slate-300'} ${!canChangeMeasure && measure !== m.id ? 'opacity-40' : 'hover:border-slate-600'}`}>
                            <div className="text-xs font-black"><Art name={m.art} size={15} className="mr-1" />{m.title}</div>
                            <div className="text-xs opacity-80 mt-0.5">{m.desc}</div>
                          </button>
                        ))}
                      </div>
                      {!canChangeMeasure && <p className="text-xs text-slate-500">Cet exercice a déjà des séances enregistrées : sa mesure ne peut plus changer. Pour une autre mesure, ajoute-le comme nouvel exercice.</p>}
                    </div>
                  )}
                  </div>
                  </details>

                  {formType === 'strength' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <label className="block text-xs font-black uppercase tracking-wider text-pink-300">
                        <Art name="target" />Type d’objectif
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            id: 'weight_only',
                            title: 'Poids (kg)',
                            desc: 'Atteindre un poids en kg'
                          },
                          {
                            id: 'reps_only',
                            title: formTimed ? 'Durée' : 'Répétitions',
                            desc: formTimed ? 'Secondes à tenir' : 'Nombre de reps cible'
                          },
                          {
                            id: 'sets_reps',
                            title: formTimed ? 'Séries × Secondes' : 'Séries × répétitions',
                            desc: formTimed ? 'Ex: 3 séries de 30 s' : 'Ex: 3 séries de 6 reps'
                          },
    			{
                            id: 'free_mode',
                            title: 'Mode libre',
                            desc: 'Sans objectif fixe'
                          }
                        ].map(mode => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              setFormGoalMode(mode.id);
                              if (mode.id === 'weight_only') setFormUnit('kg');
                            }}
                            className={`p-2.5 rounded-xl border text-left transition ${
                              formGoalMode === mode.id
                                ? 'bg-pink-600 border-pink-400 text-white shadow'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xs font-black">{mode.title}</div>
                            <div className="text-xs opacity-80 mt-0.5">{mode.desc}</div>
                          </button>
                        ))}
                      </div>

                      {formGoalMode === 'sets_reps' && (
                        <div className="space-y-2.5 pt-2">
                          <div className="flex flex-wrap gap-1.5">
                            {(formTimed ? TIMED_PRESETS : SETS_REPS_PRESETS).map(preset => {
                              const active =
                                Number(formGoalSets) === preset.sets &&
                                Number(formGoalReps) === preset.reps;
                              return (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    setFormGoalSets(preset.sets);
                                    setFormGoalReps(preset.reps);
                                    if (formUnit === 'reps') setFormGoalValue(preset.reps);
                                  }}
                                  className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition ${
                                    active
                                      ? 'bg-indigo-600 border-indigo-400 text-white'
                                      : 'bg-slate-900 border-slate-800 text-slate-300'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-1">
                                Nombre de séries cibles
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="15"
                                value={formGoalSets}
                                onChange={e => setFormGoalSets(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 text-center font-black text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-1">
                                {formTimed ? 'Secondes par série' : 'Répétitions par série'}
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="600"
                                value={formGoalReps}
                                onChange={e => {
                                  setFormGoalReps(e.target.value);
                                  if (formUnit === 'reps') setFormGoalValue(e.target.value);
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 text-center font-black text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {formGoalMode === 'reps_only' && (
                        <div className="pt-2">
                          <label className="block text-xs font-bold text-pink-200 mb-1">
                            {formTimed ? 'Durée à atteindre (secondes)' : 'Objectif de répétitions à atteindre'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={formGoalReps}
                            onChange={e => {
                              setFormGoalReps(e.target.value);
                              if (formUnit === 'reps') setFormGoalValue(e.target.value);
                            }}
                            className="w-full bg-slate-950 border border-pink-500/40 rounded-xl py-2 text-center font-black text-white"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {formType === 'strength' && formUnit === 'reps' && formTimed && formGoalMode !== 'weight_only' && (
                    <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-4 space-y-3">
                      {formTimed && (() => {
                        const adv = timedAdvice(formCustomName);
                        return (
                          <div className="space-y-2">
                            <p className="text-xs text-cyan-100">{adv.tip} Le coach ajoutera environ 5 secondes par séance jusqu’à ton objectif.</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1">Durée de départ (secondes, 1re série)</label>
                                <input type="number" min="1" max="600" value={formStartValue}
                                  onChange={e => { setFormStartValue(e.target.value); if (!editingQuestId) setFormCurrentValue(e.target.value); }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-bold text-white" />
                              </div>
                              <div className="flex items-end">
                                <button type="button" onClick={() => {
                                  setFormGoalMode('sets_reps');
                                  setFormStartValue(adv.start);
                                  if (!editingQuestId) setFormCurrentValue(adv.start);
                                  setFormGoalSets(adv.sets);
                                  setFormGoalReps(adv.reps);
                                  setFormGoalValue(adv.reps);
                                }} className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black">
                                  Appliquer les valeurs conseillées ({adv.sets} × {adv.reps} s, départ {adv.start} s)
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {formType === 'strength' && formUnit === 'reps' && !formTimed && formGoalMode !== 'weight_only' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-violet-300 mb-1">
                            <Art name="band" />Charge de départ (kg)
                          </label>
                          <SignedKgInput testId="signed-start" assist={formStartAssistanceKg} onAssist={setFormStartAssistanceKg}
                            className="w-full bg-slate-900 border border-violet-500/30 rounded-xl py-2 text-center font-bold text-violet-200" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-emerald-300 mb-1">
                            <Art name="target" />Charge objectif (kg)
                          </label>
                          <SignedKgInput testId="signed-goal" assist={formGoalAssistanceKg} onAssist={setFormGoalAssistanceKg}
                            className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl py-2 text-center font-bold text-emerald-300" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400" data-testid="signed-hint">
                        <b>−10</b> = 10 kg d’aide élastique · <b>0</b> = poids du corps seul. Plus le nombre se rapproche de 0, plus tu es autonome. Pour ajouter du poids (lest), choisis « Charge en kg ».
                      </p>
                    </div>
                  )}

                  {formType === 'strength' && (formUnit === 'kg' || formGoalMode === 'weight_only') && (
                    <div className="grid grid-cols-2 gap-3 bg-slate-950 border border-slate-800 rounded-xl p-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">
                          Charge de départ (kg)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={formStartValue}
                          onChange={e => {
                            setFormStartValue(e.target.value);
                            if (!editingQuestId) setFormCurrentValue(e.target.value);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-bold text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-300 mb-1">
                          Charge Objectif (kg)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={formGoalValue}
                          onChange={e => setFormGoalValue(e.target.value)}
                          className="w-full bg-slate-900 border border-amber-500/40 rounded-xl py-2 text-center font-black text-amber-300"
                        />
                      </div>
                    </div>
                  )}

                  {formType === 'cardio' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setFormGoalMode('distance_duration')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${formGoalMode !== 'free_mode' ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400'}`}>Mode Objectif</button>
                        <button type="button" onClick={() => setFormGoalMode('free_mode')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${formGoalMode === 'free_mode' ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400'}`}>Mode libre</button>
                      </div>
                      {formGoalMode !== 'free_mode' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Départ ({formUnit})</label>
                            <input type="number" step="0.5" value={formStartValue} onChange={e => { setFormStartValue(e.target.value); setFormCurrentValue(e.target.value); }} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-bold text-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-emerald-300 mb-1">Objectif ({formUnit})</label>
                            <input type="number" step="0.5" value={formGoalValue} onChange={e => setFormGoalValue(e.target.value)} className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl py-2 text-center font-black text-emerald-300" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3 bg-slate-900 border-t border-slate-800 rounded-b-2xl flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setQuestModalOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-bold bg-slate-800 text-slate-300"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-sm font-black bg-pink-600 text-white"
                    >
                      {editingQuestId ? 'Enregistrer l’objectif' : pick('Créer la quête', 'Créer l’exercice')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
  );
}
