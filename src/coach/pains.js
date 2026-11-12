// Douleurs signalées (4.22, muscles et côtés en 4.23). Logique pure, testée dans pains.test.js.
// coach.pains = [{ zone, side, since }] :
//  - zone = une articulation de PAIN_ZONES ('knee', 'shoulder'…) ou un muscle 'm:<id de FINE_GROUPS>' ('m:Triceps')
//    (les lombaires = la zone 'lowback', pour rester compatible avec la 4.22) ;
//  - side = 'right' | 'left' | null (zones au milieu du corps : cou, bas du dos, dos, abdominaux).
// L'appli repère les exercices qui font travailler cette articulation ou ce muscle, les signale et propose d'en changer.
// Le côté sert à l'affichage et au coach IA : un exercice à deux bras / deux jambes charge les deux côtés.
// Ce n'est PAS un avis médical : aucune rééducation n'est proposée ; douleur vive ou qui dure = arrêter et consulter.
import { fineGroupOf, secondGroupOf } from '../data/muscles';
import { stripAccents } from '../lib/text';

// g : accord de « droit / gauche » (m = masculin, f = féminin, mp = masculin pluriel) ; sided : a un côté droit et gauche
export const PAIN_ZONES = [
  { id: 'shoulder', label: 'Épaule', the: 'l’épaule', g: 'f', sided: true },
  { id: 'elbow', label: 'Coude', the: 'le coude', g: 'm', sided: true },
  { id: 'wrist', label: 'Poignet', the: 'le poignet', g: 'm', sided: true },
  { id: 'neck', label: 'Cou', the: 'le cou', g: 'm', sided: false },
  { id: 'lowback', label: 'Bas du dos', the: 'le bas du dos', g: 'm', sided: false },
  { id: 'hip', label: 'Hanche', the: 'la hanche', g: 'f', sided: true },
  { id: 'knee', label: 'Genou', the: 'le genou', g: 'm', sided: true },
  { id: 'ankle', label: 'Cheville', the: 'la cheville', g: 'f', sided: true },
];
/** Articulations proposées en puces sous le schéma (le bas du dos = les lombaires du schéma). */
export const PAIN_JOINTS = PAIN_ZONES.filter(z => z.id !== 'lowback');

// muscles du mode optimisé (data/muscles.js FINE_GROUPS) : nom au singulier pour un côté
export const PAIN_MUSCLES = [
  { muscle: 'Pectoraux', label: 'Pectoral', g: 'm', sided: true },
  { muscle: 'Épaules', label: 'Deltoïde (épaule)', g: 'm', sided: true },
  { muscle: 'Dos', label: 'Dos', g: 'm', sided: false },
  { muscle: 'Biceps', label: 'Biceps', g: 'm', sided: true },
  { muscle: 'Triceps', label: 'Triceps', g: 'm', sided: true },
  { muscle: 'Avant-bras', label: 'Avant-bras', g: 'm', sided: true },
  { muscle: 'Abdominaux', label: 'Abdominaux', g: 'mp', sided: false },
  { muscle: 'Obliques', label: 'Oblique', g: 'm', sided: true },
  { muscle: 'Hanches', label: 'Adducteurs', g: 'mp', sided: true },
  { muscle: 'Quadriceps', label: 'Quadriceps', g: 'm', sided: true },
  { muscle: 'Ischio-jambiers', label: 'Ischio-jambiers', g: 'mp', sided: true },
  { muscle: 'Fessiers', label: 'Fessier', g: 'm', sided: true },
  { muscle: 'Mollets', label: 'Mollet', g: 'm', sided: true },
];
/** Zone d'un muscle du schéma (les lombaires = le bas du dos). */
export const muscleZone = muscle => (muscle === 'Lombaires' ? 'lowback' : `m:${muscle}`);

const ZONE = Object.fromEntries([
  ...PAIN_ZONES.map(z => [z.id, z]),
  ...PAIN_MUSCLES.map(m => [`m:${m.muscle}`, { id: `m:${m.muscle}`, ...m }]),
]);
export const isSided = zone => !!(ZONE[zone] && ZONE[zone].sided);
const ADJ = { right: { m: 'droit', f: 'droite', mp: 'droits' }, left: { m: 'gauche', f: 'gauche', mp: 'gauches' } };

/** « Triceps droit », « Épaule gauche », « Cou ». */
export function painLabel(pain) {
  if (!pain) return '';
  const p = typeof pain === 'string' ? { zone: pain } : pain;
  const z = ZONE[p.zone];
  if (!z) return '';
  return z.sided && ADJ[p.side] ? `${z.label} ${ADJ[p.side][z.g]}` : z.label;
}
export const zoneLabel = id => (ZONE[id] || {}).label || '';

// muscle principal de l'exercice → articulations qui travaillent
const BY_MUSCLE = {
  Pectoraux: ['shoulder', 'elbow'], Épaules: ['shoulder'], Dos: ['shoulder', 'elbow'], Triceps: ['elbow'], Biceps: ['elbow'], 'Avant-bras': ['wrist', 'elbow'],
  Quadriceps: ['knee'], 'Ischio-jambiers': ['knee', 'hip'], Fessiers: ['hip'], Hanches: ['hip'], Mollets: ['ankle'], Lombaires: ['lowback'],
};
// compléments d'après le nom (mouvements qui chargent une articulation sans que ce soit leur muscle principal)
const BY_NAME = [
  [/pompes|developpe|planche|handstand|equilibre|front squat|epaule|arrache|jete|poignets|dips/, 'wrist'],
  [/souleve|good morning|rowing barre|buste penche|squat|hip thrust|superman|lombaire|epaule|arrache|t-bar/, 'lowback'],
  [/squat|fente|presse|step|pistol|burpee|saut|leg ext|leg curl/, 'knee'],
  [/squat|fente|souleve|hip thrust|pont fessier/, 'hip'],
  [/saut|burpee|corde|fentes marchees/, 'ankle'],
  [/shrug|nuque|tirage menton|trapeze/, 'neck'],
  [/dips|pull-over|ecartes|traction|suspension|suspendu|muscle-up|militaire/, 'shoulder'],
];

/** Zones sollicitées par un exercice : articulations + muscles travaillés ('m:Triceps'…). */
export function zonesOf(item) {
  if (!item) return [];
  const n = stripAccents(String(item.name || '').toLowerCase());
  const it = { ...item, type: 'strength' };
  const first = fineGroupOf(it);
  const out = new Set(BY_MUSCLE[first] || []);
  for (const [re, z] of BY_NAME) if (re.test(n)) out.add(z);
  for (const m of [first, secondGroupOf(it)]) if (m && m !== 'Lombaires') out.add(`m:${m}`);
  return [...out];
}

/** Douleurs valides. Une douleur d'avant la 4.23 sans côté sur une zone à deux côtés vaut pour les deux côtés. */
export function painsOf(coach) {
  const raw = (coach && Array.isArray(coach.pains) ? coach.pains : []).filter(p => p && ZONE[p.zone]);
  const out = [];
  for (const p of raw) {
    if (!isSided(p.zone)) out.push({ zone: p.zone, side: null, since: p.since });
    else if (p.side === 'left' || p.side === 'right') out.push({ zone: p.zone, side: p.side, since: p.since });
    else out.push({ zone: p.zone, side: 'right', since: p.since }, { zone: p.zone, side: 'left', since: p.since });
  }
  return out.filter((p, i) => out.findIndex(q => q.zone === p.zone && q.side === p.side) === i);
}

export const hasPain = (pains, zone, side = null) => (pains || []).some(p => p.zone === zone && (p.side || null) === (isSided(zone) ? side : null));

/** Douleur touchée par cet exercice (la première), ou null. */
export function painFor(item, coach) {
  const pains = painsOf(coach);
  if (!pains.length) return null;
  const zs = zonesOf(item);
  return pains.find(p => zs.includes(p.zone)) || null;
}

/** Ajoute ou retire une zone (et son côté). */
export function togglePain(coach, zone, side, today) {
  if (!ZONE[zone]) return painsOf(coach);
  const s = isSided(zone) ? (side === 'left' ? 'left' : 'right') : null;
  const cur = painsOf(coach);
  return hasPain(cur, zone, s) ? cur.filter(p => !(p.zone === zone && p.side === s)) : [...cur, { zone, side: s, since: today }];
}

/** Message court pour un exercice qui touche une zone sensible. */
export function painAdvice(pain) {
  const l = painLabel(pain);
  return l ? `${l} sensible : allège, raccourcis le mouvement ou change d’exercice. Si ça fait mal, arrête.` : '';
}

/** Ligne pour le coach IA. */
export function painsLine(state) {
  const pains = painsOf(state && state.coach);
  return pains.length ? `Douleurs signalées par la personne : ${pains.map(p => `${painLabel(p).toLowerCase()} (depuis le ${p.since})`).join(', ')}. Reste prudent sur les exercices qui sollicitent ces zones (un exercice à un bras ou une jambe peut épargner le côté douloureux) ; douleur vive ou qui dure : conseille d’arrêter et de consulter.` : '';
}
