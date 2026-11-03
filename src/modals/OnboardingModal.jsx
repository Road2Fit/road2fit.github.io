import { useMemo, useState } from 'react';
import { EXERCISE_CATALOG } from '../data/catalog';
import { getTodayISODate } from '../lib/dates';
import { GOALS, STARTER_EXERCISES, applyOnboarding } from '../lib/onboarding';
import { stripAccents } from '../lib/text';
import { SPORTS, sportInfo } from '../data/sports';
import { AccountForm } from '../components/AccountForm';
import { BEGINNER_STARTERS, LEVELS } from '../coach/experience';
import { BreakPicker, cleanExperience, ExperienceSources, ExpertFields, LevelPicker } from '../components/coach/ExperienceForm';

// Assistant d'accueil (édition neutre) : quelques écrans courts pour régler le coach d'après la personne.
// Tout est modifiable ensuite (onglet Coach, Exercices, Mes maxima, ⚙️).
const field = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white placeholder:text-slate-600';
const label = 'block text-xs font-bold text-slate-400 mb-1';
const chip = on => `px-3 py-2 rounded-xl border text-sm font-bold ${on ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`;
const DAYS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mer'], [4, 'Jeu'], [5, 'Ven'], [6, 'Sam'], [0, 'Dim']];
const byId = id => EXERCISE_CATALOG.find(c => c.id === id);

const STEP_NAMES = { welcome: 'Bienvenue', you: 'Toi', goal: 'Objectif et muscles', org: 'Organisation', ex: 'Exercices', expert: 'Ton entraînement en détail', sport: 'Sport régulier', backup: 'Sauvegarde', done: 'Terminé' };
const stepsFor = level => ['welcome', 'you', 'goal', 'org', 'ex', ...(level === 'expert' ? ['expert'] : []), 'sport', 'backup', 'done'];
const starterSel = () => Object.fromEntries(BEGINNER_STARTERS.filter(byId).map(id => [id, {}]));

function Toggle({ on, onClick, children, testid }) {
  return <button type="button" onClick={onClick} aria-pressed={on} data-testid={testid} className={chip(on)}>{children}</button>;
}

export function OnboardingModal({ sync, setGameState, onDone, triggerToast }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState({
    name: '', sex: 'm', age: '', heightCm: '', weightKg: '', targetKg: '', goal: 'nsp', sessionsPerWeek: 3, sessionMinutes: 60,
    gymDays: [], sport: '', sportDays: [], exercises: starterSel(), muscleMode: 'simple', level: 'beginner', experience: {},
  });
  const STEPS = stepsFor(a.level);
  const key = STEPS[step];
  const [search, setSearch] = useState('');
  const patch = p => setA(x => ({ ...x, ...p }));
  const toggleDay = (key, d) => patch({ [key]: a[key].includes(d) ? a[key].filter(x => x !== d) : [...a[key], d] });
  const setEx = (id, p) => patch({ exercises: { ...a.exercises, [id]: { ...(a.exercises[id] || {}), ...p } } });
  // débutant : exercices de départ cochés d'office ; avancé / expert : on part d'une liste vide (exercices déjà pratiqués)
  const untouched = Object.keys(a.exercises).sort().join() === Object.keys(starterSel()).sort().join() && Object.values(a.exercises).every(v => !Object.keys(v).length);
  const setLevel = level => patch({ level, exercises: level === 'beginner' ? (Object.keys(a.exercises).length ? a.exercises : starterSel()) : untouched ? {} : a.exercises });
  const setXp = p => patch({ experience: { ...a.experience, ...p } });
  const toggleEx = id => { const n = { ...a.exercises }; if (n[id]) delete n[id]; else n[id] = {}; patch({ exercises: n }); };

  const found = useMemo(() => {
    const q = stripAccents(search.trim().toLowerCase());
    if (q.length < 2) return [];
    return EXERCISE_CATALOG.filter(c => c.type === 'strength' && !STARTER_EXERCISES.includes(c.id) && stripAccents(c.name.toLowerCase()).includes(q)).slice(0, 6);
  }, [search]);
  const base = a.level === 'beginner' ? BEGINNER_STARTERS : STARTER_EXERCISES;
  const listed = [...base, ...Object.keys(a.exercises).filter(id => !base.includes(id))].map(byId).filter(Boolean);
  const expert = a.level === 'expert';

  const finish = () => {
    const today = getTodayISODate();
    const exercises = Object.entries(a.exercises).map(([catalogId, v]) => (a.level === 'beginner' ? { catalogId } : { catalogId, ...v }));
    const ce = cleanExperience(a.level, a.experience);
    setGameState(prev => applyOnboarding(prev, { ...a, exercises, experience: ce }, today));
    triggerToast('C’est prêt !', 'Ton coach est réglé. Tu peux tout modifier plus tard.', 0, '✅');
    onDone();
  };
  const skip = () => { setGameState(prev => ({ ...prev, onboarded: true })); onDone(); };


  const needSession = Number(a.sessionsPerWeek) >= 1;
  const canNext = key === 'you' ? Number(a.weightKg) > 0 : key === 'org' ? needSession : true;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950 overflow-y-auto" role="dialog" aria-label="Assistant d’accueil" data-testid="onboarding">
      <div className="min-h-full max-w-lg mx-auto p-4 pt-8 pb-24 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-sky-300">Étape {step + 1} / {STEPS.length} · {STEP_NAMES[key]}</p>
          {step < STEPS.length - 1 && <button type="button" onClick={skip} className="text-xs font-bold text-slate-500 underline">Passer l’assistant</button>}
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-sky-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

        {key === 'welcome' && (
          <section className="space-y-3">
            <h2 className="text-2xl font-black text-white">Bienvenue 👋</h2>
            <p className="text-sm text-slate-300">Cette appli suit ta musculation : un coach qui prépare tes séances, un journal, tes records et ta progression. Quelques questions (3 minutes) pour tout régler à ton niveau. Tu peux passer ou modifier chaque réponse plus tard.</p>
            <div><label className={label} htmlFor="ob-name">Ton prénom</label><input id="ob-name" value={a.name} onChange={e => patch({ name: e.target.value })} className={field} placeholder="Léa" autoComplete="given-name" /></div>
            <div>
              <p className={label}>Ton niveau réel en musculation</p>
              <LevelPicker level={a.level} onChange={setLevel} />
            </div>
            <p className="text-xs text-slate-500">Tes données restent sur ton téléphone (et dans ta sauvegarde personnelle, à l’étape Sauvegarde). Personne d’autre n’y a accès. Les conseils du coach sont des repères généraux, pas un avis médical.</p>
          </section>
        )}

        {key === 'you' && (
          <section className="space-y-3">
            <h2 className="text-xl font-black text-white">Toi</h2>
            <p className="text-xs text-slate-400">Sert à estimer tes dépenses de calories et à adapter les conseils.</p>
            <div className="flex gap-2"><Toggle on={a.sex === 'm'} onClick={() => patch({ sex: 'm' })}>Homme</Toggle><Toggle on={a.sex === 'f'} onClick={() => patch({ sex: 'f' })}>Femme</Toggle></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className={label} htmlFor="ob-age">Âge</label><input id="ob-age" inputMode="numeric" value={a.age} onChange={e => patch({ age: e.target.value })} className={field} placeholder="30" /></div>
              <div><label className={label} htmlFor="ob-h">Taille (cm)</label><input id="ob-h" inputMode="numeric" value={a.heightCm} onChange={e => patch({ heightCm: e.target.value })} className={field} placeholder="175" /></div>
              <div><label className={label} htmlFor="ob-w">Poids (kg)</label><input id="ob-w" inputMode="decimal" value={a.weightKg} onChange={e => patch({ weightKg: e.target.value })} className={field} placeholder="70" /></div>
            </div>
            <div><label className={label} htmlFor="ob-t">Poids visé (kg), si tu en as un</label><input id="ob-t" inputMode="decimal" value={a.targetKg} onChange={e => patch({ targetKg: e.target.value })} className={field} placeholder="même qu’aujourd’hui" /></div>
          </section>
        )}

        {key === 'goal' && (
          <section className="space-y-3">
            <h2 className="text-xl font-black text-white">Ton objectif principal</h2>
            <p className="text-xs text-slate-400">Il choisit ton « profil de travail » (nombre de répétitions, charges, repos). Tu pourras le changer dans l’onglet Coach.</p>
            <div className="space-y-2 pt-1" data-testid="muscle-mode-choice">
              <h3 className="text-base font-black text-white pt-2">Comment suivre tes muscles ?</h3>
              <button type="button" onClick={() => patch({ muscleMode: 'simple' })} aria-pressed={a.muscleMode === 'simple'} data-testid="mode-simple" className={`${chip(a.muscleMode === 'simple')} w-full text-left`}>
                🟢 Simplifié <span className="block text-xs font-semibold opacity-90">5 grands groupes : pectoraux, dos, jambes, épaules &amp; bras, abdominaux. Facile à suivre, idéal pour débuter.</span>
              </button>
              <button type="button" onClick={() => patch({ muscleMode: 'optimized' })} aria-pressed={a.muscleMode === 'optimized'} data-testid="mode-optimized" className={`${chip(a.muscleMode === 'optimized')} w-full text-left`}>
                🎯 Optimisé <span className="block text-xs font-semibold opacity-90">14 muscles suivis séparément (biceps, triceps, avant-bras, quadriceps, ischios, fessiers, mollets…). Le coach répartit le travail pour que tout le corps soit couvert. Modifiable à tout moment dans ⚙️.</span>
              </button>
            </div>
            <div className="space-y-2">{GOALS.map(g => <button key={g.id} type="button" data-testid={`goal-${g.id}`} onClick={() => patch({ goal: g.id })} aria-pressed={a.goal === g.id} className={`${chip(a.goal === g.id)} w-full text-left`}>{g.icon} {g.label}</button>)}</div>
          </section>
        )}

        {key === 'org' && (
          <section className="space-y-3">
            <h2 className="text-xl font-black text-white">Ton organisation</h2>
            <div>
              <p className={label}>Séances de musculation par semaine</p>
              <div className="flex gap-2">{[1, 2, 3, 4, 5, 6].map(n => <Toggle key={n} on={a.sessionsPerWeek === n} onClick={() => patch({ sessionsPerWeek: n })}>{n}</Toggle>)}</div>
            </div>
            <div>
              <p className={label}>Durée d’une séance</p>
              <div className="flex flex-wrap gap-2">{[30, 45, 60, 75, 90].map(n => <Toggle key={n} on={a.sessionMinutes === n} onClick={() => patch({ sessionMinutes: n })}>{n} min</Toggle>)}</div>
            </div>
            <div>
              <p className={label}>Jours où tu peux t’entraîner (laisse vide si tous)</p>
              <div className="flex flex-wrap gap-2">{DAYS.map(([d, n]) => <Toggle key={d} on={a.gymDays.includes(d)} onClick={() => toggleDay('gymDays', d)}>{n}</Toggle>)}</div>
            </div>
          </section>
        )}

        {key === 'ex' && (
          <section className="space-y-3">
            <h2 className="text-xl font-black text-white">{a.level === 'beginner' ? 'Tes premiers exercices' : 'Ce que tu as déjà fait'}</h2>
            {a.level === 'beginner' && <p className="text-xs text-slate-400">Le coach a choisi pour toi des machines simples à régler, une par grand mouvement. Décoche ce que tu ne veux pas ; il proposera des charges prudentes et les ajustera après tes premières séances.</p>}
            {a.level === 'advanced' && <p className="text-xs text-slate-400">Coche les exercices que tu as déjà pratiqués et indique ta meilleure série récente : « 80 kg pour 5 répétitions » (1 répétition = ton maximum). Le coach part de là, sans programme de débutant.</p>}
            {expert && <p className="text-xs text-slate-400">Pour chaque exercice pratiqué : ta meilleure série (et sa date) et ta séance type actuelle (séries × répétitions × charge). Le coach repart de ta séance type.</p>}
            {a.level === 'advanced' && <BreakPicker value={a.experience.breakMonths} onChange={v => setXp({ breakMonths: v })} />}
            <div className="space-y-2">
              {listed.map(c => {
                const on = !!a.exercises[c.id];
                const v = a.exercises[c.id] || {};
                return (
                  <div key={c.id} className={`rounded-xl border p-2.5 ${on ? 'border-sky-500/60 bg-sky-950/20' : 'border-slate-800 bg-slate-900'}`}>
                    <label className="flex items-center gap-2 text-sm font-bold text-white">
                      <input type="checkbox" checked={on} onChange={() => toggleEx(c.id)} data-testid={`ex-${c.id}`} className="accent-sky-400 w-4 h-4" />
                      <span>{c.icon} {c.name}</span>
                    </label>
                    {on && a.level !== 'beginner' && c.unit === 'kg' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div><label className={label}>Charge (kg)</label><input inputMode="decimal" value={v.kg || ''} onChange={e => setEx(c.id, { kg: e.target.value })} className={field} placeholder="80" data-testid={`kg-${c.id}`} /></div>
                        <div><label className={label}>pour combien de répétitions</label><input inputMode="numeric" value={v.reps || ''} onChange={e => setEx(c.id, { reps: e.target.value })} className={field} placeholder="1 = maximum" /></div>
                      </div>
                    )}
                    {on && expert && (
                      <div className="mt-2 space-y-2" data-testid={`work-${c.id}`}>
                        {c.unit === 'kg' && <div><label className={label}>Date de cette meilleure série</label><input type="date" value={v.date || ''} onChange={e => setEx(c.id, { date: e.target.value })} className={field} /></div>}
                        <p className={label}>Séance type actuelle</p>
                        <div className="grid grid-cols-3 gap-2">
                          <input inputMode="numeric" value={v.workSets || ''} onChange={e => setEx(c.id, { workSets: e.target.value })} className={field} placeholder="séries" aria-label="séries" data-testid={`wsets-${c.id}`} />
                          <input inputMode="numeric" value={v.workReps || ''} onChange={e => setEx(c.id, { workReps: e.target.value })} className={field} placeholder="reps" aria-label="répétitions" data-testid={`wreps-${c.id}`} />
                          {c.unit === 'kg' && <input inputMode="decimal" value={v.workKg || ''} onChange={e => setEx(c.id, { workKg: e.target.value })} className={field} placeholder="kg" aria-label="charge en kg" data-testid={`wkg-${c.id}`} />}
                        </div>
                      </div>
                    )}
                    {on && a.level !== 'beginner' && c.unit === 'reps' && (
                      <div className="mt-2"><label className={label}>Maximum de répétitions d’affilée</label><input inputMode="numeric" value={v.reps || ''} onChange={e => setEx(c.id, { reps: e.target.value })} className={field} placeholder="12" /></div>
                    )}
                  </div>
                );
              })}
            </div>
            <div>
              <label className={label} htmlFor="ob-search">Un autre exercice ?</label>
              <input id="ob-search" value={search} onChange={e => setSearch(e.target.value)} className={field} placeholder="Chercher (ex : hack squat)" />
              <div className="flex flex-wrap gap-1.5 mt-2">{found.map(c => <button key={c.id} type="button" onClick={() => { toggleEx(c.id); setSearch(''); }} className={chip(false)}>+ {c.name}</button>)}</div>
            </div>
          </section>
        )}

        {key === 'expert' && (
          <section className="space-y-3" data-testid="ob-expert">
            <h2 className="text-xl font-black text-white">Ton entraînement en détail</h2>
            <p className="text-xs text-slate-400">Tout est facultatif. Le coach s’en sert pour ton volume, tes formes de séries, tes cycles et ce qu’il doit éviter.</p>
            <ExpertFields exp={a.experience} onChange={setXp} />
            <ExperienceSources />
          </section>
        )}

        {key === 'sport' && (
          <section className="space-y-3">
            <h2 className="text-xl font-black text-white">Un sport régulier ?</h2>
            <p className="text-xs text-slate-400">Choisis ton sport, puis ses jours habituels : le coach évitera de te faire travailler les jambes la veille, gardera de l’énergie le jour J, comptera ton endurance et te proposera une préparation adaptée à ce sport. Tu pourras aussi ajouter tes matchs (onglet Coach).</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Sport">
              <Toggle on={!a.sport} onClick={() => patch({ sport: '', sportDays: [] })} testid="sport-none">Aucun</Toggle>
              {SPORTS.map(s => <Toggle key={s.id} on={a.sport === s.id} onClick={() => patch({ sport: s.id })} testid={`sport-${s.id}`}>{s.icon} {s.cap}</Toggle>)}
            </div>
            {a.sport && <p className="text-xs text-slate-300">Jours habituels de {sportInfo(a.sport).label} :</p>}
            {a.sport && <div className="flex flex-wrap gap-2">{DAYS.map(([d, n]) => <Toggle key={d} on={a.sportDays.includes(d)} onClick={() => toggleDay('sportDays', d)} testid={`sportday-${d}`}>{n}</Toggle>)}</div>}
            <p className="text-xs text-slate-500">Tes autres activités (vélo, natation, randonnée…) s’ajoutent ensuite avec le bouton « + » → « Activité annexe ».</p>
          </section>
        )}

        {key === 'backup' && (
          <section className="space-y-3" data-testid="ob-backup">
            <h2 className="text-xl font-black text-white">Ton compte ☁️</h2>
            <p className="text-sm text-slate-300">Crée un compte (e-mail + mot de passe) : tes données sont alors <strong>sauvegardées automatiquement</strong> dans ton espace personnel, et tu les retrouves en te reconnectant sur n’importe quel téléphone.</p>
            <AccountForm sync={sync} />
            <p className="text-xs text-slate-500">Tu peux le faire plus tard (⚙️ → Mon compte), mais sans compte tes données ne sont que sur ce téléphone.</p>
          </section>
        )}

        {key === 'done' && (
          <section className="space-y-3" data-testid="ob-done">
            <h2 className="text-2xl font-black text-white">Tout est prêt{a.name ? `, ${a.name}` : ''} ✅</h2>
            <ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">
              <li>Niveau : {(LEVELS.find(l => l.id === a.level) || {}).label}</li>
              <li>{a.sessionsPerWeek} séance(s) par semaine de {a.sessionMinutes} min</li>
              <li>Suivi des muscles : {a.muscleMode === 'optimized' ? 'optimisé (14 muscles)' : 'simplifié (5 grands groupes)'}</li>
              <li>Profil de travail : {(GOALS.find(g => g.id === a.goal) || {}).label}</li>
              <li>{Object.keys(a.exercises).length} exercice(s) créé(s) avec ta charge de départ</li>
              {a.sport && <li>{sportInfo(a.sport).icon} {sportInfo(a.sport).cap} pris en compte ({a.sportDays.length} jour(s) par semaine)</li>}
              <li>{sync.configured ? 'Sauvegarde automatique réglée' : '⚠️ Sauvegarde automatique non réglée : tes données ne sont que sur ce téléphone'}</li>
            </ul>
            <p className="text-xs text-slate-400">Ouvre l’onglet Coach pour voir ta première séance. Tout se modifie ensuite dans les onglets Coach, Exercices et Mes maxima.</p>
          </section>
        )}

        <div className="flex gap-2 pt-2">
          {step > 0 && <button type="button" onClick={() => setStep(s => s - 1)} className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm font-bold">← Retour</button>}
          {step < STEPS.length - 1
            ? <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext} data-testid="ob-next" className="flex-1 px-4 py-3 rounded-xl bg-sky-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-black">{key === 'backup' && !sync.configured ? 'Plus tard →' : 'Suivant →'}</button>
            : <button type="button" onClick={finish} data-testid="ob-finish" className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-black">Commencer</button>}
        </div>
      </div>
    </div>
  );
}
