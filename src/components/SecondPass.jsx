import { useEffect, useRef, useState } from 'react';
import { runSecondPass, passEstimate } from '../form/secondPass';
import { analyzeSet } from '../form/analyze';
import { keepSeries } from '../form/flag';
import { setClip } from '../form/clip';
import { getChinCal } from '../form/calibration';

// Bouton « Deuxième analyse » (4.48) sous le rapport de la série filmée : relit la vidéo image par image, puis remplace le
// résultat (la première analyse reste consultable). Lancé seulement par la personne.
export function SecondPass({ clip, result, onDone, onBusy = null }) {
  const [state, setState] = useState('idle'); // idle | run | error
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);
  // 4.48.2 : la séance sait qu'une analyse tourne (le repos ne se termine pas pendant)
  useEffect(() => { if (onBusy) onBusy(state === 'run'); return () => { if (onBusy && state === 'run') onBusy(false); }; }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  // lancée une fois l'écran « en cours » affiché (la vidéo à relire doit être dans la page)
  useEffect(() => {
    if (state !== 'run') return;
    (async () => {
    try {
      const frames = await runSecondPass({ clip, video: videoRef.current, onProgress: setProgress, cancelled: () => stop.current });
      if (!frames || stop.current) { if (!stop.current) setState('idle'); return; }
      const res = analyzeSet(frames, clip.P, { aspect: clip.aspect, targetReps: clip.targetReps, chinCal: getChinCal() });
      const sid = `series-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      keepSeries({ id: sid, frames, aspect: clip.aspect, mirror: clip.mirror, pattern: clip.P.id, targetReps: clip.targetReps, chinCal: getChinCal(), pass: 2 });
      setClip({ ...clip, frames }); // squelette du revisionnage : celui de la 2e analyse
      onDone({ ...res, seriesId: sid, clipId: clip.id, pass: 2, first: { ok: !!result.ok, repCount: result.ok ? result.repCount : null, result: result.first ? result.first.result : result } });
    } catch (e) {
      if (!stop.current) setState('error');
    }
    })();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!clip || !clip.P || clip.P.iso) return null;
  const sec = clip.frames && clip.frames.length > 1 ? (clip.frames[clip.frames.length - 1].t - clip.frames[0].t) / 1000 : 30;
  const start = () => { stop.current = false; setProgress(0); setState('run'); };
  if (state === 'idle' || state === 'error') {
    return (
      <div className="space-y-1" data-testid="form-pass2">
        <button type="button" onClick={start} className="w-full py-2 rounded-xl bg-slate-800 text-slate-100 text-xs font-black" data-testid="form-pass2-run">Deuxième analyse, plus précise (≈ {passEstimate(sec)} s)</button>
        <p className="text-[11px] text-slate-500">{state === 'error' ? 'La deuxième analyse n’a pas pu se faire. Réessaie, ou garde la première.' : 'Je relis ta vidéo image par image : plus lent, mais plus juste. Laisse l’appli ouverte.'}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 bg-slate-950 rounded-xl p-2" data-testid="form-pass2-running">
      <video ref={videoRef} muted playsInline className="w-full max-h-40 rounded-lg bg-black object-contain" />
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="h-full bg-pink-500" style={{ width: `${Math.round(progress * 100)}%` }} data-testid="form-pass2-progress" />
      </div>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-xs text-slate-300">Deuxième analyse… {Math.round(progress * 100)} %</p>
        <button type="button" onClick={() => { stop.current = true; setState('idle'); }} className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-200" data-testid="form-pass2-cancel">Annuler</button>
      </div>
    </div>
  );
}
