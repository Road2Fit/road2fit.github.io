import { useMemo, useState } from 'react';
import { coachStep } from '../coach/settings';
import { MaxCard } from '../components/MaxCard';
import { ARENA_GROUPS } from '../data/arenas';
import { getTodayISODate } from '../lib/dates';
import { estimateQuestMax } from '../lib/maxima';
import { arenaOf } from '../data/muscles';

const RPE_KEY = 'rondoufit:maxUseRpe';
const readRpe = () => { try { return localStorage.getItem(RPE_KEY) === '1'; } catch (e) { return false; } };

export function MaximaTab({ gameState, setGameState }) {
  const today = getTodayISODate();
  const [useRpe, setUseRpe] = useState(readRpe);
  const toggleRpe = v => {
    setUseRpe(v);
    try { localStorage.setItem(RPE_KEY, v ? '1' : '0'); } catch (e) {}
  };

  const groups = useMemo(() => {
    const quests = (gameState.quests || []).filter(q => q.type === 'strength' || q.type === 'cardio');
    return ARENA_GROUPS.map(a => ({
      arena: a,
      items: quests
        .filter(q => arenaOf(q) === a.id)
        .map(q => ({ q, result: estimateQuestMax(q, gameState, { useRpe, today }) })),
    })).filter(g => g.items.length);
  }, [gameState.quests, gameState.maxRecords, gameState.weightHistory, gameState.userWeightKg, useRpe, today]);

  const save = (id, rec) =>
    setGameState(prev => ({ ...prev, maxRecords: { ...(prev.maxRecords || {}), [id]: { ...rec, date: getTodayISODate() } } }));
  const clear = id =>
    setGameState(prev => {
      const { [id]: _removed, ...rest } = prev.maxRecords || {};
      return { ...prev, maxRecords: rest };
    });

  return (
    <div className="space-y-6">
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <h2 className="text-lg font-black text-white">Mes maxima</h2>
        <p className="text-sm text-slate-300">Ce que tu pourrais soulever en une seule répétition, estimé d’après tes séances.</p>
        <details className="text-sm text-slate-300">
          <summary className="text-xs font-bold text-slate-400">Comment lire ces chiffres</summary>
        <p className="mt-2">
          Pour chaque exercice, une estimation de ce que tu pourrais faire en <strong>une seule répétition</strong> (charge maximale), calculée d’après ce que tu as déjà réussi.
          Tu peux aussi noter ton <strong>record réel</strong> : il sert alors de référence pour tes charges de travail. Les estimations ont une marge d’erreur (souvent 5 à 10 %) ;
          elles sont les plus fiables avec des séries courtes (3 à 5 répétitions). Ce n’est pas un test de maximum : n’essaie un vrai 1 répétition qu’échauffé, avec un partenaire et en sécurité.
        </p>
        </details>
        <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" checked={useRpe} onChange={e => toggleRpe(e.target.checked)} className="mt-0.5" />
          <span>
            <strong>Tenir compte de l’effort ressenti</strong> : une séance notée « 8/10 » compte comme si tu avais encore 2 répétitions en réserve (méthode RPE/RIR). L’estimation monte, mais elle n’est juste que si tu notes honnêtement ton effort.
          </span>
        </label>
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer font-bold text-slate-300">📚 Comment c’est calculé (sources)</summary>
          <ul className="mt-2 space-y-1.5 list-disc pl-5">
            <li><strong>Charges :</strong> moyenne de 7 équations de prédiction du 1RM (Epley 1985, Brzycki 1993, Lander 1985, Lombardi 1989, Mayhew 1992, O’Conner 1989, Wathen 1994) appliquées à tes séries de 1 à 15 répétitions. Aucune n’est la meilleure pour tous les exercices : une étude de 2024 comparant neuf équations sur le développé couché, le squat et le curl le confirme (
              <a className="text-pink-300 underline" href="https://doaj.org/article/248a0c4089a641d5b87f1ca3f9770895" target="_blank" rel="noreferrer">Int. J. Strength Cond.</a>
              ). Epley et Brzycki viennent de manuels d’entraînement plutôt que d’études (la première vient d’un manuel de l’université du Nebraska), Mayhew a été ajustée sur 435 étudiants au développé couché.</li>
            <li><strong>Effort ressenti (option) :</strong> échelle RPE basée sur les répétitions en réserve, Zourdos et al., 2016, <em>J. Strength Cond. Res.</em> 30(1):267-275 (
              <a className="text-pink-300 underline" href="https://doi.org/10.1519/JSC.0000000000001049" target="_blank" rel="noreferrer">lien</a>
              ). On limite à 3 répétitions en réserve pour rester prudent.</li>
            <li><strong>Tractions, dips, pompes, exercices assistés :</strong> charge réellement soulevée = poids du corps × coefficient − aide. Pompes : 64 % du poids du corps, genoux 49 % (Ebben et al., 2011, <em>J. Strength Cond. Res.</em>). Pour les tractions et les dips, aucune mesure équivalente n’a été trouvée : on compte le poids du corps entier (approximation).</li>
            <li><strong>Charges de travail :</strong> tableau classique % du 1RM ↔ répétitions (NSCA, Baechle &amp; Earle, <em>Essentials of Strength Training and Conditioning</em>).</li>
            <li><strong>Cardio :</strong> formule de Riegel, T₂ = T₁ × (D₂/D₁)<sup>1,06</sup> (Riegel, 1977 et 1981), valable pour des efforts de 3,5 à 230 minutes ; fiable surtout pour des distances proches. Elle ne tient pas compte du dénivelé, de la météo ni de ton entraînement sur la distance visée.</li>
            <li><strong>Exercices chronométrés (gainage…) :</strong> aucune formule validée : on affiche ta meilleure tenue observée.</li>
          </ul>
        </details>
      </section>

      {groups.length === 0 && (
        <p className="text-sm text-slate-400">Ajoute des exercices et enregistre quelques séances : tes maxima apparaîtront ici.</p>
      )}

      {groups.map(({ arena, items }) => (
        <section key={arena.id} className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-pink-300">{arena.icon} {arena.label}</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map(({ q, result }) => (
              <MaxCard
                key={q.id}
                quest={q}
                result={result}
                step={coachStep(q, Number(q.currentValue) || 0)}
                onSave={rec => save(q.id, rec)}
                onClear={() => clear(q.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
