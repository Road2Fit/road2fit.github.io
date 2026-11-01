import { coachDateFR, coachFmt } from '../../coach/labels';
import { card } from './ui';
import { sportInfo } from '../../data/sports';

export function CoachWeightHealth({
  activity, coach, gameState, nutrition, onQuickCardio, pace, protein, setGameState, strengthTrend,
  updateCoach,
}) {
  return (
    <section className={card}>
      <h3 className="font-black text-white">Poids & activité</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <span className="text-xs font-bold uppercase text-slate-400 block">Poids actuel</span>
          <span className="text-lg font-black text-white">{coachFmt(pace.current)} kg</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <span className="text-xs font-bold uppercase text-slate-400 block">Poids cible</span>
          <input type="number" min="35" max="250" step="0.5" value={gameState.targetWeightKg}
            onChange={e => setGameState(prev => ({ ...prev, targetWeightKg: Math.max(35, Number(e.target.value) || 75) }))}
            className="w-full bg-transparent text-lg font-black text-emerald-300 outline-none" />
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <span className="text-xs font-bold uppercase text-slate-400 block">Rythme (4 sem.)</span>
          <span className="text-lg font-black text-white">{pace.unknown ? '—' : `${coachFmt(pace.kgWeek)} kg/sem.`}</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <span className="text-xs font-bold uppercase text-slate-400 block">Arrivée estimée</span>
          <span className="text-lg font-black text-white">{pace.eta ? coachDateFR(pace.eta.date).slice(0, 5) : '—'}</span>
        </div>
      </div>
      <p className="text-xs text-slate-300">
        {pace.unknown && 'Ajoute au moins 2 pesées espacées de 5 jours pour obtenir ton rythme.'}
        {!pace.unknown && pace.level === 'ok' && `Rythme de ${coachFmt(Math.abs(pace.pct))} % du poids par semaine : dans la zone généralement recommandée (environ 0,5 à 1 %).`}
        {!pace.unknown && pace.level === 'fast' && `Rythme de ${coachFmt(Math.abs(pace.pct))} % par semaine : rapide. Au-delà d’environ 1 %, le risque de perdre du muscle augmente (Garthe 2011). Vérifie tes apports et tes protéines.`}
        {!pace.unknown && pace.level === 'slow' && `Rythme de ${coachFmt(Math.abs(pace.pct))} % par semaine : lent ou stable. Si l’objectif est de perdre du poids, ajoute de l’activité ou ajuste l’alimentation.`}
        {!pace.unknown && pace.eta && ` Au rythme actuel, ${coachFmt(pace.target)} kg vers le ${coachDateFR(pace.eta.date)}.`}
      </p>
      {strengthTrend && (
        <p className={`text-xs rounded-xl border p-3 ${!pace.unknown && pace.level === 'fast' && strengthTrend.pct <= -3 ? 'bg-rose-950/30 border-rose-500/40 text-rose-100' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
          Ta force estimée a varié de <b>{strengthTrend.pct > 0 ? '+' : ''}{coachFmt(strengthTrend.pct)} %</b> sur environ 4 semaines ({strengthTrend.n} exercice(s) avec charge).{' '}
          {!pace.unknown && pace.level === 'fast' && strengthTrend.pct <= -3 && 'Tu perds du poids vite ET de la force : c’est le signe possible d’une perte de muscle. Ralentis le déficit et vérifie tes protéines (Garthe 2011).'}
          {!pace.unknown && pace.level !== 'slow' && strengthTrend.pct >= -2 && 'Tu perds du poids en gardant ta force : c’est exactement ce qu’on cherche.'}
          {!pace.unknown && pace.level === 'slow' && strengthTrend.pct >= 2 && 'Poids stable et force en hausse : tu fais de la recomposition corporelle.'}
        </p>
      )}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
        <p className="font-bold text-slate-200">Calories (estimation)</p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" placeholder="Taille (cm)" value={(coach.profile || {}).heightCm} onChange={e => updateCoach({ profile: { ...(coach.profile || {}), heightCm: e.target.value } })} className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white" />
          <input type="number" placeholder="Âge" value={(coach.profile || {}).age} onChange={e => updateCoach({ profile: { ...(coach.profile || {}), age: e.target.value } })} className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white" />
          {[['m', 'Homme'], ['f', 'Femme']].map(([v, l]) => (
            <button key={v} onClick={() => updateCoach({ profile: { ...(coach.profile || {}), sex: v } })} className={`px-2.5 py-1.5 rounded-lg border font-bold ${((coach.profile || {}).sex || 'm') === v ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{l}</button>
          ))}
        </div>
        {nutrition.needsProfile ? (
          <p className="text-slate-400">Renseigne ta taille, ton âge et ton sexe pour obtenir une estimation de tes besoins. Ces données restent dans ta sauvegarde.</p>
        ) : (
          <div className="space-y-1 text-slate-300">
            <p>Métabolisme de base ≈ <b>{nutrition.bmr} kcal</b> · dépense totale ≈ <b>{nutrition.tdee} kcal/jour</b> (dont ≈ {nutrition.exKcal} kcal d’activité par jour sur 4 semaines).</p>
            {nutrition.losing ? (
              <p>Pour perdre environ <b>{coachFmt(nutrition.kgWeek)} kg par semaine</b> (≈ {coachFmt((nutrition.kgWeek / nutrition.weight) * 100)} % du poids) : vise <b>≈ {nutrition.goalKcal} kcal/jour</b> (déficit d’environ {nutrition.deficit} kcal).{nutrition.capped ? ` Le déficit est limité pour ne pas descendre sous ${nutrition.floor} kcal.` : ''}</p>
            ) : (
              <p>Tu as atteint ou dépassé ton poids cible : pour le maintenir, vise environ <b>{nutrition.tdee} kcal/jour</b>.</p>
            )}
            <p className="text-xs text-slate-500">Estimation (formule de Mifflin-St Jeor, marge d’erreur d’environ 10 à 15 %) : ajuste selon l’évolution réelle de ta balance sur 2 à 3 semaines. Ce n’est pas un avis médical.</p>
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
          <p className="font-bold text-slate-200">Cette semaine</p>
          <p className="text-slate-300">Endurance ({sportInfo(coach.sport).label} et cardio) : <b>{activity.aerobicMin} min</b> / 150 min minimum</p>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-sky-500" style={{ width: `${Math.min(100, (activity.aerobicMin / 150) * 100)}%` }} /></div>
          <p className="text-slate-300">Renforcement : <b>{activity.strengthDays} jour(s)</b> / 2 minimum</p>
          {activity.aerobicMin < 150 && (
            <button onClick={onQuickCardio} className="mt-1 px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold">+ Ajouter du cardio</button>
          )}
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
          <p className="font-bold text-slate-200">Repère protéines</p>
          <p className="text-slate-300">Environ <b>{Math.round(protein * 1.6)} à {Math.round(protein * 2.2)} g par jour</b> (1,6 à 2,2 g/kg) pour préserver le muscle pendant une perte de poids (Morton 2018).</p>
          <p className="text-slate-500">Repère général : adapte-le avec un professionnel de santé si besoin.</p>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Conseil cardio : en phase de perte de poids, vise 150 à 250 minutes d’endurance par semaine ; {sportInfo(coach.sport).poss} compte. Une marche inclinée ou un vélo en intensité modérée un jour sans muscu est une bonne option (ACSM 2009).
      </p>
    </section>
  );
}
