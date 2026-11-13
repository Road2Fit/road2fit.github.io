import { DAY_THEMES, dayTypeOf, setDayType } from '../../coach/dayTheme';
import { DAY_STYLES, dayStylesOf, plyoPackFor, plyoQuests, setDayStyle, toggleDayStyle } from '../../coach/contraction';
import { EXERCISE_CATALOG } from '../../data/catalog';
import { makeQuestFromCatalog } from '../../lib/questFactory';

/**
 * 4.36 : choisir le thème de la séance d'un jour (haut, bas, push, pull, complet) ; « Auto » = le coach décide.
 * 4.42-4.43 : et la ou les façons de travailler (pauses iso, tenues iso, excentrique, explosif, pliométrie) : plusieurs à la
 * fois = séance mixte ; « Normale » = séries classiques. Pliométrie sans exercice de sauts suivi : ceux du sport sont ajoutés.
 */
export function DayThemePicker({ coach, date, today, updateCoach, gameState = null, setGameState = null, prefix = 'day-theme' }) {
  if (!date || !updateCoach) return null;
  const cur = dayTypeOf(coach, date);
  const sty = dayStylesOf(coach, date);
  const pick = t => updateCoach({ dayTypes: setDayType(coach, date, t, today) });
  const toggle = id => {
    const next = toggleDayStyle(coach, date, id, today);
    const adding = id === 'plyo' && !sty.includes('plyo');
    if (adding && gameState && setGameState && !plyoQuests(gameState).length) {
      // pliométrie choisie sans exercice de sauts : on ajoute ceux du sport (ou le programme général)
      setGameState(prev => {
        const have = new Set((prev.quests || []).map(q => q.catalogId));
        const ids = plyoPackFor(prev.coach && prev.coach.sport).filter(x => /^ply_/.test(x));
        const list = (ids.length ? ids : plyoPackFor(null)).filter(x => !have.has(x));
        const fresh = list.map(x => EXERCISE_CATALOG.find(c => c.id === x)).filter(Boolean).map(c => makeQuestFromCatalog(c, prev, today, 'pliométrie').quest);
        return { ...prev, quests: [...prev.quests, ...fresh], coach: { ...prev.coach, dayStyles: next } };
      });
      return;
    }
    updateCoach({ dayStyles: next });
  };
  const chip = (id, label, on, fn, tid) => (
    <button key={id} type="button" onClick={fn} aria-pressed={on} data-testid={tid}
      className={`tap-free px-2.5 py-1.5 rounded-lg text-xs font-black border ${on ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{label}</button>
  );
  return (
    <div className="space-y-2" data-testid={prefix}>
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400">Thème de la séance</p>
        <div className="flex flex-wrap gap-1.5">
          {chip('auto', 'Auto', !cur, () => pick(null), `${prefix}-auto`)}
          {DAY_THEMES.map(t => chip(t.id, t.short, cur === t.id, () => pick(t.id), `${prefix}-${t.id}`))}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400">Façon de travailler <span className="font-normal text-slate-500">(plusieurs possibles)</span></p>
        <div className="flex flex-wrap gap-1.5">
          {chip('normal', 'Normale', !sty.length, () => updateCoach({ dayStyles: setDayStyle(coach, date, null, today) }), `${prefix}-style-normal`)}
          {DAY_STYLES.map(s => chip(s.id, s.short, sty.includes(s.id), () => toggle(s.id), `${prefix}-style-${s.id}`))}
        </div>
        {sty.length > 0 && (
          <ul className="space-y-0.5" data-testid={`${prefix}-style-note`}>
            {DAY_STYLES.filter(s => sty.includes(s.id)).map(s => <li key={s.id} className="text-[11px] text-slate-400"><b className="text-slate-200">{s.label}</b> : {s.help}</li>)}
            {sty.filter(x => x !== 'plyo').length > 1 && <li className="text-[11px] text-slate-400">Séance mixte : le coach répartit ces façons entre les exercices (l’explosif sur les gros exercices). Chaque exercice reste réglable au crayon.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
