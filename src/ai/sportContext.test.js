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

describe('action sport_dates (4.52.2)', () => {
  it('« pas de volley jeudi » : jour annulé, jambes de nouveau possibles ce jour-là et la veille', async () => {
    const { normalizeActions, applyActions } = await import('./actions');
    const { coachDayInfo } = await import('../coach/planning');
    const st = { ...INITIAL_STATE, coach: { ...(INITIAL_STATE.coach || {}), sport: 'volley', volleyDays: [4] } };
    expect(coachDayInfo('2026-11-25', st.coach).legsOk).toBe(false);
    const acts = normalizeActions([{ type: 'sport_dates', label: '', args: JSON.stringify({ remove: ['2026-11-26'] }) }], st, '2026-11-22');
    expect(acts).toHaveLength(1);
    const next = applyActions(st, acts, '2026-11-22');
    expect(next.coach.volleySkips).toEqual(['2026-11-26']);
    expect(coachDayInfo('2026-11-26', next.coach).isVolley).toBe(false);
    expect(coachDayInfo('2026-11-25', next.coach).legsOk).toBe(true);
    expect(coachDayInfo('2026-12-03', next.coach).isVolley).toBe(true);
  });
});
