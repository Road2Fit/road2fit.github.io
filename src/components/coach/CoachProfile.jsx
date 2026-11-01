import { PROFILES, PROFILE_CHOICES, coachProfileAt } from '../../coach/profiles';
import { card } from './ui';

const selectClass = 'bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white';

function ProfileCard({ id }) {
  const P = PROFILES[id];
  if (!P) {
    return <p className="text-xs text-slate-400">Le coach garde son réglage d’origine : il adapte les répétitions à l’objectif de chaque exercice.</p>;
  }
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
      <p className="text-sm font-black text-white">{P.icon} {P.label}</p>
      <p className="text-xs text-slate-300">{P.summary}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
        {[
          ['Répétitions', `${P.lo} à ${P.hi}`],
          ['Séries', P.sets === P.setsAccessory ? `${P.sets}` : `${P.setsAccessory} à ${P.sets}`],
          ['Charge', `≈ ${P.pctText} du max`],
          ['Repos', P.restText],
        ].map(([k, v]) => (
          <div key={k} className="bg-slate-900 border border-slate-800 rounded-lg p-1.5">
            <p className="text-xs text-slate-400">{k}</p>
            <p className="text-xs font-black text-pink-300">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Choix du profil de travail du coach : le même tout le temps, ou un profil différent à chaque cycle. */
export function CoachProfile({ coach, today, updateCoach, w0 }) {
  const active = coachProfileAt(coach, today);
  const seq = coach.cycleProfiles || [];
  const perCycle = seq.length > 0 && !!w0.cycle;
  const setSeq = next => updateCoach({ cycleProfiles: next });

  return (
    <section className={card}>
      <h3 className="font-black text-white">🎯 Profil de travail</h3>
      <p className="text-xs text-slate-300">
        Choisis ce que tu veux travailler en ce moment : le coach adapte les <b>répétitions, les séries, le repos et la charge</b> de chaque exercice.
      </p>

      {!perCycle && (
        <div className="space-y-2">
          <select value={PROFILES[coach.workProfile] ? coach.workProfile : 'auto'} onChange={e => updateCoach({ workProfile: e.target.value })} className={selectClass}>
            {PROFILE_CHOICES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <ProfileCard id={coach.workProfile} />
        </div>
      )}

      {perCycle && (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">
            Profil actif cette semaine (cycle {active.cycleIndex + 1}) : <b className="text-pink-300">{active.id ? `${PROFILES[active.id].icon} ${PROFILES[active.id].label}` : 'Automatique'}</b>
          </p>
          <ProfileCard id={active.id} />
          <div className="space-y-1.5">
            {seq.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`w-36 font-bold ${i === active.cycleIndex % seq.length ? 'text-pink-300' : 'text-slate-400'}`}>
                  Cycle {i + 1}{i === active.cycleIndex % seq.length ? ' (en cours)' : ''}
                </span>
                <select value={p} onChange={e => setSeq(seq.map((x, j) => (j === i ? e.target.value : x)))} className={selectClass}>
                  {PROFILE_CHOICES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button onClick={() => setSeq([...seq, seq[seq.length - 1] || 'auto'])} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold">+ Ajouter un cycle</button>
            <button disabled={seq.length <= 1} onClick={() => setSeq(seq.slice(0, -1))} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold disabled:opacity-40">− Retirer le dernier</button>
            <button onClick={() => updateCoach({ cycleProfiles: [], workProfile: active.id || 'auto' })} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold">Même profil tout le temps</button>
          </div>
          <p className="text-xs text-slate-500">Après le dernier cycle de la liste, on recommence au premier. La semaine allégée de fin de cycle garde le profil du cycle.</p>
        </div>
      )}

      {!perCycle && w0.cycle && (
        <button
          onClick={() => {
            const first = PROFILES[coach.workProfile] ? coach.workProfile : 'hypertrophie';
            updateCoach({ cycleProfiles: [first, first === 'puissance' ? 'hypertrophie' : 'puissance'] }); // modifiable ensuite
          }}
          className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-black"
        >
          Un profil différent à chaque cycle
        </button>
      )}
      {!w0.cycle && (
        <p className="text-xs text-slate-500">Astuce : active un cycle d’entraînement ci-dessous pour pouvoir choisir un profil différent à chaque cycle.</p>
      )}

      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer font-bold text-slate-300">📚 Ce que dit la recherche</summary>
        <ul className="mt-2 space-y-1.5 list-disc pl-5">
          <li><b>Repères classiques</b> (ACSM 2009, NSCA) : force = 1 à 6 répétitions à 85 % du max ou plus, repos de 2 à 5 minutes ; hypertrophie = 6 à 12 répétitions à 67-85 %, repos plus courts ; endurance de force = 12 répétitions ou plus à 67 % ou moins (ACSM : 40-60 %), repos de 90 secondes ou moins. Pour progresser, l’ACSM conseille d’augmenter la charge de 2 à 10 % quand on dépasse l’objectif de 1 à 2 répétitions.</li>
          <li><b>Nuance récente</b> (Schoenfeld et al., 2021, <i>Sports</i> 9(2):32 ; Lopez et al., 2021, <i>Med. Sci. Sports Exerc.</i>) : les charges lourdes sont meilleures pour la <b>force maximale</b>, mais le muscle peut grossir sur une large plage de charges si les séries sont proches de l’échec. Les fourchettes de l’appli sont donc des repères pratiques, pas des frontières.</li>
          <li><b>« Puissance »</b> : ici, c’est le travail lourd en peu de répétitions (force maximale). Le travail explosif (vitesse d’exécution, sauts, lancers) est un autre sujet.</li>
          <li>Les charges sont calculées d’après ton <b>max estimé</b> (onglet 💯 Mes maxima) ou ton record réel si tu l’as noté. Au changement de profil, la charge est recalculée d’un coup, avec un plafond de +15 % par prudence.</li>
        </ul>
      </details>
    </section>
  );
}
