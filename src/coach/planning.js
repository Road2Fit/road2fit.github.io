import { coachCycleInfo, coachIsDeloadWeek } from './cycle';
import { COACH_TYPES, COACH_TYPE_ORDER, coachDaysBetween, coachDow, coachTimeToMin, getCoachSettings } from './settings';
import { normalizeArenaGroup } from '../data/arenas';
import { addDaysISO } from '../lib/dates';
import { getAllEntries, isStartEntry } from '../lib/quests';
import { sportInfo } from '../data/sports';

// Contraintes d'un jour : volley (jeudi/vendredi par défaut), match, récupération
// Volley un jour donné : jours habituels, sauf les dates « pas de volley », plus les volleys exceptionnels
function coachHasVolley(coach, iso) {
  if ((coach.volleyExtra || []).includes(iso)) return true;
  if ((coach.volleySkips || []).includes(iso)) return false;
  return (coach.volleyDays || []).includes(coachDow(iso));
}

export function coachDayInfo(iso, coach) {
  const volleyDays = coach.volleyDays || [];
  const matches = new Set(coach.matchDates || []);
  const dow = coachDow(iso);
  const sp = sportInfo(coach.sport);
  const isVolley = coachHasVolley(coach, iso);
  const isMatch = matches.has(iso);
  const next1 = addDaysISO(iso, 1);
  const next2 = addDaysISO(iso, 2);
  const prev1 = addDaysISO(iso, -1);
  const volleyNext = coachHasVolley(coach, next1) || matches.has(next1);
  const matchSoon = matches.has(next1) || matches.has(next2);
  const afterMatch = matches.has(prev1);
  const legsOk = !isVolley && !isMatch && !volleyNext && !matchSoon && !afterMatch;
  let legsWhy = '';
  if (isVolley || isMatch) legsWhy = isMatch ? 'jour de match' : `jour ${sp.de}`;
  else if (matches.has(next1)) legsWhy = 'match demain';
  else if (matchSoon) legsWhy = 'match dans 2 jours';
  else if (afterMatch) legsWhy = 'lendemain de match';
  else if (volleyNext) legsWhy = `${sp.label} demain`;
  return { iso, dow, sport: sp, isVolley, isMatch, blocked: isVolley || isMatch, legsOk, legsWhy };
}

// Créneaux de salle choisis par l'utilisateur (jour de la semaine + horaires)
export function coachSlotFor(coach, iso) {
  const sl = (coach.gymSlots || {})[coachDow(iso)];
  if (!sl) return null;
  const a = coachTimeToMin(sl.start), b = coachTimeToMin(sl.end);
  return { start: sl.start, end: sl.end, min: a !== null && b !== null && b > a ? b - a : 0 };
}

const coachSlotsDefined = coach => Object.keys(coach.gymSlots || {}).length > 0;

function coachCanTrain(coach, info) {
  if ((coach.gymExtra || []).includes(info.iso)) return true; // séance en plus demandée pour ce jour précis
  if ((coach.gymSkips || []).includes(info.iso)) return false;
  if (info.isMatch) return false;
  if (coachSlotsDefined(coach)) return !!coachSlotFor(coach, info.iso);
  return !info.blocked;
}

// Groupes musculaires réellement travaillés un jour donné (jambes / haut du corps)
function coachDayMuscles(state, iso) {
  const ar = new Set(
    getAllEntries(state)
      .filter(e => e.date === iso && e.quest.type === 'strength' && !isStartEntry(e))
      .map(e => normalizeArenaGroup(e.quest.category, e.quest.type))
  );
  return { iso, legs: ar.has('Jambes'), upper: ar.has('Dos') || ar.has('Pectoraux') || ar.has('Épaules & Bras') };
}

// Planifie les séances de muscu d'une semaine (lundi → dimanche), en respectant les créneaux de salle
export function coachPlanWeek(state, weekStart, today, prior = []) {
  const coach = getCoachSettings(state);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const strengthDays = new Set(
    getAllEntries(state).filter(e => e.quest.type === 'strength').map(e => e.date)
  );
  const info = days.map(d => coachDayInfo(d, coach)).map(i => ({ ...i, slot: coachSlotFor(coach, i.iso), avail: coachCanTrain(coach, i) }));
  const doneDays = days.filter(d => strengthDays.has(d));
  const lastBefore = [...strengthDays].filter(d => d < weekStart).sort().pop() || null;
  // séances exceptionnelles (coach.gymExtra) : ajoutées telles quelles, en plus du rythme habituel, sans changer les autres
  const extraSet = new Set(coach.gymExtra || []);
  const extras = days.filter(d => extraSet.has(d) && d >= today && !strengthDays.has(d));
  const cand = info.filter(i => i.iso >= today && i.avail && !strengthDays.has(i.iso) && !extraSet.has(i.iso));
  const trio = coach.splitMode === 'trio';
  let planned = [];
  const plannedTypes = {};
  let remaining;

  if (!trio) {
    remaining = Math.max(0, coach.sessionsPerWeek - doneDays.filter(d => !extraSet.has(d)).length);
    const fixed = [...doneDays, ...(lastBefore ? [lastBefore] : []), ...prior.map(p => p.iso)];
    // plus grand nombre de séances (≤ objectif) espacées d'au moins 2 jours (≈ 48 h de repos)
    let best = null;
    let target = remaining;
    for (; target >= 0; target--) {
      best = null;
      const rec = (start, chosen) => {
        if (chosen.length === target) {
          // jours de salle choisis par la personne : les plus proches d'abord (elle s'attend à la séance du prochain jour choisi),
          // puis les jours où les jambes sont possibles ; sans créneaux : jambes possibles d'abord, puis les plus proches
          const legs = chosen.filter(d => cand.find(c => c.iso === d).legsOk).length;
          const early = -chosen.reduce((s, d) => s + coachDaysBetween(weekStart, d), 0);
          const score = coachSlotsDefined(coach) ? [early, legs] : [legs, early];
          if (!best || score[0] > best.score[0] || (score[0] === best.score[0] && score[1] > best.score[1])) best = { chosen, score };
          return;
        }
        for (let k = start; k < cand.length; k++) {
          const d = cand[k].iso;
          if ([...fixed, ...chosen].every(x => Math.abs(coachDaysBetween(x, d)) >= 2)) rec(k + 1, [...chosen, d]);
        }
      };
      rec(0, []);
      if (best) break;
    }
    planned = [...(best ? best.chosen : []), ...extras].sort();
  } else {
    // Mode 3 séances : full body, jambes, haut du corps répartis sur les jours disponibles
    const doneTypes = [];
    doneDays.forEach(d => {
      const m = coachDayMuscles(state, d);
      if (m.legs && m.upper) doneTypes.push('FB');
      else if (m.legs) doneTypes.push('LEGS');
      else if (m.upper) doneTypes.push('UPPER');
    });
    const needed = COACH_TYPE_ORDER.filter(t => !doneTypes.includes(t));
    remaining = Math.min(needed.length, Math.max(0, 3 - doneDays.filter(d => !extraSet.has(d)).length));
    const fixedM = [
      ...doneDays.map(d => coachDayMuscles(state, d)),
      ...(lastBefore ? [coachDayMuscles(state, lastBefore)] : []),
      ...prior
    ];
    const okWith = (t, d, other) => {
      const g = Math.abs(coachDaysBetween(other.iso, d));
      if (g >= 2) return true;
      if (g === 0) return false;
      const ci = cand.find(c => c.iso === d);
      const legsEff = COACH_TYPES[t].legs && ci.legsOk;
      return !((legsEff && other.legs) || (COACH_TYPES[t].upper && other.upper));
    };
    let best = null;
    for (let k = Math.min(remaining, cand.length); k >= 0 && !best; k--) {
      const rec = (ti, chosen) => {
        if (chosen.length === k) {
          let score = 0;
          if (k > 0) {
            const isos = [...chosen.map(c => c.d), ...fixedM.filter(f => f.iso >= weekStart).map(f => f.iso)].sort();
            let minGap = 3;
            for (let i = 1; i < isos.length; i++) minGap = Math.min(minGap, coachDaysBetween(isos[i - 1], isos[i]));
            const slotScore = chosen.reduce((sum, c) => {
              const ci = cand.find(x => x.iso === c.d);
              const m = ci.slot && ci.slot.min ? Math.min(ci.slot.min, 90) : 90;
              return sum + (m / 90) * 10 * (c.t === 'FB' ? 1.2 : 1);
            }, 0);
            const fbBonus = chosen.some(c => c.t === 'FB' && cand.find(x => x.iso === c.d).legsOk) ? 5 : 0;
            const idxPen = chosen.reduce((sum, c) => sum + coachDaysBetween(weekStart, c.d) * 0.3, 0);
            score = minGap * 100 + slotScore + fbBonus - idxPen;
          }
          if (!best || score > best.score) best = { chosen: chosen.slice(), score };
          return;
        }
        if (ti >= needed.length) return;
        const t = needed[ti];
        // placer ce type
        cand.forEach(ci => {
          if (chosen.some(c => c.d === ci.iso)) return;
          if (t === 'LEGS' && !ci.legsOk) return;
          const m = { iso: ci.iso, legs: COACH_TYPES[t].legs && ci.legsOk, upper: COACH_TYPES[t].upper };
          if (!fixedM.every(f => okWith(t, ci.iso, f))) return;
          if (!chosen.every(c => okWith(t, ci.iso, { iso: c.d, legs: COACH_TYPES[c.t].legs && cand.find(x => x.iso === c.d).legsOk, upper: COACH_TYPES[c.t].upper }))) return;
          if (!chosen.every(c => okWith(c.t, c.d, m))) return;
          rec(ti + 1, [...chosen, { t, d: ci.iso }]);
        });
        // ou le sauter (si on peut encore atteindre k)
        if (needed.length - ti - 1 >= k - chosen.length) rec(ti + 1, chosen);
      };
      rec(0, []);
    }
    if (best) {
      best.chosen.sort((x, y) => x.d.localeCompare(y.d)).forEach(c => { planned.push(c.d); plannedTypes[c.d] = c.t; });
    }
    extras.forEach(d => { planned.push(d); plannedTypes[d] = 'FB'; });
    planned.sort();
  }
  const shortfall = Math.max(0, remaining - planned.filter(d => !extraSet.has(d)).length);
  const matchInWeek = days.some(d => (coach.matchDates || []).includes(d));
  return {
    weekStart, coach, matchInWeek, remaining, shortfall, trio, plannedTypes,
    deload: coachIsDeloadWeek(coach, weekStart),
    cycle: coachCycleInfo(coach, weekStart),
    days: info.map(i => ({
      ...i,
      type: plannedTypes[i.iso] || null,
      status: strengthDays.has(i.iso) ? 'done' : planned.includes(i.iso) ? 'planned' : i.isMatch ? 'match' : i.isVolley ? 'volley' : 'rest',
      // une journée peut cumuler la muscu et le sport (journée double) : les deux sont donnés séparément
      gym: strengthDays.has(i.iso) ? 'done' : planned.includes(i.iso) ? 'planned' : null,
      extra: extraSet.has(i.iso),
      skipped: (coach.gymSkips || []).includes(i.iso),
      sportKind: i.isMatch ? 'match' : i.isVolley ? 'sport' : null
    })),
    planned
  };
}

export function coachNextTemplateIdx(state, templates) {
  const entries = getAllEntries(state).filter(e => e.quest.type === 'strength');
  let bestIdx = 0, bestDate = null;
  templates.forEach((t, i) => {
    const ids = new Set(t.quests.map(q => q.id));
    const last = entries.filter(e => ids.has(e.quest.id)).map(e => e.date).sort().pop() || '';
    if (bestDate === null || last < bestDate) { bestDate = last; bestIdx = i; }
  });
  return bestIdx;
}
