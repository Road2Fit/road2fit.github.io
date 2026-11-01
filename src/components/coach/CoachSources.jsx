import { COACH_SOURCES } from '../../coach/labels';
import { card } from './ui';

export function CoachSources({ setShowSources, showSources }) {
  return (
    <section className={card}>
      <button onClick={() => setShowSources(s => !s)} className="w-full flex items-center justify-between text-left">
        <h3 className="font-black text-white">Sources scientifiques</h3>
        <span className="text-xs text-pink-300 font-bold">{showSources ? 'Masquer' : 'Afficher'}</span>
      </button>
      {showSources && (
        <div className="space-y-2.5">
          <p className="text-xs text-slate-400">
            ✔ = source consultée en ligne pour ce coach ; ◐ = référence réelle dont j’ai vérifié le titre, mais dont le chiffre cité vient de ma mémoire et que tu peux vérifier. Les études portent sur des groupes, pas sur toi en particulier.
          </p>
          {COACH_SOURCES.map((s, i) => (
            <div key={i} className="text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <p className="text-slate-200"><b>{s.ok ? '✔' : '◐'}</b> {s.text}</p>
              <p className="text-slate-400 mt-0.5">→ {s.use}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
