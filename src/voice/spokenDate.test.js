// Date dite dans la dictée : la séance est notée au bon jour.
import { describe, expect, it } from 'vitest';
import { spokenDate } from './spokenDate';
import { parseSpokenWorkout } from './parser';

const TODAY = '2026-11-07'; // samedi
const d = t => (spokenDate(t, TODAY) || {}).date || null;

describe('date dite dans la dictée', () => {
  it('hier, avant-hier, il y a N jours', () => {
    expect(d('hier j’ai fait 2 heures de volley')).toBe('2026-11-06');
    expect(d('Avant-hier 1h30 de volley')).toBe('2026-11-05');
    expect(d('avant hier course')).toBe('2026-11-05');
    expect(d('il y a trois jours squat')).toBe('2026-11-04');
    expect(d('il y a 10 jours')).toBe('2026-10-28');
  });
  it('jour de la semaine : le plus récent, jamais dans le futur', () => {
    expect(d('mardi j’ai couru')).toBe('2026-11-03');
    expect(d('samedi dernier volley')).toBe('2026-10-31');
    expect(d('samedi volley')).toBe(TODAY);
  });
  it('date précise', () => {
    expect(d('le 3 novembre 45 minutes de course')).toBe('2026-11-03');
    expect(d('le premier novembre')).toBe('2026-11-01');
    expect(d('le 2/11 natation')).toBe('2026-11-02');
    expect(d('le 28 décembre')).toBe('2025-12-28');
  });
  it('rien de dit : pas de date', () => {
    expect(spokenDate('développé couché 3x8 60 kg', TODAY)).toBe(null);
  });
  it('durées « 1h30 », « 2 heures et demie »', () => {
    const dur = t => parseSpokenWorkout(t, [], 80)[0].durationMin;
    expect(dur('1h30 de volley')).toBe(90);
    expect(dur('2 heures et demie de volley')).toBe(150);
    expect(dur('2 heures de volley')).toBe(120);
    expect(dur('45 minutes de course')).toBe(45);
  });
});
