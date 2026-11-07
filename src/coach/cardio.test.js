// Coach cardio : le cœur compté comme un muscle, séances proposées selon l'objectif, placement dans la semaine, enregistrement.
import { describe, expect, it } from 'vitest';
import { applyCardioSession, canRun, cardioPlanWeek, cardioSession, cardioWeekTypes, entryHeart, heartBalance, heartWeek, hrMax, runwalkStage, RUNWALK_STAGES } from './cardio';
import { EXERCISE_CATALOG } from '../data/catalog';
import { calculateCardioCalories } from '../lib/calories';

const MONDAY = '2026-11-09';
const base = (cardio, extra = {}) => ({ quests: [], userWeightKg: 80, coach: { volleyDays: [], matchDates: [], sport: '', profile: { age: 30 }, cardio, ...extra } });
const walkQuest = entries => ({ id: 'qw', catalogId: 'brisk_walk', name: 'Marche', type: 'cardio', unit: 'km', cardioMode: 'walk', history: entries });

describe('le cœur, un muscle à part entière', () => {
  it('FC max de Tanaka', () => {
    expect(hrMax(30)).toBe(187);
    expect(hrMax('')).toBe(null);
  });
  it('intensité lue dans la dépense : marche rapide = modéré, fractionné = intense, marche lente = rien', () => {
    const q = { type: 'cardio', unit: 'km' };
    // 80 kg, 30 min : MET brut = kcal/(80×0,5)+1
    expect(entryHeart({ quest: q, durationMin: 30, calories: 120 }, 80).level).toBe('moderate'); // 4 MET
    expect(entryHeart({ quest: q, durationMin: 30, calories: 260 }, 80).level).toBe('vigorous'); // 7,5 MET
    expect(entryHeart({ quest: q, durationMin: 30, calories: 40 }, 80).level).toBe('light'); // 2 MET
    expect(entryHeart({ quest: { type: 'strength' }, durationMin: 30 }, 80)).toBe(null);
  });
  it('minutes « cœur » : une minute intense compte double (OMS)', () => {
    const s = base(null);
    s.quests = [walkQuest([
      { id: 'a', date: MONDAY, durationMin: 30, calories: 120 },
      { id: 'b', date: '2026-11-11', durationMin: 20, calories: 200 },
    ])];
    const w = heartWeek(s, MONDAY);
    expect(w).toMatchObject({ moderate: 30, vigorous: 20, points: 70, sessions: 2 });
    const hb = heartBalance(s, '2026-11-12');
    expect(hb.status).toBe('low');
    expect(hb.band.good).toBe(150);
  });
  it('objectif perte de poids : repère à 250 min (ACSM 2009)', () => {
    expect(heartBalance(base({ on: true, goal: 'weight' }), MONDAY).band.good).toBe(250);
  });
});

describe('séances proposées', () => {
  it('endurance, 3 séances, coureur : fractionné + sortie longue + facile (surtout facile)', () => {
    const s = base({ on: true, goal: 'endurance', perWeek: 3, kinds: ['run'], runner: true });
    expect(cardioWeekTypes(s).sort()).toEqual(['easy', 'interval', 'long']);
  });
  it('marche seule : pas de fractionné', () => {
    const s = base({ on: true, goal: 'weight', perWeek: 4, kinds: ['walk'] });
    expect(cardioWeekTypes(s)).not.toContain('interval');
  });
  it('débutant en course : alternance course / marche, palier suivant après 3 séances réussies', () => {
    const s = base({ on: true, goal: 'health', perWeek: 3, kinds: ['run'] });
    expect(canRun(s)).toBe(false);
    const ses = cardioSession(s, 'easy', MONDAY);
    expect(ses.type).toBe('runwalk');
    expect(ses.steps.filter(x => x.run)).toHaveLength(RUNWALK_STAGES[0].reps);
    const runs = [1, 2, 3].map(i => ({ id: `r${i}`, date: `2026-11-0${i}`, durationMin: 28, calories: 200, rpe: 6, cardioPlan: { type: 'runwalk', stage: 0 } }));
    s.quests = [{ id: 'qr', catalogId: 'running_endurance', type: 'cardio', unit: 'km', history: runs }];
    expect(runwalkStage(s)).toBe(1);
  });
  it('fractionné 4 × 4 min avec la zone cardiaque', () => {
    const s = base({ on: true, goal: 'endurance', perWeek: 2, kinds: ['bike'] });
    const ses = cardioSession(s, 'interval', MONDAY);
    expect(ses.steps.filter(x => x.zone === 'hard')).toHaveLength(4);
    expect(ses.minutes).toBe(10 + 16 + 9 + 5);
    expect(ses.zones.find(z => z.zone === 'hard').text).toMatch(/^168-178 battements/);
  });
});

describe('placement dans la semaine', () => {
  it('d’abord les jours sans muscu, pas les jours de sport', () => {
    const s = base({ on: true, goal: 'health', perWeek: 2, kinds: ['walk'] }, { volleyDays: [4] });
    const w = cardioPlanWeek(s, MONDAY, MONDAY, ['2026-11-09', '2026-11-11', '2026-11-13']);
    expect(w.sessions).toHaveLength(2);
    w.sessions.forEach(x => {
      expect(['2026-11-09', '2026-11-11', '2026-11-13', '2026-11-12']).not.toContain(x.iso);
      expect(x.withGym).toBe(false);
    });
  });
  it('une séance de cardio déjà faite compte dans la semaine', () => {
    const s = base({ on: true, goal: 'health', perWeek: 2, kinds: ['walk'] });
    s.quests = [walkQuest([{ id: 'a', date: MONDAY, durationMin: 40, calories: 150 }])];
    const w = cardioPlanWeek(s, MONDAY, '2026-11-10', []);
    expect(w.done).toHaveLength(1);
    expect(w.sessions).toHaveLength(1);
  });
  it('désactivé : rien', () => {
    expect(cardioPlanWeek(base(null), MONDAY, MONDAY, []).sessions).toEqual([]);
  });
});

describe('enregistrement', () => {
  it('crée l’exercice de marche avec une distance estimée et des calories ACSM', () => {
    const s = base({ on: true, kinds: ['walk'] });
    const ses = cardioSession(s, 'easy', MONDAY);
    const { state, entry } = applyCardioSession(s, ses, { durationMin: 30, rpe: 6, date: MONDAY, catalog: EXERCISE_CATALOG, calc: calculateCardioCalories });
    const q = state.quests.find(x => x.catalogId === 'brisk_walk');
    expect(q.history).toHaveLength(1);
    expect(entry.distanceKm).toBeGreaterThan(2);
    expect(entry.calories).toBeGreaterThan(50);
    expect(entry.cardioPlan.type).toBe('easy');
    expect(entryHeart({ ...entry, quest: q }, 80).level).not.toBe('light');
  });
});

describe('vitesses à adopter (sans montre cardio)', () => {
  it('VDOT de Daniels : 5 km en 30 min ≈ 30, allure facile vers 7-8 km/h', async () => {
    const { vdotFrom, speedAt, paceText, RUN_PACES } = await import('./cardio');
    const v = vdotFrom(5, 30);
    expect(v).toBeGreaterThan(29);
    expect(v).toBeLessThan(32);
    expect(speedAt(v, RUN_PACES.easy[0])).toBeGreaterThan(6.8);
    expect(speedAt(v, RUN_PACES.easy[1])).toBeLessThan(8.2);
    expect(speedAt(v, RUN_PACES.hard[1])).toBeGreaterThan(9.5);
    expect(paceText(10)).toBe("6'00/km");
    expect(vdotFrom(0.5, 3)).toBe(null);
  });
  it('séance de course avec référence : vitesse, allure et distance par étape', () => {
    const s = base({ on: true, goal: 'endurance', perWeek: 2, kinds: ['run'], runner: true, ref: { km: 5, min: 25 } });
    const ses = cardioSession(s, 'easy', MONDAY);
    const main = ses.steps.find(x => x.zone === 'easy');
    expect(main.target.speed[0]).toBeGreaterThan(7.5);
    expect(main.target.text).toMatch(/km\/h \(\d'\d\d\/km à \d'\d\d\/km\)/);
    expect(main.km).toBeGreaterThan(2);
    expect(ses.distanceText).toMatch(/^≈ \d/);
    const iv = cardioSession(s, 'interval', MONDAY).steps.find(x => x.zone === 'hard');
    expect(iv.target.speed[0]).toBeGreaterThan(main.target.speed[1]);
  });
  it('la meilleure course mesurée sert de référence ; une distance estimée non', async () => {
    const { runRef } = await import('./cardio');
    const s = base({ on: true, kinds: ['run'], runner: true });
    s.quests = [{ id: 'r', catalogId: 'running_endurance', type: 'cardio', unit: 'km', cardioMode: 'run', history: [
      { id: 'a', date: '2026-11-01', distanceKm: 6, durationMin: 36 },
      { id: 'b', date: '2026-11-02', distanceKm: 8, durationMin: 36, estimated: true },
    ] }];
    expect(runRef(s, MONDAY)).toMatchObject({ source: 'history', km: 6 });
  });
  it('marche : vitesse et au moins 100 pas par minute', () => {
    const ses = cardioSession(base({ on: true, kinds: ['walk'] }), 'easy', MONDAY);
    const main = ses.steps.find(x => x.zone === 'easy');
    expect(main.target.cue).toContain('100 pas');
    expect(main.target.speed).toEqual([5.5, 6]);
  });
  it('course sans référence : guidée au souffle', () => {
    const ses = cardioSession(base({ on: true, kinds: ['run'], runner: true }), 'easy', MONDAY);
    expect(ses.steps.find(x => x.zone === 'easy').target.cue).toContain('parler');
  });
});
