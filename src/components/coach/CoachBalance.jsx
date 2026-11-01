import { useState } from 'react';
import { coachFmt } from '../../coach/labels';
import { coachSuggestExercises } from '../../coach/suggest';
import { card } from './ui';
import { pick } from '../../edition';
import { isOptimized } from '../../data/muscles';
import { EVIDENCE_LABEL, VOLUME_SOURCES } from '../../data/volumeSources';
import { MuscleBodyMap } from './MuscleBodyMap';

const COLOR = { good: 'bg-emerald-500', mid: 'bg-amber-400', low: 'bg-rose-500', high: 'bg-violet-400' };

export function CoachBalance({ balance, gameState, lowRows, onAddExercise }) {
  const [showSources, setShowSources] = useState(false);
  const optimized = isOptimized();
  const alerts = balance.alerts || [];
  const profileLabel = { puissance: 'force', hypertrophie: 'prise de muscle', endurance: 'endurance de force' }[balance.profile];
  return (
    <section className={card}>
      <h3 className="font-black text-white">Équilibre des {pick('arènes', 'groupes musculaires')} <span className="text-xs text-slate-400 font-semibold">(séries par semaine, moyenne sur 4 semaines)</span></h3>
      {optimized && <MuscleBodyMap rows={balance.rows} />}
      <div className="space-y-2">
        {balance.rows.map(r => {
          const color = COLOR[r.status] || COLOR.low;
          const scale = optimized ? r.band.max : r.band.good;
          return (
            <div key={r.arena}>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-slate-200">{r.arena}</span>
                <span className="text-slate-400 text-right">
                  {coachFmt(r.avg)} séries/sem. · cible {r.band.min}-{r.band.good}{optimized ? ` (max ${r.band.max})` : '+'} · {coachFmt(r.perWeekFreq)} séance(s)/sem.
                </span>
              </div>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${color}`} style={{ width: `${Math.min(100, (r.avg / scale) * 100)}%` }} />
                {optimized && <div className="absolute top-0 h-full w-px bg-white/50" style={{ left: `${Math.min(100, (r.band.good / scale) * 100)}%` }} title="Cible" />}
              </div>
              {optimized && (r.missing > 0 || r.status === 'high') && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {r.status === 'high'
                    ? 'Au-delà du volume utile : les séries en plus rapportent peu et fatiguent. Tu peux en retirer ou les mettre ailleurs.'
                    : `Il te manque environ ${r.missing} série${r.missing > 1 ? 's' : ''} par semaine pour atteindre la cible.`}
                  {r.band.evidence !== 'forte' && <span className="text-slate-500"> ({EVIDENCE_LABEL[r.band.evidence]})</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {optimized ? (
        <div className="text-xs text-slate-500 space-y-1">
          <p>
            Repères adaptés à ton objectif{profileLabel ? ` (${profileLabel})` : ''}{balance.beginner ? ' et à ton niveau (débutant : moins de 12 semaines de suivi)' : ''}. Un exercice à deux muscles compte une série pour le principal et une demi-série pour l’autre.
          </p>
          <button type="button" onClick={() => setShowSources(v => !v)} className="underline text-slate-400" data-testid="toggle-sources">
            {showSources ? 'Masquer' : 'Voir'} les études derrière ces repères
          </button>
          {showSources && (
            <ul className="space-y-1 list-disc pl-4" data-testid="sources-list">
              {VOLUME_SOURCES.map(s => <li key={s.id}><b className="text-slate-300">{s.short}</b> : {s.text}</li>)}
              <li>Pour les mollets, avant-bras, abdominaux, lombaires, adducteurs/abducteurs et obliques, on n’a pas trouvé d’étude directe : ces repères sont des estimations prudentes.</li>
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Repères : au moins 2 séances par semaine par groupe (Schoenfeld 2016) et environ 10 séries/semaine pour gagner du muscle (Schoenfeld 2017). Pendant une perte de poids, 6 séries ou plus suffisent généralement pour conserver sa masse musculaire (Spiering 2021).
        </p>
      )}
      {balance.ratio !== null && (
        <p className="text-xs text-slate-300">
          Haut du corps : <b>{balance.push}</b> séries de poussée contre <b>{balance.pull}</b> de tirage (rapport tirage/poussée {coachFmt(balance.ratio)}).{' '}
          {balance.ratio < 0.8 ? 'Pense à ajouter du tirage (dos, oiseau, face pull) pour équilibrer les épaules.' : balance.ratio > 1.6 ? 'Tu tires beaucoup plus que tu ne pousses : un peu plus de poussée équilibrerait.' : 'Bon équilibre.'}{' '}
          <span className="text-slate-500">(Pratique courante, preuves limitées.)</span>
        </p>
      )}
      {alerts.map(al => (
        <div key={al.id} className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 space-y-1.5" data-testid={`alert-${al.id}`}>
          <p>{al.text}</p>
          <div className="flex flex-wrap gap-1.5">
            {al.arenas.flatMap(a => coachSuggestExercises(gameState, a, 2)).map(c => (
              <button key={c.id} onClick={() => onAddExercise(c.id)} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold">
                + {c.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      {lowRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-rose-300">Groupes à travailler davantage :</p>
          {lowRows.map(r => {
            const sug = coachSuggestExercises(gameState, r.arena, 2);
            if (!sug.length) return null;
            return (
              <div key={r.arena} className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-300 font-bold">{r.arena} :</span>
                {sug.map(c => (
                  <button key={c.id} onClick={() => onAddExercise(c.id)} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold">
                    + {c.name}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
