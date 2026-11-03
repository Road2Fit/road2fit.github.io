import { BREAKS, LEVELS, PERIODIZATIONS } from '../../coach/experience';
import { METHODS } from '../../coach/methods';
import { COACH_ARENAS } from '../../coach/settings';
import { EXPERIENCE_SOURCES } from '../../data/experienceSources';

// Choix du niveau (débutant / avancé / expert) et fiche détaillée de l'expert.
// Utilisé par l'assistant d'accueil et par Coach → Réglages → « Mon niveau ».
const field = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white placeholder:text-slate-600';
const lab = 'block text-xs font-bold text-slate-400 mb-1';
const chip = on => `px-3 py-2 rounded-xl border text-xs font-bold ${on ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`;

export function LevelPicker({ level, onChange }) {
  return (
    <div className="space-y-2" data-testid="level-choice">
      {LEVELS.map(l => (
        <button key={l.id} type="button" onClick={() => onChange(l.id)} aria-pressed={level === l.id} data-testid={`level-${l.id}`}
          className={`${chip(level === l.id)} w-full text-left text-sm`}>
          {l.label}<span className="block text-xs font-semibold opacity-90">{l.text}</span>
        </button>
      ))}
    </div>
  );
}

export function BreakPicker({ value, onChange }) {
  return (
    <div>
      <p className={lab}>Depuis quand ?</p>
      <div className="flex flex-wrap gap-2">
        {BREAKS.map(b => <button key={b.id} type="button" onClick={() => onChange(b.id)} aria-pressed={Number(value || 0) === b.id} data-testid={`break-${b.id}`} className={chip(Number(value || 0) === b.id)}>{b.label}</button>)}
      </div>
    </div>
  );
}

const toggle = (list, x) => (list.includes(x) ? list.filter(y => y !== x) : [...list, x]);

/** Fiche de l'expert : exp = coach.experience (sans le niveau), onChange(patch). */
export function ExpertFields({ exp, onChange }) {
  const methods = exp.methods || [];
  const prio = exp.priorities || [];
  return (
    <div className="space-y-3" data-testid="expert-fields">
      <div className="grid grid-cols-2 gap-2">
        <div><label className={lab} htmlFor="xp-years">Années de pratique régulière</label><input id="xp-years" inputMode="numeric" value={exp.years || ''} onChange={e => onChange({ years: e.target.value })} className={field} placeholder="5" data-testid="xp-years" /></div>
        <div><label className={lab} htmlFor="xp-sets">Séries par muscle et par semaine (en ce moment)</label><input id="xp-sets" inputMode="numeric" value={exp.weeklySets || ''} onChange={e => onChange({ weeklySets: e.target.value })} className={field} placeholder="12" data-testid="xp-sets" /></div>
      </div>
      <BreakPicker value={exp.breakMonths} onChange={v => onChange({ breakMonths: v })} />
      <label className="flex items-start gap-2 text-xs text-slate-300">
        <input type="checkbox" checked={!!exp.rir} onChange={e => onChange({ rir: e.target.checked })} className="mt-0.5 accent-sky-400" data-testid="xp-rir" />
        <span>Je sais estimer mes répétitions en réserve (RPE) : le coach et « Mes maxima » tiennent compte de mon ressenti.</span>
      </label>
      <div>
        <p className={lab}>Formes de séries que je connais (si tu demandes de la variété, le coach ne proposera que celles-ci)</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(METHODS).filter(([id]) => id !== 'straight').map(([id, m]) => (
            <button key={id} type="button" onClick={() => onChange({ methods: toggle(methods, id) })} aria-pressed={methods.includes(id)} data-testid={`xp-method-${id}`} className={chip(methods.includes(id))}>{m.label}</button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Rien de coché : le coach peut toutes les proposer.</p>
      </div>
      <div>
        <p className={lab}>Muscles à faire progresser en priorité (une série de plus)</p>
        <div className="flex flex-wrap gap-1.5">
          {COACH_ARENAS.map(a => <button key={a} type="button" onClick={() => onChange({ priorities: toggle(prio, a) })} aria-pressed={prio.includes(a)} className={chip(prio.includes(a))}>{a}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lab} htmlFor="xp-period">Organisation sur plusieurs semaines</label>
          <select id="xp-period" value={exp.periodization || 'none'} onChange={e => onChange({ periodization: e.target.value })} className={field} data-testid="xp-period">
            {PERIODIZATIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lab} htmlFor="xp-deload">Semaine allégée toutes les… semaines</label>
          <input id="xp-deload" inputMode="numeric" value={exp.deloadEvery || ''} onChange={e => onChange({ deloadEvery: e.target.value })} className={field} placeholder="aucune" data-testid="xp-deload" />
        </div>
      </div>
      <div>
        <label className={lab} htmlFor="xp-limits">Blessures, douleurs, exercices à éviter</label>
        <textarea id="xp-limits" rows={2} value={exp.limits || ''} onChange={e => onChange({ limits: e.target.value })} className={field} placeholder="Ex : épaule droite fragile, pas de développé nuque" data-testid="xp-limits" />
        <p className="text-[11px] text-slate-500 mt-1">Retenu par le coach IA. Ce n’est pas un avis médical : en cas de douleur, demande à un professionnel de santé.</p>
      </div>
    </div>
  );
}

/** Nettoie la fiche avant de l'enregistrer (nombres, bornes). */
export function cleanExperience(level, exp) {
  const n = (v, lo, hi) => { const x = Math.round(Number(String(v || '').replace(',', '.'))); return Number.isFinite(x) && x >= lo && x <= hi ? x : 0; };
  if (level !== 'expert') return { level, breakMonths: n(exp.breakMonths, 0, 120) };
  return {
    level,
    years: n(exp.years, 0, 60),
    breakMonths: n(exp.breakMonths, 0, 120),
    weeklySets: n(exp.weeklySets, 0, 40),
    rir: !!exp.rir,
    methods: (exp.methods || []).filter(m => METHODS[m]),
    priorities: exp.priorities || [],
    periodization: exp.periodization === 'blocks' ? 'blocks' : 'none',
    deloadEvery: n(exp.deloadEvery, 0, 12),
    limits: String(exp.limits || '').trim().slice(0, 200),
  };
}

export function ExperienceSources() {
  return (
    <details className="text-xs text-slate-400">
      <summary className="cursor-pointer font-bold text-slate-300">Sur quoi s’appuie le coach</summary>
      <ul className="mt-2 space-y-1.5">
        {EXPERIENCE_SOURCES.map(s => <li key={s.ref}>{s.mark} <a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.ref}</a> : {s.use}</li>)}
      </ul>
    </details>
  );
}
