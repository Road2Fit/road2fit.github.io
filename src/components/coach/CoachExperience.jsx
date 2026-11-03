import { useState } from 'react';
import { Art } from '../Art';
import { experienceCoachPatch, getExperience, LEVELS } from '../../coach/experience';
import { getCoachSettings } from '../../coach/settings';
import { getTodayISODate } from '../../lib/dates';
import { BreakPicker, cleanExperience, ExperienceSources, ExpertFields, LevelPicker } from './ExperienceForm';

/** Coach → Réglages → « Mon niveau » : niveau réel et, pour un expert, la fiche détaillée. */
export function CoachExperience({ gameState, setGameState, onOpenMaxima }) {
  const cur = getExperience(gameState);
  const [editing, setEditing] = useState(false);
  const [level, setLevel] = useState(cur ? cur.level : 'beginner');
  const [exp, setExp] = useState(cur || {});

  const save = () => {
    const today = getTodayISODate();
    const clean = cleanExperience(level, exp);
    setGameState(prev => {
      const coach = getCoachSettings(prev);
      // avancé / expert : les exercices déjà suivis sont des exercices connus (formes variées possibles tout de suite)
      const quests = level === 'beginner' ? prev.quests : (prev.quests || []).map(q => (q.type === 'strength' ? { ...q, known: true } : q));
      return { ...prev, quests, coach: { ...coach, ...experienceCoachPatch(coach, clean, today) } };
    });
    setEditing(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs" data-testid="coach-experience">
      <h3 className="text-sm font-black text-white"><Art name="trophy" />Mon niveau</h3>
      {!editing ? (
        <>
          <p className="text-slate-300">{cur ? <><strong>{(LEVELS.find(l => l.id === cur.level) || {}).label}</strong> : {(LEVELS.find(l => l.id === cur.level) || {}).text}</> : 'Pas encore précisé : le coach te considère comme débutant tant que tu as peu de séances.'}</p>
          {cur && cur.level === 'expert' && (
            <p className="text-slate-400">
              {[cur.years ? `${cur.years} an(s) de pratique` : '', cur.weeklySets ? `${cur.weeklySets} séries par muscle et par semaine` : '', (cur.methods || []).length ? `${cur.methods.length} forme(s) de séries connue(s)` : '', (cur.priorities || []).length ? `priorité : ${cur.priorities.join(', ')}` : '', cur.periodization === 'blocks' ? 'par blocs' : ''].filter(Boolean).join(' · ')}
            </p>
          )}
          <button type="button" onClick={() => setEditing(true)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white font-bold" data-testid="experience-edit">Modifier mon niveau</button>
        </>
      ) : (
        <>
          <LevelPicker level={level} onChange={setLevel} />
          {level === 'advanced' && (
            <>
              <BreakPicker value={exp.breakMonths} onChange={v => setExp(x => ({ ...x, breakMonths: v }))} />
              <p className="text-slate-400">Indique tes records dans « Mes maxima » : le coach s’en sert pour tes charges.{onOpenMaxima && <> <button type="button" onClick={onOpenMaxima} className="underline font-bold text-sky-300">Ouvrir Mes maxima</button></>}</p>
            </>
          )}
          {level === 'expert' && <ExpertFields exp={exp} onChange={p => setExp(x => ({ ...x, ...p }))} />}
          <div className="flex gap-2">
            <button type="button" onClick={save} className="flex-1 px-3 py-2 rounded-lg bg-pink-600 text-white font-black" data-testid="experience-save">Enregistrer</button>
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white font-bold">Annuler</button>
          </div>
        </>
      )}
      <ExperienceSources />
    </div>
  );
}
