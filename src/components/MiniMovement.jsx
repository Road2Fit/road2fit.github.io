import { useEffect, useState } from 'react';
import { Figure } from '../anim/Figure';
import { animationIdFor, movementFor } from '../anim/resolve';
import { effortAt, poseAt, tempoU } from '../anim/skeleton';
import { openMovement } from '../lib/movement';

const CYCLE_MS = 5200;
const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Petite animation en boucle (séance guidée) ; un toucher ouvre la fenêtre complète. Chargé à la demande (React.lazy).
export default function MiniMovement({ catalogId, name }) {
  const id = animationIdFor({ catalogId, name });
  const mv = id ? movementFor(id) : null;
  const [phase, setPhase] = useState(0);
  const still = reducedMotion();

  useEffect(() => {
    if (!mv || still) return undefined;
    let raf;
    let last = 0;
    let shown = 0;
    const tick = t => {
      if (last) {
        const dt = t - last;
        if (t - shown > 45) { shown = t; setPhase(p => (p + dt / CYCLE_MS) % 1); last = t; }
      } else last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mv, still]);

  if (!mv) return null;
  const scene = mv.scene;
  const muscleText = mv.info ? mv.info.m : '';
  return (
    <button type="button" onClick={() => openMovement({ catalogId, name })} aria-label="Agrandir l’animation du mouvement" data-testid="mini-movement" className="block w-full text-left rounded-lg overflow-hidden border border-slate-700">
      {still ? (
        <div className="grid grid-cols-3 gap-px bg-slate-800">
          {[0, 0.5, 1].map(u => <Figure key={u} scene={scene} pose={poseAt(scene.keys, u)} muscleText={muscleText} />)}
        </div>
      ) : (
        <Figure scene={scene} pose={poseAt(scene.keys, tempoU(phase, scene.loop, mv.info && mv.info.eff ? 1 : 0))} muscleText={muscleText} effort={effortAt(phase, scene.loop, mv.info && mv.info.eff ? 1 : 0, !!(mv.info && mv.info.hold))} />
      )}
    </button>
  );
}
