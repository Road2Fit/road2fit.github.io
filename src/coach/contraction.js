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
  { id: 'iso', label: 'Isométrie (pauses)', short: 'Iso', method: 'iso_pause' },
  { id: 'iso_hold', label: 'Isométrie (tenues)', short: 'Tenues', method: 'iso_hold' },
  { id: 'ecc', label: 'Excentrique (descente lente)', short: 'Excentrique', method: 'eccentric' },
  { id: 'expl', label: 'Explosif (montée rapide)', short: 'Explosif', method: 'explosive' },
  { id: 'plyo', label: 'Pliométrie (sauts)', short: 'Pliométrie', method: null },
];
export const STYLE_IDS = DAY_STYLES.map(s => s.id);
export const styleInfo = id => DAY_STYLES.find(s => s.id === id) || null;

export function dayStyleOf(coach, iso) {
  const s = coach && coach.dayStyles && coach.dayStyles[iso];
  return STYLE_IDS.includes(s) ? s : null;
}

/** Nouveau `coach.dayStyles` : `style` pour ce jour (null = le coach décide) ; les jours passés sont retirés. */
export function setDayStyle(coach, iso, style, today) {
  const m = {};
  Object.entries((coach && coach.dayStyles) || {}).forEach(([d, s]) => { if (d >= today && d !== iso && STYLE_IDS.includes(s)) m[d] = s; });
  if (style && STYLE_IDS.includes(style)) m[iso] = style;
  return m;
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
  const chosen = planned.filter(d => dayStyleOf(coach, d) === 'plyo');
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
