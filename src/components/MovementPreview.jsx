import { useEffect, useRef, useState } from 'react';
import { Figure } from '../anim/Figure';
import { flagAnimation } from '../lib/movement';
import { animatedList, animationIdFor, movementFor } from '../anim/resolve';
import { effortAt, firstPhaseEnd, phaseOfU, phaseToU, poseAt, tempoU } from '../anim/skeleton';

const CYCLE_MS = 5200;
const MISTAKES = [
  { key: 'fast', label: 'Trop vite, avec élan', text: 'Trop vite, avec de l’élan : la charge balance, les muscles ne travaillent presque plus et les articulations encaissent.' },
  { key: 'short', label: 'Amplitude trop courte', text: 'Amplitude trop courte : le fantôme montre le trajet complet que tu dois faire.' },
  { key: 'lean', label: 'Le dos lâche', text: 'Le buste se penche et le dos lâche : la charge part sur le bas du dos au lieu des muscles visés.' },
];
const LIST = animatedList();
const viewLabel = sc => (sc.view === 'top' ? 'Vue de dessus' : sc.view === 'front' ? (sc.back ? 'Vue de dos' : 'Vue de face') : 'Vue de côté');

function Bullets({ title, items, tone = 'text-slate-300', active = -1 }) {
  if (!items || !items.length) return null;
  return (
    <section className="space-y-1">
      <h4 className="text-xs font-black uppercase tracking-wider text-pink-300">{title}</h4>
      <ul className={`space-y-1 text-xs ${tone} list-disc pl-4`}>
        {items.map((t, i) => <li key={i} className={i === active ? 'text-amber-200 font-bold' : ''}>{t}</li>)}
      </ul>
    </section>
  );
}

// Fenêtre « Voir le mouvement » : animation du geste, trajet à respecter, installation / machine, erreurs à éviter.
// S'ouvre par l'événement `rondoufit-movement` (lib/movement.js).
export function MovementPreview({ initial = null }) {
  const [target, setTarget] = useState(null);
  const [id, setId] = useState(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [phase, setPhase] = useState(0);
  const [showMuscles, setShowMuscles] = useState(true);
  const [showPath, setShowPath] = useState(false);
  const [reps, setReps] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [flagged, setFlagged] = useState({});
  const [mistake, setMistake] = useState(null);
  const last = useRef(0);
  const mistakeRef = useRef(null);
  mistakeRef.current = mistake;

  useEffect(() => {
    const open = t => {
      setTarget(t);
      setId(animationIdFor(t));
      setPhase(0);
      setReps(0);
      setMistake(null);
      const red = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReduced(red);
      setPlaying(!red);
    };
    const h = e => open(e.detail || {});
    if (initial) open(initial);
    window.addEventListener('rondoufit-movement', h);
    return () => window.removeEventListener('rondoufit-movement', h);
  }, []);

  const mv = id ? movementFor(id) : null;

  useEffect(() => {
    if (!target || !playing || !mv) return undefined;
    let raf;
    last.current = 0;
    const tick = t => {
      if (last.current) {
        const dt = ((t - last.current) / CYCLE_MS) * speed * (mistakeRef.current === 'fast' ? 2.2 : 1);
        setPhase(p => {
          const n = p + dt;
          if (n >= 1) setReps(r => r + 1);
          return n % 1;
        });
      }
      last.current = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, playing, speed, mv]);

  if (!target) return null;
  const close = () => setTarget(null);
  // Toutes les vues de l'exercice sont affichées côte à côte
  const scene = mv && mv.scene;
  const views = mv ? [{ key: 'side', label: viewLabel(mv.scene), scene: mv.scene }, ...mv.alts] : [];
  const info = mv && mv.info;
  const canMistake = !!(scene && info && !info.hold && scene.view !== 'front');
  const err = canMistake ? mistake : null;
  const loop = scene ? scene.loop : 'pingpong';
  const eff = info && info.eff ? 1 : 0;
  const baseU = scene ? (err === 'fast' ? phaseToU(phase, loop) : tempoU(phase, loop, eff)) : 0;
  const u = err === 'short' ? baseU * 0.5 : baseU;
  const poseOf = sc => {
    const pose = poseAt(sc.keys, u);
    if (sc.view) return pose;
    if (err === 'lean') return { ...pose, torso: (pose.torso || 0) + 20 * u };
    if (err === 'fast') return { ...pose, torso: (pose.torso || 0) + 14 * Math.sin(phase * Math.PI * 4) };
    return pose;
  };
  const effort = scene ? effortAt(phase, loop, eff, !!(info && info.hold)) : 0;
  const labels = info ? info.p : ['Effort', 'Retour'];
  const goingForward = loop === 'cycle' ? true : phase < firstPhaseEnd(eff);
  const phaseLabel = goingForward ? labels[0] : labels[1];
  const ghostU = loop === 'cycle' ? (baseU + 0.2) % 1 : goingForward ? 1 : 0;
  const showGhost = err === 'short';
  const breath = !info ? '' : info.hold ? '🌬️ Respire calmement' : loop === 'cycle' ? '🌬️ Respire en rythme' : (goingForward ? eff === 0 : eff === 1) ? '💨 Expire' : '🌬️ Inspire';
  const geste = info && info.g ? info.g : [];
  const activeGeste = playing && geste.length ? Math.min(geste.length - 1, Math.floor(phase * geste.length)) : -1;
  const errInfo = MISTAKES.find(m => m.key === err);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-sm flex p-4 pt-20 pb-24 sm:py-4 overflow-y-auto" onClick={close}>
      <div className="m-auto bg-slate-900 border border-sky-500/40 rounded-2xl max-w-3xl w-full p-4 sm:p-5 shadow-2xl space-y-3" onClick={e => e.stopPropagation()} role="dialog" aria-label="Voir le mouvement">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-white">🎬 {mv ? mv.name : target.name || 'Exercice'}</h3>
            {mv && <p className="text-xs text-slate-400">{mv.category}{mv.equip ? ` · ${mv.equip}` : ''}</p>}
          </div>
          <button type="button" onClick={close} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
        </div>

        {mv ? (
          <>
            <div className={`grid gap-2 ${views.length > 1 ? 'sm:grid-cols-2' : ''}`} data-testid="movement-views">
              {views.map(v => (
                <section key={v.key} className={`relative rounded-xl overflow-hidden border ${errInfo ? 'border-rose-500/70' : 'border-slate-800'}`}>
                  <h4 className="absolute top-1.5 left-2 z-10 text-[0.65rem] font-black uppercase tracking-wider text-slate-400">{v.label}</h4>
                  <Figure scene={v.scene} pose={poseOf(v.scene)} muscleText={info ? info.m : ''} bad={!!errInfo} effort={effort} showMuscles={showMuscles} showTrace={showPath} />
                  {(showPath || showGhost) && <div className="absolute inset-0 pointer-events-none"><Figure scene={v.scene} pose={poseAt(v.scene.keys, ghostU)} ghost /></div>}
                </section>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm font-black text-amber-300 min-w-[9rem]" aria-live="polite">{phaseLabel}</p>
              <p className="text-xs text-slate-400" data-testid="rep-count">Répétitions : <b className="text-white tabular-nums">{reps}</b></p>
              {breath && <p className="text-xs font-bold text-sky-200" data-testid="breath">{breath}</p>}
              <div className="flex-1 min-w-[6rem] h-2 bg-slate-800 rounded-full overflow-hidden" title="Position dans le mouvement"><div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.round(u * 100)}%` }} /></div>
            </div>
            {reduced && (
              <div className="grid grid-cols-3 gap-1" data-testid="still-strip">
                {[['Départ', 0], ['Milieu', 0.5], ['Fin', 1]].map(([t, v]) => (
                  <div key={t} className="rounded-lg overflow-hidden border border-slate-800">
                    <Figure scene={scene} pose={poseAt(scene.keys, v)} muscleText={info ? info.m : ''} showMuscles={showMuscles} />
                    <p className="text-center text-xs font-bold text-slate-400 py-0.5">{t}</p>
                  </div>
                ))}
              </div>
            )}
            {errInfo && <p className="text-xs text-rose-200 bg-rose-950/40 border border-rose-500/40 rounded-lg p-2" data-testid="mistake-text">❌ {errInfo.text}</p>}
            {canMistake && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Erreur fréquente">
                <button type="button" onClick={() => setMistake(null)} aria-pressed={!err} className={`px-2 py-1.5 rounded-lg text-xs font-bold border ${!err ? 'bg-emerald-700 border-emerald-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>✅ Bonne exécution</button>
                {MISTAKES.map(m => (
                  <button key={m.key} type="button" onClick={() => { setMistake(m.key); setPlaying(true); }} aria-pressed={err === m.key} className={`px-2 py-1.5 rounded-lg text-xs font-bold border ${err === m.key ? 'bg-rose-700 border-rose-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>❌ {m.label}</button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl p-2">
              <button type="button" onClick={() => setPlaying(p => !p)} className="px-3 py-2 rounded-xl bg-sky-600 text-white text-sm font-black">{playing ? '⏸ Pause' : '▶ Lecture'}</button>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400">Vitesse
                <input type="range" min="0.25" max="2" step="0.05" value={speed} data-testid="speed" onChange={e => setSpeed(Number(e.target.value))} className="w-20 accent-sky-400" />
                <span className="tabular-nums text-slate-200">{speed.toFixed(1).replace('.', ',')}×</span>
              </label>
              <button type="button" onClick={() => setShowMuscles(v => !v)} aria-pressed={showMuscles} data-testid="toggle-muscles" className={`px-3 py-2 rounded-xl border text-sm font-bold ${showMuscles ? 'bg-rose-700 border-rose-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>Muscles</button>
              <button type="button" onClick={() => setShowPath(v => !v)} aria-pressed={showPath} data-testid="toggle-path" className={`px-3 py-2 rounded-xl border text-sm font-bold ${showPath ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>Trajet</button>
              <button type="button" onClick={() => { setPhase(0); setReps(0); }} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-sm font-bold">Remettre à zéro</button>
              <input
                type="range" min="0" max="100" value={Math.round(u * 100)} aria-label="Position dans le mouvement" data-testid="position"
                onChange={e => { setPlaying(false); setPhase(phaseOfU(Number(e.target.value) / 100, scene.loop, eff)); }}
                className="w-full accent-sky-400"
              />
            </div>
            <div className="flex justify-end">
              {flagged[id]
                ? <span className="text-xs font-bold text-emerald-300" data-testid="flag-done">✔ Merci, c’est noté : je corrigerai cette animation.</span>
                : <button type="button" onClick={() => { flagAnimation({ animId: id, view: 'side', name: mv.name }); setFlagged(f => ({ ...f, [id]: true })); }} className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-950 text-xs font-bold text-slate-300">🚩 Cette animation est fausse</button>}
            </div>
            <p className="text-xs text-slate-500">En rouge, les muscles qui travaillent : l’intensité suit l’effort. « Trajet » montre le chemin à respecter (le cercle est le départ, la flèche le sens de l’effort) et un fantôme pâle de la position visée. Fais glisser la barre pour voir chaque position.</p>

            {info ? (
              <div className="space-y-3 pt-1">
                <section className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-pink-300">Muscles travaillés</h4>
                  <p className="text-xs text-slate-300">{info.m}</p>
                </section>
                <Bullets title="Installation et matériel" items={[...(info.s || []), ...mv.equipTips]} />
                <Bullets title="Le mouvement" items={info.g} active={activeGeste} />
                <Bullets title="Respiration et rythme" items={info.hold ? ['Respire calmement, sans bloquer.', 'Tiens la position sans te raidir.'] : ['Expire pendant l’effort, inspire pendant le retour.', 'Descends (ou reviens) en 2 à 3 secondes, monte en 1 à 2 secondes.']} />
                <Bullets title="Erreurs à éviter" items={info.e} tone="text-rose-200" />
                {info.safe && <p className="text-xs text-amber-200 bg-amber-950/30 border border-amber-500/30 rounded-lg p-2">⚠️ {info.safe}</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Pas encore de conseils écrits pour cet exercice.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-300">Cet exercice personnalisé n’a pas d’animation. Choisis un exercice proche dans la liste ci-dessous pour voir le geste.</p>
        )}

        <div className="pt-1">
          <label className="block text-xs font-bold text-slate-400 mb-1" htmlFor="mv-select">Voir un autre exercice</label>
          <select id="mv-select" value={id || ''} onChange={e => { setId(e.target.value || null); setPhase(0); }} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white">
            <option value="">Choisir…</option>
            {LIST.map(x => <option key={x.id} value={x.id}>{x.category} · {x.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
