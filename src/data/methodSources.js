// Formes de séries et objectifs : études retrouvées en ligne le 02/11/2026.
// ✔ = résultat lu dans le résumé publié ; ◐ = référence réelle, chiffres lus dans un résumé secondaire (à vérifier dans l'article).
// Ne jamais ajouter de source sans l'avoir retrouvée en ligne.
export const METHOD_SOURCES = {
  krzysztofik2019: { mark: '✔', ref: 'Krzysztofik et al. 2019, Int J Environ Res Public Health (revue systématique)', finding: 'Méthodes avancées (dégressives, repos-pause, supersets, pyramides…) : utiles pour varier et gagner du temps, preuves insuffisantes pour des consignes précises.', url: 'https://pubmed.ncbi.nlm.nih.gov/31817252/' },
  advanced2026: { mark: '◐', ref: 'Méta-analyse 2026, adultes entraînés (J Funct Morphol Kinesiol)', finding: 'Pas de supériorité générale des systèmes avancés sur les séries classiques ; petit avantage possible du repos-pause pour le muscle.', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12922048/' },
  coleman2022: { mark: '✔', ref: 'Coleman et al. 2022, Int J Strength Cond (méta-analyse)', finding: 'Dégressives contre séries classiques : différence de muscle négligeable (taille d’effet 0,08), mais plus rapides.', url: 'https://doaj.org/article/11aedadd407647bd869d527e5fdf64a3' },
  sodal2023: { mark: '✔', ref: 'Sødal et al. 2023, Sports Medicine (méta-analyse)', finding: 'Dégressives : autant de muscle que des séries classiques, certaines en deux à trois fois moins de temps.', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10390395/' },
  angleri2017: { mark: '✔', ref: 'Angleri et al. 2017, Eur J Appl Physiol', finding: 'Pyramide montante, dégressives et séries classiques à volume égal pendant 12 semaines : mêmes gains de muscle (+7,5 à 7,8 %) et de force.', url: 'https://bv.fapesp.br/en/publicacao/128339/crescent-pyramid-and-drop-set-systems-do-not-promote-greater' },
  prestes2019: { mark: '✔', ref: 'Prestes et al. 2019, J Strength Cond Res', finding: 'Repos-pause chez des pratiquants entraînés : force comparable, plus d’endurance musculaire et de muscle aux cuisses (petit échantillon).', url: 'https://pubmed.ncbi.nlm.nih.gov/28617715/' },
  enes2021: { mark: '✔', ref: 'Enes et al. 2021, Appl Physiol Nutr Metab', finding: 'À volume égal, repos-pause et dégressives : même muscle que les séries classiques ; plus de force avec le repos-pause.', url: 'https://pubmed.ncbi.nlm.nih.gov/34260860/' },
  latella2019: { mark: '✔', ref: 'Latella et al. 2019, Sports Medicine (méta-analyse, 25 études)', finding: 'Séries fractionnées : la vitesse, la puissance et la force baissent moins au cours de la séance.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/pmid/31506904' },
  davies2021: { mark: '◐', ref: 'Davies et al. 2021 (revue systématique, effets à long terme)', finding: 'Séries fractionnées et classiques : mêmes gains de force, de puissance et de vitesse sur la durée.', url: 'https://edisciplinas.usp.br/pluginfile.php/8499875/mod_resource/content/0/intervalo_entre_repeticoes_forca_hipertrofia_davies_2021.pdf' },
  robbins2010: { mark: '✔', ref: 'Robbins et al. 2010, J Strength Cond Res', finding: 'Supersets de muscles opposés (développé + tirage) : plus de travail par minute que des séries classiques.', url: 'https://vuir.vu.edu.au/6830/' },
  zhang2025: { mark: '◐', ref: 'Zhang et al. 2025 (méta-analyse sur les supersets)', finding: 'Supersets : séances plus courtes, gains de force et de muscle comparables aux séries classiques ; muscles opposés préférables.', url: 'https://www.fisiologiadelejercicio.com/wp-content/uploads/2025/11/The-Acute-and-Chronic-Effects-of-Superset.pdf' },
  wolf2023: { mark: '◐', ref: 'Wolf et al. 2023 et revue 2025 (amplitude et longueur du muscle)', finding: 'Amplitude complète en général préférable ; travailler en position étirée paraît favorable au muscle.', url: 'https://www.strongerbyscience.com/stretch-mediated-hypertrophy/' },
  helms2018: { mark: '✔', ref: 'Helms et al. 2018, Frontiers in Physiology', finding: 'Régler la charge au ressenti (RPE) ou au % du max : mêmes progrès, petit avantage de force possible avec le ressenti.', url: 'https://www.frontiersin.org/articles/10.3389/fphys.2018.00247/text' },
  grgic2017: { mark: '✔', ref: 'Grgic et al. 2017, PeerJ (méta-analyse)', finding: 'Périodisation linéaire ou ondulante : mêmes gains de muscle.', url: 'https://peerj.com/articles/3695' },
  schoenfeld2017: { mark: '✔', ref: 'Schoenfeld, Ogborn et Krieger 2017, J Sports Sci (méta-analyse)', finding: 'Plus de séries par semaine pour un muscle = plus de muscle, de façon graduelle.', url: 'https://researchgate.net/profile/Brad-Schoenfeld/publication/305455324_Dose-response_relationship_between_weekly_resistance_training_volume_and_increases_in_muscle_mass_A_systematic_review_and_meta-analysis/links/59dc0269458515e9ab4527d6/Dose-response-relationship-between-weekly-resistance-training-volume-and-increases-in-muscle-mass-A-systematic-review-and-meta-analysis.pdf' },
  robinson2024: { mark: '◐', ref: 'Robinson et al. 2024, Sports Medicine (méta-analyse)', finding: 'Finir les séries plus près de l’échec fait plus de muscle ; la force, elle, progresse de façon semblable sur une large plage.', url: 'https://biolayne.com/reps/issue-32/the-failure-factor-the-relationship-between-proximity-to-failure-and-strength-and-hypertrophy/' },
};

// Ce que le coach met en place pour chaque type d'objectif, et les études sur lesquelles il s'appuie
export const GOAL_GUIDES = {
  strength: {
    label: 'Plus de force sur un exercice',
    points: [
      'Séries lourdes (environ 3 à 6 répétitions) sur cet exercice : série lourde + séries allégées, ou séries fractionnées pour garder la vitesse.',
      'Pas besoin d’aller à l’échec pour la force : garde 1 à 2 répétitions en réserve.',
      'La charge suit ton ressenti et tes meilleures séries (max estimé), séance après séance.',
    ],
    sources: ['robinson2024', 'latella2019', 'helms2018'],
  },
  muscle: {
    label: 'Plus de muscle sur un groupe',
    points: [
      'Une série de plus sur les exercices de ce groupe : le muscle grossit avec le nombre de séries par semaine (repère : 10 ou plus).',
      'Séries proches de l’échec (0 à 2 répétitions en réserve) sur les exercices d’isolation.',
      'Dégressives, repos-pause, myo-reps et supersets pour faire ce volume sans allonger la séance.',
    ],
    sources: ['schoenfeld2017', 'robinson2024', 'sodal2023', 'enes2021'],
  },
  reps: {
    label: 'Plus de répétitions sur un exercice',
    points: [
      'Dernière série au maximum pour mesurer tes progrès, en alternance avec le repos-pause.',
      'Le repos-pause améliore l’endurance musculaire locale.',
      'Les répétitions de chaque série montent avant l’aide ou la charge.',
    ],
    sources: ['prestes2019', 'enes2021'],
  },
  weight: {
    label: 'Perdre du poids en gardant ses muscles',
    points: [
      'Garder la musculation (au moins 6 séries par semaine et par groupe) pour conserver le muscle pendant la perte de poids.',
      'Supersets pour des séances plus denses et plus courtes.',
      'Le déficit vient surtout de l’alimentation : suis tes calories dans le Coach (Poids et santé).',
    ],
    sources: ['zhang2025', 'robbins2010'],
  },
  general: {
    label: 'Forme générale',
    points: [
      'Séries classiques en base, avec de la variété (pyramides, dégressives…) toutes les deux semaines.',
      'Aucune forme n’est magique : à volume égal, elles donnent des résultats proches ; la régularité compte le plus.',
    ],
    sources: ['krzysztofik2019', 'angleri2017', 'grgic2017'],
  },
};
