import { describe, expect, it } from 'vitest';
import { DEMO_STATE } from '../../tests/ui/demo';
import { buildFriendProfile } from './friendProfile';

const TODAY = '2026-10-21';

describe('résumé de profil partagé avec les amis', () => {
  const state = { ...DEMO_STATE, heroName: 'Léa', userWeightKg: 82, weightHistory: [{ id: 'w', date: '2026-10-20', weightKg: 84, note: 'Pesée initiale' }] };
  const p = buildFriendProfile(state, TODAY);

  it('contient prénom, niveau, dernière séance, maxima et exercices', () => {
    expect(p.name).toBe('Léa');
    expect(p.level).toBeGreaterThanOrEqual(1);
    expect(p.lastSession.items.length).toBeGreaterThan(0);
    expect(p.lastSession.items[0].text).toMatch(/\d/);
    expect(p.exercises.length).toBe(state.quests.filter(q => q.type === 'strength' || q.type === 'cardio').length);
    expect(p.maxima.every(m => m.text)).toBe(true);
  });

  it('partage le rang par sa position (0 à 6), jamais par son nom', () => {
    expect(Number.isInteger(p.rank) && p.rank >= 0 && p.rank <= 6).toBe(true);
    expect(buildFriendProfile({ ...state, xp: 0, rankTrials: [] }, TODAY).rank).toBe(0);
    expect(buildFriendProfile({ ...state, xp: 200000, rankTrials: [4, 8, 14, 22, 35, 50] }, TODAY).rank).toBe(6);
  });

  it('ne contient jamais le poids, les photos ni les notes', () => {
    const json = JSON.stringify(p);
    expect(json).not.toMatch(/weight|poids|photo|note/i);
    expect(json).not.toContain('84');
  });

  it('le nom par défaut de l’édition Rondoudou n’est pas partagé comme prénom', () => {
    expect(buildFriendProfile({ ...state, heroName: 'Dresseur Rondoudou' }, TODAY).name).toBe('');
  });

  it('reste petit (bien sous la limite du serveur) même avec beaucoup d’exercices', () => {
    expect(JSON.stringify(p).length).toBeLessThan(20000);
  });
});

describe('maxima partagés', () => {
  it('le record réel saisi dans « Mes maxima » est partagé (avant l’estimation)', () => {
    const q = DEMO_STATE.quests.find(x => x.id === 'q_bench_3x8');
    const p = buildFriendProfile({ ...DEMO_STATE, maxRecords: { [q.id]: { kg: 92.5, date: '2026-10-20' } } }, TODAY);
    expect(p.maxima.find(m => m.name === q.name).text).toBe('92.5 kg (record)');
  });
});
