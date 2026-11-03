// Notes de version (« Nouveautés ») : la plus récente EN PREMIER. À compléter à chaque publication, en français simple :
// ce qui change pour la personne qui utilise l'appli, pas le détail technique. `version` doit être unique.
export const PATCH_NOTES = [
  {
    version: '3.4.1',
    date: '2026-11-03',
    title: 'Amis à jour et épreuves de rang simplifiées',
    items: [
      'Amis : les records que tes amis rentrent dans « Mes maxima » apparaissent maintenant sur leur profil, et leurs changements se publient depuis tous leurs appareils (pas seulement celui où ils ont activé les amis).',
      'Épreuves de rang plus simples (moins de jours, plus de calories à brûler), et jamais plus de 1 000 EXP bloqués : au-delà, le rang est franchi tout seul.',
    ],
  },
  {
    version: '3.4',
    date: '2026-11-03',
    title: 'Séries personnalisées',
    items: [
      'Sous chaque exercice de la prochaine séance (« Pourquoi ? / Ajuster » → Forme des séries → Personnalisée), règle chaque série toi-même : répétitions, charge ou aide, repos, type (normale, lourde, allégée, dégressive, mini-série, au maximum).',
      'Le coach retient ta forme et la reprend aux séances suivantes, avec des charges qui suivent ta progression (mêmes écarts entre les séries). « Modifier mes séries » pour la changer.',
    ],
  },
  {
    version: '3.3.2',
    date: '2026-11-03',
    title: 'Micro sur ordinateur',
    items: [
      'Le bouton « Parler » demande maintenant l’accès au micro et continue d’écouter même après un silence (dictée, coach, « Raconte ton passé »).',
      'Si le micro ne peut pas démarrer, l’appli dit pourquoi et quoi faire : micro bloqué (cadenas à gauche de l’adresse → Micro → Autoriser), aucun micro, ou navigateur sans reconnaissance vocale (Opera et Opera GX, Firefox, Brave : utilise Chrome ou Edge, ou Windows + H).',
    ],
  },
  {
    version: '3.3.1',
    date: '2026-11-03',
    title: 'Silhouette des muscles pour tous',
    items: [
      'En mode simplifié aussi, la silhouette montre le travail de chaque groupe (pectoraux, dos, jambes, épaules et bras, abdominaux) : dans le Coach et en petit à côté de ta barre d’EXP.',
    ],
  },
  {
    version: '3.3',
    date: '2026-11-03',
    title: 'Séances variées, objectif et niveau',
    items: [
      'Formes de séries « selon les études » : séries classiques, et une autre forme seulement quand une étude montre un intérêt pour toi (séance courte : dégressives et supersets ; objectif de répétitions : repos-pause). Envie de pyramides, myo-reps, série lourde… ? Demande-les au coach ou choisis « Variée » : il te les propose sans problème.',
      'En haut du Coach, « Ton objectif » : force sur un exercice, muscle sur un groupe, répétitions, poids… Le coach adapte tes séances d’après les études (affichées sous l’objectif).',
      'Dans la séance guidée : chaque série a sa charge, son repos et son explication ; les supersets s’enchaînent tout seuls.',
      'La dictée comprend les séances particulières (échauffement, série lourde, dégressives, mini-séries) et la progression, les maxima et les objectifs fonctionnent avec n’importe quelle forme.',
      'Ton niveau réel (débutant, avancé, expert) dès l’accueil ou dans Coach → Réglages → Mon niveau : le débutant n’a rien à régler, l’avancé indique ses exercices et ses records, l’expert détaille son entraînement (séance type, volume, formes connues, cycles, blessures). Encore plus simple : « Raconte ton passé » (dès l’accueil pour les niveaux avancé et expert, et dans Coach → Réglages), tu racontes à l’oral ce que tu as fait et le coach remplit tout seul ton niveau, tes exercices et tes records.',
    ],
  },
  {
    version: '3.2',
    date: '2026-11-02',
    title: 'Séance en plus et séance ratée',
    items: [
      'Une séance en plus, juste une fois : demande-la au coach (« cette semaine j’en veux une aussi jeudi ») ou ajoute-la dans Réglages. Ton rythme habituel ne change pas.',
      'Séance prévue et pas faite ? En haut du Coach : « Faire cette séance maintenant » lance la séance qui était prévue, et la suite se décale.',
    ],
  },
  {
    version: '3.1',
    date: '2026-11-02',
    title: 'Le coach comprend mieux les jours',
    items: [
      '« Jeudi » veut dire le prochain jeudi : le coach reçoit le calendrier des deux semaines à venir et vérifie que ses réglages donnent bien les dates voulues.',
      'Avec tes jours de salle choisis, la prochaine séance va au prochain jour choisi (avant, le coach préférait parfois un jour plus tard).',
      'Après un changement : « Prochaines séances » s’affiche tout de suite, et « Annuler ce changement » remet tout comme avant en un geste.',
    ],
  },
  {
    version: '3.0.1',
    date: '2026-11-02',
    title: 'Onglets en entier sur ordinateur',
    items: ['Sur ordinateur, l’onglet « Amis » n’est plus coupé : tous les onglets sont visibles (ils passent sur deux lignes si l’écran est étroit).'],
  },
  {
    version: '3.0',
    date: '2026-11-02',
    title: 'Le coach intelligent',
    items: [
      'En haut du Coach : « Parle à ton coach ». Dis-lui en langage courant tes jours, ta durée, ta forme, une douleur… Il t’explique et règle l’appli pour toi (après ton accord).',
      'Il se souvient de ce que tu lui dis (blessure, matériel, contraintes) : « Ce que je retiens de toi ».',
      'La dictée comprend toutes les formulations : charges différentes par série, corrections, ressenti (« la dernière, j’ai galéré »).',
      'Programme de ton coach : colle-le tel quel (message, tableau), il est rangé en semaines et en séances.',
      'Il faut être connecté à ton compte et l’activer une fois. Sans internet, l’appli marche comme avant.',
    ],
  },
  {
    version: '2.9',
    date: '2026-11-02',
    title: 'La dictée de séance, bien en vue',
    items: [
      '« Dicter ma séance » est maintenant en haut du Coach, des Exercices et du Journal, et en premier dans le bouton « + ».',
      'Dis toute ta séance d’une traite (« développé couché 4 fois 8 à 60 kilos, tractions 6 6 5… ») : je remplis les séries pour toi.',
    ],
  },
  {
    version: '2.8',
    date: '2026-11-02',
    title: 'Tu as déjà un coach ? Ajoute son programme',
    items: [
      'Dans le Coach : « Ajouter le programme de mon coach ». Une ligne par exercice, par exemple « Squat 4x8 60kg » ou « Tractions 3x6 aide 10kg ».',
      'Tu peux saisir plusieurs semaines (copie la semaine et change les chiffres) : l’appli suit le programme séance après séance.',
      'Une fois le programme fini, le coach de l’appli propose la suite dans la même logique : même progression (charge, répétitions ou aide), même rythme de semaines allégées.',
      'La partie « Ce que j’ai compris du programme » résume son analyse.',
    ],
  },
  {
    version: '2.7',
    date: '2026-11-02',
    title: 'Nouveautés et rappel de mise à jour',
    items: [
      'Cette fenêtre « Nouveautés » résume chaque mise à jour, et toutes les précédentes sont dans Plus → Nouveautés.',
      'Quand une version plus récente est publiée, un bandeau te le dit et te propose de rafraîchir la page.',
    ],
  },
  {
    version: '2.6',
    date: '2026-11-02',
    title: 'Des logos maison partout',
    items: [
      'Environ 170 logos dessinés pour l’appli remplacent tous les emojis : exercices, muscles, sports, trophées, messages.',
      'Ils s’affichent pareil sur tous les téléphones.',
    ],
  },
  {
    version: '2.5',
    date: '2026-11-02',
    title: 'Icônes en couleur',
    items: ['Navigation, titres et boutons principaux ont leur icône en couleur : l’appli est moins austère.'],
  },
  {
    version: '2.4',
    date: '2026-11-01',
    title: 'Interface plus simple',
    items: [
      'L’appli s’ouvre sur le Coach, avec ta séance du jour en haut.',
      'Cartes d’exercice repliées : nom, objectif, « Noter la séance » ; le reste dans « Détails et réglages ».',
      'Séance guidée : le repos est une bande fixe en bas, la série en cours est encadrée.',
      'Le bouton « Valider » reste visible dans Noter la séance et Ajuster.',
      'Coach : sommaire en haut de page et deux colonnes sur ordinateur.',
    ],
  },
  {
    version: '2.3',
    date: '2026-11-01',
    title: 'Animations des exercices revues',
    items: [
      'Nouveau personnage, muscles en rouge selon l’effort, vues de côté et de face côte à côte.',
      'Une quinzaine de gestes faux corrigés (tractions, banc décliné, lombaires, hip thrust, presses…).',
    ],
  },
  {
    version: '2.2',
    date: '2026-10-31',
    title: 'Amis',
    items: [
      'Un code à 7 caractères pour ajouter des amis et voir leur profil.',
      'Le rang de tes amis à côté de leur nom, un pseudo à choisir dans Mon compte, une liste qui se met à jour seule.',
    ],
  },
];

export const CURRENT_VERSION = PATCH_NOTES[0].version;
