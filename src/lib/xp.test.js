import { describe, expect, it } from 'vitest';
import { RANK_TRIALS, evaluateTrial } from '../data/trials';
import { DAILY_FULL_XP, computeXp, streakBonusPct, weekStreak } from './xp';
import { levelFromXp, xpForLevel } from './levels';

const e = (id, date) => ({ id, date, value: 1, calories: 100, note: '' });
const state = (dates, extra = {}) => ({ xp: 0, quests: [{ id: 'q', level: 1, history: dates.map((d, i) => e('e' + i, d)) }], ...extra });
const TODAY = '2026-10-21'; // mercredi ; semaines : 5, 12 et 19 octobre

describe('série de semaines et bonus', () => {
  it('compte les semaines d’affilée et ignore les entrées « Point de départ »', () => {
    expect(weekStreak(state([]), TODAY)).toBe(0);
    expect(weekStreak(state(['2026-10-20']), TODAY)).toBe(1);
    expect(weekStreak(state(['2026-10-13', '2026-10-20']), TODAY)).toBe(2);
    expect(weekStreak(state(['2026-10-06', '2026-10-20']), TODAY)).toBe(1); // semaine du 12 sautée
    const depart = state([]);
    depart.quests[0].history.push({ id: 'd', date: '2026-10-20', note: 'Point de départ — Niveau 1' });
    expect(weekStreak(depart, TODAY)).toBe(0);
  });

  it('la semaine en cours ne compte pas pour le bonus, qui plafonne à +50 %', () => {
    expect(streakBonusPct(state(['2026-10-20']), TODAY)).toBe(0);
    expect(streakBonusPct(state(['2026-10-13']), TODAY)).toBe(10);
    const longue = state(Array.from({ length: 8 }, (_, i) => `2026-0${8 + Math.floor(i / 4)}-${String(3 + (i % 4) * 7).padStart(2, '0')}`));
    expect(streakBonusPct(state(['2026-10-13', '2026-10-06', '2026-09-29', '2026-09-22', '2026-09-15', '2026-09-08', '2026-09-01']), TODAY)).toBe(50);
    expect(longue.xp).toBe(0);
  });
});

describe('computeXp', () => {
  it('applique le bonus aux séances seulement', () => {
    const s = state(['2026-10-13', '2026-10-06']);
    expect(computeXp(s, 100, TODAY, 'session').gained).toBe(120);
    expect(computeXp(s, 100, TODAY, 'minor').gained).toBe(100);
    expect(computeXp(s, 100, TODAY, 'reward').gained).toBe(100);
  });

  it('réduit de moitié l’EXP au-delà du plafond du jour', () => {
    const s = state([], { xpDaily: { date: TODAY, earned: DAILY_FULL_XP - 100 } });
    const r = computeXp(s, 300, TODAY, 'session'); // 100 à plein tarif + 200 réduits de moitié
    expect(r.gained).toBe(200);
    expect(r.reduced).toBe(true);
    expect(r.patch.xpDaily).toEqual({ date: TODAY, earned: DAILY_FULL_XP + 100 });
  });

  it('repart de zéro le lendemain et ne limite pas les récompenses', () => {
    const plein = state([], { xpDaily: { date: '2026-10-20', earned: 5000 } });
    expect(computeXp(plein, 300, TODAY, 'session').gained).toBe(300);
    const hier = state([], { xpDaily: { date: TODAY, earned: 5000 } });
    const r = computeXp(hier, 250, TODAY, 'reward');
    expect(r.gained).toBe(250);
    expect(r.patch.xpDaily).toEqual({ date: TODAY, earned: 5000 }); // une récompense ne compte pas dans le plafond
  });

  it('cumule l’EXP par semaine', () => {
    const a = computeXp(state([]), 80, TODAY, 'session');
    const b = computeXp({ ...state([]), ...a.patch }, 40, '2026-10-22', 'session');
    expect(b.patch.xpWeeks).toEqual({ '2026-10-19': 120 });
    expect(b.patch.xp).toBe(120);
  });
});

describe('épreuves de rang et blocage du niveau', () => {
  it('l’épreuve du rang 4 demande 2 jours d’entraînement', () => {
    expect(RANK_TRIALS[4]).toEqual({ days: 2 });
    expect(evaluateTrial(4, state(['2026-10-12', '2026-10-12']), TODAY).done).toBe(false);
    const ok = evaluateTrial(4, state(['2026-10-12', '2026-10-14']), TODAY);
    expect(ok.done).toBe(true);
    expect(ok.tasks[0]).toMatchObject({ current: 2, target: 2, done: true });
  });

  it('le niveau reste juste avant un rang dont l’épreuve n’est pas réussie', () => {
    const xp = xpForLevel(4) + 600; // niveau 4 atteint, moins de 1 000 EXP au-delà du rang
    expect(levelFromXp(xp).level).toBe(4); // sans règle de blocage
    const bloque = levelFromXp(xp, { passed: [] });
    expect(bloque.level).toBe(3);
    expect(bloque.locked.minLevel).toBe(4);
    expect(bloque.progressPct).toBe(100);
    expect(bloque.reserve).toBe(xp - xpForLevel(4));
    expect(levelFromXp(xp, { passed: [4] }).level).toBe(4);
    expect(levelFromXp(xpForLevel(8) + 500, { passed: [4] }).level).toBe(7); // bloqué avant le rang 8
    expect(levelFromXp(xpForLevel(3), { passed: [] }).locked).toBeNull(); // pas encore au seuil
  });

  it('jamais plus de 1 000 EXP bloqués : au-delà, le rang est franchi tout seul', () => {
    const r = levelFromXp(15000, { passed: [] }); // le cas de Gabin : 15 000 EXP
    expect(r.locked).toBeNull();
    expect(r.autoPassed).toEqual([4, 8]);
    expect(r.level).toBe(levelFromXp(15000).level);
    const juste = levelFromXp(xpForLevel(8) + 999, { passed: [4] });
    expect(juste.locked.minLevel).toBe(8);
    expect(juste.reserve).toBe(999);
    expect(levelFromXp(xpForLevel(8) + 1000, { passed: [4] }).locked).toBeNull();
  });
});
