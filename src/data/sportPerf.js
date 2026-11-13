// Entraînement de performance propre à chaque sport (4.42, demande de Gabin : « quelqu'un qui vient de n'importe quel
// sport peut demander au coach un entraînement adapté »). Études retrouvées en ligne le 13/11/2026.
// ✔ = résultat lu dans le résumé publié ; ◐ = référence réelle, chiffres lus dans un résumé secondaire ou preuves faibles.
// Ne jamais ajouter de source sans l'avoir retrouvée en ligne.
//  - focus : ce que le programme vise ; pack : exercices proposés (catalogue) ; perWeek : séances avec des sauts conseillées
//    (0 = pas de pliométrie : escalade, vélo) ; style : façon de travailler conseillée pour certaines séances.
export const SPORT_PERF = {
  volley: {
    focus: 'détente verticale (attaque, contre, service sauté)',
    pack: ['ply_cmj', 'ply_pogo', 'ply_approach_jump', 'ply_block_jump', 'ply_box_jump'], perWeek: 2,
    sources: [
      { mark: '✔', ref: 'Ramirez-Campillo et al. 2020, J Sports Sci Med (méta-analyse, 14 essais)', finding: 'Pliométrie chez les volleyeurs : détente verticale améliorée (effet modéré, d = 0,82), hommes et femmes, même à faible volume et faible fréquence.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7429440' },
    ],
  },
  football: {
    focus: 'sprint, détente et changements de direction',
    pack: ['ply_squat_jump', 'ply_broad_jump', 'ply_single_leg_hop', 'ply_split_jump', 'ply_pogo'], perWeek: 2,
    sources: [
      { mark: '✔', ref: 'Ramirez-Campillo et al. 2020 (méta-analyse, 33 études, 1 499 jeunes footballeurs)', finding: 'Pliométrie : saut vertical et sprint améliorés ; sur 10 m, plus d’effet au-delà de 7 semaines et 14 séances.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7862112' },
      { mark: '◐', ref: 'Thapa et al. 2021 (méta-analyse, 10 essais, 14-23 ans)', finding: 'Musculation + pliométrie combinées : meilleurs sprint, saut et changements de direction ; 8 semaines ou plus paraissent préférables.', url: 'https://repositorio.umayor.cl/xmlui/handle/sibum/8405' },
    ],
  },
  basket: {
    focus: 'détente, vitesse et changements de direction',
    pack: ['ply_cmj', 'ply_pogo', 'ply_box_jump', 'ply_single_leg_hop', 'ply_broad_jump'], perWeek: 2,
    sources: [
      { mark: '✔', ref: 'Zhou et al. 2024 (méta-analyse, 24 études, jeunes basketteurs)', finding: 'Pliométrie : saut, sprint, changements de direction et équilibre améliorés ; meilleurs résultats avec 1 à 2 séances par semaine et des sauts variés.', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11457583/' },
    ],
  },
  handball: {
    focus: 'détente, sprint et vitesse de tir',
    pack: ['ply_cmj', 'ply_single_leg_hop', 'ply_split_jump', 'ply_mb_chest_pass', 'ply_box_jump'], perWeek: 2,
    sources: [
      { mark: '✔', ref: 'Méta-analyse 2024 (20 études, 563 handballeurs)', finding: 'Pliométrie : saut, sprint, force maximale, puissance et agilité améliorés ; pas d’effet sur l’équilibre ; plus efficace au-delà de 8 semaines.', url: 'https://pubmed.ncbi.nlm.nih.gov/38455436/' },
      { mark: '◐', ref: 'Méta-analyse 2023, PLOS One (handball, baseball, water-polo)', finding: 'Vitesse de tir améliorée (ES = 0,78), surtout au-delà de 7 semaines ; certitude faible à modérée.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10351709' },
    ],
  },
  rugby: {
    focus: 'sprint, accélération et puissance',
    pack: ['ply_broad_jump', 'ply_squat_jump', 'ply_box_jump', 'ply_clap_pushup', 'ply_mb_chest_pass'], perWeek: 2,
    sources: [
      { mark: '✔', ref: 'Sanz-Matesanz et al. 2025 (revue systématique, 26 études, 644 joueurs)', finding: 'Le sprint progresse le plus avec musculation + pliométrie + agilité ; le sprint résisté aide l’accélération courte.', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11843853/' },
    ],
  },
  tennis: {
    focus: 'vitesse de service, sprint et appuis',
    pack: ['ply_pogo', 'ply_single_leg_hop', 'ply_split_jump', 'ply_mb_chest_pass', 'ply_mb_slam'], perWeek: 2,
    sources: [
      { mark: '✔', ref: 'Deng et al. 2022, Front Physiol (méta-analyse, 12 études, 443 joueurs)', finding: 'Pliométrie : vitesse de service améliorée (effet modéré, ES = 0,75), petits effets sur le sprint, la puissance et l’agilité ; pas d’effet net sur la précision.', url: 'https://www.frontiersin.org/articles/10.3389/fphys.2022.1024418/full' },
    ],
  },
  badminton: {
    focus: 'puissance, vitesse de déplacement et équilibre',
    pack: ['ply_split_jump', 'ply_single_leg_hop', 'ply_pogo', 'ply_cmj', 'ply_broad_jump'], perWeek: 2,
    sources: [
      { mark: '◐', ref: 'Méta-analyse 2024, Heliyon (11 essais, 445 joueurs)', finding: 'Pliométrie : effets petits à modérés sur la puissance, l’agilité, la vitesse et l’équilibre ; pas sur le temps de réaction ; certitude faible.', url: 'https://doaj.org/article/3a8f634a78a24958a81d49ba787b988d' },
    ],
  },
  hockey: {
    focus: 'accélération et puissance des jambes',
    pack: ['ply_broad_jump', 'ply_single_leg_hop', 'ply_split_jump', 'ply_squat_jump'], perWeek: 1,
    sources: [
      { mark: '◐', ref: 'Knechta, Čillík et Zháněl 2021, Studia Sportiva (33 joueurs de 14-15 ans)', finding: 'Pliométrie : petit effet sur la vitesse de patinage, aucun sur la course : preuves faibles chez les hockeyeurs.', url: 'https://journals.muni.cz/studiasportiva/article/view/14225' },
    ],
  },
  course: {
    focus: 'économie de course (dépenser moins à la même allure)',
    pack: ['ply_pogo', 'ply_single_leg_hop', 'ply_broad_jump', 'squat', 'fp_calf_standing'], perWeek: 1,
    sources: [
      { mark: '✔', ref: 'Méta-analyse 2022, Sports Medicine Open', finding: 'Pour l’économie de course, la musculation lourde (g = −0,32) fait mieux que la pliométrie seule (effet faible et incertain) : les deux se combinent.', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9653533/' },
    ],
  },
  cyclisme: {
    focus: 'force maximale des jambes',
    pack: ['squat', 'leg_press', 'fp_bulgarian', 'fp_rdl', 'fp_step_up'], perWeek: 0,
    sources: [
      { mark: '◐', ref: 'Rønnestad et Mujika 2014, Scand J Med Sci Sports (revue)', finding: 'La musculation lourde ou explosive aide les sports d’endurance ; pour le vélo, les résultats sont moins réguliers que pour la course.', url: 'https://paulogentil.com/pdf/Optimizing%20strength%20training%20for%20running%20and%20cycling%20endurance%20performance%20-%20A%20review.pdf' },
      { mark: '◐', ref: 'Llanos-Lagos, Ramirez-Campillo et Sáez de Villarreal 2025, Eur J Appl Physiol (méta-analyse, cyclistes)', finding: 'Méta-analyse dédiée à la musculation lourde chez les cyclistes (chiffres non lus).', url: 'https://link.springer.com/article/10.1007/s00421-025-05883-2' },
    ],
  },
  natation: {
    focus: 'départs et virages (poussée des jambes)',
    pack: ['ply_cmj', 'ply_squat_jump', 'ply_box_jump', 'ply_mb_slam'], perWeek: 2,
    sources: [
      { mark: '✔', ref: 'Amaro et al. 2019, Science & Sports (revue systématique)', finding: 'La pliométrie paraît la plus efficace pour les départs et les virages (6 à 8 semaines, 2 séances par semaine) ; la force maximale pour la nage.', url: 'https://lida.sport-iat.de/ta/Record/4055835' },
      { mark: '✔', ref: 'Thng, Pearson et Keogh 2019, Sports Medicine (revue, 16 études)', finding: 'Pliométrie : départs améliorés sur la durée ; la qualité du départ est très liée à la détente verticale.', url: 'https://www.springermedizin.de/relationships-between-dry-land-resistance-training-and-swim-star/17146706' },
    ],
  },
  combat: {
    focus: 'force, détente et explosivité des frappes',
    pack: ['ply_squat_jump', 'ply_split_jump', 'ply_clap_pushup', 'ply_mb_chest_pass', 'ply_mb_slam'], perWeek: 2,
    sources: [
      { mark: '✔', ref: 'Ojeda-Aravena et al. 2023, Sports (méta-analyse, 12 études)', finding: 'Pliométrie 4 à 12 semaines, 2 à 3 séances par semaine : gains petits à modérés de force, saut, changements de direction et performance du sport.', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9965890/' },
    ],
  },
  escalade: {
    focus: 'force des doigts et tenue (isométrie)',
    pack: ['fp_dead_hang', 'pullups', 'fp_wrist_curl'], perWeek: 0, style: 'iso_hold',
    sources: [
      { mark: '✔', ref: 'Hermans et al. 2022, Front Sports Act Living (essai, 35 grimpeurs)', finding: '10 semaines de poutre (suspensions) en plus de la grimpe : force maximale des doigts nettement augmentée.', url: 'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.888158/pdf' },
      { mark: '✔', ref: 'López-Rivera et González-Badillo (8 semaines, grimpeurs)', finding: 'Suspensions intermittentes plus efficaces pour l’endurance de préhension chez les grimpeurs avancés ; maximales et intermittentes peuvent alterner.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6458579/' },
    ],
  },
  danse: {
    focus: 'hauteur des sauts',
    pack: ['ply_cmj', 'ply_pogo', 'ply_squat_jump', 'ply_tuck_jump'], perWeek: 2,
    sources: [
      { mark: '✔', ref: 'Essai 2022, 81 danseurs de ballet professionnels (9 semaines)', finding: 'Pliométrie (seule ou combinée) : saut vertical et sauté nettement plus hauts que sans.', url: 'https://www.pubmed.gov/35894994/' },
    ],
  },
  autre: {
    focus: 'détente et explosivité',
    pack: ['ply_squat_jump', 'ply_pogo', 'ply_box_jump', 'ply_broad_jump', 'ply_clap_pushup'], perWeek: 1,
    sources: [
      { mark: '✔', ref: 'Markovic 2007, Br J Sports Med (méta-analyse)', finding: 'La pliométrie améliore la hauteur du saut vertical chez les personnes en bonne santé.', url: 'https://pubmed.ncbi.nlm.nih.gov/17347316/' },
    ],
  },
};

/** Fiche de performance d'un sport (sport inconnu ou non précisé : la fiche générale). */
export const sportPerf = id => SPORT_PERF[id] || SPORT_PERF.autre;
