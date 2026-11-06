import { EXERCISE_CATALOG } from '../data/catalog';
import { stripAccents } from '../lib/text';

// ==========================================
// DICTÉE VOCALE : dictionnaire des exercices (noms, variantes et fautes d'écoute courantes)
// ==========================================
export const VOICE_DICTIONARY = [
  {
    id: 'hip_thrust',
    name: 'Hip Thrust Barre',
    category: 'Jambes',
    type: 'strength',
    unit: 'kg',
    icon: '🍑',
    defaultGoal: 100,
    defaultGoalSets: 3,
    defaultGoalReps: 10,
    aliases: [
      'hip thrust', 'hip-thrust', 'hiptrust', 'hip trust', 'ip trust', 'ip thrust',
      'hype trust', 'hype thrust', 'yp trust', 'relevé de bassin', 'releve de bassin',
      'pont fessier', 'fessiers barre', 'exercice fessier'
    ]
  },
  {
    id: 'pullups',
    name: 'Tractions Pronation',
    category: 'Dos',
    type: 'strength',
    unit: 'reps',
    icon: '🦅',
    defaultGoal: 6,
    defaultGoalSets: 3,
    defaultGoalReps: 6,
    aliases: [
      'tractions pronation', 'traction pronation', 'tracon pronation', 'tracons pronation',
      'tractions', 'traction', 'tracon', 'tracons', 'traxion', 'traxions', 'tracton',
      'tration', 'trations', 'pull up', 'pull-up', 'pullups'
    ]
  },
  {
    id: 'chinups',
    name: 'Tractions Supination',
    category: 'Dos',
    type: 'strength',
    unit: 'reps',
    icon: '🔱',
    defaultGoal: 8,
    defaultGoalSets: 3,
    defaultGoalReps: 8,
    aliases: [
      'tractions supination', 'traction supination', 'tracon supination', 'tracons supination',
      'traction biceps', 'chin up', 'chin-up', 'chinups'
    ]
  },
  {
    id: 'lat_pulldown',
    name: 'Tirage Vertical Poulie Haute',
    category: 'Dos',
    type: 'strength',
    unit: 'kg',
    icon: '🏹',
    defaultGoal: 55,
    defaultGoalSets: 3,
    defaultGoalReps: 10,
    aliases: [
      'tirage vertical', 'tirage poulie haute', 'poulie haute', 'tirage poitrine',
      'tirage dos', 'lat pulldown', 'tirage haut'
    ]
  },
  {
    id: 'barbell_row',
    name: 'Rowing Barre Buste Penché',
    category: 'Dos',
    type: 'strength',
    unit: 'kg',
    icon: '🚣',
    defaultGoal: 65,
    defaultGoalSets: 3,
    defaultGoalReps: 8,
    aliases: [
      'rowing barre', 'rowing', 'roing', 'rowing haltère', 'rowing haltere',
      'tirage horizontal', 'tirage bucheron', 'bûcheron', 'bucheron'
    ]
  },
  {
    id: 'bench_press',
    name: 'Développé Couché Barre',
    category: 'Pectoraux',
    type: 'strength',
    unit: 'kg',
    icon: '🏋️',
    defaultGoal: 60,
    defaultGoalSets: 3,
    defaultGoalReps: 8,
    aliases: [
      'développé couché', 'developpe couche', 'développer coucher', 'developper coucher',
      'développé coucher', 'developpe coucher', 'couché barre', 'couche barre',
      'bench press', 'bench', 'dév couché', 'dc barre'
    ]
  },
  {
    id: 'incline_dumbbell',
    name: 'Développé Incliné Haltères',
    category: 'Pectoraux',
    type: 'strength',
    unit: 'kg',
    icon: '🔥',
    defaultGoal: 22,
    defaultGoalSets: 3,
    defaultGoalReps: 10,
    aliases: [
      'développé incliné', 'developpe incline', 'développer incliner', 'developper incliner',
      'incliné haltères', 'incline haltere', 'incliné', 'incline'
    ]
  },
  {
    id: 'pushups',
    name: 'Pompes Classiques',
    category: 'Pectoraux',
    type: 'strength',
    unit: 'reps',
    icon: '🛡️',
    defaultGoal: 20,
    defaultGoalSets: 3,
    defaultGoalReps: 20,
    aliases: ['pompes', 'pompe', 'ponpe', 'ponpes', 'push up', 'push-up', 'pushups']
  },
  {
    id: 'squat',
    name: 'Squat Barre',
    category: 'Jambes',
    type: 'strength',
    unit: 'kg',
    icon: '🦵',
    defaultGoal: 80,
    defaultGoalSets: 3,
    defaultGoalReps: 6,
    aliases: [
      'squat barre', 'squats', 'squat', 'skouat', 'scouat', 'squate', 'squates',
      'skouate', 'scouate', 'back squat', 'front squat'
    ]
  },
  {
    id: 'leg_press',
    name: 'Presse à Cuisses',
    category: 'Jambes',
    type: 'strength',
    unit: 'kg',
    icon: '⚡',
    defaultGoal: 140,
    defaultGoalSets: 4,
    defaultGoalReps: 10,
    aliases: [
      'presse à cuisses', 'presse a cuisses', 'presse cuisse', 'leg press',
      'presse jambes', 'presse'
    ]
  },
  {
    id: 'deadlift',
    name: 'Soulevé de Terre',
    category: 'Jambes',
    type: 'strength',
    unit: 'kg',
    icon: '🦍',
    defaultGoal: 100,
    defaultGoalSets: 3,
    defaultGoalReps: 5,
    aliases: [
      'soulevé de terre', 'souleve de terre', 'soulever de terre', 'deadlift',
      'dead lift', 'sdt', 'soulevé terre'
    ]
  },
  {
    id: 'dips',
    name: 'Dips sur Barres Parallèles',
    category: 'Épaules & Bras',
    type: 'strength',
    unit: 'reps',
    icon: '💎',
    defaultGoal: 8,
    defaultGoalSets: 3,
    defaultGoalReps: 8,
    aliases: ['dips', 'dip', 'dipse', 'dipses', 'deep', 'deeps']
  },
  {
    id: 'overhead_press',
    name: 'Développé Militaire',
    category: 'Épaules & Bras',
    type: 'strength',
    unit: 'kg',
    icon: '⚔️',
    defaultGoal: 45,
    defaultGoalSets: 3,
    defaultGoalReps: 8,
    aliases: [
      'développé militaire', 'developpe militaire', 'développer militaire',
      'développé épaules', 'developpe epaules', 'militaire', 'overhead press', 'ohp'
    ]
  },
  {
    id: 'barbell_curl',
    name: 'Curl Biceps Barre EZ',
    category: 'Épaules & Bras',
    type: 'strength',
    unit: 'kg',
    icon: '💥',
    defaultGoal: 35,
    defaultGoalSets: 3,
    defaultGoalReps: 10,
    aliases: [
      'curl biceps', 'curl barre', 'curl haltères', 'curl haltere', 'curl',
      'keurl', 'coeur biceps', 'biceps'
    ]
  },
  {
    id: 'crunches_floor',
    name: 'Crunchs Abdominaux au Sol',
    category: 'Abdominaux',
    type: 'strength',
    unit: 'reps',
    icon: '🍫',
    defaultGoal: 20,
    defaultGoalSets: 3,
    defaultGoalReps: 20,
    aliases: [
      'crunchs abdominaux', 'crunch au sol', 'crunchs', 'crunch', 'crunche',
      'krunch', 'crench', 'abdos', 'abdo', 'abdominaux'
    ]
  },
  {
    id: 'hanging_leg_raises',
    name: 'Relevé de Jambes Suspendu',
    category: 'Abdominaux',
    type: 'strength',
    unit: 'reps',
    icon: '🦿',
    defaultGoal: 12,
    defaultGoalSets: 3,
    defaultGoalReps: 12,
    aliases: [
      'relevé de jambes', 'releve de jambes', 'relevé de jambe', 'relever de jambe',
      'jambes suspendu'
    ]
  },
  {
    id: 'ab_wheel',
    name: 'Roue Abdominale (Ab Wheel)',
    category: 'Abdominaux',
    type: 'strength',
    unit: 'reps',
    icon: '🎡',
    defaultGoal: 12,
    defaultGoalSets: 3,
    defaultGoalReps: 12,
    aliases: ['roue abdominale', 'roue abdos', 'roue abdo', 'ab wheel']
  },
  {
    id: 'cable_crunch',
    name: 'Crunch Abdominaux Poulie Haute',
    category: 'Abdominaux',
    type: 'strength',
    unit: 'kg',
    icon: '⚡',
    defaultGoal: 45,
    defaultGoalSets: 3,
    defaultGoalReps: 15,
    aliases: ['crunch poulie', 'abdos poulie', 'crunch corde']
  },
  {
    id: 'running_endurance',
    name: 'Course à pied (Endurance)',
    category: 'Course & Cardio',
    type: 'cardio',
    unit: 'km',
    cardioMode: 'run',
    icon: '🏃',
    defaultGoal: 10,
    aliases: [
      'course à pied', 'course a pied', 'course', 'footing', 'fouting',
      'running', 'jogging', 'couru', 'courir'
    ]
  },
  {
    id: 'running_interval',
    name: 'Course Fractionné / VMA',
    category: 'Course & Cardio',
    type: 'cardio',
    unit: 'km',
    cardioMode: 'interval',
    icon: '⚡',
    defaultGoal: 6,
    aliases: ['fractionné', 'fractionne', 'vma', 'sprint']
  },
  {
    id: 'brisk_walk',
    name: 'Marche Active / Randonnée',
    category: 'Course & Cardio',
    type: 'cardio',
    unit: 'km',
    cardioMode: 'walk',
    icon: '🥾',
    defaultGoal: 12,
    aliases: ['marche active', 'marche rapide', 'randonnée', 'randonnee', 'rando', 'marche', 'marché']
  },
  {
    id: 'incline_walk',
    name: 'Marche Inclinée (Tapis)',
    category: 'Course & Cardio',
    type: 'cardio',
    unit: 'min',
    cardioMode: 'incline_walk',
    icon: '⛰️',
    defaultGoal: 45,
    aliases: ['marche inclinée', 'marche inclinee', 'tapis incliné', 'tapis incline']
  },
{
    id: 'volleyball',
    name: 'Volley-ball',
    category: 'Volley-ball',
    type: 'cardio',
    unit: 'min',
    cardioMode: 'volleyball',
    icon: '🏐',
    defaultGoal: 120,
    aliases: ['volley', 'volleyball', 'volley-ball', 'match de volley', 'entrainement de volley']
  },
];

// ------------------------------------------------------------------
// DICTÉE VOCALE : alias pour les exercices du catalogue étendu (Fitness Park)
// Chaque phrase fait 3 mots maximum (limite de la fenêtre d'analyse).
// ------------------------------------------------------------------
const VOICE_ALIASES_EXTRA = {
  fp_seated_row: ['tirage horizontal', 'rowing poulie basse', 'tirage poulie basse', 'rowing assis', 'row assis'],
  fp_low_row_machine: ['low row', 'low row machine', 'rowing machine assise'],
  fp_hammer_row: ['rowing hammer', 'rowing hammer strength', 'row hammer', 'rowing iso lateral', 'iso lateral row'],
  fp_tbar_row: ['t bar', 'tbar', 'rowing t bar', 'rowing tbar', 'ti bar'],
  fp_db_row: ['rowing haltere', 'rowing haltere unilateral', 'tirage haltere', 'rowing unilateral'],
  fp_vertical_traction: ['vertical traction', 'traction verticale', 'traction machine'],
  fp_hammer_pulldown: ['tirage hammer', 'tirage vertical hammer', 'pulldown hammer'],
  fp_close_pulldown: ['tirage prise serree', 'tirage poitrine', 'tirage serre'],
  fp_straight_arm_pd: ['pull over poulie', 'pullover poulie', 'pull over haute', 'bras tendus'],
  fp_assisted_pullup: ['traction assistee', 'tractions assistees', 'traction machine assistee', 'assisted pull up'],
  fp_back_extension: ['extension lombaires', 'lombaires', 'banc a lombaires', 'hyperextension', 'hyper extension'],
  fp_lumbar_machine: ['lombaires machine', 'extension lombaire machine'],
  fp_shrugs_db: ['shrugs haltere', 'shrug haltere', 'trapezes haltere', 'haussements epaules'],
  fp_shrugs_bar: ['shrugs barre', 'shrug barre', 'trapezes barre', 'shrugs', 'shrug', 'trapezes'],
  fp_inverted_row: ['rowing inverse', 'tirage inverse', 'inverted row'],

  fp_db_bench: ['developpe couche haltere', 'developpe haltere', 'couche haltere', 'developpe couche halteres'],
  fp_incline_barbell: ['developpe incline barre', 'incline barre', 'incline barbell'],
  fp_decline_barbell: ['developpe decline', 'decline barre', 'developpe decline barre'],
  fp_smith_bench: ['developpe couche smith', 'bench smith', 'smith couche'],
  fp_smith_incline: ['developpe incline smith', 'incline smith'],
  fp_chest_press: ['chest press', 'chest press machine', 'developpe machine', 'pec press'],
  fp_hammer_chest: ['chest press hammer', 'developpe hammer', 'hammer chest', 'hammer pecs'],
  fp_hammer_incline: ['incline hammer', 'developpe incline hammer', 'hammer incline'],
  fp_pec_deck: ['pec deck', 'peck deck', 'pec dec', 'butterfly', 'papillon', 'machine papillon'],
  fp_cable_fly: ['ecartes poulie', 'ecarte poulie', 'crossover', 'cross over', 'vis a vis', 'poulies vis a vis'],
  fp_db_fly: ['ecartes haltere', 'ecartes halteres', 'ecartes couche'],
  fp_incline_fly: ['ecartes inclines', 'ecartes incline'],
  fp_db_pullover: ['pull over haltere', 'pullover haltere', 'pull over', 'pullover'],
  fp_decline_pushups: ['pompes pieds surleves', 'pompes declinees', 'pompes declines'],
  fp_diamond_pushups: ['pompes diamant', 'pompe diamant', 'diamond pushups'],

  fp_smith_squat: ['squat smith', 'smith squat', 'squat a la smith'],
  fp_front_squat: ['front squat', 'squat avant', 'squat frontal'],
  fp_goblet: ['goblet squat', 'squat goblet', 'goblet', 'gobelet'],
  fp_bulgarian: ['squat bulgare', 'bulgarian', 'bulgare', 'fentes bulgares'],
  fp_hack_squat: ['hack squat', 'hack', 'hacksquat'],
  fp_leg_press_h: ['presse horizontale', 'presse cuisses horizontale'],
  fp_leg_press_45: ['presse inclinee', 'presse plaques', 'presse hammer'],
  fp_leg_ext: ['leg extension', 'extension de jambes', 'extension jambes', 'extension quadriceps', 'quadriceps machine'],
  fp_leg_curl_seat: ['leg curl assis', 'curl ischio assis', 'ischio assis'],
  fp_leg_curl_lying: ['leg curl allonge', 'curl ischio allonge', 'ischio allonge', 'leg curl', 'ischios', 'ischio jambiers'],
  fp_adductors: ['adducteurs', 'adducteur', 'machine adducteurs'],
  fp_abductors: ['abducteurs', 'abducteur', 'machine abducteurs'],
  fp_calf_press: ['mollets presse', 'mollets a la presse', 'mollet presse'],
  fp_calf_standing: ['mollets debout', 'mollet debout', 'calf debout', 'mollets', 'mollet'],
  fp_calf_seated: ['mollets assis', 'mollet assis', 'calf assis'],
  fp_walking_lunge: ['fentes marchees', 'fentes marchee', 'fentes haltere', 'fentes', 'lunges', 'walking lunge'],
  fp_barbell_lunge: ['fentes barre', 'fente barre', 'lunges barre'],
  fp_rdl: ['roumain', 'terre roumain', 'souleve roumain', 'rdl', 'romanian deadlift'],
  fp_sumo: ['souleve sumo', 'sumo', 'deadlift sumo', 'terre sumo'],
  fp_trapbar: ['trap bar', 'trapbar', 'hex bar', 'souleve trap bar'],
  fp_hip_thrust_machine: ['hip thrust machine', 'hip trust machine'],
  fp_glute_kickback: ['kickback fessiers', 'kick back fessiers', 'kickback poulie', 'fessiers poulie'],
  fp_glute_bridge: ['glute bridge', 'bridge fessiers', 'pont fessiers'],
  fp_multihip: ['multi hip', 'multihip', 'multi hanche', 'multihanche'],
  fp_good_morning: ['good morning', 'good mornings', 'goodmorning'],
  fp_step_up: ['step up', 'step ups', 'montees de banc', 'montee banc'],
  fp_wall_ball: ['wall ball', 'wallball', 'wall balls'],
  fp_burpees: ['burpees', 'burpee'],

  fp_db_shoulder: ['developpe epaules haltere', 'developpe epaules', 'shoulder press haltere', 'developpe assis haltere'],
  fp_machine_shoulder: ['shoulder press', 'shoulder press machine', 'developpe epaules machine'],
  fp_hammer_shoulder: ['shoulder press hammer', 'developpe epaules hammer', 'hammer epaules'],
  fp_smith_shoulder: ['militaire smith', 'developpe militaire smith', 'shoulder press smith'],
  fp_arnold: ['arnold press', 'developpe arnold', 'arnold'],
  fp_lateral_db: ['elevations laterales', 'elevation laterale', 'laterales haltere', 'lateral raise', 'laterales'],
  fp_lateral_machine: ['laterales machine', 'elevations laterales machine'],
  fp_lateral_cable: ['laterales poulie', 'elevations laterales poulie'],
  fp_front_raise: ['elevations frontales', 'elevation frontale', 'frontales haltere', 'frontales'],
  fp_rear_fly_db: ['oiseau haltere', 'oiseau', 'oiseaux', 'deltoides posterieurs', 'rear delt'],
  fp_reverse_pec_deck: ['oiseau machine', 'reverse pec deck', 'reverse pec', 'pec deck inverse'],
  fp_face_pull: ['face pull', 'face pulls', 'facepull', 'tirage visage'],
  fp_upright_row: ['tirage menton', 'upright row', 'rowing menton', 'tirage au menton'],
  fp_ext_rotation: ['rotation externe', 'rotation externe poulie', 'coiffe des rotateurs', 'coiffe rotateurs'],
  fp_db_curl: ['curl haltere', 'curl halteres', 'curl alterne', 'curl biceps haltere', 'biceps haltere'],
  fp_hammer_curl: ['curl marteau', 'hammer curl', 'curls marteau', 'marteau'],
  fp_preacher_bar: ['curl pupitre', 'curl pupitre barre', 'pupitre barre', 'preacher curl', 'larry scott'],
  fp_preacher_machine: ['curl pupitre machine', 'pupitre machine', 'preacher machine'],
  fp_cable_curl: ['curl poulie', 'curl poulie basse', 'biceps poulie'],
  fp_incline_curl: ['curl incline', 'curl incline haltere', 'incline curl'],
  fp_concentration_curl: ['curl concentre', 'concentration curl', 'curl concentration'],
  fp_biceps_machine: ['biceps curl machine', 'biceps machine', 'curl machine', 'machine biceps'],
  fp_pushdown: ['extension triceps poulie', 'triceps poulie', 'triceps corde', 'pushdown', 'push down', 'poulie corde', 'extension triceps'],
  fp_pushdown_bar: ['triceps barre droite', 'triceps poulie barre', 'pushdown barre'],
  fp_skull: ['barre au front', 'skull crusher', 'skullcrusher', 'skull crushers', 'barre front'],
  fp_overhead_ext_db: ['triceps nuque', 'extension nuque', 'extension nuque haltere', 'triceps nuque haltere'],
  fp_overhead_ext_cable: ['triceps nuque poulie', 'extension nuque poulie', 'overhead extension'],
  fp_kickback: ['kickback triceps', 'kick back triceps', 'kickback haltere'],
  fp_triceps_machine: ['triceps machine', 'extension triceps machine', 'machine triceps'],
  fp_close_grip_bench: ['developpe prise serree', 'couche prise serree', 'close grip bench', 'close grip'],
  fp_dip_machine: ['dips machine', 'dip machine', 'dips assis machine'],
  fp_bench_dips: ['dips banc', 'dips sur banc', 'bench dips'],
  fp_wrist_curl: ['curl poignets', 'curl poignet', 'avant bras', 'wrist curl'],

  hs_oblique_crunch: ['oblique crunch', 'hammer strength obliques', 'machine obliques', 'obliques machine', 'abdominal oblique', 'obliques', 'rotation buste'],
  tg_total_abdominal: ['total abdominal', 'technogym abdos', 'machine abdos technogym', 'abdos transverse', 'transverse'],
  fp_ab_machine: ['crunch machine', 'abdos machine', 'machine abdos', 'ab crunch'],
  fp_captain_knee: ['releves de genoux', 'releve genoux', 'chaise romaine', 'captain chair', 'releves genoux'],
  fp_toes_to_bar: ['toes to bar', 'toes bar', 'ttb', 'orteils barre'],
  fp_plank: ['gainage', 'planche', 'plank', 'gainage planche'],
  fp_side_plank: ['gainage lateral', 'planche laterale', 'side plank'],
  fp_hollow_hold: ['hollow', 'hollow body', 'hollow hold'],
  fp_wall_sit: ['chaise murale', 'wall sit', 'chaise au mur'],
  fp_dead_hang: ['suspension barre', 'dead hang', 'suspension a la barre'],
  fp_superman_hold: ['superman', 'superman hold'],
  fp_mountain: ['mountain climbers', 'mountain climber', 'grimpeurs'],
  fp_reverse_crunch: ['crunch inverse', 'reverse crunch', 'crunchs inverses'],
  fp_leg_raise_floor: ['releves de jambes sol', 'releve jambes sol', 'leg raise sol', 'releves jambes'],
  fp_situp: ['sit up', 'sit ups', 'situp', 'situps'],
  fp_decline_crunch: ['crunch decline', 'crunch banc', 'abdos decline', 'crunchs declines'],

  fp_bike: ['velo', 'biking', 'velo stationnaire', 'cycling', 'velo de salle', 'cycle park'],
  fp_assault_bike: ['assault bike', 'air bike', 'velo assault', 'assault'],
  fp_elliptical: ['elliptique', 'velo elliptique', 'cross trainer', 'crosstrainer'],
  fp_rower: ['rameur', 'aviron', 'concept 2', 'rowerg'],
  fp_stairs: ['stairmaster', 'escalier', 'stair master', 'machine escalier', 'stepper'],
  fp_skierg: ['ski erg', 'skierg', 'ski ergometre', 'machine ski'],
  fp_jumprope: ['corde a sauter', 'corde sauter', 'jump rope'],
  fp_hiit: ['hiit', 'cross training', 'crossfit', 'circuit training', 'crosstraining'],
  fp_boxing: ['boxe', 'sac de frappe', 'sac frappe', 'boxing', 'punching ball'],
  fp_group_class: ['cours collectif', 'cours collectifs', 'cours de groupe', 'zumba', 'body pump']
};

// Ajoute au dictionnaire vocal une entrée par exercice du catalogue étendu
(function extendVoiceDictionary() {
  const clean = t => stripAccents(t).replace(/[^a-z0-9]+/g, ' ').trim();
  const seen = new Set();
  VOICE_DICTIONARY.forEach(d => d.aliases.forEach(a => seen.add(clean(a))));
  EXERCISE_CATALOG.forEach(c => {
    const list = VOICE_ALIASES_EXTRA[c.id];
    if (!list) return;
    const aliases = [];
    list.forEach(a => {
      const n = clean(a);
      if (!n || n.split(' ').length > 3 || seen.has(n)) return;
      seen.add(n);
      aliases.push(n);
    });
    if (aliases.length === 0) return;
    VOICE_DICTIONARY.push({
      id: c.id,
      name: c.name,
      category: c.category,
      type: c.type,
      unit: c.unit,
      cardioMode: c.cardioMode,
      icon: c.icon,
      defaultGoal: c.defaultGoal,
      defaultGoalSets: c.defaultGoalSets || 3,
      defaultGoalReps: c.defaultGoalReps || 8,
      strict: true,
      aliases
    });
  });
})();
