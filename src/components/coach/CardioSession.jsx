// Séance de cardio guidée : étapes chronométrées (échauffement, efforts, récupérations), son et vibration à chaque
// changement d'étape, pause, étape suivante ; à la fin (ou « Déjà faite ») : durée, distance facultative, ressenti → enregistrée.
// La séance en cours survit à un rechargement de la page (clé rondoufit:cardioRun).
import { useEffect, useRef, useState } from 'react';
import { Art } from '../Art';
import { EXERCISE_CATALOG } from '../../data/catalog';
import { ZONES, hrMax, zoneText } from '../../coach/cardio';
import { getCoachSettings } from '../../coach/settings';
import { playGameSound } from '../../lib/sound';

const KEY = 'rondoufit:cardioRun';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
const save = v => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch (e) { /* rien */ } };
const mmss = s => { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const ZONE_TONE = { easy: 'text-emerald-300', hard: 'text-rose-300', rest: 'text-sky-300', calm: 'text-slate-300' };

/** Séance de cardio en cours mémorisée (pour la reprendre après un rechargement), ou null. */
export const savedCardioRun = () => load();

export function CardioSession({ session, gameState, startAtEnd = false, onClose, onSave }) {
  const [run, setRun] = useState(() => {
    const s = load();
    if (s && s.session && s.session.iso === session.iso && s.session.type === session.type) return s;
    const fresh = { session, startedAt: Date.now(), paused: 0, pausedAt: null, skip: 0, end: startAtEnd };
    save(fresh);
    return fresh;
  });
  const [now, setNow] = useState(Date.now());
  const age = Number((getCoachSettings(gameState).profile || {}).age) || 0;
  const steps = session.steps;
  const total = steps.reduce((s, x) => s + x.min * 60, 0);
  const elapsed = (now - run.startedAt - run.paused - (run.pausedAt ? now - run.pausedAt : 0)) / 1000 + run.skip;
  let acc = 0, idx = steps.length;
  for (let i = 0; i < steps.length; i++) { if (elapsed < acc + steps[i].min * 60) { idx = i; break; } acc += steps[i].min * 60; }
  const finished = run.end || idx >= steps.length;
  const lastIdx = useRef(idx);
  const update = patch => setRun(r => { const n = { ...r, ...patch }; save(n); return n; });

  useEffect(() => {
    if (finished) return undefined;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [finished]);
  // changement d'étape : son + vibration
  useEffect(() => {
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      playGameSound('done', gameState.soundEnabled !== false);
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* rien */ }
    }
  }, [idx]);

  const cat = EXERCISE_CATALOG.find(c => c.id === session.catalogId);
  const withDist = !!cat && cat.unit === 'km';
  const [dur, setDur] = useState('');
  const [dist, setDist] = useState('');
  const [rpe, setRpe] = useState(7);
  const doneMin = Math.max(1, Math.round(Math.min(elapsed, total) / 60));
  const close = () => { save(null); onClose(); };
  const finish = () => { save(null); onSave({ durationMin: Number(dur) || (run.end && elapsed < 60 ? session.minutes : doneMin), distanceKm: Number(String(dist).replace(',', '.')) || 0, rpe }); };

  const step = steps[Math.min(idx, steps.length - 1)];
  const left = acc + (step ? step.min * 60 : 0) - elapsed;
  const next = steps[idx + 1];
  const paused = !!run.pausedAt;

  return (
    <div className="fixed inset-0 !mt-0 z-[70] bg-slate-950 overflow-y-auto" role="dialog" aria-label="Séance de cardio" data-testid="cardio-session">
      <div className="min-h-full max-w-md mx-auto px-4 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={close} aria-label="Fermer" className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-black">✕</button>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cardio · {session.minutes} min{session.distanceText ? ` · ${session.distanceText}` : ''}</p>
            <h2 className="text-lg font-black text-white truncate">{session.title}</h2>
          </div>
        </div>

        {!finished ? (
          <>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-pink-500" style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }} /></div>
            <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center space-y-2" data-testid="cardio-step">
              <p className="text-sm font-bold text-slate-400">Étape {idx + 1}/{steps.length}</p>
              <h3 className="text-3xl font-black text-white">{step.label}</h3>
              <p className="text-6xl font-black text-white tabular-nums" data-testid="cardio-left">{mmss(left)}</p>
              {step.target && step.target.text && <p className={`text-xl font-black ${ZONE_TONE[step.zone]}`} data-testid="cardio-speed">{step.target.text}</p>}
              <p className={`text-sm font-bold ${ZONE_TONE[step.zone]}`}>{ZONES[step.zone].label} · {step.target ? step.target.cue : ZONES[step.zone].talk}{step.km ? ` · ≈ ${String(Math.round(step.km * 10) / 10).replace('.', ',')} km` : ''}</p>
              {hrMax(age) && <p className="text-xs text-slate-500">Avec une montre : {zoneText(step.zone, age).split(' · ')[0]}</p>}
            </section>
            {next && <p className="text-center text-sm text-slate-400">Ensuite : <b className="text-slate-200">{next.label}</b> ({next.min} min{next.target && next.target.speed ? `, ${String(next.target.speed[0]).replace('.', ',')}-${String(next.target.speed[1]).replace('.', ',')} km/h` : ''})</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" data-testid="cardio-pause" onClick={() => (paused ? update({ paused: run.paused + (Date.now() - run.pausedAt), pausedAt: null }) : update({ pausedAt: Date.now() }))} className="py-3 rounded-xl bg-slate-800 text-white font-black">{paused ? 'Reprendre' : 'Pause'}</button>
              <button type="button" data-testid="cardio-skip" onClick={() => update({ skip: run.skip + Math.max(0, left) })} className="py-3 rounded-xl bg-slate-800 text-white font-black">Étape suivante</button>
            </div>
            <button type="button" data-testid="cardio-stop" onClick={() => update({ end: true, pausedAt: run.pausedAt || Date.now() })} className="py-3 rounded-xl border border-slate-700 text-slate-300 font-bold">Terminer la séance</button>
            <details className="text-xs text-slate-400"><summary className="cursor-pointer font-bold">Pourquoi cette séance ?</summary><p className="mt-1">{session.why}</p></details>
          </>
        ) : (
          <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5 space-y-4" data-testid="cardio-end">
            <h3 className="text-xl font-black text-white"><Art name="heart" />Séance terminée</h3>
            <label className="block text-sm font-bold text-slate-300">Durée (min)
              <input type="number" inputMode="numeric" data-testid="cardio-dur" value={dur} placeholder={String(run.end && elapsed < 60 ? session.minutes : doneMin)} onChange={e => setDur(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white" />
            </label>
            {withDist && (
              <label className="block text-sm font-bold text-slate-300">Distance (km, si tu la connais)
                <input type="text" inputMode="decimal" data-testid="cardio-dist" value={dist} placeholder="estimée sinon" onChange={e => setDist(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white" />
              </label>
            )}
            <div className="grid grid-cols-3 gap-2">
              {[[5, 'Facile', 'smile'], [7, 'Bien', 'muscle'], [9, 'Dur', 'tired']].map(([v, lab, art]) => (
                <button key={v} type="button" data-testid={`cardio-rpe-${v}`} aria-pressed={rpe === v} onClick={() => setRpe(v)} className={`py-3 rounded-xl text-sm font-black border ${rpe === v ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-200'}`}><Art name={art} />{lab}</button>
              ))}
            </div>
            <button type="button" data-testid="cardio-save" data-key onClick={finish} className="w-full py-3.5 rounded-xl bg-pink-600 text-white text-lg font-black">Enregistrer</button>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------- Résumé d'une séance de cardio (toucher la carte « Cardio » du Coach) : ce qu'on va faire, étape par étape ----------
const minTxt = m => (m >= 1 ? `${String(Math.round(m * 10) / 10).replace('.', ',')} min` : `${Math.round(m * 60)} s`);
const baseLabel = l => String(l || '').replace(/\s*\d+\s*\/\s*\d+\s*$/, ''); // « Effort 2/4 » → « Effort »
const sameStep = (a, b) => a && b && baseLabel(a.label) === baseLabel(b.label) && a.min === b.min && a.zone === b.zone;
/** Regroupe les répétitions : « 4 × (4 min effort + 3 min récupération) ». */
export function groupSteps(steps) {
  const out = [];
  let i = 0;
  while (i < steps.length) {
    let done = false;
    for (const len of [2, 1]) {
      let k = 1;
      while (i + (k + 1) * len <= steps.length && steps.slice(i, i + len).every((s, j) => sameStep(s, steps[i + k * len + j]))) k++;
      if (k > 1) {
        // effort + récupération répétés, le dernier effort sans récupération après : « 4 fois », sans récup après le dernier
        const tail = len === 2 && sameStep(steps[i + k * len], steps[i]);
        out.push({ times: k + (tail ? 1 : 0), steps: steps.slice(i, i + len), noLastRest: tail });
        i += k * len + (tail ? 1 : 0); done = true; break;
      }
    }
    if (!done) { out.push({ times: 1, steps: [steps[i]] }); i++; }
  }
  return out;
}

export function CardioSummary({ session, onClose, onStart, onDone, onRemoveCustom }) {
  const groups = groupSteps(session.steps || []);
  return (
    <div className="fixed inset-0 !mt-0 z-[70] bg-slate-950/85 overflow-y-auto" onClick={onClose} data-testid="cardio-summary">
      <div className="min-h-full flex items-end sm:items-center justify-center px-2 pt-10 pb-2">
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-3" onClick={e => e.stopPropagation()} role="dialog" aria-label={session.title}>
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
          <div className="pr-10">
            <p className="text-xs font-black text-pink-300 uppercase tracking-wider"><Art name="heart" size={14} bare /> Cardio</p>
            <h3 className="text-2xl font-black text-white leading-tight">{session.title}</h3>
            <p className="text-sm font-bold text-slate-300 mt-0.5">{session.minutes} min{session.distanceText ? ` · ${session.distanceText}` : ''}</p>
          </div>
          <ol className="space-y-1.5" data-testid="cardio-summary-steps">
            {groups.map((g, i) => (
              <li key={i} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                {g.times > 1 && <p className="text-xs font-black text-amber-300 mb-0.5">{g.times} fois{g.noLastRest ? ' (pas de récupération après le dernier)' : ''} :</p>}
                {g.steps.map((s, j) => (
                  <div key={j} className="flex items-baseline gap-2">
                    <span className="text-sm font-black text-white w-16 shrink-0">{minTxt(s.min)}</span>
                    <span className="min-w-0">
                      <span className={`text-sm font-bold ${ZONE_TONE[s.zone] || 'text-slate-200'}`}>{g.times > 1 ? baseLabel(s.label) : s.label}</span>
                      {s.target && s.target.text && <span className="block text-xs text-slate-300">{s.target.text}{s.km ? ` · ≈ ${String(Math.round(s.km * 10) / 10).replace('.', ',')} km` : ''}</span>}
                      {s.target && s.target.cue && <span className="block text-xs text-slate-500">{s.target.cue}</span>}
                    </span>
                  </div>
                ))}
              </li>
            ))}
          </ol>
          {session.why && <p className="text-xs text-slate-400">{session.why}</p>}
          {session.custom && onRemoveCustom && <button type="button" onClick={onRemoveCustom} className="w-full py-2 rounded-xl bg-violet-900/50 border border-violet-500/40 text-xs font-bold text-violet-200" data-testid="cardio-custom-remove"><Art name="repeat" />Revenir à la proposition du coach</button>}
          <div className="flex gap-2">
            {onDone && <button type="button" onClick={onDone} className="px-4 py-3.5 rounded-xl bg-slate-800 text-emerald-300 text-sm font-black" data-testid="cardio-summary-done"><Art name="check" size={16} bare />Déjà faite</button>}
            <button type="button" onClick={onStart} data-key className="flex-1 py-3.5 rounded-xl bg-pink-600 text-white text-lg font-black" data-testid="cardio-summary-start">Lancer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
