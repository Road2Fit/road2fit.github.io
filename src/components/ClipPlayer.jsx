import { useEffect, useRef, useState } from 'react';
import { drawSkeleton, frameAt, neonColor } from '../form/draw';

// Extrait de la série filmée (4.20) : le moment où un point a été relevé (une rep), en boucle, avec le squelette mesuré
// par-dessus. Ralenti, autres reps concernées, ou toute la série.
export function ClipPlayer({ clip, reps = [], finding = null, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const list = finding && Array.isArray(finding.reps) ? finding.reps.filter(i => reps[i]) : [];
  const [sel, setSel] = useState(list.length ? list[0] : -1); // -1 = toute la série
  const [slow, setSlow] = useState(true);
  const seg = sel >= 0 && reps[sel] ? { a: reps[sel].t0 || 0, b: reps[sel].t1 || 0 } : null;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    try { v.playbackRate = slow ? 0.5 : 1; } catch (e) {}
    if (seg) { try { v.currentTime = seg.a; } catch (e) {} }
    const p = v.play && v.play();
    if (p && p.catch) p.catch(() => {});
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, slow]);

  useEffect(() => {
    let raf = 0;
    const color = neonColor();
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        if (seg && v.currentTime >= seg.b) { try { v.currentTime = seg.a; } catch (e) {} } // boucle sur la rep
        drawSkeleton(canvasRef.current, v, frameAt(clip.frames, clip.t0 + v.currentTime * 1000), { aspect: clip.aspect, color });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clip, seg && seg.a, seg && seg.b]);

  const mirror = clip.mirror ? { transform: 'scaleX(-1)' } : undefined;
  return (
    <div className="fixed inset-0 z-[95] bg-black flex flex-col h-[100dvh]" role="dialog" aria-label="Extrait de la série" data-testid="clip-player" style={{ margin: 0 }}>
      <div className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2">
        <button type="button" onClick={onClose} aria-label="Fermer l’extrait" data-testid="clip-close" className="nav-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white truncate">{finding ? finding.title : 'Ta série'}</p>
          <p className="text-xs text-slate-400 truncate">{sel >= 0 ? `Rep ${sel + 1}` : 'Toute la série'}{slow ? ' · ralenti' : ''}</p>
        </div>
        <button type="button" onClick={() => setSlow(v => !v)} className={`px-3 py-2 rounded-xl text-xs font-black ${slow ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-200'}`} data-testid="clip-slow">Ralenti</button>
      </div>
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0" style={mirror}>
          <video ref={videoRef} src={clip.url} playsInline muted autoPlay loop={!seg} className="absolute inset-0 w-full h-full object-contain" data-testid="clip-video" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        </div>
      </div>
      <div className="shrink-0 px-4 pt-3 pb-4 space-y-2 max-w-md w-full mx-auto">
        {finding && (finding.detail || finding.fix) && (
          <div className="text-sm">
            {finding.detail && <p className="text-slate-300">{finding.detail}</p>}
            {finding.fix && <p className="font-bold text-emerald-200 mt-0.5">→ {finding.fix}</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5" data-testid="clip-reps">
          {list.map(i => (
            <button key={i} type="button" onClick={() => setSel(i)} className={`px-3 py-1.5 rounded-lg text-xs font-black ${sel === i ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-200'}`}>Rep {i + 1}</button>
          ))}
          <button type="button" onClick={() => setSel(-1)} className={`px-3 py-1.5 rounded-lg text-xs font-black ${sel < 0 ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-200'}`} data-testid="clip-all">Toute la série</button>
        </div>
      </div>
    </div>
  );
}
