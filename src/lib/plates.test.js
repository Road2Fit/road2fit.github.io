import { describe, expect, it } from 'vitest';
import { isBarbell, platesFor, platesText } from './plates';

describe('calculateur de disques', () => {
  it('trouve les disques de chaque côté', () => {
    expect(platesFor(82.5).perSide).toEqual([25, 5, 1.25]);
    expect(platesFor(100).perSide).toEqual([25, 15]);
    expect(platesFor(140).perSide).toEqual([25, 25, 10]);
    expect(platesFor(20).perSide).toEqual([]);
    expect(platesFor(15)).toBeNull();
  });
  it('signale ce qui ne se fait pas avec les disques courants', () => {
    expect(platesFor(21).rest).toBe(1);
  });
  it('texte court', () => {
    expect(platesText(82.5)).toBe('25 + 5 + 1,25 de chaque côté');
    expect(platesText(20)).toBe('barre seule');
  });
  it('reconnaît les exercices à la barre droite', () => {
    expect(isBarbell('Squat Barre')).toBe(true);
    expect(isBarbell('Développé Couché Barre')).toBe(true);
    expect(isBarbell('Soulevé de Terre')).toBe(true);
    expect(isBarbell('Curl Biceps Barre EZ')).toBe(false);
    expect(isBarbell('Squat Smith Machine')).toBe(false);
    expect(isBarbell('Développé Couché Haltères')).toBe(false);
    expect(isBarbell('Tirage Vertical Poulie Haute')).toBe(false);
  });
});
