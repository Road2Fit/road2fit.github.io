import { estimateQuestMax } from '../lib/maxima';
import { assistChangeText, nextAssistDown } from '../lib/assist';
import { coachDaysBetween, coachRound, coachSetsOf, coachStep } from './settings';

// Objectif d'un exercice selon le profil de travail choisi (voir profiles.js) : fourchette de répétitions, nombre de séries,
// repos, et charge calculée à partir du max estimé. Progression « à double échelon » :
//  1. on garde la charge et on ajoute des répétitions jusqu'en haut de la fourchette sur toutes les séries ;
//  2. une fois en haut, on augmente la charge et on repart du bas de la fourchette (ACSM 2009 : +2 à 10 % quand on dépasse
//     de 1 à 2 répétitions).
// Si la dernière séance sortait de la fourchette (par ex. après un changement de profil), la charge est recalculée d'après
// le max estimé (ou le record réel saisi) : c'est ce qui fait passer de 10 répétitions à 4 sans tâtonner.

const median = list => {
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function decideProfileTarget({ q, P, kind, last, today, opts, boss, load, assist, compound, goalAssist }) {
  const sets = compound ? P.sets : P.setsAccessory;
  const { lo, hi } = P;
  const restSec = compound ? P.restCompound : P.restAccessory;
  const step = coachStep(q, load);
  const range = `${lo} à ${hi} reps`;

  // max estimé (ou record réel saisi) pour les exercices à charge
  let e1 = null;
  if (kind === 'load') {
    const rec = opts.maxRecords && opts.maxRecords[q.id];
    if (rec && Number(rec.kg) > 0) e1 = Number(rec.kg);
    else {
      const est = estimateQuestMax(q, {}, { today });
      if (est.estimate > 0) e1 = est.estimate;
    }
  }
  const anchor = pct => coachRound((e1 * pct) / 100, step);
  const result = p => ({ sets, restSec, lo, hi, ...p });
  const fill = n => Array(sets).fill(n);

  if (!last) {
    const startLoad = kind === 'load' && e1 ? anchor(P.pctStart) : load;
    return result({
      load: startLoad, assist, reps: fill(lo), change: 'new',
      reason:
        kind === 'load' && e1
          ? `Profil ${P.label} : ${sets} séries de ${range}. Charge de départ ≈ ${P.pctStart} % de ton max estimé (${coachRound(e1, 0.5)} kg).`
          : `Profil ${P.label} : ${sets} séries de ${range}. Pars d’une charge que tu peux répéter ${lo} fois en gardant 2 ou 3 répétitions en réserve.`,
    });
  }

  // Séries à charge (ou aide) différente : on part de la dernière série, on juge les séries à cette charge ou plus dures
  let prevSets = coachSetsOf(last, sets, lo);
  const perSet = kind === 'load' ? last.setLoads : kind === 'assisted' ? last.setAssists : null;
  const mixed = Array.isArray(perSet) && perSet.length === prevSets.length && new Set(perSet.map(Number)).size > 1;
  const ref = mixed ? Number(perSet[perSet.length - 1]) || 0 : null;
  if (mixed) prevSets = prevSets.filter((_, i) => (kind === 'load' ? Number(perSet[i]) >= ref : Number(perSet[i]) <= ref));
  const curLoad = kind === 'load' ? (mixed ? ref : Number(last.value) || load) : 0;
  const curAssist = kind === 'assisted' ? (mixed ? ref : Number(last.assistanceKg) || 0) : 0;
  const rpe = Number(last.rpe) || 7;
  const gap = coachDaysBetween(last.date, today);
  const padded = Array.from({ length: sets }, (_, i) => (prevSets[i] !== undefined ? Number(prevSets[i]) || 0 : lo));
  const minReps = Math.min(...padded);
  const m = prevSets.length ? median(prevSets) : 0;
  const keep = { load: curLoad, assist: curAssist };

  if (gap >= 14) {
    const f = gap >= 21 ? 0.9 : 0.95;
    return result({
      load: kind === 'load' ? Math.max(step, coachRound(curLoad * f, step)) : 0,
      assist: kind === 'assisted' ? curAssist + (gap >= 21 ? 5 : 2.5) : 0,
      reps: fill(lo), change: 'resume',
      reason: `Reprise après ${gap} jours sans cet exercice : on repart un peu plus léger, en bas de la fourchette (${range}).`,
    });
  }

  if (boss && minReps >= lo) {
    return result({ ...keep, reps: fill(hi), change: 'goal', reason: 'Objectif atteint ! Valide le niveau suivant dans l’onglet Exercices pour définir un nouveau but.' });
  }

  const inRange = m >= lo && m <= hi;

  if (inRange) {
    const easyTop = rpe <= 6 && minReps >= Math.ceil((lo + hi) / 2); // ressenti facile : inutile d'attendre le haut de la fourchette
    if (rpe >= 9 && minReps >= hi) {
      return result({ ...keep, reps: fill(hi), change: 'hold', reason: `Séance précédente ressentie très dure (${rpe}/10) : on consolide la même ${kind === 'load' ? 'charge' : kind === 'assisted' ? 'aide' : 'difficulté'} une séance de plus.` });
    }
    if (minReps >= hi || easyTop) {
      if (kind === 'load') {
        let nl = coachRound(curLoad * (1 + (rpe <= 6 ? 0.05 : 0.035)), step);
        if (nl <= curLoad) nl = coachRound(curLoad + step, step);
        const goalV = Number(q.goalValue) || 0;
        if (goalV > curLoad && nl > goalV) nl = goalV;
        return result({ load: nl, assist: 0, reps: fill(lo), change: 'up', reason: `${minReps >= hi ? `${hi} reps réussies partout` : `Séries faciles (ressenti ${rpe}/10)`} → +${coachRound(nl - curLoad, 0.5)} kg, et on repart de ${lo} reps (profil ${P.label}).` });
      }
      if (kind === 'assisted') {
        const st = nextAssistDown(curAssist, goalAssist);
        if (st.reached) return result({ ...keep, reps: fill(hi), change: 'goal', reason: st.lest ? 'Objectif de lest atteint ! Valide le niveau suivant dans l’onglet Exercices.' : 'Objectif atteint sans aide ! Valide le niveau suivant dans l’onglet Exercices.' });
        const na = st.value;
        return result({ load: 0, assist: na, reps: fill(lo), change: 'assist_down', reason: `${hi} reps réussies partout → ${assistChangeText(curAssist, na)}, et on repart de ${lo} reps.` });
      }
      return result({ ...keep, reps: fill(hi), change: 'hold', reason: `Haut de la fourchette atteint (${hi} reps). Pour progresser dans le profil ${P.label}, ajoute du lest ou passe à une variante plus difficile.` });
    }
    // double progression : une répétition de plus par série, jusqu'en haut de la fourchette
    return result({
      ...keep, reps: padded.map(r => Math.min(hi, Math.max(lo, r) + (r >= lo ? 1 : 0))), change: 'hold',
      reason: `Dernière fois : ${padded.join(' - ')} reps. On garde la même ${kind === 'load' ? 'charge' : kind === 'assisted' ? 'aide' : 'difficulté'} et on vise +1 rép par série (fourchette du profil ${P.label} : ${range}).`,
    });
  }

  if (m > hi) {
    // trop léger pour ce profil (par ex. on passe de l'hypertrophie à la puissance) : charge recalculée
    if (kind === 'load') {
      let nl = e1 ? Math.max(coachRound(curLoad + step, step), anchor(P.pctStart)) : coachRound(curLoad * 1.075, step);
      nl = Math.min(nl, coachRound(curLoad * 1.15, step));
      return result({
        load: nl, assist: 0, reps: fill(lo), change: 'profile',
        reason: `Profil ${P.label} : tu faisais ${Math.round(m)} reps, c’est plus que la fourchette (${range}). Charge relevée de ${coachRound(curLoad, 0.5)} à ${coachRound(nl, 0.5)} kg${e1 ? ` (≈ ${P.pctStart} % de ton max estimé ${coachRound(e1, 0.5)} kg)` : ''}, par prudence pas plus de 15 % d’un coup.`,
      });
    }
    if (kind === 'assisted') {
      const na = nextAssistDown(curAssist, goalAssist).value;
      return result({ load: 0, assist: na, reps: fill(lo), change: 'profile', reason: `Profil ${P.label} : tu faisais ${Math.round(m)} reps, c’est plus que la fourchette (${range}) : ${assistChangeText(curAssist, na)}.` });
    }
    return result({ ...keep, reps: fill(hi), change: 'profile', reason: `Profil ${P.label} : tu faisais ${Math.round(m)} reps, c’est plus que la fourchette (${range}). Ajoute du lest ou passe à une variante plus difficile.` });
  }

  // m < lo : trop lourd pour ce profil (par ex. on passe de la puissance à l'endurance, ou séance ratée)
  if (kind === 'load') {
    const target = e1 ? anchor(P.pctStart) : coachRound(curLoad * 0.9, step);
    if (curLoad <= target * 1.08) {
      return result({ ...keep, reps: fill(lo), change: 'hold', reason: `Sous la fourchette du profil ${P.label} (${Math.round(m)} reps pour ${range}) : on garde la charge et on vise ${lo} reps.` });
    }
    const nl = Math.max(target, coachRound(curLoad * 0.8, step));
    return result({
      load: nl, assist: 0, reps: fill(lo), change: 'profile',
      reason: `Profil ${P.label} : tu faisais ${Math.round(m)} reps, la fourchette est ${range}. Charge ramenée de ${coachRound(curLoad, 0.5)} à ${coachRound(nl, 0.5)} kg${e1 ? ` (≈ ${P.pctStart} % de ton max estimé ${coachRound(e1, 0.5)} kg)` : ''}.`,
    });
  }
  if (kind === 'assisted') {
    const na = curAssist + (m < lo - 3 ? 5 : 2.5);
    return result({ load: 0, assist: na, reps: fill(lo), change: 'profile', reason: `Profil ${P.label} : tu faisais ${Math.round(m)} reps, la fourchette est ${range} : ${assistChangeText(curAssist, na)}.` });
  }
  return result({ ...keep, reps: fill(lo), change: 'hold', reason: `Sous la fourchette du profil ${P.label} (${Math.round(m)} reps pour ${range}) : on vise ${lo} reps par série.` });
}
