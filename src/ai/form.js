// Analyse vidéo par le coach IA (4.19) : seulement si le coach intelligent est activé.
// On n'envoie QUE des chiffres (mesures de l'algorithme sur la série filmée) et le strict nécessaire sur l'exercice :
// jamais d'image ni de vidéo. Le coach IA rend un verdict, des points à corriger et un conseil pour la série suivante.
import { coachRealEntries, coachSetsOf, getCoachSettings } from '../coach/settings';
import { experienceLine } from '../coach/experience';

const SIGNAL_TXT = {
  knee: 'angle du genou (°)', kneeFront: 'angle du genou le plus plié (°)', hip: 'angle de la hanche (°)', hipMove: 'angle de la hanche qui bouge (°)',
  elbow: 'angle du coude (°)', shoulder: 'angle bras-buste à l’épaule (°)', ankle: 'angle de la cheville (°)', wrist: 'angle du poignet (°)',
  gap: 'écart des poignets / largeur d’épaules', shrug: 'distance épaules-oreilles / largeur d’épaules', thighs: 'écart des genoux / largeur de hanches',
  twist: 'rotation du buste (°)', wristUp: 'hauteur des mains au-dessus des hanches / buste', hipY: 'hauteur du bassin', legAlt: 'écart entre les deux hanches (°)',
  limbsUp: 'bras et jambes décollés / buste', wristOut: 'avant-bras vers l’extérieur', motion: 'déplacement du repère qui bouge le plus',
};
const VIEW_TXT = { side: 'de profil', front: 'de face', oblique: 'de trois quarts' };

/** Texte compact envoyé au coach IA pour une série filmée. */
export function formContext(state, { item, setLabel, setText, result, earlier = [] }) {
  const r = result;
  const lines = [];
  lines.push(`Exercice : ${item.name}${item.equip ? ` (${item.equip})` : ''}. Série filmée : ${setLabel} — prévu : ${setText}.`);
  lines.push(`Vue de la caméra : ${VIEW_TXT[r.view] || r.view}${r.viewOk === false ? ' (pas la vue conseillée : certaines mesures sont moins fiables)' : ''}. Visibilité du corps : ${Math.round((r.quality || 0) * 100)} %.`);
  if (r.iso) {
    lines.push(`Tenue mesurée : ${r.holdSec} s.`);
  } else {
    lines.push(`Reps comptées par la caméra : ${r.repCount}. Signal suivi : ${SIGNAL_TXT[r.signal] || r.signal}.`);
    lines.push('Par rep (phase de retour / phase d’effort en s, pause au point d’inversion en s, amplitude relative 1 = complète, valeurs min-max du signal, inclinaison du buste en ° au point d’inversion, + = vers l’avant) :');
    (r.reps || []).forEach((p, i) => lines.push(`${i + 1}. retour ${p.ecc} / effort ${p.con} / pause ${p.hold} / ampl. ${p.depth} / ${p.lo}-${p.hi}${p.lean != null ? ` / buste ${p.lean}` : ''}`));
  }
  if (r.chin && r.chin.raw && r.chin.raw.length) {
    // en cm environ (buste ≈ 50 cm) ; + = menton au-dessus de la barre ; calibration personnelle déjà ajoutée
    const cm = x => Math.round((x + (r.chin.cal || 0)) * 50);
    lines.push(`Menton par rapport à la barre au plus haut de chaque rep (estimation, cm, + = au-dessus ; au niveau = réussi à ±2 cm) : ${r.chin.raw.map((x, k) => `rep ${r.chin.idx[k] + 1} : ${cm(x) > 0 ? '+' : ''}${cm(x)}`).join(', ')}${r.chin.cal ? ' (calibré par la personne : mesure ajustée à sa morphologie)' : ''}. La position de la barre est déduite des poignets : en cas de doute, ne contredis pas la personne.`);
  }
  lines.push(`Constats de l’algorithme : ${(r.findings || []).map(f => `[${f.level}] ${f.title} : ${f.detail}`).join(' | ') || 'aucun'}.`);
  if (earlier.length) lines.push(`Séries filmées plus tôt sur cet exercice aujourd’hui : ${earlier.join(' | ')}.`);
  // historique de l'exercice et profil (ce qui permet de personnaliser)
  const q = (state.quests || []).find(x => x.id === item.questId);
  if (q) {
    const last = coachRealEntries(q).slice(-3).map(e => `${e.date} : ${q.unit === 'kg' ? `${e.value} kg ` : ''}${coachSetsOf(e, Number(q.goalSets) || 3, Number(q.goalReps) || 8).join('-')}${e.rpe ? ` (ressenti ${e.rpe}/10)` : ''}`);
    if (last.length) lines.push(`Dernières séances sur cet exercice : ${last.join(' ; ')}.`);
  }
  try { lines.push(experienceLine(state)); } catch (e) { /* profil incomplet */ }
  const mem = (getCoachSettings(state).memory || []);
  if (mem.length) lines.push(`Ce que tu sais de la personne : ${mem.map(m => m.text).join(' ; ')}.`);
  return lines.join('\n');
}

const LEVELS = new Set(['warn', 'tip', 'good']);
const VERDICTS = new Set(['Propre', 'Correct', 'À travailler']);
const str = (v, n) => String(v || '').trim().slice(0, n);

// 4.48.1 (demande de Gabin) : les points du coach IA se touchent pour revoir la rep concernée, comme ceux de l'algorithme.
// Le serveur renvoie `reps` (numéros à partir de 1) ; à défaut, on lit les numéros cités dans le texte (« rep 3 »,
// « reps 2 et 4 », « reps 3 à 5 », « 3e rep », « première / dernière rep »). 'last' = dernière rep (résolu à l'affichage).
const ORD = { première: 1, premiere: 1, deuxième: 2, deuxieme: 2, seconde: 2, troisième: 3, troisieme: 3, quatrième: 4, quatrieme: 4, cinquième: 5, cinquieme: 5 };
const W = '(?<![a-zà-ÿ])'; // début de mot (\b ne marche pas avec les lettres accentuées)
const REP = 'r[eé]p(?:[eé]titions?|s)?(?![a-zà-ÿ])';
export function repsInText(text) {
  const s = String(text || '').toLowerCase();
  const out = new Set();
  // « rep 3 », « reps 2, 4 et 6 », « reps 3 à 5 », « rep n° 2 », « répétition 4 »
  for (const m of s.matchAll(new RegExp(`${W}${REP}\\s*(?:n°|no|numéros?)?\\s*(\\d+(?:\\s*(?:,|et|à|-|–)\\s*\\d+)*)`, 'g'))) {
    const parts = m[1].split(/\s*(,|et|à|-|–)\s*/);
    for (let k = 0; k < parts.length; k += 2) {
      const n = Number(parts[k]);
      const sep = parts[k - 1];
      if ((sep === 'à' || sep === '-' || sep === '–') && k >= 2) { for (let x = Number(parts[k - 2]) + 1; x <= n && x - Number(parts[k - 2]) <= 20; x++) out.add(x); }
      else out.add(n);
    }
  }
  for (const m of s.matchAll(new RegExp(`(?<![\\d])(\\d+)\\s*(?:e|ème|eme|er|re)\\s+${REP}`, 'g'))) out.add(Number(m[1]));
  for (const m of s.matchAll(new RegExp(`${W}(${Object.keys(ORD).join('|')})\\s+${REP}`, 'g'))) out.add(ORD[m[1]]);
  const nums = [...out].filter(n => Number.isInteger(n) && n >= 1 && n <= 100).sort((a, b) => a - b).map(n => n - 1);
  return new RegExp(`${W}derni[eè]re\\s+${REP}`).test(s) ? [...nums, 'last'] : nums;
}
const repsOf = p => {
  const given = (Array.isArray(p.reps) ? p.reps : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 100).map(n => n - 1);
  return given.length ? [...new Set(given)].sort((a, b) => a - b) : repsInText(`${p.title} ${p.detail} ${p.fix}`);
};
/** Index des reps (à partir de 0) d'un point du coach IA, limités aux n reps de la série. */
export function aiPointReps(reps, n) {
  const out = (reps || []).map(x => (x === 'last' ? n - 1 : x)).filter(x => Number.isInteger(x) && x >= 0 && x < n);
  return [...new Set(out)].sort((a, b) => a - b);
}

/** Vérifie la réponse du coach IA (format attendu, longueurs bornées). */
export function normalizeFormAi(data) {
  if (!data || typeof data !== 'object') return null;
  const points = (Array.isArray(data.points) ? data.points : [])
    .filter(p => p && LEVELS.has(p.level) && str(p.title, 60))
    .slice(0, 4)
    .map((p, i) => ({ id: `ai${i}`, level: p.level, title: str(p.title, 60), detail: str(p.detail, 240), fix: str(p.fix, 240), reps: repsOf(p) }));
  return {
    verdict: VERDICTS.has(data.verdict) ? data.verdict : 'Correct',
    summary: str(data.summary, 300),
    points,
    nextSet: str(data.nextSet, 240),
    usage: data.usage ? { input: Number(data.usage.input) || 0, output: Number(data.usage.output) || 0 } : null,
  };
}
