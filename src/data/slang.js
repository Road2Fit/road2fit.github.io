// Argot de la musculation et de la salle de sport (français + anglicismes), recherché le 04/11/2026 : lexiques Decathlon,
// Ma Salle de Sport (25 termes), BarBend « Big Glossary of Gym Slang », Exercise With Style (57 termes), Fitness Mentors
// (50 termes), complétés par l'usage courant des salles et forums francophones.
// Sert à trois choses :
//  1. traduire avant de lire une dictée, une ligne de programme ou une recherche d'exercice (`to` = texte que l'appli comprend) ;
//  2. donner le lexique au coach intelligent (envoyé avec le catalogue, partie mise en cache) ;
//  3. la page « Lexique de la salle » (Plus → Lexique), où chacun peut chercher un mot.
// Entrée : { t: [variantes écrites ou dites], to: remplacement pour la lecture (absent = explication seulement), means, cat }.
import { stripAccents } from '../lib/text';

export const SLANG_CATS = ['Exercices', 'Muscles', 'Séries et charges', 'Matériel', 'Physique et nutrition', 'Vie de salle'];

const E = (cat, t, means, to) => ({ cat, t, means, to });

export const SLANG = [
  // ---------------- Exercices ----------------
  E('Exercices', ['dc', 'dév couché', 'dev couche', 'développé couché', 'bench', 'bench press', 'banc couché'], 'Développé couché (barre)', 'développé couché barre'),
  E('Exercices', ['dch', 'dc haltères', 'dc halteres', 'db bench', 'dumbbell bench'], 'Développé couché haltères', 'développé couché haltères'),
  E('Exercices', ['di', 'dév incliné', 'dev incline', 'incline bench', 'incline press'], 'Développé incliné', 'développé incliné'),
  E('Exercices', ['dd', 'dév décliné', 'dev decline', 'decline bench'], 'Développé décliné', 'développé décliné'),
  E('Exercices', ['dc serré', 'dc prise serrée', 'close grip', 'close grip bench', 'cgbp'], 'Développé couché prise serrée', 'développé couché prise serrée'),
  E('Exercices', ['dm', 'développé militaire', 'dév militaire', 'dev militaire', 'militaire', 'ohp', 'overhead press', 'strict press', 'press militaire', 'military press'], 'Développé militaire (debout, barre)', 'développé militaire'),
  E('Exercices', ['dév épaules', 'dev epaules', 'shoulder press', 'presse épaules'], 'Développé épaules', 'développé épaules'),
  E('Exercices', ['arnold', 'arnold press'], 'Développé Arnold', 'développé arnold'),
  E('Exercices', ['sdt', 'soulevé de terre', 'soulevé', 'deadlift', 'dead', 'deadlift conventionnel', 'sdt conventionnel'], 'Soulevé de terre', 'soulevé de terre'),
  E('Exercices', ['rdl', 'roumain', 'sdt roumain', 'romanian deadlift', 'sdtjt', 'sdt jambes tendues', 'jambes tendues', 'stiff', 'stiff leg', 'stiff leg deadlift'], 'Soulevé de terre roumain (jambes presque tendues)', 'soulevé de terre roumain'),
  E('Exercices', ['sumo', 'sdt sumo', 'sumo deadlift'], 'Soulevé de terre sumo', 'soulevé de terre sumo'),
  E('Exercices', ['trap bar', 'trapbar', 'hex bar', 'hexbar', 'barre hexagonale'], 'Soulevé de terre à la trap bar', 'soulevé de terre trap bar'),
  E('Exercices', ['back squat', 'squat arrière', 'squat barre', 'low bar', 'high bar'], 'Squat barre sur le dos', 'squat barre'),
  E('Exercices', ['front', 'front squat', 'squat avant', 'squat devant'], 'Squat barre devant (front squat)', 'front squat barre'),
  E('Exercices', ['goblet', 'goblet squat', 'squat gobelet'], 'Squat goblet (haltère ou kettlebell contre la poitrine)', 'squat goblet'),
  E('Exercices', ['bulgare', 'bulgarian', 'bulgarian split squat', 'split squat', 'fente bulgare'], 'Squat bulgare (pied arrière sur un banc)', 'squat bulgare'),
  E('Exercices', ['hack', 'hack squat'], 'Hack squat (machine)', 'hack squat machine'),
  E('Exercices', ['presse', 'leg press', 'presse cuisses', 'presse à cuisses', 'presse 45'], 'Presse à cuisses', 'presse à cuisses'),
  E('Exercices', ['leg ext', 'leg extension', 'leg extensions', 'extension quadri', 'extension jambes'], 'Leg extension (quadriceps, machine)', 'leg extension'),
  E('Exercices', ['leg curl', 'curl ischios', 'curl jambes', 'ischio machine'], 'Leg curl (ischio-jambiers, machine)', 'leg curl'),
  E('Exercices', ['hip thrust', 'thrust', 'ht', 'pont fessier lesté'], 'Hip thrust (poussée de hanches, dos sur un banc)', 'hip thrust'),
  E('Exercices', ['glute bridge', 'pont fessier', 'bridge'], 'Pont fessier au sol', 'pont fessier'),
  E('Exercices', ['fentes', 'lunges', 'lunge', 'fentes marchées', 'walking lunges'], 'Fentes', 'fentes'),
  E('Exercices', ['good morning', 'gm'], 'Good morning (flexion du buste barre sur le dos)', 'good morning'),
  E('Exercices', ['mollets', 'calf', 'calves', 'calf raise', 'extension mollets', 'mollets debout'], 'Mollets (extensions de chevilles)', 'mollets'),
  E('Exercices', ['adduc', 'adducteurs machine', 'adductor'], 'Adducteurs (machine)', 'adducteurs machine'),
  E('Exercices', ['abduc', 'abducteurs machine', 'abductor'], 'Abducteurs (machine)', 'abducteurs machine'),
  E('Exercices', ['pull up', 'pullup', 'pull ups', 'pullups', 'tractions pronation', 'traction pro'], 'Tractions prise pronation (paumes vers l’avant)', 'tractions pronation'),
  E('Exercices', ['chin up', 'chinup', 'chin ups', 'chins', 'tractions supination', 'traction supi', 'tractions supi'], 'Tractions prise supination (paumes vers soi)', 'tractions supination'),
  E('Exercices', ['tractions lestées', 'traction lestée', 'weighted pull up', 'weighted pull ups'], 'Tractions avec du lest (ceinture, gilet)', 'tractions pronation lestées'),
  E('Exercices', ['tirage vertical', 'tirage poulie haute', 'lat pulldown', 'pulldown', 'pull down', 'tirage nuque', 'tirage poitrine'], 'Tirage vertical à la poulie haute', 'tirage vertical poulie haute'),
  E('Exercices', ['tirage horizontal', 'rowing poulie', 'seated row', 'cable row', 'tirage assis', 'poulie basse'], 'Tirage horizontal à la poulie basse', 'tirage horizontal poulie basse'),
  E('Exercices', ['rowing barre', 'bent over row', 'barbell row', 'rowing penché', 'pendlay', 'pendlay row'], 'Rowing barre buste penché', 'rowing barre'),
  E('Exercices', ['rowing haltère', 'db row', 'dumbbell row', 'rowing un bras', 'kroc row'], 'Rowing haltère à un bras', 'rowing haltère unilatéral'),
  E('Exercices', ['t bar', 'tbar', 't bar row', 'rowing t', 'rowing t bar'], 'Rowing T-bar', 'rowing t-bar'),
  E('Exercices', ['pull over', 'pullover', 'pull-over'], 'Pull-over', 'pull-over'),
  E('Exercices', ['straight arm', 'straight arm pulldown', 'pull over poulie'], 'Pull-over à la poulie haute, bras tendus', 'pull-over poulie haute'),
  E('Exercices', ['face pull', 'facepull', 'fp'], 'Face pull (tirage de la corde vers le visage)', 'face pull'),
  E('Exercices', ['shrug', 'shrugs', 'haussement épaules', 'haussements d’épaules'], 'Shrugs (haussements d’épaules pour les trapèzes)', 'shrugs'),
  E('Exercices', ['oiseau', 'rear delt', 'rear delt fly', 'reverse fly', 'reverse pec deck', 'butterfly inversé'], 'Oiseau (arrière d’épaule)', 'oiseau'),
  E('Exercices', ['élév lat', 'elev lat', 'élévations latérales', 'lat raise', 'lateral raise', 'lateral raises', 'latérales', 'lat raises'], 'Élévations latérales (milieu d’épaule)', 'élévations latérales'),
  E('Exercices', ['élév front', 'front raise', 'élévations frontales', 'frontales'], 'Élévations frontales', 'élévations frontales'),
  E('Exercices', ['tirage menton', 'upright row', 'rowing menton'], 'Tirage menton', 'tirage menton'),
  E('Exercices', ['pec deck', 'butterfly', 'peck deck', 'pecdeck'], 'Pec deck (écartés à la machine)', 'pec deck'),
  E('Exercices', ['écartés', 'ecartes', 'fly', 'flys', 'dumbbell fly', 'écarté couché'], 'Écartés haltères', 'écartés haltères'),
  E('Exercices', ['crossover', 'cross over', 'vis à vis', 'vis-à-vis', 'cable fly', 'écartés poulie'], 'Écartés à la poulie vis-à-vis', 'écartés poulie vis-à-vis'),
  E('Exercices', ['chest press', 'presse pectoraux', 'presse pecs'], 'Chest press (développé à la machine)', 'chest press machine'),
  E('Exercices', ['dips barres', 'dips parallèles', 'dips aux barres'], 'Dips aux barres parallèles', 'dips sur barres parallèles'),
  E('Exercices', ['dips lestés', 'weighted dips'], 'Dips avec du lest', 'dips sur barres parallèles lestés'),
  E('Exercices', ['dips banc', 'bench dips'], 'Dips sur un banc', 'dips sur banc'),
  E('Exercices', ['push up', 'pushup', 'push ups', 'pushups'], 'Pompes', 'pompes classiques'),
  E('Exercices', ['pompes diamant', 'diamond push up', 'diamond'], 'Pompes diamant (mains rapprochées)', 'pompes diamant'),
  E('Exercices', ['curl barre', 'curl ez', 'barbell curl'], 'Curl biceps à la barre', 'curl biceps barre'),
  E('Exercices', ['curl haltères', 'curl alterné', 'db curl', 'dumbbell curl'], 'Curl haltères', 'curl haltères alterné'),
  E('Exercices', ['marteau', 'curl marteau', 'hammer curl', 'hammer'], 'Curl marteau (prise neutre)', 'curl marteau'),
  E('Exercices', ['pupitre', 'curl pupitre', 'preacher', 'preacher curl', 'larry scott'], 'Curl au pupitre', 'curl pupitre'),
  E('Exercices', ['curl concentré', 'concentration curl'], 'Curl concentré', 'curl concentré'),
  E('Exercices', ['curl poulie', 'cable curl'], 'Curl à la poulie basse', 'curl poulie basse'),
  E('Exercices', ['barre au front', 'skull', 'skull crusher', 'skullcrusher', 'skulls', 'écrase crâne', 'french press'], 'Barre au front (triceps)', 'barre au front'),
  E('Exercices', ['pushdown', 'push down', 'extension poulie', 'extension triceps poulie', 'triceps poulie', 'tirage triceps', 'rope pushdown'], 'Extension des triceps à la poulie haute', 'extension triceps poulie haute'),
  E('Exercices', ['extension nuque', 'overhead extension', 'french press haltère', 'extension triceps nuque'], 'Extension des triceps derrière la nuque', 'extension triceps nuque'),
  E('Exercices', ['kickback', 'kick back', 'kickback triceps'], 'Kickback (triceps buste penché)', 'kickback triceps haltère'),
  E('Exercices', ['crunches', 'crunch au sol', 'crunchs au sol'], 'Crunchs (abdominaux)', 'crunchs abdominaux au sol'),
  E('Exercices', ['crunch poulie', 'cable crunch', 'prière'], 'Crunch à la poulie haute', 'crunch abdominaux poulie haute'),
  E('Exercices', ['relevé de jambes', 'leg raise', 'leg raises', 'hanging leg raise', 'relevés de jambes suspendu'], 'Relevés de jambes', 'relevé de jambes suspendu'),
  E('Exercices', ['chaise romaine', 'captain chair', 'captain’s chair'], 'Relevés de genoux à la chaise romaine', 'relevé de genoux chaise romaine'),
  E('Exercices', ['ttb', 'toes to bar', 't2b'], 'Toes to bar (pieds à la barre)', 'toes to bar'),
  E('Exercices', ['planche', 'plank', 'gainage', 'gainage ventral'], 'Gainage planche (en secondes)', 'gainage planche'),
  E('Exercices', ['gainage latéral', 'side plank'], 'Gainage latéral (en secondes)', 'gainage latéral'),
  E('Exercices', ['roue', 'ab wheel', 'roue abdo', 'roulette'], 'Roue abdominale', 'roue abdominale'),
  E('Exercices', ['lombaires', 'extension lombaire', 'back extension', 'hyperextension', 'hyperextensions', 'banc à lombaires'], 'Extensions lombaires', 'extension lombaires'),
  E('Exercices', ['curl', 'curls'], 'Curl : flexion du coude (biceps) ; à préciser : barre, haltères, poulie, marteau…'),
  E('Exercices', ['traction', 'tractions', 'pull'], 'Tractions (sans précision : prise pronation)'),
  E('Exercices', ['dips', 'dip'], 'Dips (barres parallèles, banc ou machine)'),
  E('Exercices', ['pompes', 'pompe'], 'Pompes'),
  E('Exercices', ['crunch', 'crunchs'], 'Crunch (abdominaux)'),
  E('Exercices', ['muscle up', 'muscle-up', 'mu', 'muscle ups'], 'Muscle-up (traction puis passage au-dessus de la barre)', 'muscle-up'),
  E('Exercices', ['burpee', 'burpees'], 'Burpees', 'burpees'),
  E('Exercices', ['mountain climber', 'mountain climbers', 'grimpeur'], 'Mountain climbers', 'mountain climbers'),
  E('Exercices', ['wall ball', 'wallball'], 'Wall ball (lancer de ballon contre un mur)', 'wall ball'),
  E('Exercices', ['woodchop', 'bûcheron'], 'Bûcheron à la poulie (rotation)', 'bûcheron poulie'),
  E('Exercices', ['pallof', 'pallof press'], 'Pallof press (anti-rotation)', 'pallof press'),
  E('Exercices', ['dead hang', 'suspension'], 'Suspension à la barre (en secondes)', 'suspension à la barre'),
  E('Exercices', ['clean', 'épaulé', 'power clean'], 'Épaulé (haltérophilie)'),
  E('Exercices', ['snatch', 'arraché'], 'Arraché (haltérophilie)'),
  E('Exercices', ['jerk', 'jeté', 'clean and jerk', 'épaulé jeté'], 'Épaulé-jeté (haltérophilie)'),
  E('Exercices', ['thruster', 'thrusters'], 'Thruster (squat avant enchaîné avec un développé)'),
  E('Exercices', ['farmer walk', 'farmer’s walk', 'marche du fermier'], 'Marche du fermier (porter deux charges lourdes)'),
  E('Exercices', ['sled', 'traîneau', 'prowler'], 'Traîneau à pousser ou tirer'),
  E('Exercices', ['les 3 mouvements', 'big 3', 'sbd'], 'Squat, développé couché, soulevé de terre (force athlétique)'),
  // ---------------- Muscles ----------------
  E('Muscles', ['pecs', 'pec', 'pectos', 'pectoraux', 'chest'], 'Pectoraux', 'pectoraux'),
  E('Muscles', ['bis', 'biceps', 'guns', 'pythons'], 'Biceps', 'biceps'),
  E('Muscles', ['tris', 'triceps', 'trice'], 'Triceps', 'triceps'),
  E('Muscles', ['delts', 'deltos', 'épaules', 'épaule', 'shoulders', 'delto'], 'Épaules (deltoïdes)', 'épaules'),
  E('Muscles', ['lats', 'grand dorsal', 'grands dorsaux', 'dorsaux', 'dos large'], 'Grands dorsaux (dos)', 'dos'),
  E('Muscles', ['traps', 'trapèzes', 'trapèze'], 'Trapèzes', 'trapèzes'),
  E('Muscles', ['quadri', 'quadris', 'quads', 'quadriceps', 'cuisses'], 'Quadriceps', 'quadriceps'),
  E('Muscles', ['ischios', 'ischio', 'hamstrings', 'hammies', 'hammys', 'arrière cuisses'], 'Ischio-jambiers', 'ischio-jambiers'),
  E('Muscles', ['fessiers', 'fesses', 'glutes', 'booty'], 'Fessiers', 'fessiers'),
  E('Muscles', ['abdos', 'abs', 'tablettes', 'tablettes de chocolat', 'sangle abdominale', 'core'], 'Abdominaux', 'abdominaux'),
  E('Muscles', ['obliques', 'poignées d’amour'], 'Obliques (côtés du ventre)', 'obliques'),
  E('Muscles', ['mollets', 'calves', 'mollet'], 'Mollets', 'mollets'),
  E('Muscles', ['avant bras', 'avants bras', 'forearms', 'grip'], 'Avant-bras (et force de la poigne)', 'avant-bras'),
  E('Muscles', ['lombaires', 'bas du dos', 'lower back'], 'Lombaires (bas du dos)', 'lombaires'),
  E('Muscles', ['haut du corps', 'upper', 'upper body'], 'Haut du corps (pectoraux, dos, épaules, bras)'),
  E('Muscles', ['bas du corps', 'lower', 'lower body', 'legs', 'leg day', 'jour des jambes'], 'Bas du corps (jambes, fessiers)'),
  E('Muscles', ['chaîne postérieure', 'posterior chain'], 'Arrière du corps : ischios, fessiers, lombaires'),
  // ---------------- Séries et charges ----------------
  E('Séries et charges', ['rep', 'reps', 'rép', 'réps', 'répét', 'répétition', 'repetition'], 'Répétition : un mouvement complet', 'répétitions'),
  E('Séries et charges', ['set', 'sets', 'série', 'séries'], 'Série : un groupe de répétitions sans pause', 'séries'),
  E('Séries et charges', ['5x5', '3x10', '4x8', 'nxm'], '« 5x5 » = 5 séries de 5 répétitions (séries × répétitions)'),
  E('Séries et charges', ['top set', 'top', 'série lourde', 'heavy single', 'single'], 'Série la plus lourde de la séance (souvent peu de répétitions)'),
  E('Séries et charges', ['back off', 'back-off', 'backoff', 'séries de retour', 'série allégée'], 'Séries allégées faites après la série lourde'),
  E('Séries et charges', ['warm up', 'warmup', 'échauffement', 'série de chauffe', 'chauffe', 'montée en charge', 'ramp up'], 'Séries d’échauffement (jamais comptées)'),
  E('Séries et charges', ['rm', '1rm', 'max', 'pr', 'pb', 'record', 'record perso'], 'RM = répétition maximale, 1RM = charge pour une seule répétition ; PR / PB = record personnel'),
  E('Séries et charges', ['rir', 'en réserve', 'reps in reserve'], 'RIR : répétitions qu’il restait en réserve (RIR 2 = encore 2 possibles). RIR = 10 − RPE'),
  E('Séries et charges', ['rpe', '@'], 'RPE : effort ressenti de 1 à 10 (« 5 reps @8 » = RPE 8, il en restait 2)'),
  E('Séries et charges', ['échec', 'failure', 'à l’échec', 'to failure', 'rir 0'], 'Aller jusqu’à ne plus pouvoir faire une répétition propre (RIR 0)'),
  E('Séries et charges', ['amrap', 'max reps'], 'AMRAP : le plus de répétitions possible'),
  E('Séries et charges', ['emom'], 'EMOM : une série au début de chaque minute'),
  E('Séries et charges', ['superset', 'super set', 'superserie', 'super série', 'biset', 'bi set'], 'Superset / biset : deux exercices enchaînés sans repos'),
  E('Séries et charges', ['triset', 'tri set', 'giant set', 'série géante', 'circuit'], 'Triset / série géante : trois exercices ou plus enchaînés'),
  E('Séries et charges', ['drop set', 'dropset', 'dégressive', 'dégressif', 'strip set'], 'Série dégressive : on baisse la charge sans repos et on continue'),
  E('Séries et charges', ['rest pause', 'rest-pause', 'repos pause'], 'Repos-pause : courtes pauses de quelques secondes pour quelques répétitions de plus'),
  E('Séries et charges', ['myo reps', 'myo', 'myoreps'], 'Myo-reps : une série d’activation puis des mini-séries très rapprochées'),
  E('Séries et charges', ['cluster', 'cluster set', 'séries fractionnées'], 'Séries fractionnées : la série est coupée par de courtes pauses'),
  E('Séries et charges', ['pyramide', 'pyramid'], 'Pyramide : la charge monte (ou descend) de série en série'),
  E('Séries et charges', ['tempo', '3010', '3-0-1-0'], 'Tempo : vitesse de chaque phase (ex. 3-0-1-0 = 3 s pour descendre, 0 pause, 1 s pour monter)'),
  E('Séries et charges', ['negative', 'négative', 'négatives', 'excentrique'], 'Négative : phase de descente, freinée'),
  E('Séries et charges', ['partielles', 'partials', 'demi reps'], 'Répétitions partielles (amplitude réduite)'),
  E('Séries et charges', ['triche', 'cheat', 'cheating', 'élan'], 'Tricher : s’aider de l’élan pour soulever plus'),
  E('Séries et charges', ['atg', 'ass to grass', 'squat complet', 'full squat'], 'Squat le plus bas possible'),
  E('Séries et charges', ['lest', 'lesté', 'lestée', 'weighted', 'ceinture de lest'], 'Poids ajouté sur un exercice au poids du corps (ceinture, gilet)'),
  E('Séries et charges', ['pdc', 'poids du corps', 'bodyweight', 'bw', 'pdc seul'], 'Poids du corps, sans charge', 'poids du corps'),
  E('Séries et charges', ['plaque', 'plaques', 'galette', 'galettes', 'disque', 'disques', 'plate', 'plates'], 'Disques de fonte. « 2 plaques de chaque côté » = barre de 20 kg + 2 × 20 kg de chaque côté = 100 kg'),
  E('Séries et charges', ['barre à vide', 'barre vide', 'empty bar'], 'La barre seule (20 kg pour une barre olympique)', '20 kg'),
  E('Séries et charges', ['kilos', 'kg', 'kil', 'kils', 'kgs'], 'Kilogrammes', 'kg'),
  E('Séries et charges', ['déload', 'deload', 'semaine de décharge', 'semaine allégée', 'décharge'], 'Semaine allégée pour récupérer'),
  E('Séries et charges', ['volume'], 'Volume : nombre de séries (ou séries × répétitions × charge)'),
  E('Séries et charges', ['intensité'], 'Intensité : charge par rapport au max (en %) ou effort'),
  E('Séries et charges', ['surcharge progressive', 'progressive overload', 'overload'], 'Surcharge progressive : augmenter peu à peu charge, répétitions ou séries'),
  // ---------------- Matériel ----------------
  E('Matériel', ['smith', 'cadre guidé', 'barre guidée', 'multipower', 'smith machine'], 'Smith machine (barre guidée sur rails)', 'smith machine'),
  E('Matériel', ['rack', 'cage', 'cage à squat', 'power rack', 'squat rack'], 'Cage (ou rack) à squat'),
  E('Matériel', ['ez', 'barre ez', 'barre coudée'], 'Barre EZ (coudée)', 'barre ez'),
  E('Matériel', ['barre olympique', 'olympique'], 'Barre olympique (20 kg, 2,20 m)'),
  E('Matériel', ['haltère', 'haltères', 'halteres', 'db', 'dbs', 'dumbbell', 'dumbbells', 'hantel'], 'Haltères', 'haltères'),
  E('Matériel', ['kb', 'kettle', 'kettlebell', 'kettlebells'], 'Kettlebell', 'kettlebell'),
  E('Matériel', ['poulie', 'poulies', 'câble', 'cable', 'cables', 'vis à vis'], 'Poulie (câble)', 'poulie'),
  E('Matériel', ['élastique', 'elastique', 'band', 'bands', 'bande'], 'Élastique (aide ou résistance)', 'élastique'),
  E('Matériel', ['banc', 'bench'], 'Banc'),
  E('Matériel', ['ceinture', 'belt', 'ceinture de force'], 'Ceinture de force (gainage pour les charges lourdes)'),
  E('Matériel', ['straps', 'sangles', 'sangles de tirage'], 'Sangles pour tenir la barre sans que la poigne lâche'),
  E('Matériel', ['magnésie', 'chalk', 'craie'], 'Magnésie (mains sèches)'),
  E('Matériel', ['genouillères', 'knee sleeves', 'manchons'], 'Manchons de genoux'),
  E('Matériel', ['épi', 'porte disques'], 'Support de rangement des disques'),
  E('Matériel', ['tapis', 'tapis de course', 'treadmill'], 'Tapis de course'),
  E('Matériel', ['rameur', 'rower', 'row'], 'Rameur'),
  E('Matériel', ['vélo', 'bike', 'assault bike', 'airbike'], 'Vélo (d’appartement, air bike)'),
  // ---------------- Physique et nutrition ----------------
  E('Physique et nutrition', ['prise de masse', 'pdm', 'bulk', 'bulking', 'masse'], 'Prise de masse : manger un peu plus pour prendre du muscle'),
  E('Physique et nutrition', ['sèche', 'seche', 'cut', 'cutting', 'sécher'], 'Sèche : perdre du gras en gardant le muscle'),
  E('Physique et nutrition', ['recompo', 'recomposition', 'recomp'], 'Recomposition : perdre du gras et prendre du muscle en même temps'),
  E('Physique et nutrition', ['maintien', 'maintenance'], 'Maintien : manger autant qu’on dépense'),
  E('Physique et nutrition', ['gains', 'gainz', 'progrès'], 'Gains : progrès en muscle ou en force'),
  E('Physique et nutrition', ['pump', 'congestion', 'gonflé'], 'Pump / congestion : muscle gonflé de sang pendant l’effort (temporaire)'),
  E('Physique et nutrition', ['courbatures', 'doms'], 'Courbatures (DOMS) : douleurs 1 à 3 jours après l’effort'),
  E('Physique et nutrition', ['sec', 'shredded', 'ripped', 'déf', 'défini', 'dessiné', 'vasculaire'], 'Sec / dessiné : peu de gras, muscles bien visibles'),
  E('Physique et nutrition', ['massif', 'gros', 'swole', 'jacked', 'big'], 'Très musclé'),
  E('Physique et nutrition', ['skinny fat', 'mince gras'], 'Mince mais avec peu de muscle et un peu de gras'),
  E('Physique et nutrition', ['whey', 'protéine', 'prot', 'shaker'], 'Whey : protéine en poudre (lait)'),
  E('Physique et nutrition', ['créa', 'créatine', 'creatine'], 'Créatine : complément étudié pour la force'),
  E('Physique et nutrition', ['booster', 'pré workout', 'pre workout', 'preworkout'], 'Booster : complément pris avant la séance (souvent caféine)'),
  E('Physique et nutrition', ['macros'], 'Macros : protéines, glucides, lipides'),
  E('Physique et nutrition', ['tdee', 'dépense'], 'Dépense calorique totale de la journée'),
  E('Physique et nutrition', ['cheat meal', 'cheat day', 'craquage'], 'Repas « plaisir » hors régime'),
  E('Physique et nutrition', ['gh', 'stéro', 'stéroïdes', 'produits', 'natty', 'natural', 'naturel'], 'Natty = sans produits dopants ; produits / stéros = dopage (dangereux et interdit en compétition)'),
  // ---------------- Vie de salle ----------------
  E('Vie de salle', ['go muscu', 'gym', 'la salle', 'salle de muscu'], 'La salle de musculation'),
  E('Vie de salle', ['séance', 'session', 'entraînement', 'training', 'workout', 'wod'], 'Séance d’entraînement'),
  E('Vie de salle', ['full body', 'fullbody', 'corps entier'], 'Séance qui travaille tout le corps'),
  E('Vie de salle', ['split', 'half body', 'haut bas', 'upper lower'], 'Séances qui alternent des parties du corps (haut / bas…)'),
  E('Vie de salle', ['ppl', 'push pull legs', 'push', 'pull'], 'Push / pull / legs : séances poussée, tirage, jambes'),
  E('Vie de salle', ['spot', 'spotter', 'pareur', 'parer', 'parade'], 'Pareur : partenaire qui sécurise une série lourde'),
  E('Vie de salle', ['ego lift', 'ego lifting', 'ego'], 'Soulever trop lourd pour l’ego, au détriment de la technique'),
  E('Vie de salle', ['broscience', 'bro science'], 'Croyances de salle sans preuve scientifique'),
  E('Vie de salle', ['gym bro', 'bro', 'gros bras', 'fonteux', 'fonte'], 'Habitué de la salle ; « la fonte » = les charges, la musculation'),
  E('Vie de salle', ['powerlifting', 'force athlétique', 'powerlifteur', 'pl'], 'Force athlétique : squat, développé couché, soulevé de terre'),
  E('Vie de salle', ['bodybuilding', 'culturisme', 'bb', 'bodybuildeur'], 'Culturisme : développer et dessiner les muscles'),
  E('Vie de salle', ['street workout', 'calisthenics', 'calisthénie', 'sw'], 'Musculation au poids du corps (barres, anneaux)'),
  E('Vie de salle', ['crossfit', 'cross training', 'hyrox'], 'Entraînement fonctionnel en circuits'),
  E('Vie de salle', ['cardio', 'hiit', 'liss'], 'Cardio ; HIIT = fractionné intense ; LISS = effort doux et long'),
  E('Vie de salle', ['récup', 'recup', 'récupération', 'repos', 'rest day', 'jour off'], 'Récupération / jour de repos'),
  E('Vie de salle', ['blessure', 'pépin', 'bobo'], 'Blessure ou douleur'),
  E('Vie de salle', ['plateau', 'stagnation', 'stagne'], 'Plateau : plus de progrès depuis un moment'),
  E('Vie de salle', ['débutant', 'newbie', 'noob', 'novice'], 'Débutant'),
];

const norm = s => stripAccents(String(s || '').toLowerCase()).replace(/[’']/g, ' ').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// remplacements pour la lecture : plus long d'abord (« sdt roumain » avant « sdt »)
const RULES = SLANG.filter(e => e.to)
  .flatMap(e => e.t.map(t => [norm(t), norm(e.to)]))
  .filter(([t]) => t.length >= 2)
  .sort((a, b) => b[0].length - a[0].length);
const RE = RULES.length ? new RegExp(`(^|[^a-z0-9])(${RULES.map(([t]) => esc(t)).join('|')})(?=$|[^a-z0-9])`, 'g') : null;
const MAP = new Map(RULES);

/**
 * Traduit l'argot avant la lecture : « 3x5 dc à 2 plaques de chaque côté @8 » → « 3x5 developpe couche barre a 100 kg rpe 8 ».
 * Texte rendu en minuscules sans accents (ce que lisent les analyses de l'appli).
 */
export function normalizeSlang(text) {
  let s = ` ${norm(text)} `;
  // charges en disques : « 2 plaques (de 20) de chaque côté » = barre de 20 kg + 2 × 2 × 20 kg
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*(?:plaques?|galettes?|disques?|plates?)(?:\s*de\s*(\d+(?:[.,]\d+)?)(?:\s*kg)?)?\s*(?:de chaque cote|par cote|chaque cote|de chaque|each side|par\s*cote)/g,
    (m, n, w) => ` ${20 + 2 * Number(String(n).replace(',', '.')) * (w ? Number(String(w).replace(',', '.')) : 20)} kg `);
  // la barre seule
  s = s.replace(/(^|\s)(?:barre a vide|barre vide|empty bar)(?=\s|$)/g, ' 20 kg ');
  // notation RPE « @8 » / « @ 8.5 »
  s = s.replace(/@\s*(\d+(?:[.,]5)?)/g, ' rpe $1 ');
  // « à l'échec » = RIR 0
  s = s.replace(/(^|\s)(?:a l echec|jusqu a l echec|to failure|failure)(?=\s|$)/g, ' rir 0 ');
  if (RE) s = s.replace(RE, (m, pre, t) => `${pre}${MAP.get(t) || t}`);
  return s.replace(/\s+/g, ' ').trim();
}

/** Recherche dans le lexique (page « Lexique de la salle »). */
export function searchSlang(q) {
  const k = norm(q);
  if (!k) return SLANG;
  return SLANG.filter(e => e.t.some(t => norm(t).includes(k)) || norm(e.means).includes(k));
}

/** Lexique compact pour le coach intelligent (envoyé avec le catalogue, partie mise en cache). */
export function slangText() {
  return SLANG.map(e => `${e.t.slice(0, 6).join(', ')} = ${e.means}`).join('\n');
}
