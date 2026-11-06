import { describe, expect, it } from 'vitest';
import { applyWorkoutImport, csvDate, matchExercise, readWorkoutCsv } from './importCsv';
import { makeQuestFromCatalog } from './questFactory';
import { questAfterHistoryChange } from './history';
import { calculateStrengthCalories } from './calories';

const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Push","15 Jan 2026, 18:30","15 Jan 2026, 19:40","","Bench Press (Barbell)","","","0","warmup","40","10","","",""
"Push","15 Jan 2026, 18:30","15 Jan 2026, 19:40","","Bench Press (Barbell)","","","1","normal","80","6","","","8"
"Push","15 Jan 2026, 18:30","15 Jan 2026, 19:40","","Bench Press (Barbell)","","","2","normal","80","6","","","8"
"Push","15 Jan 2026, 18:30","15 Jan 2026, 19:40","","Pull Up (Weighted)","","","0","normal","10","6","","",""
"Push","15 Jan 2026, 18:30","15 Jan 2026, 19:40","","Plank","","","0","normal","","","","60",""
"Push","15 Jan 2026, 18:30","15 Jan 2026, 19:40","","Zercher Lunge Cyclone","","","0","normal","20","8","","",""
"Legs","17 Jan 2026, 18:30","17 Jan 2026, 19:40","","Squat (Barbell)","","","0","normal","100","5","","",""`;

const STRONG = `Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE
2026-02-01 10:00:00;Jambes;1h;Squat (Barbell);1;220;5;0;0;;;
2026-02-01 10:00:00;Jambes;1h;Leg Extension (Machine);1;100;12;0;0;;;`;

describe('import Hevy / Strong', () => {
  it('reconnaît les noms anglais standard', () => {
    expect(matchExercise('Bench Press (Barbell)')).toBe('bench_press');
    expect(matchExercise('Lat Pulldown (Cable)')).toBe('lat_pulldown');
    expect(matchExercise('Romanian Deadlift (Dumbbell)')).toBe('fp_rdl');
    expect(matchExercise('Développé Couché Barre')).toBe('bench_press');
    expect(matchExercise('Zercher Lunge Cyclone')).toBeNull();
  });
  it('lit les dates des deux applis', () => {
    expect(csvDate('15 Jan 2026, 18:30')).toBe('2026-01-15');
    expect(csvDate('2026-02-01 10:00:00')).toBe('2026-02-01');
    expect(csvDate('Feb 3, 2026 7:00 PM')).toBe('2026-02-03');
  });
  it('lit un export Hevy : échauffements ignorés, noms inconnus listés', () => {
    const r = readWorkoutCsv(HEVY);
    expect(r.source).toBe('Hevy');
    expect(r.sessions).toBe(2);
    const bench = r.exercises.find(e => e.catalogId === 'bench_press');
    expect(bench.sessions[0].sets).toHaveLength(2);
    expect(r.unknown).toEqual(['Zercher Lunge Cyclone']);
  });
  it('lit un export Strong en livres', () => {
    const r = readWorkoutCsv(STRONG, { lbs: true });
    expect(r.source).toBe('Strong');
    expect(r.exercises.find(e => e.catalogId === 'squat').sessions[0].sets[0].kg).toBe(99.75);
  });
  it('ajoute les séances aux exercices, sans doublon si on réimporte', () => {
    const deps = { makeQuest: makeQuestFromCatalog, afterHistory: questAfterHistoryChange, calories: calculateStrengthCalories };
    const base = { quests: [], userWeightKg: 80 };
    const read = readWorkoutCsv(HEVY);
    const a = applyWorkoutImport(base, read, '2026-11-06', deps);
    expect(a.created).toBe(4);
    const bench = a.state.quests.find(q => q.catalogId === 'bench_press');
    const e = bench.history.find(h => h.date === '2026-01-15' && !String(h.note).startsWith('Point'));
    expect(e.setDetails).toEqual([6, 6]);
    expect(e.value).toBe(80);
    expect(bench.currentValue).toBe(80);
    const pull = a.state.quests.find(q => q.catalogId === 'pullups');
    expect(pull.history.find(h => h.note === 'Importé de Hevy').assistanceKg).toBe(-10); // lest
    const plank = a.state.quests.find(q => q.catalogId === 'fp_plank');
    expect(plank.history.find(h => h.note === 'Importé de Hevy').setDetails).toEqual([60]);
    const again = applyWorkoutImport(a.state, read, '2026-11-06', deps);
    expect(again.added).toBe(0);
    expect(again.created).toBe(0);
  });
});
