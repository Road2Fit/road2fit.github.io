// Douleurs signalées (4.22). Logique pure, testée dans pains.test.js.
// coach.pains = [{ zone, since }] : zones que la personne dit sensibles. L'appli repère les exercices qui font travailler
// cette articulation (repérage anatomique simple, d'après le muscle et le nom), les signale et propose d'en changer.
// Ce n'est PAS un avis médical : aucune rééducation n'est proposée ; douleur vive ou qui dure = arrêter et consulter.
import { fineGroupOf } from '../data/muscles';
import { stripAccents } from '../lib/text';

export const PAIN_ZONES = [
  { id: 'shoulder', label: 'Épaule', the: 'l’épaule' },
  { id: 'elbow', label: 'Coude', the: 'le coude' },
  { id: 'wrist', label: 'Poignet', the: 'le poignet' },
  { id: 'neck', label: 'Cou', the: 'le cou' },
  { id: 'lowback', label: 'Bas du dos', the: 'le bas du dos' },
  { id: 'hip', label: 'Hanche', the: 'la hanche' },
  { id: 'knee', label: 'Genou', the: 'le genou' },
  { id: 'ankle', label: 'Cheville', the: 'la cheville' },
];
const ZONE = Object.fromEntries(PAIN_ZONES.map(z => [z.id, z]));
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

/** Zones sollicitées par un exercice (identifiants de PAIN_ZONES). */
export function zonesOf(item) {
  if (!item) return [];
  const n = stripAccents(String(item.name || '').toLowerCase());
  const out = new Set(BY_MUSCLE[fineGroupOf({ ...item, type: 'strength' })] || []);
  for (const [re, z] of BY_NAME) if (re.test(n)) out.add(z);
  return [...out];
}

export const painsOf = coach => ((coach && Array.isArray(coach.pains) ? coach.pains : []).filter(p => p && ZONE[p.zone]));

/** Zone douloureuse touchée par cet exercice (la première), ou null. */
export function painFor(item, coach) {
  const pains = painsOf(coach);
  if (!pains.length) return null;
  const zs = zonesOf(item);
  const hit = pains.find(p => zs.includes(p.zone));
  return hit ? hit.zone : null;
}

/** Ajoute ou retire une zone. */
export function togglePain(coach, zone, today) {
  const cur = painsOf(coach);
  return cur.some(p => p.zone === zone) ? cur.filter(p => p.zone !== zone) : [...cur, { zone, since: today }];
}

/** Message court pour un exercice qui touche une zone sensible. */
export function painAdvice(zone) {
  const z = ZONE[zone];
  return z ? `${z.label} sensible : allège, raccourcis le mouvement ou change d’exercice. Si ça fait mal, arrête.` : '';
}

/** Ligne pour le coach IA. */
export function painsLine(state) {
  const pains = painsOf(state && state.coach);
  return pains.length ? `Douleurs signalées par la personne : ${pains.map(p => `${zoneLabel(p.zone).toLowerCase()} (depuis le ${p.since})`).join(', ')}. Reste prudent sur les exercices qui sollicitent ces zones ; douleur vive ou qui dure : conseille d’arrêter et de consulter.` : '';
}
