import { describe, expect, it } from 'vitest';
import { sessionFocus } from './focus';

const ex = arena => ({ arena });
describe('type de séance (haut / bas / corps entier)', () => {
  it('plus de 70 % d’exercices du haut du corps : haut du corps', () => {
    expect(sessionFocus([ex('Pectoraux'), ex('Dos'), ex('Épaules & Bras'), ex('Jambes')]).id).toBe('upper'); // 75 %
  });
  it('plus de 70 % du bas : bas du corps', () => {
    expect(sessionFocus([ex('Jambes'), ex('Jambes'), ex('Jambes'), ex('Dos')]).id).toBe('lower');
  });
  it('à peu près moitié-moitié : corps entier ; 70 % pile reste corps entier', () => {
    expect(sessionFocus([ex('Pectoraux'), ex('Jambes')]).id).toBe('full');
    expect(sessionFocus([...Array(7)].map(() => ex('Dos')).concat([...Array(3)].map(() => ex('Jambes')))).id).toBe('full');
  });
  it('les abdos ne comptent pas', () => {
    expect(sessionFocus([ex('Pectoraux'), ex('Dos'), ex('Abdominaux'), ex('Abdominaux'), ex('Abdominaux')]).id).toBe('upper');
    expect(sessionFocus([ex('Abdominaux')])).toBeNull();
  });
});
