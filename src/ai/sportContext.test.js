// 4.52.1 : le coach IA voit le vrai planning de sport (annulations comprises).
import { describe, it, expect } from 'vitest';
import { coachContext } from './context';
import { INITIAL_STATE } from '../data/initialState';

describe('contexte du coach IA : sport', () => {
  it('un jour de volley annulé est dit annulé, et n’est pas dans le sport prévu', () => {
    const st = { ...INITIAL_STATE, coach: { ...(INITIAL_STATE.coach || {}), sport: 'volley', volleyDays: [4], volleySkips: ['2026-11-26'], volleyExtra: ['2026-11-28'] } };
    const ctx = coachContext(st, '2026-11-22');
    const line = ctx.split('\n').find(l => l.startsWith('Sport VRAIMENT prévu'));
    expect(line).toBeTruthy();
    const [prevu, annule] = line.split('ANNULÉ');
    expect(prevu).not.toContain('2026-11-26');
    expect(prevu).toContain('2026-12-03');
    expect(prevu).toContain('2026-11-28');
    expect(annule).toContain('2026-11-26');
  });
});
