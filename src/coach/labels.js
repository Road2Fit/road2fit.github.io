// Textes fixes de l'onglet Coach : formats de date, badges de changement, sources scientifiques.
export const coachFmt = n => String(Math.round((Number(n) || 0) * 100) / 100).replace('.', ',');

export const coachDateFR = iso => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

export const COACH_CHANGE_BADGES = {
  up: ['🔼', 'Progression', 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'],
  assist_down: ['🪢', 'Moins d’aide', 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'],
  hold: ['🟰', 'Consolider', 'bg-sky-500/20 text-sky-300 border-sky-500/40'],
  down: ['🔽', 'Recul', 'bg-amber-500/20 text-amber-300 border-amber-500/40'],
  resume: ['↩️', 'Reprise', 'bg-amber-500/20 text-amber-300 border-amber-500/40'],
  goal: ['🎯', 'Objectif atteint', 'bg-pink-500/20 text-pink-300 border-pink-500/40'],
  profile: ['🎯', 'Profil de travail', 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'],
  dictated: ['🎤', 'Ta séance', 'bg-violet-500/20 text-violet-300 border-violet-500/40'],
  manual: ['✋', 'Ton choix', 'bg-violet-500/20 text-violet-300 border-violet-500/40'],
  program: ['📋', 'Ton coach', 'bg-violet-500/20 text-violet-200 border-violet-500/40'],
  suite: ['✨', 'Suite proposée', 'bg-violet-500/20 text-violet-200 border-violet-500/40'],
  new: ['🆕', 'Départ', 'bg-slate-700/60 text-slate-200 border-slate-600']
};

export const COACH_SOURCES = [
  { ok: true, text: 'Ratamess N.A. et al. (2009), ACSM Position Stand « Progression Models in Resistance Training for Healthy Adults », Med Sci Sports Exerc 41(3):687-708.', use: 'Augmenter la charge de 2 à 10 % quand les répétitions cibles sont dépassées ; repos de 2-3 min sur les exercices principaux, 1-2 min sur les exercices d’appoint.' },
  { ok: true, text: 'Garthe I. et al. (2011), « Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes », Int J Sport Nutr Exerc Metab 21(2):97-104.', use: 'Une perte d’environ 0,7 % du poids par semaine a mieux préservé la masse maigre qu’une perte d’environ 1,4 % (chez des athlètes d’élite).' },
  { ok: true, text: 'Schoenfeld B.J. et al. (2016), « Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men », J Strength Cond Res 30(7):1805-1812.', use: '3 minutes de repos ont donné de meilleurs gains de force et de muscle des cuisses que 1 minute.' },
  { ok: false, text: 'Schoenfeld B.J., Ogborn D., Krieger J.W. (2016), « Effects of resistance training frequency on measures of muscle hypertrophy », Sports Med 46(11):1689-1697.', use: 'Entraîner chaque groupe au moins 2 fois par semaine est préférable à 1 fois (conclusion citée de mémoire).' },
  { ok: false, text: 'Schoenfeld B.J., Ogborn D., Krieger J.W. (2017), « Dose-response relationship between weekly resistance training volume and increases in muscle mass », J Sports Sci 35(11):1073-1082.', use: 'Plus de séries par semaine et par groupe donne plus de muscle, avec une cible d’environ 10 séries (chiffre cité de mémoire).' },
  { ok: false, text: 'Spiering B.A. et al. (2021), « Maintaining Physical Performance: The Minimal Dose of Exercise Needed to Preserve Endurance and Strength Over Time », J Strength Cond Res 35(5):1449-1458.', use: 'Conserver sa force demande bien moins de volume que d’en gagner, ce qui compte pendant une perte de poids (contenu cité de mémoire).' },
  { ok: false, text: 'Morton R.W. et al. (2018), méta-analyse sur la supplémentation en protéines et l’entraînement en résistance, Br J Sports Med 52(6):376-384.', use: 'Les gains de masse maigre plafonnent vers 1,6 g/kg/jour (intervalle jusqu’à 2,2) ; repère général, chiffre cité de mémoire.' },
  { ok: false, text: 'Donnelly J.E. et al. (2009), ACSM Position Stand « Appropriate physical activity intervention strategies for weight loss and prevention of weight regain for adults », Med Sci Sports Exerc 41(2):459-471 ; et OMS (2020), Bull F.C. et al., Br J Sports Med 54:1451-1462.', use: '150 minutes d’endurance par semaine au minimum (davantage pour perdre du poids) et du renforcement musculaire au moins 2 jours par semaine (chiffres cités de mémoire).' },
  { ok: false, text: 'Mifflin M.D. et al. (1990), « A new predictive equation for resting energy expenditure in healthy individuals », Am J Clin Nutr 51(2):241-247.', use: 'Formule d’estimation de ton métabolisme de base utilisée pour les calories (équation citée de mémoire).' },
  { ok: false, text: 'Epley B. (1985), « Poundage chart », Boyd Epley Workout, Lincoln, Nebraska.', use: 'Formule 1RM ≈ charge × (1 + répétitions / 30), utilisée pour suivre l’évolution de ta force (formule citée de mémoire, à titre indicatif).' },
  { ok: false, text: 'Bell L. et al. (2023), « Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach », Sports Med Open.', use: 'Consensus d’experts : alléger une semaine de temps en temps est une pratique courante. Les preuves expérimentales directes restent limitées.' },
  { ok: true, text: 'Tooth C. et al. (2023), « Prevention of shoulder injuries in volleyball players: the usefulness and efficiency of a warm-up routine », Phys Ther Sport (d’après un compte rendu de lecture).', use: 'Un programme d’épaules en échauffement n’a pas montré de bénéfice statistiquement établi : les conseils de prévention restent des pistes à preuves limitées.' }
];
