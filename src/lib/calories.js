import { ACTIVITY_MET } from '../data/activities';

// ---------------------------------------------------------------------------------------------------------------------
// Calories NETTES (la dépense de repos est retirée : 1 MET = 1 kcal par kg et par heure), donc les kcal des séances
// s'ajoutent au métabolisme de base sans double compte (voir coach/advice.js, coachNutrition).
//   • musculation : MET moyen de la séance (repos entre les séries compris) × durée estimée ;
//   • course, marche, randonnée, trail : équations ACSM (vitesse + pente) ;
//   • vélo, natation, kayak, roller, ski de fond… : MET du Compendium des activités physiques (Ainsworth 2011) selon la VITESSE ;
//     la montée en vélo / roller / ski s'ajoute (énergie potentielle ÷ rendement musculaire de 25 %) ;
//   • rameur et ski-erg : puissance mécanique de l'ergomètre (P = 2,8 × v³) ÷ rendement de 23 % ;
//   • sports collectifs, raquette, cours, autres : MET de l'activité × facteur d'intensité (ressenti RPE, neutre à 6/10).
// ---------------------------------------------------------------------------------------------------------------------

const RUN_WALK_MODES = ['run', 'interval', 'walk', 'incline_walk', 'hike', 'trail', 'nordic'];
/** Activités extérieures avec une vraie montée : le dénivelé compte (vélo, roller, ski de fond, raquettes, trottinette). */
export const OUTDOOR_CLIMB_MODES = ['fp_road_bike', 'fp_mtb', 'fp_city_bike', 'fp_ebike', 'fp_roller', 'fp_ski_xc', 'fp_snowshoe', 'fp_scooter'];
/** Modes pour lesquels le dénivelé a un sens : course et marche (extérieur ou tapis), randonnée, trail, vélo et glisse en extérieur. */
export const ELEVATION_MODES = [...RUN_WALK_MODES, ...OUTDOOR_CLIMB_MODES];
export const cardioHasElevation = mode => ELEVATION_MODES.includes(mode || 'run');

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
/** Interpolation linéaire dans un tableau [[x, y], …] trié (valeurs bornées aux extrémités). */
const table = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
};

// MET brut selon la vitesse moyenne (km/h) – points du Compendium 2011 (cyclisme : 16 km/h ≈ 6,8 ; 22 km/h ≈ 10 ; 32 km/h ≈ 15,8…)
const ROAD = [[8, 3.0], [14, 4.0], [17.7, 6.8], [20.9, 8.0], [24, 10.0], [28, 12.0], [34, 15.8]];
const SWIM = [[1.5, 4.8], [2.0, 5.8], [2.7, 8.3], [3.5, 9.8], [4.5, 11.5]];
const SPEED_MET = {
  fp_road_bike: s => table(ROAD, s),
  fp_city_bike: s => table(ROAD, s),
  fp_mtb: s => table(ROAD, s) + 1.5, // terrain irrégulier : plus d'effort à vitesse égale
  fp_ebike: s => Math.max(3.0, table(ROAD, s) * 0.6), // l'assistance électrique fait une partie du travail
  fp_swim: s => table(SWIM, s),
  fp_open_water: s => table(SWIM, s) + 0.3,
  fp_kayak: s => table([[3, 2.8], [5, 3.5], [7, 5.0], [9, 7.0], [11, 9.0]], s),
  fp_rowing_out: s => table([[6, 3.5], [8, 4.8], [10, 7.0], [12, 8.5], [14, 12.0]], s),
  fp_sup: s => table([[2, 3.0], [4, 4.5], [6, 6.0], [8, 8.0]], s),
  fp_roller: s => table([[8, 4.5], [10, 6.0], [14, 7.5], [19, 9.8], [22, 12.3], [26, 15.0]], s),
  fp_ski_xc: s => table([[4, 5.5], [6.4, 6.8], [8, 9.0], [12.6, 12.5], [16, 15.0]], s),
  fp_snowshoe: s => table([[2, 4.5], [3.5, 6.0], [5, 8.0], [6.5, 10.0]], s),
  fp_scooter: s => table([[6, 3.5], [10, 5.0], [14, 7.0]], s),
};

// MET brut des activités qui n'ont pas de vitesse utile (anciens modes + activités annexes)
const MET_BY_MODE = { ...ACTIVITY_MET, bike: 6.8, assault_bike: 9.0, elliptical: 5.0, rower: 7.0, stairs: 8.8, skierg: 7.5, jumprope: 10.5, hiit: 8.0, boxing: 7.5, group_class: 6.0 };

/** Facteur d'intensité du ressenti : 1 à RPE 6, +7 % par point (borné) ; multiplicatif, donc jamais de dépense négative. */
export const rpeFactor = rpe => clamp(1 + ((Number(rpe) || 6) - 6) * 0.07, 0.6, 1.35);

export function calculateStrengthCalories({
  unit, weightKg = 0, assistanceKg = 0, setDetails = [6, 6, 6], rpe = 7, userWeightKg = 82,
  timed = false,
}) {
  const numSets = Math.max(1, setDetails.length);
  const totalReps = setDetails.reduce((acc, r) => acc + (Number(r) || 0), 0) / (timed ? 3 : 1);
  const durationHours = (numSets * 2.2 + totalReps * 0.05) / 60;
  const effectiveLoad = unit === 'reps'
    ? Math.max(15, userWeightKg * 0.78 - (Number(assistanceKg) || 0))
    : Math.max(5, Number(weightKg) || 0);
  const loadRatio = effectiveLoad / Math.max(45, userWeightKg);
  // MET moyen de la séance, repos entre les séries compris : musculation légère ≈ 3,5, vigoureuse ≈ 6 (Compendium) ;
  // il monte avec le ressenti et avec la charge relative, sans saturer dès les charges moyennes
  const grossMet = clamp(3.5 + (Number(rpe) - 5) * 0.35 + Math.min(1.5, loadRatio * 0.8), 3.5, 6.5);
  return Math.max(10, Math.round((grossMet - 1) * userWeightKg * durationHours));
}

/**
 * Calories des séries d'échauffement faites. Effort léger : musculation légère ≈ 3,5 MET (Compendium), soit 2,5 MET nets ;
 * durée de chaque série = son repos + environ 3 s par répétition (les séries d'échauffement ont des repos courts).
 * @param {{ userWeightKg }} q  @param {{ reps, restSec? }[]} sets
 */
export function warmupCalories({ userWeightKg = 82 } = {}, sets = []) {
  const min = sets.reduce((m, w) => m + ((Number(w.restSec) || 45) + (Number(w.reps) || 0) * 3) / 60, 0);
  return Math.round(2.5 * (Number(userWeightKg) || 82) * (min / 60));
}

export function calculateCardioCalories({
  cardioMode = 'run', distanceKm = 5, durationMin = 30, elevationM = 0, rpe = 7, userWeightKg = 82,
}) {
  const durMin = Math.max(1, Number(durationMin) || 20);
  const distKm = Math.max(0.1, Number(distanceKm) || 0);
  const elevM = cardioHasElevation(cardioMode) ? Math.max(0, Number(elevationM) || 0) : 0;
  const w = Math.max(30, Number(userWeightKg) || 82);
  const hours = durMin / 60;
  const speedKmh = distKm / hours;
  let kcal = 0;

  if (cardioMode === 'volleyball') {
    // ~3 MET à RPE 4, ~4,8 à RPE 7, ~6 à RPE 9 (valeurs brutes), temps morts inclus
    const grossMet = Math.max(2, 3 + (clamp(rpe, 1, 10) - 4) * 0.6);
    kcal = (grossMet - 1) * w * hours;
  } else if (RUN_WALK_MODES.includes(cardioMode)) {
    // Équations ACSM (vitesse + pente) : VO2 en ml/kg/min, 1 L d'O2 ≈ 5 kcal, repos (3,5) retiré
    const speed = (distKm * 1000) / durMin; // m/min
    const grade = Math.min(0.25, elevM / (distKm * 1000));
    const walkVo2 = 0.1 * speed + 1.8 * speed * grade;
    const runVo2 = 0.2 * speed + 0.9 * speed * grade;
    let vo2;
    if (cardioMode === 'run' || cardioMode === 'interval' || cardioMode === 'trail') vo2 = runVo2;
    else if (speed <= 100) vo2 = walkVo2; // marche normale à rapide (jusqu'à 6 km/h)
    else if (speed >= 134) vo2 = runVo2; // au-delà de 8 km/h on court
    else vo2 = walkVo2 + ((runVo2 - walkVo2) * (speed - 100)) / 34; // transition marche athlétique → course
    if (cardioMode === 'nordic') vo2 *= 1.2; // les bâtons sollicitent le haut du corps : environ +20 % à même vitesse
    kcal = (vo2 * w * durMin / 1000) * 5;
  } else if (cardioMode === 'rower' || cardioMode === 'skierg') {
    // ergomètre : puissance mécanique P = 2,8 × v³ (v en m/s), rendement musculaire ≈ 23 %
    const v = (distKm * 1000) / (durMin * 60);
    const metabolicW = (2.8 * v * v * v) / 0.23;
    const gross = (metabolicW * durMin * 60) / 4184;
    kcal = Math.max(gross - w * hours, (3.5 - 1) * w * hours); // net, jamais sous un effort léger
  } else if (SPEED_MET[cardioMode] && distanceKm > 0 && Number(distanceKm) > 0) {
    // activité mesurée en distance : MET selon la vitesse (le ressenti est déjà dans la vitesse)
    kcal = (SPEED_MET[cardioMode](speedKmh) - 1) * w * hours;
    if (OUTDOOR_CLIMB_MODES.includes(cardioMode) && elevM > 0) {
      // montée : énergie potentielle (sportif + matériel de 10 kg) ÷ rendement musculaire d'environ 25 % ; moitié moins avec assistance électrique
      const joules = (w + 10) * 9.81 * elevM;
      kcal += (joules / 0.25 / 4184) * (cardioMode === 'fp_ebike' ? 0.5 : 1);
    }
  } else {
    const grossMet = (MET_BY_MODE[cardioMode] || 6.8) * rpeFactor(rpe);
    kcal = (grossMet - 1) * w * hours;
  }
  return Math.max(5, Math.round(kcal));
}

export const DEFAULT_CARDIO_INPUT = { inputMode: 'distance', speedKmh: 10, slopeMode: 'meters', slopePct: 5 };

/**
 * Saisie cardio « vitesse + durée » et/ou « pente en % » → distance (km) et dénivelé positif (m) utilisés partout ailleurs.
 *  - inputMode 'speed' : distance = vitesse × durée (ex. 10 km/h pendant 5 min = 0,83 km) ;
 *  - slopeMode 'percent' : dénivelé = pente % × distance parcourue (ex. 4 km/h pendant 40 min à 10 % = 2,67 km → 267 m).
 */
export function resolveCardioInputs({ inputMode = 'distance', distanceKm = 0, speedKmh = 0, durationMin = 0, slopeMode = 'meters', elevationM = 0, slopePct = 0 }) {
  const dur = Math.max(0, Number(durationMin) || 0);
  const dist = inputMode === 'speed'
    ? Math.round(Math.max(0, Number(speedKmh) || 0) * dur / 60 * 100) / 100
    : Math.max(0, Number(distanceKm) || 0);
  const elev = slopeMode === 'percent'
    ? Math.round(Math.max(0, Number(slopePct) || 0) / 100 * dist * 1000)
    : Math.max(0, Number(elevationM) || 0);
  return { distanceKm: dist, elevationM: elev };
}

/** Texte « à 10 km/h, pente 10 % » ajouté aux notes automatiques ('' en saisie classique). */
export function cardioInputNote(ci) {
  if (!ci) return '';
  const parts = [];
  if (ci.inputMode === 'speed') parts.push(`à ${Number(ci.speedKmh) || 0} km/h`);
  if (ci.slopeMode === 'percent') parts.push(`pente ${Number(ci.slopePct) || 0} %`);
  return parts.join(', ');
}

export function formatPaceAndSpeed(distanceKm, durationMin) {
  const dist = Number(distanceKm) || 0;
  const dur = Number(durationMin) || 0;
  if (dist <= 0 || dur <= 0) return { pace: '--:-- /km', speed: '0.0 km/h' };
  const paceDecimal = dur / dist;
  const paceMin = Math.floor(paceDecimal);
  const paceSec = Math.round((paceDecimal - paceMin) * 60);
  const normalizedMin = paceSec === 60 ? paceMin + 1 : paceMin;
  const normalizedSec = paceSec === 60 ? 0 : paceSec;
  const speed = (dist / (dur / 60)).toFixed(1);
  return {
    pace: `${normalizedMin}'${String(normalizedSec).padStart(2, '0')}" /km`,
    speed: `${speed} km/h`
  };
}
