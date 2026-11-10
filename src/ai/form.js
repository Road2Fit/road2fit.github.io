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

/** Vérifie la réponse du coach IA (format attendu, longueurs bornées). */
export function normalizeFormAi(data) {
  if (!data || typeof data !== 'object') return null;
  const points = (Array.isArray(data.points) ? data.points : [])
    .filter(p => p && LEVELS.has(p.level) && str(p.title, 60))
    .slice(0, 4)
    .map((p, i) => ({ id: `ai${i}`, level: p.level, title: str(p.title, 60), detail: str(p.detail, 240), fix: str(p.fix, 240) }));
  return {
    verdict: VERDICTS.has(data.verdict) ? data.verdict : 'Correct',
    summary: str(data.summary, 300),
    points,
    nextSet: str(data.nextSet, 240),
    usage: data.usage ? { input: Number(data.usage.input) || 0, output: Number(data.usage.output) || 0 } : null,
  };
}
