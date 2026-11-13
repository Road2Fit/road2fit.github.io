// Façons de faire travailler le muscle (4.42, demande de Gabin) : concentrique, excentrique, isométrique, pliométrique.
// Fonctions pures, testées dans contraction.test.js. Études : data/contractionSources.js (retrouvées en ligne le 13/11/2026).
//  - Concentrique et excentrique sont présents dans presque tous les exercices (la montée et la descente).
//  - Isométrique (tenir une position) : se fait sur presque toutes les machines ; gains de force surtout autour de l'angle
//    travaillé (Lum et Barbosa 2019), plus de muscle en position étirée (Oranchuk 2019).
//  - Pliométrique (étirement rapide puis contraction explosive : sauts, rebonds, lancers) : exercices dédiés (catalogue
//    `ply_*`), qui améliorent la détente (Markovic 2007 ; volleyeurs : Ramirez-Campillo 2020).
// Le coach ne les impose pas : il les propose quand la personne le demande (séance du jour, exercice, préparation d'un sport).
import { EXERCISE_CATALOG } from '../data/catalog';
import { SPORT_PERF, sportPerf } from '../data/sportPerf';

export const CONTRACTION_MODES = [
  { id: 'concentric', label: 'Concentrique', short: 'Le muscle se raccourcit en déplaçant la charge : la montée d’un curl, la poussée d’un développé.' },
  { id: 'eccentric', label: 'Excentrique', short: 'Le muscle freine la charge en s’allongeant : la descente contrôlée. On y est plus fort qu’à la montée.' },
  { id: 'isometric', label: 'Isométrique', short: 'Le muscle force sans que l’articulation bouge : tenir une position (en haut d’une traction, gainage, chaise).' },
  { id: 'plyometric', label: 'Pliométrique', short: 'Un étirement rapide suivi aussitôt d’une contraction explosive : sauts, rebonds, lancers. Pour la détente et la vitesse.' },
];

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Où tenir la position, d'après le nom de l'exercice (le premier qui correspond). Règle de Gabin pour les tractions : en haut.
const HOLD_POINTS = [
  [/traction|pull.?up|chin.?up|muscle.?up/, 'en haut, menton au-dessus de la barre'],
  [/lombaire|back extension|hyperextension/, 'en haut, corps aligné'],
  [/leg curl|curl.*(jambe|ischio)|ischio/, 'genoux pliés à 90°'],
  [/leg extension|extension.*(jambe|quadri)/, 'jambes tendues, cuisses contractées'],
  [/tirage|rowing|row\b|face pull/, 'poignée contre le buste, omoplates serrées'],
  [/dips/, 'à mi-descente, coudes à 90°'],
  [/pompe|push.?up/, 'à mi-descente, poitrine à quelques centimètres du sol'],
  [/hip thrust|pont|bridge/, 'en haut, bassin aligné avec les cuisses'],
  [/souleve|deadlift|rdl|roumain|good morning/, 'barre juste sous les genoux, dos plat'],
  [/squat|presse|leg press|fente|hack|step|chaise/, 'en bas, cuisses parallèles au sol'],
  [/mollet|calf/, 'en haut, sur la pointe des pieds'],
  [/shrug|haussement/, 'en haut, épaules vers les oreilles'],
  [/elevation|oiseau|lateral|raise/, 'bras à l’horizontale'],
  [/ecarte|pec deck|butterfly|fly/, 'bras à mi-ouverture'],
  [/curl/, 'coudes pliés à 90°'],
  [/extension|triceps|barre au front|kickback|pushdown/, 'à mi-parcours, coudes à 90°'],
  [/developpe|press|bench/, 'à mi-descente, coudes à 90°'],
  [/crunch|abdo|releve|sit.?up/, 'en haut, abdominaux contractés'],
  [/adduct|abduct/, 'jambes à mi-parcours'],
];

/** Position à tenir pour la version isométrique d'un exercice (texte affiché). */
export function holdPoint(e) {
  const n = norm(`${(e && e.name) || ''} ${(e && e.catalogId) || ''}`);
  const hit = HOLD_POINTS.find(([re]) => re.test(n));
  return hit ? hit[1] : 'au point le plus difficile du mouvement';
}

/** Mouvement où la version excentrique se fait en « négatives » (monter avec un appui, descendre seul, lentement). */
export const negativesFit = e => /traction|pull.?up|chin|dips|muscle.?up/.test(norm(`${(e && e.name) || ''} ${(e && e.catalogId) || ''}`));

// ---------- Pliométrie ----------
export const isPlyo = q => !!q && /^ply_/.test(String(q.catalogId || ''));
const UPPER_PLYO = new Set(['ply_clap_pushup', 'ply_mb_slam', 'ply_mb_chest_pass']);
export const isLegPlyo = q => isPlyo(q) && !UPPER_PLYO.has(q.catalogId);

/**
 * Programme de performance de chaque sport (data/sportPerf.js) : exercices proposés (sauts, lancers, ou exercices de force
 * pour l'escalade et le vélo), séances avec des sauts conseillées, études. Sport non précisé : programme général.
 */
export const PERF_SPORTS = Object.keys(SPORT_PERF).filter(id => id !== 'autre');
export const perfSport = id => (SPORT_PERF[id] ? id : null);
export const plyoPackFor = sport => sportPerf(sport).pack;

/**
 * Nombre de contacts au sol par séance : repère courant des guides d'entraînement (pas une étude) :
 * débutant 60 (on monte vers 80-100), habitué 100. Une série de sauts = autant de contacts que de répétitions.
 */
export const plyoContacts = level => (level === 'advanced' || level === 'expert' ? 100 : 60);

/** Exercices de pliométrie que la personne suit (non mis en pause), les jambes seulement si elles peuvent travailler ce jour-là. */
export function plyoQuests(state, legsOk = true) {
  return ((state && state.quests) || []).filter(q => q.type === 'strength' && isPlyo(q) && !q.paused && q.goalMode !== 'free_mode' && (legsOk || !isLegPlyo(q)));
}

/**
 * Bloc de pliométrie en début de séance (après l'échauffement, quand on est frais) : au plus 3 exercices, les moins
 * récemment faits d'abord, séries réduites pour rester sous le nombre de contacts du jour.
 * @param targets exercices déjà calculés (computeExerciseTarget) ; renvoie la liste réduite.
 */
export function capPlyoBlock(targets, contacts) {
  let left = contacts;
  const out = [];
  for (const e of targets.slice(0, 3)) {
    const reps = Math.max(1, Math.min(...(e.targetReps || [5])));
    const sets = Math.max(1, Math.min(e.sets || 3, Math.floor(left / reps)));
    if (left < reps) break;
    left -= sets * reps;
    out.push({ ...e, sets, targetReps: Array(sets).fill(reps), restSec: Math.max(90, e.restSec || 0) });
  }
  return out;
}

// ---------- Façon de travailler choisie pour un jour ----------
// coach.dayStyles = { 'AAAA-MM-JJ': 'iso' | 'iso_hold' | 'ecc' | 'expl' | 'plyo' } ; rien = le coach décide (séries classiques)
export const DAY_STYLES = [
  { id: 'iso', label: 'Pauses isométriques', short: 'Pauses iso', method: 'iso_pause', help: 'Tu fais tes répétitions, mais à chaque rep tu t’arrêtes 3 à 5 s au point le plus dur (tractions : menton au-dessus de la barre). Moins de reps, un peu moins lourd.' },
  { id: 'iso_hold', label: 'Tenues isométriques', short: 'Tenues iso', method: 'iso_hold', help: 'Pas de répétitions : tu tiens une seule position sans bouger, 20 à 30 s, 3 ou 4 fois. C’est plus long que les pauses.' },
  { id: 'ecc', label: 'Excentrique (descente lente)', short: 'Excentrique', method: 'eccentric', help: 'La descente dure 4 à 5 s, la montée reste normale (tractions et dips : négatives).' },
  { id: 'expl', label: 'Explosif (montée rapide)', short: 'Explosif', method: 'explosive', help: 'Montée la plus rapide possible, peu de reps, loin de l’échec : de préférence sur les gros exercices.' },
  { id: 'plyo', label: 'Pliométrie (sauts)', short: 'Pliométrie', method: null, help: 'Des sauts en début de séance, à la place d’un ou deux exercices (la séance garde sa durée).' },
];
export const STYLE_IDS = DAY_STYLES.map(s => s.id);
export const styleInfo = id => DAY_STYLES.find(s => s.id === id) || null;

/** Façons de travailler choisies pour ce jour (plusieurs possibles : séance mixte). */
export function dayStylesOf(coach, iso) {
  const v = coach && coach.dayStyles && coach.dayStyles[iso];
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return STYLE_IDS.filter(id => arr.includes(id));
}
export const dayStyleOf = (coach, iso) => dayStylesOf(coach, iso)[0] || null;
export const stylesLabel = list => list.map(s => (styleInfo(s) || {}).label).filter(Boolean).join(' + ');

/** Nouveau `coach.dayStyles` : `style` (une ou plusieurs façons, null = normale) pour ce jour ; les jours passés sont retirés. */
export function setDayStyle(coach, iso, style, today) {
  const m = {};
  Object.keys((coach && coach.dayStyles) || {}).forEach(d => {
    if (d < today || d === iso) return;
    const a = dayStylesOf(coach, d);
    if (a.length) m[d] = a.length > 1 ? a : a[0];
  });
  const want = Array.isArray(style) ? style : style ? [style] : [];
  const list = STYLE_IDS.filter(id => want.includes(id));
  if (list.length) m[iso] = list.length > 1 ? list : list[0];
  return m;
}
/** Ajoute ou retire une façon de travailler pour ce jour (les autres restent : séance mixte). */
export function toggleDayStyle(coach, iso, style, today) {
  const cur = dayStylesOf(coach, iso);
  return setDayStyle(coach, iso, cur.includes(style) ? cur.filter(x => x !== style) : [...cur, style], today);
}

/**
 * Séance mixte : forme de l'exercice parmi les façons choisies qui lui conviennent. L'explosif va aux gros exercices
 * (pas à l'isolation s'il y a un autre choix) ; sinon on alterne d'un exercice à l'autre (k = rang de l'exercice).
 * @param methods méthodes candidates (déjà filtrées : celles qui conviennent à l'exercice)
 */
export function pickMixed(methods, compound, k) {
  if (!methods.length) return null;
  const list = compound ? methods : methods.filter(m => m !== 'explosive');
  const use = list.length ? list : methods;
  return use[k % use.length];
}

/** Séances de pliométrie par semaine voulues (0 à 3) : coach.plyo.perWeek. */
export const plyoPerWeek = coach => Math.max(0, Math.min(3, Math.round(Number(coach && coach.plyo && coach.plyo.perWeek) || 0)));

/**
 * Jours de pliométrie de la semaine : les jours choisis « Pliométrie » + les premières séances prévues où les jambes
 * peuvent travailler (pas la veille d'un match), jusqu'au nombre voulu, avec au moins un jour d'écart (48-72 h entre
 * deux séances de sauts intenses, repère courant).
 * @param planned dates prévues (triées) ; info : coachDayInfo de chaque jour de la semaine
 */
export function plyoWeekDays(coach, planned, info) {
  const chosen = planned.filter(d => dayStylesOf(coach, d).includes('plyo'));
  const want = plyoPerWeek(coach);
  const gap = (a, b) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000;
  for (const d of planned) {
    if (chosen.length >= want) break;
    const i = info.find(x => x.iso === d);
    if (!i || !i.legsOk || chosen.includes(d) || dayStyleOf(coach, d)) continue;
    if (chosen.some(c => gap(c, d) < 2)) continue;
    chosen.push(d);
  }
  return chosen.sort();
}

/** Exercices du programme d'un sport pas encore suivis (identifiants du catalogue). */
export function missingPlyo(state, sport) {
  const have = new Set(((state && state.quests) || []).map(q => q.catalogId));
  return plyoPackFor(sport).filter(id => !have.has(id) && EXERCISE_CATALOG.some(c => c.id === id));
}
