import { DAY_THEMES, dayTypeOf, setDayType } from '../../coach/dayTheme';
import { DAY_STYLES, dayStyleOf, setDayStyle } from '../../coach/contraction';

/**
 * 4.36 : choisir le thème de la séance d'un jour (haut, bas, push, pull, complet) ; « Auto » = le coach décide.
 * 4.42 : et la façon de travailler (isométrie, excentrique, explosif, pliométrie) ; « Normale » = séries classiques.
 */
export function DayThemePicker({ coach, date, today, updateCoach, prefix = 'day-theme' }) {
  if (!date || !updateCoach) return null;
  const cur = dayTypeOf(coach, date);
  const sty = dayStyleOf(coach, date);
  const pick = t => updateCoach({ dayTypes: setDayType(coach, date, t, today) });
  const pickStyle = s => updateCoach({ dayStyles: setDayStyle(coach, date, s, today) });
  const chip = (id, label, on, fn, tid) => (
    <button key={id} type="button" onClick={fn} aria-pressed={on} data-testid={tid}
      className={`tap-free px-2.5 py-1.5 rounded-lg text-xs font-black border ${on ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{label}</button>
  );
  const style = DAY_STYLES.find(s => s.id === sty);
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
        <p className="text-xs font-bold text-slate-400">Façon de travailler</p>
        <div className="flex flex-wrap gap-1.5">
          {chip('normal', 'Normale', !sty, () => pickStyle(null), `${prefix}-style-normal`)}
          {DAY_STYLES.map(s => chip(s.id, s.short, sty === s.id, () => pickStyle(s.id), `${prefix}-style-${s.id}`))}
        </div>
        {style && <p className="text-[11px] text-slate-400" data-testid={`${prefix}-style-note`}>{style.label} : le coach adapte chaque exercice (voir « Pourquoi ? / Ajuster »).</p>}
      </div>
    </div>
  );
}
