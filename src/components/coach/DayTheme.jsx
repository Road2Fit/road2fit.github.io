import { DAY_THEMES, dayTypeOf, setDayType } from '../../coach/dayTheme';

/** 4.36 : choisir le thème de la séance d'un jour (haut, bas, push, pull, complet) ; « Auto » = le coach décide. */
export function DayThemePicker({ coach, date, today, updateCoach, prefix = 'day-theme' }) {
  if (!date || !updateCoach) return null;
  const cur = dayTypeOf(coach, date);
  const pick = t => updateCoach({ dayTypes: setDayType(coach, date, t, today) });
  const chip = (id, label, on) => (
    <button key={id} type="button" onClick={() => pick(id === 'auto' ? null : id)} aria-pressed={on} data-testid={`${prefix}-${id}`}
      className={`tap-free px-2.5 py-1.5 rounded-lg text-xs font-black border ${on ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{label}</button>
  );
  return (
    <div className="space-y-1" data-testid={prefix}>
      <p className="text-xs font-bold text-slate-400">Thème de la séance</p>
      <div className="flex flex-wrap gap-1.5">
        {chip('auto', 'Auto', !cur)}
        {DAY_THEMES.map(t => chip(t.id, t.short, cur === t.id))}
      </div>
    </div>
  );
}
