// Argot de la salle : traduit avant la lecture, sans casser les noms d'exercices précis.
import { describe, expect, it } from 'vitest';
import { normalizeSlang, searchSlang, slangText, SLANG } from './slang';
import { parseProgramLine } from '../coach/program';
import { parseSpokenWorkout } from '../voice/parser';

describe('argot de la salle', () => {
  it('traduit abréviations, anglicismes, disques et notations', () => {
    expect(normalizeSlang('3x5 dc à 2 plaques de chaque côté @8')).toBe('3x5 developpe couche barre a 100 kg rpe 8');
    expect(normalizeSlang('rdl 3x8 100 kilos')).toContain('souleve de terre roumain');
    expect(normalizeSlang('ohp 5x5')).toContain('developpe militaire');
    expect(normalizeSlang('élév lat 3x15 à l’échec')).toBe('elevations laterales 3x15 rir 0');
    expect(normalizeSlang('squat barre à vide 2x10')).toContain('20 kg');
  });
  it('ne change pas les noms précis (curl incliné, dips machine, crunch machine…)', () => {
    for (const t of ['curl incliné 3x10', 'dips machine assise 3x10', 'crunch machine 3x15', 'presse à cuisses horizontale 4x10', 'barre au front 3x10']) {
      expect(normalizeSlang(t)).toBe(normalizeSlang(t).toLowerCase()); // juste minuscules / sans accents
      expect(normalizeSlang(t)).not.toMatch(/barres paralleles|au sol|developpe/);
    }
  });
  it('compris par la saisie de programme et la dictée', () => {
    expect(parseProgramLine('SDT 1x3 180kg RIR 1', []).catalogId).toBe('deadlift');
    expect(parseProgramLine('RDL 3x8 100kg', []).catalogId).toBe('fp_rdl');
    expect(parseProgramLine('OHP 5x5 60kg', []).catalogId).toBe('overhead_press');
    expect(parseProgramLine('Pull ups lestées 3x5 +20kg', [])).toMatchObject({ catalogId: 'pullups', assist: -20 });
    const d = parseSpokenWorkout('dc 3 fois 5 à 2 plaques de chaque côté', []);
    expect(d[0].catalogRef && d[0].catalogRef.id).toBe('bench_press');
    expect(d[0].weightKg).toBe(100);
  });
  it('lexique : cherchable et envoyé au coach intelligent', () => {
    expect(SLANG.length).toBeGreaterThan(150);
    expect(searchSlang('pump')[0].means).toMatch(/gonfl/);
    expect(searchSlang('RDL').length).toBeGreaterThan(0);
    expect(slangText()).toContain('dc, dév couché');
  });
});
