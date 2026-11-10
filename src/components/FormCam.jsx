import { useEffect, useMemo, useRef, useState } from 'react';
import { Art } from './Art';
import { loadPose, poseMock } from '../form/pose';
import { analyzeSet, bodyVisible, liveCount } from '../form/analyze';
import { patternFor, placementText } from '../form/patterns';
import { playGameSound } from '../lib/sound';

// Filmer une série (4.19) : la caméra du téléphone, le squelette détecté dessiné par-dessus, le compteur de reps en direct.
// L'enregistrement démarre tout seul quand le corps est entièrement visible depuis 1 s, et s'arrête tout seul
// (plus de nouvelle rep depuis 8 s, ou 4 s une fois le nombre prévu atteint, ou corps sorti de l'image 2,5 s) ou avec le bouton.
// Puis l'analyse (form/analyze.js) est rendue à la séance guidée, qui l'affiche pendant le repos.
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32]];
const MAX_FRAMES = 30 * 60 * 4; // 4 minutes au plus

function camError(e) {
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Accès à la caméra refusé. Autorise la caméra pour ce site (réglages du navigateur ou de l’appli), puis réessaie.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Aucune caméra trouvée sur cet appareil.';
  if (n === 'NotReadableError') return 'La caméra est déjà utilisée par une autre appli. Ferme-la et réessaie.';
  return 'Impossible d’ouvrir la caméra sur cet appareil.';
}

export default function FormCam({ item, info = '', targetReps = 0, holdTarget = 0, soundEnabled = true, onDone, onClose, onStopAuto }) {
  const P = useMemo(() => patternFor({ catalogId: item.catalogId, name: item.name, timed: item.timed }), [item.catalogId, item.name, item.timed]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('loading'); // loading | wait | rec | analyzing | error
  const [err, setErr] = useState('');
  const [count, setCount] = useState(0);
  const [sec, setSec] = useState(0);
  const [facing, setFacing] = useState(() => { try { return localStorage.getItem('rondoufit:formCam') || 'user'; } catch (e) { return 'user'; } });
  const run = useRef(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let stopped = false, raf = 0, timer = 0, stream = null;
    const r = { phase: 'loading', frames: [], visibleSince: null, recStart: 0, lastTs: 0, lostSince: null, count: 0, lastRepT: 0, countedAt: 0, aspect: 9 / 16, sec: 0 };
    run.current = r;
    const go = p => { r.phase = p; if (!stopped) setPhase(p); };
    const stopCam = () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      if (stream) stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
      stream = null;
    };
    const neon = (() => { try { return getComputedStyle(document.documentElement).getPropertyValue('--neon').trim() || '#c6ff3d'; } catch (e) { return '#c6ff3d'; } })();

    const draw = lm => {
      const c = canvasRef.current, v = videoRef.current;
      if (!c || !c.getContext) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const cw = c.clientWidth, ch = c.clientHeight, dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      if (!lm) return;
      // même cadrage que la vidéo (object-contain)
      const vw = (v && v.videoWidth) || r.aspect * 1000, vh = (v && v.videoHeight) || 1000;
      const s = Math.min(cw / vw, ch / vh), ox = (cw - vw * s) / 2, oy = (ch - vh * s) / 2;
      const X = p => ox + p.x * vw * s, Y = p => oy + p.y * vh * s;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = neon;
      ctx.shadowColor = neon;
      ctx.shadowBlur = 8;
      for (const [a, b] of BONES) {
        const A = lm[a], B = lm[b];
        if (!A || !B || (A.visibility ?? 1) < 0.4 || (B.visibility ?? 1) < 0.4) continue;
        ctx.globalAlpha = Math.min(A.visibility ?? 1, B.visibility ?? 1);
        ctx.beginPath(); ctx.moveTo(X(A), Y(A)); ctx.lineTo(X(B), Y(B)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      for (let i = 11; i < 33; i++) {
        const p = lm[i];
        if (!p || (p.visibility ?? 1) < 0.4) continue;
        ctx.beginPath(); ctx.arc(X(p), Y(p), 4, 0, Math.PI * 2); ctx.fill();
      }
    };

    const finish = () => {
      if (r.phase !== 'rec') return;
      go('analyzing');
      stopCam();
      setTimeout(() => {
        if (stopped) return;
        const res = analyzeSet(r.frames, P, { aspect: r.aspect, targetReps });
        const reached = holdTarget > 0 && r.lastTs - r.recStart >= holdTarget * 1000;
        doneRef.current(res, { sec: Math.max(1, Math.round((r.lastTs - r.recStart) / 1000)), reachedTarget: reached });
      }, 30);
    };
    r.finish = finish;

    const onFrame = (res, ts, aspect) => {
      if (stopped) return;
      r.aspect = aspect || r.aspect;
      const lm = res && res.lm;
      draw(lm);
      const visible = !!lm && bodyVisible(lm, P);
      if (r.phase === 'wait') {
        if (visible) {
          if (r.visibleSince == null) r.visibleSince = ts;
          if (ts - r.visibleSince >= 1000) {
            r.recStart = ts; r.lastRepT = ts; r.frames = [];
            go('rec');
            playGameSound('click', soundEnabled);
            try { navigator.vibrate && navigator.vibrate(80); } catch (e) {}
          }
        } else r.visibleSince = null;
        return;
      }
      if (r.phase !== 'rec') return;
      r.lastTs = ts;
      if (r.frames.length < MAX_FRAMES) r.frames.push({ t: ts, lm: lm || null, wl: (res && res.wl) || null });
      if (visible) r.lostSince = null; else if (r.lostSince == null) r.lostSince = ts;
      const lost = r.lostSince != null && ts - r.lostSince > 2500;
      if (P.iso) {
        const s = Math.floor((ts - r.recStart) / 1000);
        if (s !== r.sec) { r.sec = s; setSec(s); }
        if (holdTarget > 0 && ts - r.recStart >= holdTarget * 1000) {
          playGameSound('done', soundEnabled);
          try { navigator.vibrate && navigator.vibrate([150, 80, 300]); } catch (e) {}
          finish();
        } else if (lost && ts - r.recStart > 5000) finish();
        return;
      }
      if (r.frames.length - r.countedAt >= 10) {
        r.countedAt = r.frames.length;
        const n = liveCount(r.frames, P, { aspect: r.aspect });
        if (n > r.count) {
          r.count = n; r.lastRepT = ts; setCount(n);
          try { navigator.vibrate && navigator.vibrate(40); } catch (e) {}
        }
      }
      const idle = ts - r.lastRepT;
      if (r.count > 0 && (idle > 8000 || (targetReps > 0 && r.count >= targetReps && idle > 4000) || lost)) finish();
      if (r.frames.length >= MAX_FRAMES) finish();
    };

    (async () => {
      go('loading');
      const mock = poseMock();
      try {
        if (!mock) {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('no camera'), { name: 'NotFoundError' });
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } });
          if (stopped) { stopCam(); return; }
          const v = videoRef.current;
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
      } catch (e) {
        if (!stopped) { setErr(camError(e)); go('error'); }
        return;
      }
      let pose;
      try { pose = await loadPose(); } catch (e) {
        stopCam();
        if (!stopped) { setErr('Impossible de charger la détection du corps. Il faut une connexion internet la première fois.'); go('error'); }
        return;
      }
      if (stopped) { stopCam(); return; }
      go('wait');
      if (mock) {
        // tests : images fournies à l'avance, lues par paquets
        const frames = mock.frames || [];
        let i = 0;
        timer = setInterval(() => {
          for (let k = 0; k < (mock.batch || 30) && i < frames.length; k++, i++) onFrame(frames[i], frames[i].t, mock.aspect);
          if (i >= frames.length) { clearInterval(timer); finish(); }
        }, 15);
        return;
      }
      let lastVT = -1;
      const tick = () => {
        if (stopped) return;
        const v = videoRef.current;
        if (v && v.readyState >= 2 && v.currentTime !== lastVT && v.videoWidth) {
          lastVT = v.currentTime;
          const ts = performance.now();
          let res = null;
          try { res = pose.detect(v, ts); } catch (e) {}
          onFrame(res, ts, v.videoWidth / v.videoHeight);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => { stopped = true; stopCam(); };
  }, [facing, P, targetReps, holdTarget, soundEnabled]);

  const switchCam = () => {
    const next = facing === 'user' ? 'environment' : 'user';
    try { localStorage.setItem('rondoufit:formCam', next); } catch (e) {}
    setCount(0); setSec(0);
    setFacing(next);
  };
  const mirror = facing === 'user' ? { transform: 'scaleX(-1)' } : undefined;

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col h-[100dvh]" role="dialog" aria-label="Filmer ma série" data-testid="form-cam" style={{ margin: 0 }}>
      <div className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2">
        <button type="button" onClick={onClose} aria-label="Fermer la caméra" data-testid="form-cam-close" className="nav-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-xs font-black text-pink-300 uppercase tracking-wider">Analyse vidéo</p>
          <p className="text-sm font-bold text-white truncate">{item.name}</p>
        </div>
        <button type="button" onClick={switchCam} aria-label="Changer de caméra" title="Changer de caméra" data-testid="form-cam-switch" className="nav-btn"><Art name="repeat" size={20} bare /></button>
      </div>

      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0" style={mirror}>
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-contain" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        </div>
        {phase === 'rec' && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none">
            <p className="flex items-center gap-1.5 text-xs font-black text-rose-300"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />ANALYSE EN COURS</p>
            <p className="text-6xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] leading-none" data-testid="form-cam-count">{P.iso ? `${sec} s` : count}</p>
            <p className="text-xs font-bold text-slate-200 drop-shadow">{P.iso ? (holdTarget ? `sur ${holdTarget} s` : 'tenue') : targetReps ? `sur ${targetReps} reps` : 'reps'}</p>
          </div>
        )}
        {phase !== 'rec' && (
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-slate-950/85 border border-slate-700 p-3 text-center space-y-1.5" data-testid="form-cam-status">
            {phase === 'loading' && <p className="text-sm font-bold text-slate-200">Ouverture de la caméra et de la détection du corps… <span className="block text-xs text-slate-400 font-normal mt-0.5">La 1re fois, environ 20 Mo sont téléchargés (Wi-Fi conseillé).</span></p>}
            {phase === 'wait' && (<>
              <p className="text-base font-black text-white">Mets-toi en place</p>
              <p className="text-sm text-slate-300">{placementText(P)}</p>
              <p className="text-xs text-slate-400">L’analyse démarre toute seule dès que tout ton corps est visible.</p>
            </>)}
            {phase === 'analyzing' && <p className="text-base font-black text-white">Analyse de ta série…</p>}
            {phase === 'error' && <p className="text-sm font-bold text-rose-200" data-testid="form-cam-error">{err}</p>}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pt-3 pb-4 space-y-2 max-w-md w-full mx-auto">
        {info && <p className="text-center text-sm font-bold text-slate-300">{info}</p>}
        {phase === 'rec' ? (
          <button type="button" onClick={() => run.current && run.current.finish && run.current.finish()} data-key className="w-full py-4 rounded-2xl text-lg font-black text-white bg-pink-600 active:bg-pink-500" data-testid="form-cam-stop">{P.iso ? '■ Stop' : 'Série terminée'}</button>
        ) : (
          <button type="button" onClick={onClose} className="w-full py-3 rounded-2xl bg-slate-800 text-slate-100 font-bold">{phase === 'error' ? 'Fermer' : 'Annuler'}</button>
        )}
        {onStopAuto && phase !== 'rec' && <button type="button" onClick={onStopAuto} className="w-full py-1 text-xs font-bold text-slate-500 underline underline-offset-2" data-testid="form-cam-stop-auto">Ne plus filmer cet exercice</button>}
        <p className="text-center text-[11px] text-slate-500">La vidéo reste sur ton téléphone : rien n’est enregistré ni envoyé.</p>
      </div>
    </div>
  );
}
