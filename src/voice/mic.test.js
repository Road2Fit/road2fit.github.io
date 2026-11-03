// Micro commun : autorisation demandée d'abord, relance après un silence (Chrome / Edge sur PC), messages clairs.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { micErrorMessage, startListening } from './mic';

const tick = () => new Promise(r => setTimeout(r, 0));
let made = [];
class FakeRec {
  constructor() { made.push(this); }
  start() { setTimeout(() => this.onstart && this.onstart(), 0); }
  stop() { setTimeout(() => this.onend && this.onend(), 0); }
  say(text) { this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] }); }
}
const setup = ({ rec = FakeRec, gum = async () => ({ getTracks: () => [{ stop() {} }] }) } = {}) => {
  made = [];
  vi.stubGlobal('window', rec ? { webkitSpeechRecognition: rec } : {});
  vi.stubGlobal('navigator', { userAgent: 'Chrome', mediaDevices: { getUserMedia: gum } });
};
afterEach(() => vi.unstubAllGlobals());

describe('micro', () => {
  it('demande le micro, écoute, et relance après un silence jusqu’à « Stop »', async () => {
    setup();
    const got = [];
    let ended = 0;
    const ctl = startListening({ onFinal: t => got.push(t), onEnd: () => ended++ });
    await tick(); await tick();
    expect(made).toHaveLength(1);
    made[0].say('squat 4 fois 8');
    made[0].onend(); // Chrome s'arrête tout seul après un silence
    await tick();
    expect(made).toHaveLength(2); // relancé
    expect(ended).toBe(0);
    made[1].say('à 80 kilos');
    ctl.stop();
    await tick();
    expect(got).toEqual(['squat 4 fois 8', 'à 80 kilos']);
    expect(ended).toBe(1);
    expect(made).toHaveLength(2);
  });
  it('micro bloqué : message qui explique comment l’autoriser, sans lancer la reconnaissance', async () => {
    setup({ gum: async () => { throw Object.assign(new Error('x'), { name: 'NotAllowedError' }); } });
    const errs = [];
    let ended = 0;
    startListening({ onError: m => errs.push(m), onEnd: () => ended++ });
    await tick(); await tick();
    expect(errs[0]).toContain('cadenas');
    expect(made).toHaveLength(0);
    expect(ended).toBe(1);
  });
  it('navigateur sans reconnaissance vocale : il le dit et propose Chrome / Edge ou Windows + H', () => {
    setup({ rec: null });
    const errs = [];
    startListening({ onError: m => errs.push(m), onEnd: () => {} });
    expect(errs[0]).toContain('Windows + H');
  });
  it('Opera GX : message tout de suite, sans demander le micro pour rien', () => {
    let asked = 0;
    made = [];
    vi.stubGlobal('window', { webkitSpeechRecognition: FakeRec });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/130 Safari/537.36 OPR/115.0 (Edition GX)', mediaDevices: { getUserMedia: async () => { asked++; return { getTracks: () => [] }; } } });
    const errs = [];
    startListening({ onError: m => errs.push(m), onEnd: () => {} });
    expect(errs[0]).toContain('Opera GX');
    expect(asked).toBe(0);
    expect(made).toHaveLength(0);
  });
  it('erreur réseau de la reconnaissance (Brave, Opera…) : message clair ; le silence n’est pas une erreur', async () => {
    expect(micErrorMessage('network')).toContain('Chrome ou Edge');
    expect(micErrorMessage('no-speech')).toBe('');
    setup();
    const errs = [];
    let ended = 0;
    startListening({ onError: m => errs.push(m), onEnd: () => ended++ });
    await tick(); await tick();
    made[0].onerror({ error: 'no-speech' });
    expect(errs).toEqual([]);
    made[0].onerror({ error: 'network' });
    expect(errs[0]).toContain('Chrome ou Edge');
    expect(ended).toBe(1);
  });
});
