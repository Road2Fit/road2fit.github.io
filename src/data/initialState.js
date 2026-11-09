import { pick } from '../edition';
// ==========================================
// ÉTAT DE DÉPART : application vide (aucun exercice, aucune pesée). Tout nouveau champ doit avoir sa valeur ici.
// ==========================================
export const INITIAL_STATE = {
  heroName: pick('Dresseur Rondoudou', ''),
  startWeightKg: pick(84, 75),
  userWeightKg: pick(82, 75),
  targetWeightKg: 75,
  coach: { sessionsPerWeek: 2, sessionMinutes: 60, volleyDays: pick([4, 5], []), matchDates: [], deloadWeeks: [], cycleWeeks: 0, cycleStart: null, weeklyClaimed: [], splitMode: 'auto', gymSlots: {}, gymSkips: [] },
  weightHistory: [],
  muscleMode: 'simple',                         // suivi des muscles : 'simple' (5 grands groupes) ou 'optimized' (14 muscles précis)
  onboarded: false,
  voiceNextSeen: false,                         // onglet « Prochaine séance » de la dictée ouvert au moins une fois (sinon pastille sur le micro)
  aiConsent: false,
  friendsOn: false,                             // amis activés (vaut pour tous les appareils du compte)                             // coach intelligent (API Claude) activé par la personne                             // l'assistant d'accueil a été fait (ou passé)
  xp: 0,
  streak: 0,
  soundEnabled: true,
  xpWeeks: {},                                  // EXP gagnée par semaine (clé = lundi AAAA-MM-JJ), pour la courbe du Bilan
  xpDaily: { date: '', earned: 0 },             // EXP gagnée aujourd'hui (plafond du jour)
  rankTrials: [],                               // niveaux des rangs dont l'épreuve est réussie
  cosmetics: { theme: pick('rose', 'ardoise'), accessory: 'none', title: '' },
  animFlags: [],                                // animations signalées comme fausses : { id, animId, view, name, at }
  maxRecords: {},                               // records réels saisis dans l'onglet « Mes maxima » (clé = id de l'exercice)
  unlockedAchievements: [],
  claimedChallenges: [],
  quests: []
};
