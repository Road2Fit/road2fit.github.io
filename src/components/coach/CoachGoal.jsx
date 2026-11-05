import { useMemo, useState } from 'react';
import { Art } from '../Art';
import { goalProgress } from '../../coach/goal';
import { getCoachSettings, COACH_ARENAS } from '../../coach/settings';
import { GOAL_GUIDES, METHOD_SOURCES } from '../../data/methodSources';
import { formatDayFr, getTodayISODate } from '../../lib/dates';

const field = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white';
const PROFILE_FOR = { strength: ['puissance', 'Force'], muscle: ['hypertrophie', 'Prise de muscle'], reps: ['endurance', 'Endurance de force'] };

/**
 * « Mon objectif » : la personne donne un objectif au coach (force sur un exercice, muscle sur un groupe, répétitions,
 * poids, forme générale) ; le coach oriente les séances (formes de séries, séries en plus) d'après les études.
 */
export function CoachGoal({ gameState, setGameState }) {
  const today = getTodayISODate();
  const coach = getCoachSettings(gameState);
  const goal = coach.mainGoal && coach.mainGoal.kind ? coach.mainGoal : null;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ kind: 'strength', questId: '', arena: '', target: '', deadline: '' });
  const strength = (gameState.quests || []).filter(q => q.type === 'strength' && q.goalMode !== 'free_mode');
  const prog = useMemo(() => (goal ? goalProgress(gameState, goal, today) : null), [gameState.quests, gameState.weightHistory, gameState.coach, today]);
  const setCoach = patch => setGameState(prev => ({ ...prev, coach: { ...getCoachSettings(prev), ...patch } }));

  const save = () => {
    const q = strength.find(x => x.id === form.questId);
    const kind = form.kind;
    if ((kind === 'strength' || kind === 'reps') && !q) return;
    if (kind === 'muscle' && !form.arena) return;
    const target = Number(String(form.target).replace(',', '.')) || 0;
    const text = kind === 'strength' ? `${q.name}${target ? ` : ${target} kg (max)` : ''}`
      : kind === 'reps' ? `${q.name}${target ? ` : ${target} répétitions` : ''}`
        : kind === 'muscle' ? `Plus de muscle : ${form.arena}`
          : kind === 'weight' ? `Poids : ${target} kg` : 'Forme générale';
    const cur = (gameState.weightHistory || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).pop();
    setCoach({ mainGoal: { kind, text, questId: q ? q.id : undefined, arena: kind === 'muscle' ? form.arena : undefined, target: target || undefined, deadline: form.deadline || undefined, startWeight: kind === 'weight' ? (cur ? Number(cur.weightKg) : Number(gameState.userWeightKg) || undefined) : undefined, createdAt: today } });
    setEditing(false);
  };

  if (!goal || editing) {
    return (
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3" data-testid="coach-goal">
        <h3 className="font-black text-white"><Art name="target" />{goal ? 'Changer mon objectif' : 'Ton objectif'}</h3>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} data-testid="goal-add" className="w-full py-2.5 rounded-xl bg-pink-600 text-white text-sm font-black">Choisir mon objectif</button>
        ) : (
          <div className="space-y-2">
            <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))} aria-label="Type d’objectif" data-testid="goal-kind" className={field}>
              {Object.entries(GOAL_GUIDES).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
            </select>
            {(form.kind === 'strength' || form.kind === 'reps') && (
              <select value={form.questId} onChange={e => setForm(f => ({ ...f, questId: e.target.value }))} aria-label="Exercice" data-testid="goal-quest" className={field}>
                <option value="">Choisis l’exercice…</option>
                {strength.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            )}
            {form.kind === 'muscle' && (
              <select value={form.arena} onChange={e => setForm(f => ({ ...f, arena: e.target.value }))} aria-label="Groupe musculaire" data-testid="goal-arena" className={field}>
                <option value="">Choisis le groupe…</option>
                {COACH_ARENAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
            {form.kind !== 'general' && form.kind !== 'muscle' && (
              <label className="block text-xs font-bold text-slate-400">{form.kind === 'strength' ? 'Max visé (kg pour 1 répétition)' : form.kind === 'reps' ? 'Répétitions visées en une série' : 'Poids visé (kg)'}
                <input inputMode="decimal" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} data-testid="goal-target" className={field} />
              </label>
            )}
            <label className="block text-xs font-bold text-slate-400">Pour quand ? (facultatif)
              <input type="date" min={today} value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className={field} />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={save} data-testid="goal-save" className="flex-1 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-black">Enregistrer</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold">Annuler</button>
            </div>
          </div>
        )}
      </section>
    );
  }

  const guide = GOAL_GUIDES[goal.kind] || GOAL_GUIDES.general;
  const sugg = PROFILE_FOR[goal.kind];
  return (
    <section className="rounded-2xl border border-emerald-500/40 bg-slate-900 p-4 space-y-3" data-testid="coach-goal">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide">Mon objectif</p>
          <h3 className="font-black text-white">{goal.text}</h3>
          {goal.deadline && <p className="text-xs text-slate-400">Pour le {formatDayFr(goal.deadline)}{prog && prog.weeksLeft !== null ? ` · encore ${prog.weeksLeft} semaine${prog.weeksLeft > 1 ? 's' : ''}` : ''}</p>}
        </div>
        <button type="button" onClick={() => setEditing(true)} className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold">Changer</button>
      </div>
      {prog && prog.label && (
        <div className="space-y-1" data-testid="goal-progress">
          <p className="text-sm text-slate-200">{prog.label}</p>
          {prog.pct !== null && <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${prog.pct}%` }} /></div>}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-xs font-black text-slate-300">Comment le coach t’y emmène</p>
        <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">{guide.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </div>
      {sugg && coach.workProfile !== sugg[0] && (
        <button type="button" onClick={() => setCoach({ workProfile: sugg[0] })} data-testid="goal-profile" className="w-full py-2 rounded-xl bg-slate-800 text-emerald-200 text-xs font-black">Passer mon profil de travail en « {sugg[1]} »</button>
      )}
      <details className="text-xs text-slate-400">
        <summary className="font-bold text-slate-300 cursor-pointer">Ce que disent les études</summary>
        <ul className="mt-2 space-y-1.5">
          {guide.sources.map(id => METHOD_SOURCES[id]).filter(Boolean).map(s => (
            <li key={s.ref}><span className="font-bold text-slate-200">{s.mark} {s.ref}</span> : {s.finding} <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-300 underline">lien</a></li>
          ))}
        </ul>
        <p className="mt-2 text-slate-500">✔ chiffres lus dans le résumé publié ; ◐ référence réelle, chiffres d’un résumé secondaire. Des repères, pas un avis médical.</p>
      </details>
      <button type="button" onClick={() => { if (window.confirm('Retirer cet objectif ?')) setCoach({ mainGoal: null }); }} className="text-xs text-slate-500 hover:text-rose-300">Retirer l’objectif</button>
    </section>
  );
}
