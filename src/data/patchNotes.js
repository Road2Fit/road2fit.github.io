// Notes de version (« Nouveautés ») : la plus récente EN PREMIER. À compléter à chaque publication, en français simple :
// ce qui change pour la personne qui utilise l'appli, pas le détail technique. `version` doit être unique.
export const PATCH_NOTES = [
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
