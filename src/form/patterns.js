// Analyse vidéo d'une série (4.19) : chaque exercice de musculation est rattaché à un MODÈLE DE MOUVEMENT, qui dit
//  - quel signal suit les répétitions (angle du genou, de la hanche, du coude, de l'épaule, écart des poignets…),
//  - dans quel ordre viennent les phases (first : 'ecc' = la rep commence par la descente, ex. squat ; 'con' = par l'effort, ex. curl),
//  - dans quel sens va le signal pendant l'effort (conDir : +1 il augmente, -1 il diminue, 0 = on le déduit de la vidéo),
//  - quels contrôles de technique ont un sens (profondeur, verrouillage, buste, alignement du corps, élan…),
//  - sous quel angle filmer pour que ces contrôles soient fiables (view : de profil 'side' ou de face 'front').
// Le rattachement passe par la famille de l'animation (anim/info.js : INFO_FAMILY), qui couvre tout le catalogue.
// Seuils : repères de technique courants (angles articulaires), pas des normes issues d'une étude ; ils servent à repérer
// les écarts nets, et chaque retour reste formulé comme un conseil.
import { INFO_FAMILY, NAME_RULES } from '../anim/info';
import { EXERCISE_CATALOG, normSearch } from '../data/catalog';

const UP = ['montée', 'descente'];
const PUSH = ['poussée', 'descente'];
const PULL = ['tirage', 'retour'];

// signal : 'knee' | 'hip' | 'elbow' | 'shoulder' | 'ankle' | 'wrist' (angles articulaires) | 'kneeFront' (genou le plus plié) |
//          'hipMove' (hanche de la jambe qui bouge) | 'hipY' (hauteur du bassin) | 'wristUp' (mains au-dessus des hanches) |
//          'gap' (écart des poignets) | 'shrug' (épaules vers les oreilles) | 'thighs' (écart des genoux) | 'twist' (rotation du buste) |
//          'legAlt' (jambes en alternance) | 'limbsUp' (bras et jambes décollés) | 'wristOut' (avant-bras vers l'extérieur)
// min    : amplitude minimale du signal pour compter une répétition (degrés, ou fraction de la longueur du buste)
// words  : [nom de la phase d'effort, nom du retour], pour les retours écrits
export const PATTERNS = {
  squat:      { label: 'squat', signal: 'knee', first: 'ecc', conDir: 1, view: 'side', words: UP, min: 30, thighOk: 15, thighWarn: 35, trunkMax: 50,
                checks: ['depthThigh', 'kneeLock', 'trunk', 'hipsFirst', 'valgus', 'shift', 'bounce', 'tempo', 'fade', 'speed'] },
  machineLeg: { label: 'presse', signal: 'knee', first: 'ecc', conDir: 1, view: 'side', words: PUSH, min: 25, depth: 95, depthWarn: 118,
                checks: ['depthKnee', 'kneeHyper', 'bounce', 'tempo', 'fade', 'speed'] },
  lunge:      { label: 'fente', signal: 'kneeFront', first: 'ecc', conDir: 1, view: 'side', words: UP, min: 25, depth: 100, depthWarn: 122, trunkMax: 30,
                checks: ['depthKnee', 'trunk', 'tempo', 'fade'] },
  pistol:     { label: 'squat sur une jambe', signal: 'kneeFront', first: 'ecc', conDir: 1, view: 'side', words: UP, min: 30, depth: 80, depthWarn: 105,
                checks: ['depthKnee', 'tempo', 'fade'] },
  deadlift:   { label: 'soulevé de terre', signal: 'hip', first: 'con', conDir: 1, view: 'side', words: UP, min: 35, lock: 165,
                checks: ['hipLock', 'leanBack', 'hipsFirst', 'fade', 'speed'] },
  rdl:        { label: 'soulevé de terre jambes tendues', signal: 'hip', first: 'ecc', conDir: 1, view: 'side', words: UP, min: 30, lock: 165, kneeVar: 35, hinge: 115,
                checks: ['hipLock', 'hinge', 'kneeStill', 'tempo', 'fade'] },
  hipThrust:  { label: 'hip thrust', signal: 'hip', first: 'con', conDir: 1, view: 'side', words: UP, min: 25, lock: 165,
                checks: ['hipLock', 'topPause', 'tempo', 'fade', 'speed'] },
  backExt:    { label: 'extension du dos', signal: 'hip', first: 'con', conDir: 1, view: 'side', words: UP, min: 20, lock: 160,
                checks: ['hipLock', 'tempo', 'fade'] },
  superman:   { label: 'superman', signal: 'limbsUp', first: 'con', conDir: 1, view: 'side', words: UP, min: 0.08,
                checks: ['topPause', 'tempo', 'fade'] },
  benchPress: { label: 'développé couché', signal: 'elbow', first: 'ecc', conDir: 1, view: 'side', words: PUSH, min: 35, depth: 95, depthWarn: 120, lock: 150,
                checks: ['depthElbow', 'lock', 'bounce', 'tempo', 'fade', 'speed'] },
  pushUp:     { label: 'pompe', signal: 'elbow', first: 'ecc', conDir: 1, view: 'side', words: PUSH, min: 30, depth: 100, depthWarn: 125, lock: 150,
                checks: ['depthElbow', 'lock', 'bodyLine', 'tempo', 'fade', 'speed'] },
  dip:        { label: 'dips', signal: 'elbow', first: 'ecc', conDir: 1, view: 'side', words: PUSH, min: 30, depth: 100, depthWarn: 125, lock: 150,
                checks: ['depthElbow', 'lock', 'tempo', 'fade', 'speed'] },
  press:      { label: 'développé au-dessus de la tête', signal: 'elbow', first: 'con', conDir: 1, view: 'side', words: PUSH, min: 35, depth: 95, depthWarn: 120, lock: 155,
                checks: ['lockOver', 'depthElbow', 'archBack', 'tempo', 'fade', 'speed'] },
  hspu:       { label: 'pompe en équilibre', signal: 'elbow', first: 'ecc', conDir: 1, view: 'side', words: PUSH, min: 30, depth: 95, depthWarn: 120, lock: 150,
                checks: ['depthElbow', 'lock', 'tempo', 'fade'] },
  pullUp:     { label: 'traction', signal: 'elbow', first: 'con', conDir: -1, view: 'side', words: UP, min: 35, hang: 150, top: 80, kipMax: 30,
                checks: ['hang', 'chin', 'kip', 'tempo', 'fade', 'speed'] },
  pulldown:   { label: 'tirage vertical', signal: 'elbow', first: 'con', conDir: -1, view: 'side', words: PULL, min: 35, hang: 145, top: 85, swingMax: 20,
                checks: ['hang', 'topElbow', 'swing', 'tempo', 'fade'] },
  row:        { label: 'rowing', signal: 'elbow', first: 'con', conDir: -1, view: 'side', words: PULL, min: 30, hang: 140, top: 95, trunkVar: 15,
                checks: ['hang', 'topElbow', 'trunkStill', 'tempo', 'fade', 'speed'] },
  invRow:     { label: 'rowing inversé', signal: 'elbow', first: 'con', conDir: -1, view: 'side', words: PULL, min: 30, hang: 140, top: 95,
                checks: ['hang', 'topElbow', 'bodyLine', 'tempo', 'fade'] },
  curl:       { label: 'curl', signal: 'elbow', first: 'con', conDir: -1, view: 'side', words: UP, min: 40, hang: 145, top: 70, swingMax: 10, elbowVar: 25,
                checks: ['hang', 'topElbow', 'swing', 'elbowStill', 'tempo', 'fade'] },
  wristCurl:  { label: 'curl poignets', signal: 'wrist', first: 'con', conDir: 0, view: 'side', words: UP, min: 20, checks: ['tempo', 'fade'] },
  triExtUp:   { label: 'extension des triceps', signal: 'elbow', first: 'con', conDir: 1, view: 'side', words: ['extension', 'retour'], min: 30, lock: 155, elbowVar: 20,
                checks: ['lock', 'elbowStill', 'tempo', 'fade'] },
  triExtDown: { label: 'extension des triceps', signal: 'elbow', first: 'ecc', conDir: 1, view: 'side', words: ['extension', 'descente'], min: 30, lock: 155, elbowVar: 20,
                checks: ['lock', 'elbowStill', 'tempo', 'fade'] },
  raise:      { label: 'élévation latérale', signal: 'shoulder', first: 'con', conDir: 1, view: 'front', words: UP, min: 30, swingMax: 10, topMin: 65, topMax: 110,
                checks: ['raiseTop', 'swing', 'sym', 'tempo', 'fade'] },
  frontRaise: { label: 'élévation frontale', signal: 'shoulder', first: 'con', conDir: 1, view: 'side', words: UP, min: 30, swingMax: 10, topMin: 70, topMax: 120,
                checks: ['raiseTop', 'swing', 'tempo', 'fade'] },
  flyIn:      { label: 'écarté', signal: 'gap', first: 'ecc', conDir: -1, view: 'front', words: ['fermeture', 'ouverture'], min: 0.4,
                checks: ['elbowBend', 'sym', 'tempo', 'fade'] },
  flyOpen:    { label: 'écarté', signal: 'gap', first: 'con', conDir: -1, view: 'front', words: ['fermeture', 'ouverture'], min: 0.4,
                checks: ['elbowBend', 'sym', 'tempo', 'fade'] },
  rearFly:    { label: 'oiseau', signal: 'gap', first: 'con', conDir: 1, view: 'front', words: ['ouverture', 'retour'], min: 0.4,
                checks: ['elbowBend', 'sym', 'tempo', 'fade'] },
  pullover:   { label: 'pull-over', signal: 'shoulder', first: 'ecc', conDir: -1, view: 'side', words: ['retour', 'descente'], min: 30, checks: ['elbowBend', 'tempo', 'fade'] },
  pulloverCon:{ label: 'pull-over', signal: 'shoulder', first: 'con', conDir: -1, view: 'side', words: PULL, min: 30, checks: ['elbowBend', 'tempo', 'fade'] },
  shrug:      { label: 'shrug', signal: 'shrug', first: 'con', conDir: -1, view: 'front', words: UP, min: 0.06, checks: ['topPause', 'tempo', 'fade'] },
  legExt:     { label: 'leg extension', signal: 'knee', first: 'con', conDir: 1, view: 'side', words: ['extension', 'retour'], min: 35, checks: ['kneeTop', 'topPause', 'tempo', 'fade'] },
  legCurl:    { label: 'leg curl', signal: 'knee', first: 'con', conDir: -1, view: 'side', words: ['flexion', 'retour'], min: 35, hipVar: 15, checks: ['kneeBottom', 'hipStill', 'tempo', 'fade'] },
  calf:       { label: 'mollets', signal: 'ankle', first: 'con', conDir: 1, view: 'side', words: UP, min: 10, checks: ['topPause', 'bounce', 'tempo', 'fade'] },
  adductor:   { label: 'adducteurs', signal: 'thighs', first: 'con', conDir: -1, view: 'front', words: ['fermeture', 'ouverture'], min: 0.25, checks: ['tempo', 'fade'] },
  abductor:   { label: 'abducteurs', signal: 'thighs', first: 'con', conDir: 1, view: 'front', words: ['ouverture', 'retour'], min: 0.25, checks: ['tempo', 'fade'] },
  kickback:   { label: 'extension de hanche', signal: 'hipMove', first: 'con', conDir: 1, view: 'side', words: ['extension', 'retour'], min: 20, trunkVar: 15,
                checks: ['trunkStill', 'topPause', 'tempo', 'fade'] },
  multiHip:   { label: 'mouvement de hanche', signal: 'hipMove', first: 'con', conDir: 0, view: 'side', words: ['effort', 'retour'], min: 20, trunkVar: 15,
                checks: ['trunkStill', 'tempo', 'fade'] },
  crunch:     { label: 'crunch', signal: 'hip', first: 'con', conDir: -1, view: 'side', words: ['enroulement', 'retour'], min: 12, checks: ['tempo', 'fade'] },
  legRaise:   { label: 'relevé de jambes', signal: 'hip', first: 'con', conDir: -1, view: 'side', words: UP, min: 30, swingMax: 20, checks: ['swing', 'tempo', 'fade'] },
  rollout:    { label: 'roue abdominale', signal: 'shoulder', first: 'ecc', conDir: -1, view: 'side', words: ['retour', 'déroulé'], min: 30, checks: ['hipSag', 'tempo', 'fade'] },
  twist:      { label: 'rotation du buste', signal: 'twist', first: 'con', conDir: 0, view: 'front', words: ['rotation', 'retour'], min: 15, checks: ['tempo', 'fade'] },
  pallof:     { label: 'pallof press', signal: 'elbow', first: 'con', conDir: 1, view: 'side', words: PUSH, min: 30, checks: ['topPause', 'tempo', 'fade'] },
  extRot:     { label: 'rotation externe', signal: 'wristOut', first: 'con', conDir: 1, view: 'front', words: ['rotation', 'retour'], min: 0.2, checks: ['tempo', 'fade'] },
  olympic:    { label: 'haltérophilie', signal: 'wristUp', first: 'con', conDir: 1, view: 'side', words: UP, min: 0.5, checks: ['fullExt', 'fade'] },
  olympicOver:{ label: 'haltérophilie', signal: 'wristUp', first: 'con', conDir: 1, view: 'side', words: UP, min: 0.5, checks: ['fullExt', 'lockOverOly', 'fade'] },
  mountain:   { label: 'mountain climbers', signal: 'legAlt', first: 'con', conDir: 1, view: 'side', words: ['montée de genou', 'retour'], min: 25, checks: ['bodyLine', 'fade'] },
  generic:    { label: 'mouvement', signal: 'hipY', first: 'ecc', conDir: -1, view: 'side', words: UP, min: 0.25, checks: ['fade'] },
  // tenues (pas de répétitions) : durée et position
  plank:      { label: 'gainage', iso: true, hold: 'line', view: 'side', checks: ['holdLine'] },
  holdOnly:   { label: 'gainage', iso: true, hold: 'line', view: 'side', checks: [] },
  wallSit:    { label: 'chaise', iso: true, hold: 'wallSit', view: 'side', checks: ['holdKnee'] },
  hang:       { label: 'suspension', iso: true, hold: 'hang', view: 'side', checks: ['holdHang'] },
  lSit:       { label: 'L-sit', iso: true, hold: 'lSit', view: 'side', checks: ['holdL'] },
  carry:      { label: 'marche chargée', iso: true, hold: 'upright', view: 'side', checks: ['holdUpright'] },
};

// famille de l'animation (anim/info.js) → modèle de mouvement
const FAMILY_PATTERN = {
  benchBarbell: 'benchPress', benchDb: 'benchPress', benchIncline: 'benchPress', benchDecline: 'benchPress', benchClose: 'benchPress', smithBench: 'benchPress',
  chestPressMachine: 'benchPress', chestPressIncline: 'benchPress', declineMachine: 'benchPress',
  fly: 'flyIn', cableFly: 'flyOpen', pecDeck: 'flyOpen', rearFly: 'rearFly', reversePecDeck: 'rearFly',
  pullover: 'pullover', pulloverCable: 'pulloverCon', pulloverMachine: 'pulloverCon',
  pushUp: 'pushUp', pushUpFeet: 'pushUp', pushUpDiamond: 'pushUp', pushUpIncline: 'pushUp',
  dips: 'dip', benchDips: 'dip', dipMachine: 'dip', ringDips: 'dip', assistedDip: 'dip',
  pullUp: 'pullUp', chinUp: 'pullUp', assistedPullUp: 'pullUp', muscleUp: 'pullUp',
  pulldown: 'pulldown', pulldownMachine: 'pulldown', highRow: 'row',
  barbellRow: 'row', dbRow: 'row', seatedRow: 'row', rowMachine: 'row', tBarRow: 'row', facePull: 'row', uprightRow: 'raise',
  invertedRow: 'invRow',
  backExtension: 'backExt', lumbarMachine: 'backExt', superman: 'holdOnly',
  shrugs: 'shrug', shrugMachine: 'shrug',
  overheadBarbell: 'press', overheadSmith: 'press', dbShoulder: 'press', arnold: 'press', shoulderMachine: 'press', hspu: 'hspu',
  olyPushPress: 'press', olyPushJerk: 'olympicOver', olySplitJerk: 'olympicOver',
  lateralRaise: 'raise', frontRaise: 'frontRaise', extRotation: 'extRot',
  curl: 'curl', curlHammer: 'curl', curlIncline: 'curl', curlConcentration: 'curl', curlPreacher: 'curl', curlMachine: 'curl', wristCurl: 'wristCurl',
  pushdown: 'triExtUp', kickback: 'triExtUp', tricepsMachine: 'triExtUp', skull: 'triExtDown', overheadExt: 'triExtDown',
  squat: 'squat', squatBody: 'squat', squatFront: 'squat', squatSmith: 'squat', goblet: 'squat', beltSquat: 'squat', olyOverheadSquat: 'squat', wallBall: 'squat',
  hackSquat: 'machineLeg', legPress: 'machineLeg',
  bulgarian: 'lunge', lunge: 'lunge', lungeBody: 'lunge', stepUp: 'lunge', sandbagLunge: 'lunge', pistol: 'pistol',
  calfPress: 'calf', calfStanding: 'calf', calfSeated: 'calf',
  legExt: 'legExt', legCurl: 'legCurl', standingLegCurl: 'legCurl',
  adductors: 'adductor', abductors: 'abductor', multiHip: 'multiHip', gluteKickback: 'kickback',
  deadlift: 'deadlift', deadliftSumo: 'deadlift', trapBar: 'deadlift', deadliftMachine: 'deadlift', olyPull: 'olympic',
  rdl: 'rdl', goodMorning: 'rdl',
  hipThrust: 'hipThrust', hipThrustMachine: 'hipThrust', gluteBridge: 'hipThrust',
  olyClean: 'olympic', olyPowerClean: 'olympic', olySnatch: 'olympicOver', olyPowerSnatch: 'olympicOver', olyMuscleSnatch: 'olympicOver',
  olyCleanJerk: 'olympicOver', olySnatchBalance: 'olympicOver', olyHighPull: 'olympic',
  crunch: 'crunch', situp: 'crunch', crunchDecline: 'crunch', cableCrunch: 'crunch', abMachine: 'crunch', abMachineOblique: 'twist', abMachineTotal: 'crunch',
  reverseCrunch: 'legRaise', legRaiseFloor: 'legRaise', hangingLegRaise: 'legRaise', toesToBar: 'legRaise', captain: 'legRaise',
  abWheel: 'rollout', rotaryTorso: 'twist', woodchop: 'twist', pallof: 'pallof',
  plank: 'plank', sidePlank: 'plank', hollow: 'holdOnly', handstand: 'plank', frontLever: 'plank', planche: 'plank',
  wallSit: 'wallSit', deadHang: 'hang', lSit: 'lSit', farmersCarry: 'carry', sledPush: 'carry', sledPull: 'carry',
  burpeeBroadJump: 'generic', burpee: 'generic', mountain: 'mountain',
};
export const familyPatternMap = FAMILY_PATTERN;

// réglages propres à certaines variantes (buste plus droit attendu au squat avant, au goblet…)
const FAMILY_TWEAKS = {
  squatFront: { trunkMax: 35 }, goblet: { trunkMax: 35 }, squatBody: { trunkMax: 40 }, olyOverheadSquat: { trunkMax: 30 }, beltSquat: { trunkMax: 30 },
  squatSmith: { trunkMax: 40 }, wallBall: { trunkMax: 40 }, bulgarian: { trunkMax: 40 }, stepUp: { trunkMax: 40, checks: ['trunk', 'tempo', 'fade'] },
  curlConcentration: { checks: ['hang', 'topElbow', 'tempo', 'fade'] }, curlPreacher: { checks: ['hang', 'topElbow', 'tempo', 'fade'] },
  curlMachine: { checks: ['hang', 'topElbow', 'tempo', 'fade'] }, curlIncline: { checks: ['hang', 'topElbow', 'elbowStill', 'tempo', 'fade'] },
  muscleUp: { checks: ['hang', 'tempo', 'fade'] }, facePull: { top: 100 }, deadliftSumo: { lock: 160 }, gluteBridge: { lock: 160 },
  seatedRow: { trunkVar: 20 }, rowMachine: { trunkVar: 12 }, highRow: { trunkVar: 12 },
  shoulderMachine: { checks: ['lock', 'depthElbow', 'tempo', 'fade', 'speed'] }, overheadSmith: { checks: ['lock', 'depthElbow', 'tempo', 'fade', 'speed'] },
  benchDips: { depth: 95, depthWarn: 120 }, uprightRow: { label: 'rowing menton', topMax: 120, checks: ['raiseTop', 'swing', 'tempo', 'fade'] },
};

const CAT = Object.fromEntries(EXERCISE_CATALOG.map(c => [c.id, c]));

/** Famille d'animation d'un exercice (catalogue, catalogue commun via `like`, ou reconnaissance du nom). */
export function familyFor({ catalogId, name } = {}) {
  if (catalogId && INFO_FAMILY[catalogId]) return INFO_FAMILY[catalogId];
  const like = catalogId && CAT[catalogId] && CAT[catalogId].like;
  if (like && INFO_FAMILY[like]) return INFO_FAMILY[like];
  const n = normSearch(name || '');
  if (!n) return null;
  const exact = EXERCISE_CATALOG.find(c => normSearch(c.name) === n && INFO_FAMILY[c.id]);
  if (exact) return INFO_FAMILY[exact.id];
  for (const [re, id] of NAME_RULES) if (re.test(n) && INFO_FAMILY[id]) return INFO_FAMILY[id];
  return null;
}

/** Modèle de mouvement d'un exercice : { id, family, ...réglages } (exercice inconnu : modèle générique). */
export function patternFor(item = {}) {
  const fam = familyFor(item);
  // tenue chronométrée inconnue (planche maison…) : jamais de répétitions à compter
  const id = (fam && FAMILY_PATTERN[fam]) || (item.timed ? 'holdOnly' : 'generic');
  return { id, family: fam, ...PATTERNS[id], ...(fam && FAMILY_TWEAKS[fam]) };
}

// mouvements faits allongés ou presque : le corps tient mieux dans une vidéo en paysage
const LANDSCAPE = new Set(['pushUp', 'plank', 'holdOnly', 'invRow', 'benchPress', 'hipThrust', 'rollout', 'mountain', 'crunch', 'machineLeg', 'legCurl', 'backExt', 'pullover', 'flyIn']);
export const wantsLandscape = p => !!p && LANDSCAPE.has(p.id);

/** Où poser le téléphone pour ce mouvement (texte court). */
export function placementText(p) {
  const where = p && p.view === 'front' ? 'face à toi' : 'sur le côté (de profil)';
  const how = wantsLandscape(p) ? 'tenu à l’horizontale' : 'bien droit';
  return `Pose le téléphone ${where}, ${how}, à 2-3 m et à hauteur de hanches : tout ton corps doit être dans l’image.`;
}
