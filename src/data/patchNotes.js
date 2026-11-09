// Notes de version (« Nouveautés ») : la plus récente EN PREMIER. À compléter à chaque publication, en français simple :
// ce qui change pour la personne qui utilise l'appli, pas le détail technique. `version` doit être unique.
export const PATCH_NOTES = [
  {
    version: '4.17',
    date: '2026-11-09',
    title: 'Nouvelle navigation',
    items: [
      'En bas, « Communauté » ouvre directement Souvenirs et Amis.',
      'Bilan, Trophées, Récompenses et Épreuve de rang : touche ton profil en haut à gauche.',
      'L’engrenage en haut à droite regroupe les réglages, la couleur du néon et les Nouveautés, avec une pastille quand il y a du nouveau à lire.',
    ],
  },
  {
    version: '4.16',
    date: '2026-11-09',
    title: 'Photos entre amis',
    items: [
      'Amis : active « Montrer ma dernière photo de séance à mes amis » pour qu’elle apparaisse dans ton profil chez eux (désactivé au départ).',
      'Souvenirs : « Taguer un ami » sur une de tes photos (amis qui t’ont ajouté aussi) : elle apparaît dans ses Souvenirs.',
      'Quand un ami te tague, une pastille s’affiche sur Souvenirs jusqu’à ce que tu l’ouvres.',
    ],
  },
  {
    version: '4.15.1',
    date: '2026-11-09',
    title: 'Prénom visible chez les amis',
    items: [
      'Ton prénom est bien envoyé à tes amis dès l’ouverture de l’appli (avant, il pouvait rester « Ami sans prénom » tant que tu n’avais pas fait de nouvelle séance).',
    ],
  },
  {
    version: '4.15',
    date: '2026-11-09',
    title: 'Dicte ta prochaine séance',
    items: [
      'Le micro a deux onglets : « Séance faite » (comme avant) et « Prochaine séance ». Dicte ou colle la séance que tu veux faire (« jeudi développé couché 4x6 à 55 kg, tractions 3x8 ») : le coach la propose à la place de la sienne, telle quelle.',
      'Tu peux toujours l’ajuster ou revenir à la proposition du coach. « Sans élastique » est bien compris.',
      'Du cardio dicté (« samedi 40 minutes de course ») devient ta séance de cardio de ce jour-là, exactement comme demandé.',
    ],
  },
  {
    version: '4.14.4',
    date: '2026-11-09',
    title: 'Cardio du jour : résumé toujours là',
    items: [
      'Quand le cardio du jour est dans le grand rond, l’encadré « Cardio » reste en haut (avec son résumé) tant que la séance n’est pas faite.',
    ],
  },
  {
    version: '4.14.3',
    date: '2026-11-09',
    title: 'Page Séance symétrique',
    items: [
      'Sur téléphone, « Parle à ton coach » est centré entre le micro et le « + », avec le même écart en bas qu’au-dessus du premier encadré : la page est symétrique autour du grand rond.',
    ],
  },
  {
    version: '4.14.2',
    date: '2026-11-09',
    title: 'Fenêtre de la séance sans défilement',
    items: [
      'La fenêtre de la prochaine séance ne défile plus pour rien : elle remonte juste ce qu’il faut pour que tout tienne, bouton « Lancer » compris.',
    ],
  },
  {
    version: '4.14.1',
    date: '2026-11-09',
    title: '« Parle à ton coach » en bas',
    items: [
      'Sur téléphone, « Parle à ton coach » est collé à la barre des onglets du Coach, et le rond prend la place libérée.',
    ],
  },
  {
    version: '4.14',
    date: '2026-11-09',
    title: 'Maxima plus justes',
    items: [
      'Ton max est la moyenne de tes séances récentes (les plus courtes et les plus récentes comptent le plus), avec tes répétitions en réserve, jusqu’à 12 répétitions.',
      'Une séance sans ressenti ne compte plus dans le max. « Noter la séance » a maintenant un choix de ressenti (facultatif).',
      'Note un vrai record dans « Mon maximum » : l’appli règle un coefficient propre à cet exercice. Le tableau des charges dit quoi mettre pour X répétitions en en gardant Y en réserve.',
    ],
  },
  {
    version: '4.13.4',
    date: '2026-11-08',
    title: 'Page Séance calée tout de suite',
    items: [
      'En revenant sur le Coach, le rond et « Parle à ton coach » sont à leur place dès la première image : plus de bouton qui descend après coup.',
    ],
  },
  {
    version: '4.13.3',
    date: '2026-11-08',
    title: '« Parle à ton coach » reste en place',
    items: [
      'En revenant sur le Coach depuis un autre onglet, « Parle à ton coach » et le rond reprennent leur place (plus besoin de rafraîchir).',
    ],
  },
  {
    version: '4.13.2',
    date: '2026-11-08',
    title: 'Page Séance stable',
    items: [
      'En revenant sur la page Séance, la barre des onglets du Coach ne passe plus par le milieu de l’écran et les boutons ne bougent plus.',
    ],
  },
  {
    version: '4.13.1',
    date: '2026-11-08',
    title: 'Fenêtre de la séance en bas',
    items: [
      'La fenêtre de la prochaine séance est collée en bas de l’écran, comme celle du cardio, et commence sous l’encadré « Séance » : le retoucher la referme.',
    ],
  },
  {
    version: '4.13',
    date: '2026-11-08',
    title: 'Page Séance sans défiler',
    items: [
      'Coach → Séance tient dans l’écran : en haut les encadrés « Séance » (toucher = voir et modifier la prochaine séance) et « Cardio », au milieu le grand rond, dessous « Parle à ton coach ».',
      'Les questions à répondre une fois (ton objectif, as-tu déjà un coach, le cardio…) apparaissent en haut comme des notifications, puis disparaissent : tu les retrouves dans Réglages.',
      'Sur téléphone, les onglets du Coach (Séance, Semaine, Objectifs…) sont en bas, au-dessus de la barre de navigation.',
    ],
  },
  {
    version: '4.12.1',
    date: '2026-11-08',
    title: 'Retrouver sa séance perso',
    items: [
      'Après « Revenir à la proposition du coach », un bouton « Revenir à ma séance perso » la remet comme elle était (pareil pour le réglage d’un exercice : « Revenir à mon réglage »).',
      'Séance perso : l’encadré jour / groupes / exercices à ajouter est rangé derrière un petit crayon.',
    ],
  },
  {
    version: '4.12',
    date: '2026-11-08',
    title: 'Prochaine séance plus compacte',
    items: [
      'Prochaine séance : chaque exercice tient en deux lignes. Le crayon ouvre la charge, les répétitions, les séries, la forme, et Changer / Monter / Descendre / Retirer.',
      'Le titre de la séance dit ce qu’elle travaille : « Haut du corps », « Bas du corps » ou « Corps entier » (plus de 70 % d’exercices en haut ou en bas, sinon corps entier).',
      'Cardio : toucher la carte ouvre le résumé de la séance (étapes, durées, vitesses), avec « Lancer » en bas.',
    ],
  },
  {
    version: '4.11',
    date: '2026-11-08',
    title: 'Ressenti à part, exercice supprimable',
    items: [
      'Séance guidée : à la fin d’un exercice, un écran à part te demande ton ressenti (1 à 10). Une seule fois : ensuite, le chrono du repos s’affiche en grand.',
      'Menu ⋯ de la séance : « Supprimer l’exercice de la séance » le retire complètement (rien n’est enregistré pour lui).',
    ],
  },
  {
    version: '4.10',
    date: '2026-11-08',
    title: 'Les boutons clés ressortent',
    items: [
      'Les boutons les plus importants (Lancer, Reprendre, Série faite, Série suivante, Enregistrer) ont une touche de la couleur complémentaire de ton néon : framboise pour le vert citron, jaune pour le violet, orange pour le bleu…',
      'La couleur que tu as choisie reste la couleur principale : les grands boutons gardent ta couleur avec un liseré, seuls les petits boutons sont pleins de la complémentaire.',
    ],
  },
  {
    version: '4.9.3',
    date: '2026-11-08',
    title: 'Échauffement : la barre fait 20 kg',
    items: [
      'Les exercices à la barre dont le nom ne dit pas « barre » (développé couché prise serrée, push press, jetés, squat bras tendus) sont reconnus : échauffement jamais sous 20 kg, disques indiqués.',
    ],
  },
  {
    version: '4.9.2',
    date: '2026-11-08',
    title: 'Disques à l’échauffement',
    items: [
      'Séance guidée : à l’échauffement d’un exercice à la barre, l’appli dit aussi quels disques mettre de chaque côté.',
      'L’échauffement à la barre ne descend jamais sous la barre seule (20 kg).',
    ],
  },
  {
    version: '4.9.1',
    date: '2026-11-08',
    title: 'Dictée sur Android',
    items: [
      'Sur Android, la dictée répétait chaque mot plusieurs fois (« hier hier j’ai hier j’ai eu… ») : la phrase s’écrit maintenant une seule fois.',
    ],
  },
  {
    version: '4.9',
    date: '2026-11-07',
    title: 'Noter une séance oubliée',
    items: [
      'Dictée : dis « hier », « avant-hier », « mardi », « il y a 3 jours » ou « le 3 novembre » et la séance est notée à ce jour-là (la date s’affiche avant de valider, tu peux la changer).',
      'Dictée : « 1h30 » ou « 2 heures et demie » sont bien compris.',
      'Journal sur téléphone : toucher un jour ouvre son résumé dans une fenêtre.',
    ],
  },
  {
    version: '4.8.3',
    date: '2026-11-07',
    title: 'Cardio bien visible dans ta semaine',
    items: ['« Ma semaine » : les jours de cardio sont encadrés (rose, vert une fois faits) ; seuls les jours de repos restent gris.'],
  },
  {
    version: '4.8.2',
    date: '2026-11-07',
    title: 'Tes jours de cardio',
    items: [
      'Réglages → Cardio : choisis les jours de ton cardio ; le coach ne le met plus que ces jours-là. Tu peux aussi le demander dans « Parle à ton coach ».',
      'Ordinateur : le grand rond de la séance ne se retrouve plus isolé au milieu d’un grand vide après avoir ouvert une fenêtre.',
    ],
  },
  {
    version: '4.8.1',
    date: '2026-11-07',
    title: 'Cardio : ta vitesse et ta distance',
    items: [
      'Chaque étape du cardio donne la vitesse à tenir (km/h et minutes au km) et la distance à faire, plus besoin de montre cardio.',
      'Course : donne un temps récent (ex. 5 km en 28:30) dans Réglages → Cardio, ou laisse le coach le lire dans tes courses notées ; il en tire ta vitesse facile et ta vitesse de fractionné.',
      'Marche : vitesse et au moins 100 pas par minute (25 pas en 15 secondes).',
    ],
  },
  {
    version: '4.8',
    date: '2026-11-07',
    title: 'Le coach entraîne aussi ton cœur',
    items: [
      'Cardio à la demande : marche, course, vélo, rameur ou elliptique, selon ton objectif (perdre du poids, améliorer ton cardio, santé du cœur). À activer sur la page Séance ou dans Réglages → Cardio.',
      'Séances guidées avec minuteur : échauffement, efforts, récupération, son et vibration à chaque étape. Pour débuter la course : alternance course / marche qui s’allonge toute seule.',
      'Les séances sont placées dans ta semaine autour de la muscu et du sport, et leurs calories comptent dans les calories du jour.',
      'Page Équilibre : ton cœur est suivi comme un muscle (minutes de la semaine, repère de l’OMS).',
      'Tu peux aussi demander du cardio ou du running au coach dans la discussion.',
    ],
  },
  {
    version: '4.7.1',
    date: '2026-11-06',
    title: 'Ton niveau en haut',
    items: ['Ton niveau s’affiche à côté de ton prénom, en haut de l’écran.'],
  },
  {
    version: '4.7',
    date: '2026-11-06',
    title: 'Pour ceux qui s’entraînent souvent',
    items: [
      '4 séances par semaine ou plus : le coach passe en haut / bas du corps (4), puis poussée / tirage / jambes (5 et 6), au lieu de n’en prévoir que 2.',
      'Séance guidée : « La dernière fois » sous chaque série, les disques à mettre sur la barre, un record fêté dès qu’il tombe, et « Machine prise ? » dans le menu ⋯ pour changer d’exercice (annulable).',
      'Notification « Repos terminé » quand le téléphone est verrouillé ou l’appli en arrière-plan.',
      'Plus → Importer depuis Hevy ou Strong : récupère ton historique d’une autre appli.',
      'Accueil : aide élastique gardée tant que tu ne fais pas sans aide des séries complètes (tractions, dips), lest possible si tu en fais déjà avec ; l’objectif n’est plus redemandé, une seule cible par exercice.',
    ],
  },
  {
    version: '4.6.2',
    date: '2026-11-06',
    title: 'Nouvelle icône néon',
    items: [
      'Nouvelle icône de l’appli : un haltère en tube néon sur fond noir (onglet du navigateur et appli installée).',
      'Préparation de l’appli Android : le site la reconnaît, elle s’ouvre en plein écran sans barre d’adresse.',
    ],
  },
  {
    version: '4.6.1',
    date: '2026-11-06',
    title: 'Road2Fit en haut sur téléphone',
    items: ['Sur téléphone, « Road2Fit » réapparaît en haut à côté de l’engrenage. Le badge de sauvegarde n’y montre plus que ⚠ pour laisser la place à ton prénom.'],
  },
  {
    version: '4.6',
    date: '2026-11-06',
    title: 'Le grand rond en tube néon',
    items: [
      'Style néon : le grand rond du Coach a un intérieur sombre et un contour qui brille comme un tube néon, avec des ondes qui partent de son bord.',
      'La durée de la séance est sous « Séance du jour », le rond tient entier dans l’écran, même sur un petit téléphone.',
    ],
  },
  {
    version: '4.5.4',
    date: '2026-11-06',
    title: 'Les muscles de la séance dans le rond',
    items: ['Le grand rond du Coach montre le schéma du corps (face et dos) avec les muscles travaillés pendant la séance, à la place de la liste des exercices.'],
  },
  {
    version: '4.5.3',
    date: '2026-11-06',
    title: 'Chrono du gainage',
    items: ['Séance guidée : pour une tenue (gainage, planche…), le chrono s’arrête tout seul au temps prévu de la série, avec un petit son et une vibration, puis passe au repos.'],
  },
  {
    version: '4.5.2',
    date: '2026-11-06',
    title: 'Écrans d’accueil lisibles',
    items: [
      'Style néon : les choix sélectionnés et les boutons de l’assistant d’accueil ont un texte sombre sur la couleur du néon (le blanc était illisible).',
      'Les boutons grisés (pas encore disponibles) sont plus lisibles.',
      'Coach : la page défile tout de suite, les menus ne s’écartent plus du grand rond au début du défilement.',
    ],
  },
  {
    version: '4.5.1',
    date: '2026-11-06',
    title: 'Le grand rond s’anime',
    items: [
      'Quand tu touches « Lancer » ou « Reprendre », tout le rond s’enfonce, rebondit et lance une onde de lumière avant d’ouvrir la séance.',
      'Le rond occupe tout le haut de l’écran : en dessous, seul le titre « Prochaine séance » dépasse.',
    ],
  },
  {
    version: '4.5',
    date: '2026-11-06',
    title: 'Carte ronde et icônes',
    items: [
      'La grande carte de ta séance, en haut du Coach, devient un cercle.',
      'Prochaine séance : touche l’icône pour voir le mouvement, et le crayon pour le « pourquoi » et les réglages de l’exercice (un point orange = modifié par toi).',
    ],
  },
  {
    version: '4.4.3',
    date: '2026-11-06',
    title: 'Fiches d’exercice qui ne défilaient plus',
    items: ['La fiche d’un exercice (et les autres fenêtres) défile de nouveau jusqu’en bas sur téléphone.'],
  },
  {
    version: '4.4.2',
    date: '2026-11-05',
    title: 'Icônes à la bonne taille',
    items: ['Sur un bouton sélectionné (texte plus grand, en majuscules), l’icône grandit avec le texte.'],
  },
  {
    version: '4.4.1',
    date: '2026-11-05',
    title: 'Icônes qui disparaissaient',
    items: [
      'Séance guidée : « Cuit », « Normal » et « En forme » ont le même aspect, chacun avec son icône (celle de « Normal » ne disparaît plus).',
      'Les icônes des boutons sélectionnés (pages du Coach, « Mon poids »…) restent visibles en style néon.',
    ],
  },
  {
    version: '4.4',
    date: '2026-11-05',
    title: 'Nouveau style « néon de salle »',
    items: [
      'Nouveau look sombre façon salle de sport, avec une couleur de néon au choix (8 couleurs, en haut de « Plus »). Le style classique reste disponible dans les réglages.',
      'Toutes les icônes sont redessinées au trait, dans la couleur de ton néon. Le coach a maintenant un cerveau à casquette.',
      'Une grande carte en haut du Coach montre ta prochaine séance avec le bouton « Lancer ». L’avis du coach affiche sa note dans une jauge.',
      'Petites animations partout : changement d’onglet, fenêtres, écrans de la séance guidée, chiffres qui rebondissent.',
      'Séance guidée : les boutons « précédent » et « réduire » utilisent la même flèche.',
    ],
  },
  {
    version: '4.3',
    date: '2026-11-05',
    title: 'Ton poids dans ton profil',
    items: [
      'Le suivi du poids (pesées, courbe, poids visé) est dans ton profil : touche ton icône en haut à gauche, puis « Mon poids ».',
      'L’onglet « Suivi » disparaît : la barre du bas n’a plus que Coach, Exercices, Journal et Plus.',
    ],
  },
  {
    version: '4.2.2',
    date: '2026-11-05',
    title: 'Bouton « précédent » dans la séance',
    items: ['Séance guidée : un bouton ‹ en haut à gauche ramène à l’écran d’avant (une « Série faite » touchée par erreur est annulée).'],
  },
  {
    version: '4.2.1',
    date: '2026-11-05',
    title: 'Prochaine séance épurée',
    items: [
      'Le jour de ta séance, un gros bouton « Lancer la séance du jour » en haut du Coach.',
      'Profil → « Équilibre des muscles » ouvre directement la page Équilibre du Coach.',
      'Le bouton « 40 min » et les petits textes sous « Lancer » disparaissent : tu adaptes ta séance au début du suivi (« Comment te sens-tu ? »).',
    ],
  },
  {
    version: '4.2',
    date: '2026-11-05',
    title: 'Haltérophilie, HYROX, calisthénie',
    items: [
      'Haltérophilie : épaulé-jeté, arraché, épaulé, versions en puissance et suspendues, push press, jetés, squat bras tendus, snatch balance, tirages (16 exercices), avec animation, conseils et repères (ex. l’arraché vaut environ 80 % de l’épaulé-jeté).',
      'HYROX : poussée et tirage de traîneau, marche du fermier, fentes sac de sable, burpee saut en longueur, avec les charges de course (open femmes / hommes).',
      'Calisthénie : muscle-up (barre et anneaux), dips aux anneaux, pompes en équilibre, poirier, L-sit, front lever, planche, pistol squat, tractions et pompes archer, pompes pseudo-planche, dragon flag.',
      'Fenêtres : la page derrière ne défile plus quand une fenêtre est ouverte (téléphone compris).',
    ],
  },
  {
    version: '4.1',
    date: '2026-11-05',
    title: 'Tout sur un exercice au même endroit',
    items: [
      'La courbe et le maximum de chaque exercice sont dans sa fiche (touche son logo, puis les boutons courbe et maximum). Les onglets « Courbes » et « Mes maxima » disparaissent.',
      'Le maximum tient toujours compte de ton effort ressenti, sans case à cocher.',
      'Prochaine séance : une horloge pour la durée, une flamme pour les calories ; les petits textes sont dans le détail de l’avis du coach.',
      '« Comment te sens-tu ? » est maintenant la première page de la séance guidée : « Cuit » allège la séance (−10 % de charge, une série de moins).',
    ],
  },
  {
    version: '4.0.1',
    date: '2026-11-05',
    title: 'Tes photos souvenirs reviennent',
    items: [
      'Si le téléphone a effacé des photos de sa mémoire, l’appli les retélécharge maintenant depuis ta sauvegarde en ligne (elles n’étaient pas perdues).',
      'Sécurité : seule une photo que tu supprimes toi-même est retirée de la sauvegarde.',
    ],
  },
  {
    version: '4.0',
    date: '2026-11-05',
    title: 'Une appli plus simple et plus fluide',
    items: [
      'Séance guidée en plein écran : un écran par série, avec l’animation du mouvement en haut, puis un écran de repos. Un seul bouton pour avancer ; la flèche en haut à gauche réduit la séance.',
      'Série trop dure ou trop facile (2 reps de moins, 3 de plus) : pendant le repos, le coach propose d’ajuster la charge de la suite, d’un geste.',
      'Coach : des pages séparées (Séance, Semaine, Objectifs, Équilibre, Réglages) au lieu d’une longue page.',
      'Exercices : juste les logos et les noms ; un toucher ouvre la fiche complète. Objectif atteint : une coupe apparaît, touche-la pour valider le niveau suivant.',
      'En haut : seulement ton icône, entourée de ta jauge d’EXP ; touche-la pour voir ton profil (niveau, rang, série, bonus, récompenses).',
      '« Parle à ton coach » devient un bouton qui ouvre la discussion ; micro rond au-dessus du « + » pour dicter ta séance ; beaucoup moins de petits textes.',
    ],
  },
  {
    version: '3.9.2',
    date: '2026-11-05',
    title: 'Des repos adaptés à chaque exercice',
    items: [
      'Le repos se calcule pour chaque exercice selon la charge et le nombre de muscles sollicités : par exemple 3 min pour des tractions à 8 répétitions, 4 min pour un squat lourd, 1 min 15 pour un curl.',
      'D’après les revues scientifiques : plus long pour les charges lourdes et les gros exercices, au moins 1 min partout.',
      'Le repos de chaque exercice s’affiche dans la prochaine séance, avec sa raison dans « Pourquoi ? / Ajuster ».',
    ],
  },
  {
    version: '3.9.1',
    date: '2026-11-04',
    title: 'L’échauffement compte',
    items: [
      'Séance guidée : les séries d’échauffement cochées « Fait » s’ajoutent aux calories de la séance.',
      'Plus d’échauffement affiché quand il n’a pas de sens (gainage planche et autres exercices tenus, abdos).',
    ],
  },
  {
    version: '3.9',
    date: '2026-11-04',
    title: 'Programme de ton coach : l’appli prend le relais, ou pas',
    items: [
      'Après avoir enregistré le programme de ton coach, une question : l’appli prend le relais pour la suite, oui ou non ?',
      'Non : tu gardes ton coach ou tu continues seul. À la fin du programme, le coach de l’appli se met en retrait et montre seulement un aperçu de la séance qu’il aurait proposée.',
      'Tu peux changer d’avis à tout moment, depuis la carte du programme ou l’aperçu.',
    ],
  },
  {
    version: '3.8',
    date: '2026-11-04',
    title: 'Journées doubles, séances en plus et alerte de mise à jour',
    items: [
      'Ma semaine : touche un jour pour ajouter une séance de muscu en plus juste ce jour-là (le reste de la semaine ne bouge pas), annuler la salle, ou ajouter ou retirer ton sport.',
      'Journée double : un même jour peut avoir la muscu ET ton sport (ex. salle puis entraînement le jeudi). Le coach retire alors les jambes ce jour-là. Tu peux aussi le demander au coach intelligent.',
      'Profil de travail « Automatique » : si tu veux perdre ou prendre du poids, le coach passe en hypertrophie (charges modérées à lourdes, près de l’échec) pour garder ou construire du muscle. D’après les études, c’est le déficit calorique qui fait perdre le gras, pas les séries longues.',
      'Alerte de mise à jour corrigée : l’appli vérifie aussi quand tu fais défiler la page, et une pastille « Mise à jour à faire » reste en haut tant que tu n’as pas rafraîchi.',
    ],
  },
  {
    version: '3.7',
    date: '2026-11-04',
    title: 'L’argot de la salle compris partout',
    items: [
      'Plus de 200 mots et abréviations de musculation compris par la dictée, la saisie d’un programme, la recherche d’exercice et le coach : DC, SDT, RDL, OHP, bench, pull-up, élév lat, top set, back-off, @8, à l’échec, « 2 plaques de chaque côté » (= 100 kg), barre à vide…',
      'Nouveau : Plus → « Lexique de la salle », pour chercher un mot (pump, sèche, superset, PR, natty…).',
    ],
  },
  {
    version: '3.6.3',
    date: '2026-11-04',
    title: 'Programme d’un coach : lest et nouveaux exercices',
    items: [
      'Programme de ton coach : le lest est compris (« Dips lestés 3x8 +52,5 kg » = 52,5 kg de lest) et suivi dans la séance guidée.',
      'Un exercice inconnu du programme (muscle-up, isométrie…) n’empêche plus d’enregistrer : à l’enregistrement, le coach le trouve dans le catalogue ou le crée pour tout le monde. Il vérifie aussi les lignes douteuses (« Rowing appui poitrine »).',
      'Noms mieux reconnus : « Curl biceps poulie » → curl poulie, « Mollets machine assise » → mollets assis, « Extension lombaire 50 kg » → machine lombaires.',
    ],
  },
  {
    version: '3.6.2',
    date: '2026-11-04',
    title: 'Erreurs fréquentes réalistes',
    items: [
      '« Voir le mouvement » → Erreur fréquente : les mauvaises exécutions sont maintenant réalistes et propres à chaque exercice, sans personnage qui traverse un banc, un siège ou le sol.',
      'Exemples : développé couché → les fesses décollent du banc ; machines → les fesses décollent du siège ; pompes et planche → le bassin s’affaisse ; squat → le buste plonge ; rowing, soulevé de terre → le dos lâche ; tirages → le buste bascule ; curls, développé debout → le buste part en arrière ; crunch → on tire sur la nuque ; tractions, dips → balancement des jambes.',
    ],
  },
  {
    version: '3.6.1',
    date: '2026-11-04',
    title: 'Animations cohérentes entre les vues',
    items: [
      'Sur toutes les animations à plusieurs vues, les mains et les coudes suivent maintenant le même trajet que la vue de profil, au même moment.',
      'Les coudes ne partent plus sur le côté quand ils doivent rester près du corps (développé couché, pompes, dips, rowings, curls…) : leur écart suit la bonne technique de chaque exercice.',
    ],
  },
  {
    version: '3.6',
    date: '2026-11-04',
    title: 'Lest, RIR et nouveaux exercices',
    items: [
      'Exercices au poids du corps lestés (dips, tractions, muscle-up…) : un seul nombre, +10 = 10 kg de lest, −10 = 10 kg d’aide. Le coach fait progresser : moins d’aide, puis du lest. La dictée comprend « dips 3 fois 8 à 10 kilos ».',
      'Le coach comprend le RIR (répétitions en réserve) : « RIR 2 » = ressenti 8/10, à l’oral comme dans la discussion.',
      'Un exercice qui n’existe pas ? Demande-le au coach, dicte-le, ou cherche-le puis « Créer avec le coach » : il fait une recherche sur le web, le range dans le bon groupe musculaire et l’ajoute au catalogue de tous les utilisateurs ; il le propose ensuite dans tes séances comme les autres.',
    ],
  },
  {
    version: '3.5.1',
    date: '2026-11-04',
    title: 'Plus de repos en fin de séance',
    items: [
      'Séance guidée : la dernière série de la séance ne lance plus le minuteur de repos (même si tu coches les séries dans le désordre), et terminer la séance coupe le repos en cours.',
    ],
  },
  {
    version: '3.5',
    date: '2026-11-04',
    title: 'Coach plus clair, trophées de la semaine',
    items: [
      'Coach : l’équilibre des groupes musculaires est juste sous la prochaine séance, avec le schéma seul (« Voir le détail » pour le reste). « Ton objectif », une fois rempli, et « Tu as déjà un coach ? » (bouton « Non ») se rangent dans les réglages.',
      'Les objectifs de la semaine deviennent des trophées qui se renouvellent chaque lundi, dans l’onglet Trophées (avec le nombre de fois où tu les as gagnés).',
      'Programme de ton coach : bouton « Dicter » pour le dire à l’oral au lieu de l’écrire.',
      'Amis : un prénom déjà donné ne peut plus disparaître (un appareil resté sur une vieille copie l’effaçait).',
    ],
  },
  {
    version: '3.4.2',
    date: '2026-11-03',
    title: 'Épreuves de rang plus accessibles',
    items: [
      'Les épreuves ne demandent plus que des jours d’entraînement et des semaines actives (pas forcément d’affilée) : elles avancent à chaque séance et ne reculent jamais.',
      'Elles sont calculées pour ne presque jamais bloquer ton EXP : même en t’entraînant tous les jours, pas plus d’environ 2 500 EXP en attente. Si tu étais bloqué, ouvre « Épreuve de rang » : elle est sûrement déjà réussie.',
    ],
  },
  {
    version: '3.4.1',
    date: '2026-11-03',
    title: 'Amis à jour et épreuves de rang simplifiées',
    items: [
      'Amis : les records que tes amis rentrent dans « Mes maxima » apparaissent maintenant sur leur profil, et leurs changements se publient depuis tous leurs appareils (pas seulement celui où ils ont activé les amis).',
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
