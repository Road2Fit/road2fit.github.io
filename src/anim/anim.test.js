import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG } from '../data/catalog';
import { ALL_SCENES } from './registry';
import { SEG, ik, poseAt, solveFront, solvePose, solveTop } from './skeleton';

const strength = EXERCISE_CATALOG.filter(c => c.type === 'strength');

describe('cinématique du bonhomme', () => {
  it('le coude / genou reste à la bonne distance des deux extrémités', () => {
    const r = ik([0, 0], [30, 30], SEG.uarm, SEG.farm, 1);
    expect(Math.hypot(r.mid[0], r.mid[1])).toBeCloseTo(SEG.uarm, 3);
    expect(Math.hypot(r.end[0] - r.mid[0], r.end[1] - r.mid[1])).toBeCloseTo(SEG.farm, 3);
  });
  it('une cible trop loin est ramenée à la portée maximale', () => {
    const r = ik([0, 0], [200, 0], 28, 26, 1);
    expect(r.end[0]).toBeLessThanOrEqual(54);
  });
  it('les deux côtés de pliage donnent des coudes symétriques', () => {
    const a = ik([0, 0], [40, 0], 28, 26, 1).mid;
    const b = ik([0, 0], [40, 0], 28, 26, -1).mid;
    expect(a[0]).toBeCloseTo(b[0], 3);
    expect(a[1]).toBeCloseTo(-b[1], 3);
  });
});

describe('animations des exercices', () => {
  it('chaque exercice de musculation du catalogue a son animation', () => {
    const have = new Set(ALL_SCENES.map(s => s.id));
    expect(strength.filter(c => !have.has(c.id)).map(c => c.id)).toEqual([]);
  });

  it('aucune animation n’utilise un identifiant inconnu ou en double', () => {
    const ids = ALL_SCENES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const known = new Set(EXERCISE_CATALOG.map(c => c.id));
    expect(ids.filter(i => !known.has(i))).toEqual([]);
  });

  it('toutes les poses sont calculables (aucun nombre invalide) du début à la fin', () => {
    for (const s of ALL_SCENES) {
      expect(s.scene.keys.length, s.id).toBeGreaterThanOrEqual(2);
      for (let i = 0; i <= 20; i++) {
        const pose = poseAt(s.scene.keys, i / 20);
        const pts = s.scene.view === 'front'
          ? (() => { const f = solveFront(pose); return [f.R.elbow, f.R.wrist, f.R.knee, f.R.ankle, f.L.wrist, f.headC]; })()
          : Object.values(solvePose(pose)).filter(Array.isArray);
        for (const p of pts) {
          expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), `${s.id} u=${i / 20}`).toBe(true);
        }
      }
    }
  });

  it('les vues de face / de dos sont aussi calculables et nombreuses', () => {
    let n = 0;
    for (const s of ALL_SCENES) {
      for (const a of s.alts) {
        n++;
        expect(['front', 'top'], s.id + ' ' + a.key).toContain(a.scene.view);
        for (let i = 0; i <= 20; i++) {
          const f = a.scene.view === 'top' ? { ...solveTop(poseAt(a.scene.keys, i / 20)), headC: solveTop(poseAt(a.scene.keys, i / 20)).head } : solveFront(poseAt(a.scene.keys, i / 20));
          if (a.scene.view === 'top') { for (const p of [f.R.elbow, f.R.wrist, f.L.wrist, f.L.elbow, f.headC]) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), s.id + ' ' + a.key).toBe(true); continue; }
          for (const p of [f.R.elbow, f.R.wrist, f.L.wrist, f.L.elbow, f.R.ankle, f.headC]) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), s.id + ' ' + a.key).toBe(true);
        }
      }
    }
    expect(n).toBeGreaterThan(40);
  });

  it('les pieds / mains qui doivent toucher le sol ne le traversent pas (tolérance 6 px)', () => {
    for (const s of ALL_SCENES) {
      if (s.scene.view === 'front') continue;
      for (let i = 0; i <= 10; i++) {
        const j = solvePose(poseAt(s.scene.keys, i / 10));
        for (const k of ['ankle', 'toe', 'knee', 'hip']) expect(j[k][1], `${s.id} ${k}`).toBeLessThan(206);
      }
    }
  });
});

describe('conseils écrits', () => {
  it('chaque exercice de musculation a ses explications complètes', async () => {
    const { FAMILIES, INFO_FAMILY } = await import('./info');
    for (const c of strength) {
      const f = FAMILIES[INFO_FAMILY[c.id]];
      expect(f, c.id).toBeTruthy();
      expect(f.m && f.s.length && f.g.length && f.e.length && f.p.length === 2, c.id).toBeTruthy();
    }
  });

  it('les exercices personnalisés sont reconnus par leur nom', async () => {
    const { animationIdFor } = await import('./resolve');
    expect(animationIdFor({ name: 'Développé Couché Barre' })).toBe('bench_press');
    expect(animationIdFor({ name: 'Squat gobelet' })).toBe('fp_goblet');
    expect(animationIdFor({ name: 'Tractions lestées' })).toBe('pullups');
    expect(animationIdFor({ name: 'Planche' })).toBe('fp_plank');
    expect(animationIdFor({ name: 'Danse du robot' })).toBeNull();
    expect(animationIdFor({ catalogId: 'fp_rdl', name: 'autre' })).toBe('fp_rdl');
  });
});

describe('précision des animations (validateur automatique)', () => {
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  it('les mains et les pieds posés sur une cible (barre, poignée, plateau, sol) l’atteignent réellement (6 px)', () => {
    const bad = [];
    for (const s of ALL_SCENES) {
      const views = [{ name: s.id, scene: s.scene }, ...s.alts.map(a => ({ name: `${s.id}#${a.key}`, scene: a.scene }))];
      for (const v of views) {
        let mh = 0;
        let mf = 0;
        for (let i = 0; i <= 10; i++) {
          const pose = poseAt(v.scene.keys, i / 10);
          const j = v.scene.view === 'front' ? solveFront(pose).R : v.scene.view === 'top' ? solveTop(pose).R : solvePose(pose);
          if (pose.hand) mh = Math.max(mh, d(j.wrist, pose.hand));
          if (pose.foot) mf = Math.max(mf, d(j.ankle, pose.foot));
        }
        if (mh > 6 || mf > 6) bad.push(`${v.name} main=${mh.toFixed(0)} pied=${mf.toFixed(0)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('muscles colorés', () => {
  it('chaque exercice animé a au moins un muscle reconnu, le premier cité est le principal', async () => {
    const { musclesOf } = await import('./muscles');
    const { movementFor } = await import('./resolve');
    expect(musclesOf('Pectoraux, triceps, avant des épaules')[0]).toEqual({ z: 'chest', lvl: 1 });
    const sans = [];
    for (const s of ALL_SCENES) {
      const info = movementFor(s.id)?.info;
      if (info && musclesOf(info.m).length === 0) sans.push(`${s.id}: ${info.m}`);
    }
    expect(sans).toEqual([]);
  });
});

describe('respiration : on expire pendant l’effort', () => {
  it('la phase d’effort de chaque exercice (eff) n’est jamais une descente / un retour', async () => {
    const { FAMILIES } = await import('./info');
    const exceptions = new Set(['pulloverMachine', 'abWheel']); // « descends les coudes » = tirer ; roue : l'effort (gainage) est le retour
    const bad = [];
    for (const [fam, f] of Object.entries(FAMILIES)) {
      if (f.hold || exceptions.has(fam) || fam === 'burpee' || fam === 'mountain') continue;
      const effLabel = f.p[f.eff ? 1 : 0];
      if (/^(re)?descends|^reviens|^relâche|^penche|en contrôle|^remonte en étirant/i.test(effLabel)) bad.push(`${fam}: « ${effLabel} »`);
    }
    expect(bad).toEqual([]);
  });

  it('le squat (descente d’abord) expire à la remontée, le développé couché (poussée d’abord) à la poussée', async () => {
    const { tempoU, firstPhaseEnd } = await import('./skeleton');
    const { FAMILIES, INFO_FAMILY } = await import('./info');
    expect(FAMILIES[INFO_FAMILY.squat].eff).toBe(1);
    expect(FAMILIES[INFO_FAMILY.bench_press].eff).toBeUndefined();
    // squat : 1re phase lente (descente), 2e rapide
    expect(firstPhaseEnd(1)).toBeGreaterThan(firstPhaseEnd(0));
    expect(tempoU(0.25, 'pingpong', 1)).toBeCloseTo(0.5, 5);
    expect(tempoU(0.18, 'pingpong', 0)).toBeCloseTo(0.5, 5);
  });
});

// Contrôles d'anatomie et de cohérence, sur toutes les vues (ajoutés après la revue critique du 01/11/2026)
describe('animations réalistes', () => {
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const v = (a, b) => [b[0] - a[0], b[1] - a[1]];
  const FRAMES = 12;
  const framesOf = (s, solve) => Array.from({ length: FRAMES + 1 }, (_, i) => solve(poseAt(s.keys, i / FRAMES)));
  // Tirage menton : le coude passe au-dessus de la main par rotation de l'épaule, ce n'est pas un coude à l'envers
  const ELBOW_OK = new Set(['fp_upright_row']);

  it('de profil : genoux et coudes dans le bon sens, rien sous le sol', () => {
    const errs = [];
    for (const e of ALL_SCENES) {
      for (const s of [e.scene, ...e.alts.map(a => a.scene)]) {
        if (s.view) continue;
        const sign = s.supine ? -1 : 1;
        framesOf(s, solvePose).forEach(j => {
          if (cross(v(j.hip, j.knee), v(j.knee, j.ankle)) * sign < -60) errs.push(e.id + ' : genou à l’envers');
          if (!ELBOW_OK.has(e.id) && cross(v(j.shoulder, j.elbow), v(j.elbow, j.wrist)) * sign > 150) errs.push(e.id + ' : coude à l’envers');
          for (const k of ['hip', 'shoulder', 'knee', 'ankle', 'toe', 'wrist']) if (j[k][1] > 203) errs.push(e.id + ' : ' + k + ' sous le sol');
        });
      }
    }
    expect([...new Set(errs)]).toEqual([]);
  });

  it('de face : pas de coude en travers du buste quand la main est plus basse que l’épaule, mains non croisées', () => {
    const errs = [];
    for (const e of ALL_SCENES) {
      for (const s of [e.scene, ...e.alts.map(a => a.scene)]) {
        if (s.view !== 'front') continue;
        framesOf(s, solveFront).forEach(f => {
          for (const [sd, side] of [[f.R, 1], [f.L, -1]]) {
            if (!ELBOW_OK.has(e.id) && sd.wrist[1] > sd.shoulder[1] + 2 && (sd.elbow[0] - Math.min(sd.shoulder[0] * side, (sd.shoulder[0] + sd.wrist[0]) / 2 * side) * side) * side < -1) errs.push(e.id + ' : coude vers l’intérieur'); // le coude peut rester au niveau de l'épaule (coudes collés), jamais en travers du buste
          }
        });
      }
    }
    expect([...new Set(errs)]).toEqual([]);
  });

  it('trajets cohérents entre les vues : mains et coudes à la même hauteur que de profil, coudes pas plus écartés que la technique', () => {
    const errs = [];
    for (const e of ALL_SCENES) {
      if (e.scene.view) continue;
      for (const a of e.alts) {
        if (a.scene.view !== 'front') continue;
        if (a.scene.elbows === undefined) { errs.push(e.id + '#' + a.key + ' : écart des coudes non déclaré'); continue; }
        for (let i = 0; i <= 20; i++) {
          const u = i / 20;
          const s = solvePose(poseAt(e.scene.keys, u));
          const p = poseAt(a.scene.keys, u);
          const f = solveFront(p).R;
          if (Math.abs((f.elbow[1] - f.shoulder[1]) - (s.elbow[1] - s.shoulder[1])) > 3) errs.push(e.id + '#' + a.key + ' : hauteur du coude');
          if (p.hand && !p.handL && Math.abs((f.wrist[1] - f.shoulder[1]) - (s.wrist[1] - s.shoulder[1])) > 4) errs.push(e.id + '#' + a.key + ' : hauteur de la main');
          const lat = typeof a.scene.elbows === 'number' ? a.scene.elbows : Array.isArray(a.scene.elbows) ? Math.max(...a.scene.elbows) : SEG.uarm;
          if (Math.abs(f.elbow[0] - f.shoulder[0]) > lat + 1) errs.push(e.id + '#' + a.key + ' : coudes trop écartés');
        }
      }
    }
    expect([...new Set(errs)]).toEqual([]);
  });

  it('les vues d’un même exercice bougent dans le même sens', () => {
    const errs = [];
    const track = s => { const fr = framesOf(s, s.view === 'front' ? solveFront : solvePose); const J = j => (s.view === 'front' ? j.R : j); return ['wrist', 'shoulder'].map(k => J(fr[FRAMES])[k][1] - J(fr[0])[k][1]); };
    for (const e of ALL_SCENES) {
      if (e.scene.view === 'top') continue;
      const m = track(e.scene);
      for (const a of e.alts) {
        if (a.scene.view === 'top') continue;
        track(a.scene).forEach((d, i) => { if (Math.abs(d) > 8 && Math.abs(m[i]) > 8 && Math.sign(d) !== Math.sign(m[i])) errs.push(e.id + '#' + a.key); });
      }
    }
    expect([...new Set(errs)]).toEqual([]);
  });

  it('roue abdominale : les genoux ne glissent pas ; pieds au sol immobiles', () => {
    const errs = [];
    for (const e of ALL_SCENES) {
      if (e.scene.view) continue;
      const fr = framesOf(e.scene, solvePose);
      if (fr.every(j => j.ankle[1] > 186)) { const xs = fr.map(j => j.ankle[0]); if (Math.max(...xs) - Math.min(...xs) > 7) errs.push(e.id); }
      if (fr.every(j => j.knee[1] > 186)) { const xs = fr.map(j => j.knee[0]); if (Math.max(...xs) - Math.min(...xs) > 7) errs.push(e.id + ' (genou)'); }
    }
    expect(errs).toEqual([]);
  });
});
