import { describe, it, expect } from 'vitest';
import { analyzeSet, liveCount, detectReps, bodyVisible } from './analyze';
import { patternFor, PATTERNS, familyPatternMap } from './patterns';
import { timeline, makeFrames, squatBody, curlBody, pushUpBody, frontSquatLm, plankBody, sideBody, toLandmarks, pullUpBody, frontRaiseLm } from './synth';
import { EXERCISE_CATALOG } from '../data/catalog';
import { FAMILIES } from '../anim/info';

const LAND = 16 / 9;
const ids = res => res.findings.map(f => `${f.level}:${f.id}`);

describe('modèles de mouvement', () => {
  it('chaque exercice de musculation du catalogue a un modèle (pas de cardio)', () => {
    const strength = EXERCISE_CATALOG.filter(c => c.type !== 'cardio');
    expect(strength.length).toBeGreaterThan(150);
    for (const c of strength) {
      const p = patternFor({ catalogId: c.id, name: c.name });
      expect(PATTERNS[p.id], c.id).toBeTruthy();
      expect(p.family, c.id).toBeTruthy();
    }
    for (const f of Object.keys(FAMILIES)) expect(familyPatternMap[f], f).toBeTruthy();
  });
  it('reconnaît un exercice perso par son nom', () => {
    expect(patternFor({ name: 'Squat barre haute' }).id).toBe('squat');
    expect(patternFor({ name: 'Curl haltères' }).id).toBe('curl');
    expect(patternFor({ name: 'Truc inventé' }).id).toBe('generic');
    expect(patternFor({ name: 'Truc inventé', timed: true }).id).toBe('holdOnly');
  });
});

describe('comptage des répétitions', () => {
  it('signal simple : 4 creux = 4 reps, les petits tremblements ne comptent pas', () => {
    const t = [], s = [];
    for (let i = 0; i < 400; i++) { t.push(i / 30); s.push(170 - 90 * Math.max(0, Math.sin(i / 400 * 4 * 2 * Math.PI)) + (i % 7 === 0 ? 3 : 0)); }
    expect(detectReps(t, s, { rest: 'hi', min: 30 }).reps.length).toBe(4);
  });
  it('pas de rep si l’amplitude est trop faible', () => {
    const t = Array.from({ length: 200 }, (_, i) => i / 30);
    const s = t.map(x => 170 + 5 * Math.sin(x * 3));
    expect(detectReps(t, s, { rest: 'hi', min: 30 }).reps.length).toBe(0);
  });
});

describe('squat de profil', () => {
  const P = patternFor({ catalogId: 'squat', name: 'Squat' });
  it('modèle squat', () => expect(P.id).toBe('squat'));
  it('compte 6 reps, mesure le tempo, profondeur OK', () => {
    const fr = makeFrames(timeline({ reps: 6, p1: 1.6, p2: 0.9 }), d => squatBody(d), { noise: 0.002 });
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(res.ok).toBe(true);
    expect(res.view).toBe('side');
    expect(res.repCount).toBe(6);
    expect(res.tempo.ecc).toBeGreaterThan(1.1);
    expect(res.tempo.ecc).toBeLessThan(2.1);
    expect(res.tempo.con).toBeGreaterThan(0.6);
    expect(res.tempo.con).toBeLessThan(1.3);
    expect(ids(res)).toContain('good:depth');
    expect(ids(res).some(x => x.startsWith('warn'))).toBe(false);
    expect(res.summary).toMatch(/6 reps · descente 1,\d s · montée [01],\d s/);
    expect(liveCount(fr, P, { aspect: 9 / 16 })).toBe(6);
  });
  it('squat trop haut → retour « squat partiel » avec une correction', () => {
    const fr = makeFrames(timeline({ reps: 5 }), d => squatBody(d, { depth: 0.5 }));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(res.repCount).toBe(5);
    const f = res.findings.find(x => x.id === 'depth');
    expect(f.level).toBe('warn');
    expect(f.fix).toMatch(/Descends/);
    expect(res.verdict).not.toBe('Propre');
  });
  it('buste qui plonge et fesses qui remontent en premier', () => {
    const fr = makeFrames(timeline({ reps: 5 }), d => squatBody(d, { lean: 70 }));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(ids(res)).toContain('warn:trunk');
  });
  it('descente trop rapide → conseil de tempo ; vitesse qui chute → proche de l’échec', () => {
    const fr = makeFrames(timeline({ reps: 6, p1: 0.45, p2: i => (i < 3 ? 0.7 : 0.7 + (i - 2) * 0.35), holdTurn: 0 }), d => squatBody(d));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(res.repCount).toBe(6);
    expect(ids(res)).toContain('tip:tempo');
    expect(ids(res)).toContain('info:speed');
    expect(res.findings.find(x => x.id === 'speed').title).toMatch(/limite/);
  });
  it('dernières reps moins profondes → amplitude qui baisse', () => {
    const fr = makeFrames(timeline({ reps: 6, depth: i => (i < 4 ? 1 : 0.55) }), d => squatBody(d));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(ids(res)).toContain('tip:fade');
  });
  it('la personne qui s’approche du téléphone à la fin ne fausse pas le compte', () => {
    const tl = timeline({ reps: 4, tail: 0.2 });
    const fr = makeFrames(tl, d => squatBody(d));
    const last = fr[fr.length - 1].t;
    for (let i = 1; i <= 30; i++) {
      const b = sideBody({ x0: 0.3, trunk: 60, thigh: -60, shin: 20 });
      const big = toLandmarks(b).map(p => ({ ...p, x: 0.5 + (p.x - 0.5) * 2.2, y: 0.5 + (p.y - 0.5) * 2.2 }));
      fr.push({ t: last + i * 33, lm: big });
    }
    expect(analyzeSet(fr, P, { aspect: 9 / 16 }).repCount).toBe(4);
  });
});

describe('squat de face (repères 3D)', () => {
  const P = patternFor({ catalogId: 'squat', name: 'Squat' });
  it('genoux qui rentrent → alerte valgus', () => {
    const fr = makeFrames(timeline({ reps: 5 }), d => frontSquatLm(d, { valgus: 0.8 }));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(res.view).toBe('front');
    expect(res.repCount).toBe(5);
    expect(ids(res)).toContain('warn:valgus');
    expect(ids(res)).toContain('info:view');
  });
  it('genoux dans l’axe → bon point, profondeur mesurée en 3D', () => {
    const fr = makeFrames(timeline({ reps: 5 }), d => frontSquatLm(d));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(ids(res)).toContain('good:valgus');
    expect(ids(res)).toContain('good:depth');
  });
});

describe('curl', () => {
  const P = patternFor({ catalogId: 'fp_db_curl', name: 'Curl haltères' });
  it('8 reps propres', () => {
    const fr = makeFrames(timeline({ reps: 8, p1: 0.9, p2: 1.4 }), d => curlBody(d), { noise: 0.002 });
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(res.repCount).toBe(8);
    expect(res.findings.filter(f => f.level === 'warn' || f.level === 'tip')).toEqual([]);
    expect(res.verdict).toBe('Propre');
  });
  it('élan avec le buste et coudes qui avancent', () => {
    const fr = makeFrames(timeline({ reps: 6 }), d => curlBody(d, { swing: 25, drift: 40 }));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(res.repCount).toBe(6);
    expect(ids(res)).toContain('warn:swing');
    expect(ids(res)).toContain('tip:elbows');
  });
  it('demi-reps en haut', () => {
    const fr = makeFrames(timeline({ reps: 6 }), d => curlBody(d, { top: 80 }));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(ids(res)).toContain('tip:top');
  });
});

describe('tractions', () => {
  const P = patternFor({ catalogId: 'pullups', name: 'Tractions' });
  it('menton au-dessus de la barre, bras tendus en bas', () => {
    const fr = makeFrames(timeline({ reps: 6, p1: 1, p2: 1.4 }), d => pullUpBody(d), { noise: 0.002 });
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(res.repCount).toBe(6);
    expect(ids(res)).toContain('good:chin');
    expect(ids(res)).not.toContain('tip:hang');
  });
  it('demi-tractions : menton sous la barre', () => {
    const fr = makeFrames(timeline({ reps: 6 }), d => pullUpBody(d, { top: 95 }));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(res.repCount).toBe(6);
    expect(ids(res)).toContain('warn:chin');
  });
  it('élan des jambes (kipping)', () => {
    const fr = makeFrames(timeline({ reps: 5 }), d => pullUpBody(d, { kip: 50 }));
    expect(ids(analyzeSet(fr, P, { aspect: 9 / 16 }))).toContain('tip:kip');
  });
});

describe('élévations latérales (de face)', () => {
  const P = patternFor({ catalogId: 'fp_lateral_db', name: 'Élévations latérales' });
  it('bonne hauteur, compte juste', () => {
    const fr = makeFrames(timeline({ reps: 12, p1: 0.9, p2: 1.3 }), d => frontRaiseLm(d));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(res.view).toBe('front');
    expect(res.repCount).toBe(12);
    expect(ids(res)).toContain('good:top');
    expect(res.viewOk).toBe(true);
  });
  it('bras gauche plus bas, bras au-dessus des épaules, élan du buste', () => {
    const fr = makeFrames(timeline({ reps: 8 }), d => frontRaiseLm(d, { topL: 105, topR: 130, swing: 30 }));
    const res = analyzeSet(fr, P, { aspect: 9 / 16 });
    expect(ids(res)).toContain('tip:sym');
    expect(res.findings.find(f => f.id === 'sym').detail).toMatch(/gauche/);
    expect(ids(res)).toContain('tip:top');
    expect(ids(res).some(x => /:swing$/.test(x))).toBe(true);
  });
});

describe('pompes (vidéo en paysage)', () => {
  const P = patternFor({ catalogId: 'pushups', name: 'Pompes' });
  it('modèle pompe', () => expect(P.id).toBe('pushUp'));
  it('10 pompes gainées', () => {
    const fr = makeFrames(timeline({ reps: 10, p1: 1, p2: 0.8 }), d => pushUpBody(d), { aspect: LAND, noise: 0.002 });
    const res = analyzeSet(fr, P, { aspect: LAND });
    expect(res.repCount).toBe(10);
    expect(ids(res)).toContain('good:line');
    expect(ids(res)).toContain('good:depth');
  });
  it('bassin qui s’affaisse et pompes trop hautes', () => {
    const fr = makeFrames(timeline({ reps: 6 }), d => pushUpBody(d, { sag: 0.3, bottom: 135 }), { aspect: LAND });
    const res = analyzeSet(fr, P, { aspect: LAND });
    expect(res.repCount).toBe(6);
    expect(ids(res)).toContain('warn:line');
    expect(ids(res)).toContain('warn:depth');
  });
});

describe('gainage', () => {
  const P = patternFor({ catalogId: 'fp_plank', name: 'Planche' });
  it('mesure la durée de tenue et l’alignement', () => {
    const tl = timeline({ reps: 0, lead: 20, tail: 0 });
    const res = analyzeSet(makeFrames(tl, () => plankBody(0), { aspect: LAND }), P, { aspect: LAND });
    expect(P.iso).toBe(true);
    expect(res.ok).toBe(true);
    expect(res.holdSec).toBeGreaterThanOrEqual(19);
    expect(ids(res)).toContain('good:line');
  });
  it('bassin qui descend', () => {
    const tl = timeline({ reps: 0, lead: 15, tail: 0 });
    const res = analyzeSet(makeFrames(tl, () => plankBody(0.35), { aspect: LAND }), P, { aspect: LAND });
    expect(ids(res)).toContain('warn:line');
  });
});

describe('cas limites', () => {
  const P = patternFor({ catalogId: 'squat', name: 'Squat' });
  it('personne absente', () => {
    const res = analyzeSet(Array.from({ length: 60 }, (_, i) => ({ t: i * 33, lm: null })), P, {});
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('nobody');
    expect(res.tips.length).toBeGreaterThan(0);
  });
  it('immobile : pas de rep', () => {
    const res = analyzeSet(makeFrames(timeline({ reps: 0, lead: 5 }), () => squatBody(0)), P, { aspect: 9 / 16 });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('nomove');
  });
  it('corps visible : démarrage auto', () => {
    const lm = toLandmarks(squatBody(0));
    expect(bodyVisible(lm, P)).toBe(true);
    const cut = lm.map((p, i) => (i === 27 || i === 28 ? { ...p, y: 1.2 } : p));
    expect(bodyVisible(cut, P)).toBe(false);
  });
});
