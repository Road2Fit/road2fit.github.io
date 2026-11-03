// Erreurs fréquentes : réalistes, propres à la posture, sans jamais traverser le sol, un banc ou un siège.
import { describe, expect, it } from 'vitest';
import { ALL_SCENES } from './registry';
import { FAMILIES, INFO_FAMILY } from './info';
import { GROUND, poseAt, solvePose } from './skeleton';
import { applyMistake, mistakesFor, postureOf } from './mistakes';

const ang = d => Math.abs(((((d % 360) + 540) % 360) - 180));

describe('erreurs fréquentes', () => {
  it('chaque exercice de profil (hors maintien) propose au moins « trop vite » et « amplitude trop courte »', () => {
    for (const e of ALL_SCENES) {
      if (e.scene.view) continue;
      const info = FAMILIES[INFO_FAMILY[e.id]] || {};
      const keys = mistakesFor(e.scene, info, e.id).map(m => m.key);
      if (info.hold) expect(keys).toEqual([]);
      else expect(keys.slice(0, 2)).toEqual(['fast', 'short']);
    }
  });
  it('aucune erreur ne traverse le sol, n’enfonce le bassin dans un banc ou un siège, ni ne tord le buste de plus de 18°', () => {
    const errs = [];
    for (const e of ALL_SCENES) {
      const s = e.scene;
      if (s.view) continue;
      const info = FAMILIES[INFO_FAMILY[e.id]] || {};
      const post = postureOf(s, e.id);
      for (const m of mistakesFor(s, info, e.id)) {
        for (let i = 0; i <= 20; i++) {
          const u = i / 20;
          const base = poseAt(s.keys, u);
          const p = applyMistake(m.key, base, s, e.id, u, u * 0.5);
          const j = solvePose(p);
          const j0 = solvePose(base);
          for (const k of ['hip', 'shoulder', 'elbow', 'wrist', 'knee', 'ankle', 'headC']) if (j[k] && j[k][1] > GROUND + 2) errs.push(`${e.id} ${m.key} : ${k} sous le sol`);
          if (['lying', 'seated', 'bridge'].includes(post) && j.hip[1] > j0.hip[1] + 0.5) errs.push(`${e.id} ${m.key} : bassin dans le banc / le siège`);
          if (['lying', 'bridge', 'plank'].includes(post) && Math.hypot(j.shoulder[0] - j0.shoulder[0], j.shoulder[1] - j0.shoulder[1]) > 1.5) errs.push(`${e.id} ${m.key} : épaules qui quittent l’appui`);
          if (ang((p.torso || 0) - (base.torso || 0)) > 18) errs.push(`${e.id} ${m.key} : buste trop tordu`);
        }
      }
    }
    expect([...new Set(errs)]).toEqual([]);
  });
  it('erreurs adaptées : couché → fesses qui décollent ; squat → buste qui plonge ; pompes → bassin qui s’affaisse ; tractions → pas d’erreur de buste', () => {
    const third = id => { const e = ALL_SCENES.find(x => x.id === id); return mistakesFor(e.scene, FAMILIES[INFO_FAMILY[id]] || {}, id).map(m => m.key)[2]; };
    expect(third('bench_press')).toBe('hips');
    expect(third('squat')).toBe('plunge');
    expect(third('pushups')).toBe('sag');
    expect(third('fp_chest_press')).toBe('seat');
    expect(third('pullups')).toBeUndefined();
  });
});
