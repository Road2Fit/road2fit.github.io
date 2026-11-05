import { Art } from './Art';

// Sources du calcul des maxima (affichées sous le maximum, dans la fiche de l'exercice).
export function MaximaSources() {
  return (
    <details className="text-xs text-slate-400">
      <summary className="cursor-pointer font-bold text-slate-300"><Art name="book" />Comment c’est calculé (sources)</summary>
      <ul className="mt-2 space-y-1.5 list-disc pl-5">
        <li><strong>Charges :</strong> moyenne de 7 équations de prédiction du 1RM (Epley 1985, Brzycki 1993, Lander 1985, Lombardi 1989, Mayhew 1992, O’Conner 1989, Wathen 1994) appliquées à tes séries de 1 à 15 répétitions. Aucune n’est la meilleure pour tous les exercices : une étude de 2024 comparant neuf équations sur le développé couché, le squat et le curl le confirme (
          <a className="text-pink-300 underline" href="https://doaj.org/article/248a0c4089a641d5b87f1ca3f9770895" target="_blank" rel="noreferrer">Int. J. Strength Cond.</a>
          ). Epley et Brzycki viennent de manuels d’entraînement plutôt que d’études (la première vient d’un manuel de l’université du Nebraska), Mayhew a été ajustée sur 435 étudiants au développé couché.</li>
        <li><strong>Effort ressenti (toujours pris en compte) :</strong> échelle RPE basée sur les répétitions en réserve, Zourdos et al., 2016, <em>J. Strength Cond. Res.</em> 30(1):267-275 (
          <a className="text-pink-300 underline" href="https://doi.org/10.1519/JSC.0000000000001049" target="_blank" rel="noreferrer">lien</a>
          ). On limite à 3 répétitions en réserve pour rester prudent.</li>
        <li><strong>Tractions, dips, pompes, exercices assistés :</strong> charge réellement soulevée = poids du corps × coefficient − aide. Pompes : 64 % du poids du corps, genoux 49 % (Ebben et al., 2011, <em>J. Strength Cond. Res.</em>). Pour les tractions et les dips, aucune mesure équivalente n’a été trouvée : on compte le poids du corps entier (approximation).</li>
        <li><strong>Charges de travail :</strong> tableau classique % du 1RM ↔ répétitions (NSCA, Baechle &amp; Earle, <em>Essentials of Strength Training and Conditioning</em>).</li>
        <li><strong>Cardio :</strong> formule de Riegel, T₂ = T₁ × (D₂/D₁)<sup>1,06</sup> (Riegel, 1977 et 1981), valable pour des efforts de 3,5 à 230 minutes ; fiable surtout pour des distances proches. Elle ne tient pas compte du dénivelé, de la météo ni de ton entraînement sur la distance visée.</li>
        <li><strong>Exercices chronométrés (gainage…) :</strong> aucune formule validée : on affiche ta meilleure tenue observée.</li>
      </ul>
    </details>
  );
}
