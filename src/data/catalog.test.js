import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG, normSearch } from './catalog';

describe('catalogue d’exercices', () => {
  it('identifiants et noms uniques', () => {
    const ids = EXERCISE_CATALOG.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = EXERCISE_CATALOG.map(c => normSearch(c.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it('les machines de marque sont retrouvables par leur marque', () => {
    const find = brand => EXERCISE_CATALOG.filter(c => normSearch(`${c.name} ${c.equip || ''} ${c.brands || ''}`).includes(brand));
    expect(find('technogym').length).toBeGreaterThan(20);
    expect(find('hammer').length).toBeGreaterThan(8);
    expect(find('matrix').length).toBeGreaterThan(20);
    expect(find('gym80').length).toBeGreaterThan(5);
    expect(find('bodytone').length).toBeGreaterThan(10);
  });

  it('les machines ajoutées (rotary torso, pull-over, belt squat…) existent', () => {
    const ids = ['fp_rotary_torso', 'fp_pullover_machine', 'fp_high_row', 'fp_shrug_machine', 'fp_decline_press_machine', 'fp_assisted_dip', 'fp_standing_leg_curl', 'fp_belt_squat', 'fp_deadlift_machine', 'fp_woodchop', 'fp_pallof', 'fp_treadmill', 'fp_recumbent', 'fp_climbmill'];
    for (const id of ids) expect(EXERCISE_CATALOG.some(c => c.id === id), id).toBe(true);
  });
});

describe('haltérophilie, HYROX et calisthénie (05/11/2026)', () => {
  it('les exercices se trouvent par leur nom français ou anglais', async () => {
    const { EXERCISE_CATALOG, normSearch } = await import('./catalog');
    const find = q => EXERCISE_CATALOG.filter(c => normSearch(c.name).includes(normSearch(q))).map(c => c.id);
    expect(find('épaulé jeté').concat(find('epaule-jete'))).toContain('wl_clean_jerk');
    expect(find('clean & jerk')).toContain('wl_clean_jerk');
    expect(find('arraché')).toContain('wl_snatch');
    expect(find('traîneau')).toEqual(expect.arrayContaining(['hx_sled_push', 'hx_sled_pull']));
    expect(find('muscle-up')).toEqual(expect.arrayContaining(['cal_muscle_up', 'cal_ring_muscle_up']));
    expect(find('front lever')).toContain('cal_front_lever');
    const ids = new Set(EXERCISE_CATALOG.map(c => c.id));
    expect(ids.size).toBe(EXERCISE_CATALOG.length); // pas de doublon
  });
});
