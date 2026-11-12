import { useEffect, useMemo, useRef, useState } from 'react';
import { Art } from './Art';
import { loadPose, poseMock } from '../form/pose';
import { analyzeSet, bodyVisible, chinCalibration, liveCount } from '../form/analyze';
import { getChinCal, setChinCal } from '../form/calibration';
import { patternFor, placementText } from '../form/patterns';
import { playGameSound } from '../lib/sound';
import { drawSkeleton, neonColor } from '../form/draw';
import { pickMime, setClip } from '../form/clip';
import { pickPerson } from '../form/pickPerson';
import { lensesFor, nextZoom, savedLens, savedZoom, saveLens, saveZoom, zoomLevels, zoomText } from '../form/camZoom';

// Filmer une série (4.19) : la caméra du téléphone, le squelette détecté dessiné par-dessus, le compteur de reps en direct.
// L'enregistrement démarre tout seul quand le corps est entièrement visible depuis 1 s ; depuis 4.24 il ne s'arrête QUE
// quand la personne appuie sur « Série terminée » (ou au bout de 4 min).
// Puis l'analyse (form/analyze.js) est rendue à la séance guidée, qui l'affiche pendant le repos.
// 4.20 : la série est aussi enregistrée (MediaRecorder, en mémoire seulement : form/clip.js) pour revoir l'extrait d'un
// point relevé et, si la personne le choisit, garder la vidéo.
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
  const usesChin = (P.checks || []).includes('chin');
  const [calibMsg, setCalibMsg] = useState('');
  const [facing, setFacing] = useState(() => { try { return localStorage.getItem('rondoufit:formCam') || 'user'; } catch (e) { return 'user'; } });
  // zoom et objectif (4.30) : réglables avant l'enregistrement seulement
  const [lens, setLens] = useState(() => savedLens(facing));
  const [lenses, setLenses] = useState([]);
  const [zoomCaps, setZoomCaps] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [camReady, setCamReady] = useState(false);
  const trackRef = useRef(null);
  const run = useRef(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let stopped = false, raf = 0, timer = 0, stream = null;
    const r = { phase: 'loading', frames: [], visibleSince: null, recStart: 0, lastTs: 0, lostSince: null, count: 0, lastRepT: 0, countedAt: 0, aspect: 9 / 16, sec: 0, recorder: null, chunks: [], mime: '' };
    run.current = r;
    const go = p => { r.phase = p; if (!stopped) setPhase(p); };
    // calibration du menton (4.25) : la personne tient le menton au niveau de la barre ; mesuré quand c'est immobile
    r.startCalib = () => { if (r.phase === 'wait') { r.calib = []; r.calibAt = 0; setCalibMsg(''); go('calib'); } };
    r.cancelCalib = () => { if (r.phase === 'calib') { r.visibleSince = null; go('wait'); } };
    const stopCam = () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      if (stream) stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
      stream = null;
    };
    function setupTrack(track) {
      trackRef.current = track || null;
      let caps = {};
      try { caps = (track && track.getCapabilities && track.getCapabilities()) || {}; } catch (e) { caps = {}; }
      const zc = caps.zoom && caps.zoom.max > caps.zoom.min ? { min: caps.zoom.min, max: caps.zoom.max } : null;
      setZoomCaps(zc);
      if (zc) {
        let now = 1;
        try { now = Number(track.getSettings().zoom) || 1; } catch (e) { /* rien */ }
        const want = savedZoom(facing);
        const z = Math.min(zc.max, Math.max(zc.min, want || now));
        if (Math.abs(z - now) > 0.01) { try { track.applyConstraints({ advanced: [{ zoom: z }] }).catch(() => {}); } catch (e) { /* rien */ } }
        setZoom(z);
      }
      setCamReady(true);
    }
    const neon = neonColor();
    const draw = lm => drawSkeleton(canvasRef.current, videoRef.current, lm, { aspect: r.aspect, color: neon });

    // vidéo de la série : arrêt de l'enregistreur, puis la vidéo complète (ou rien si l'enregistrement n'a pas pu se faire)
    const stopRecorder = () => new Promise(done => {
      const rec = r.recorder;
      const mock = poseMock();
      if (!rec) return done(mock && mock.clip ? (mock.clip === true ? { blob: new Blob(['video'], { type: 'video/webm' }), url: 'blob:test-clip', mime: 'video/webm' } : mock.clip) : null);
      r.recorder = null;
      rec.onstop = () => {
        try {
          const blob = new Blob(r.chunks, { type: r.mime || rec.mimeType || 'video/webm' });
          done(blob.size ? { blob, url: URL.createObjectURL(blob), mime: blob.type } : null);
        } catch (e) { done(null); }
      };
      try { rec.stop(); } catch (e) { done(null); }
    });
    const finish = () => {
      if (r.phase !== 'rec') return;
      go('analyzing');
      const clipP = stopRecorder();
      clipP.then(() => stopCam());
      Promise.all([clipP, new Promise(ok => setTimeout(ok, 30))]).then(([clip]) => {
        if (stopped) return;
        const res = analyzeSet(r.frames, P, { aspect: r.aspect, targetReps, chinCal: getChinCal() });
        if (clip) {
          const id = `clip-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          setClip({ id, ...clip, frames: r.frames, t0: r.recStart, mirror: facing === 'user', aspect: r.aspect, name: item.name });
          res.clipId = id;
        } else setClip(null);
        const reached = holdTarget > 0 && r.lastTs - r.recStart >= holdTarget * 1000;
        doneRef.current(res, { sec: Math.max(1, Math.round((r.lastTs - r.recStart) / 1000)), reachedTarget: reached });
      });
    };
    r.finish = finish;

    const onFrame = (res, ts, aspect) => {
      if (stopped) return;
      r.aspect = aspect || r.aspect;
      // plusieurs personnes à l'image (4.31) : celle du premier plan, puis la même pendant la série
      const cands = res ? (res.all && res.all.length ? res.all : res.lm ? [res] : []) : [];
      if (cands.length) {
        const pk = pickPerson(cands, aspect || r.aspect, r.track, r.phase === 'rec');
        r.track = pk.track;
        res = pk.pose;
      }
      const lm = res && res.lm;
      draw(lm);
      const visible = !!lm && bodyVisible(lm, P);
      if (r.phase === 'calib') {
        r.calib.push({ t: ts, lm: lm || null, wl: (res && res.wl) || null });
        while (r.calib.length > 2 && ts - r.calib[0].t > 1500) r.calib.shift();
        if (++r.calibAt % 10 === 0) {
          const cal = chinCalibration(r.calib, { aspect: r.aspect });
          if (cal != null) {
            setChinCal(cal);
            setCalibMsg('Menton calibré. Redescends : l’analyse démarre quand tu es en place.');
            playGameSound('done', soundEnabled);
            try { navigator.vibrate && navigator.vibrate([100, 60, 100]); } catch (e) {}
            r.visibleSince = null;
            go('wait');
          }
        }
        return;
      }
      if (r.phase === 'wait') {
        // réglage du zoom / de l'objectif à l'instant : on laisse 2,5 s avant de démarrer
        if (r.holdUntil && Date.now() < r.holdUntil) { r.visibleSince = null; return; }
        if (visible) {
          if (r.visibleSince == null) r.visibleSince = ts;
          if (ts - r.visibleSince >= 1000) {
            r.recStart = ts; r.lastRepT = ts; r.frames = [];
            // enregistrement de la vidéo (en mémoire) en même temps que l'analyse
            if (stream && window.MediaRecorder) {
              try {
                r.mime = pickMime();
                r.chunks = [];
                const rec = new MediaRecorder(stream, r.mime ? { mimeType: r.mime, videoBitsPerSecond: 2500000 } : { videoBitsPerSecond: 2500000 });
                rec.ondataavailable = e => { if (e.data && e.data.size) r.chunks.push(e.data); };
                rec.start(1000);
                r.recorder = rec;
                r.recStart = performance.now();
              } catch (e) { r.recorder = null; }
            }
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
      if (P.iso) {
        const s = Math.floor((ts - r.recStart) / 1000);
        if (s !== r.sec) { r.sec = s; setSec(s); }
        // temps visé atteint : signal seulement, c'est la personne qui arrête (4.24)
        if (holdTarget > 0 && !r.holdSignaled && ts - r.recStart >= holdTarget * 1000) {
          r.holdSignaled = true;
          playGameSound('done', soundEnabled);
          try { navigator.vibrate && navigator.vibrate([150, 80, 300]); } catch (e) {}
        }
        if (r.frames.length >= MAX_FRAMES) finish();
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
      // plus d'arrêt automatique (4.24, demande de Gabin) : la personne appuie sur « Série terminée » quand toutes ses reps
      // sont faites ; seule limite, la durée maximale d'enregistrement.
      if (r.frames.length >= MAX_FRAMES) finish();
    };

    (async () => {
      go('loading');
      const mock = poseMock();
      try {
        if (!mock) {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('no camera'), { name: 'NotFoundError' });
          const size = { width: { ideal: 1280 }, height: { ideal: 720 } };
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: lens ? { deviceId: { exact: lens }, ...size } : { facingMode: facing, ...size } });
          } catch (e) {
            if (!lens) throw e;
            saveLens(facing, null); // objectif disparu (autre téléphone…) : caméra par défaut
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing, ...size } });
          }
          if (stopped) { stopCam(); return; }
          setupTrack(stream.getVideoTracks()[0]);
          navigator.mediaDevices.enumerateDevices && navigator.mediaDevices.enumerateDevices().then(ds => { if (!stopped) setLenses(lensesFor(ds, facing)); }).catch(() => {});
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
      if (mock && mock.camera) {
        // tests : fausse caméra avec zoom et objectifs
        const c = mock.camera;
        setupTrack({ getCapabilities: () => (c.zoom ? { zoom: c.zoom } : {}), getSettings: () => ({ zoom: c.now || 1 }), applyConstraints: o => { c.applied = o.advanced[0].zoom; return Promise.resolve(); } });
        setLenses(lensesFor(c.devices || [], facing));
      } else if (mock) setCamReady(true);
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
    return () => { stopped = true; try { r.recorder && r.recorder.stop(); } catch (e) {} stopCam(); };
  }, [facing, lens, P, targetReps, holdTarget, soundEnabled, item.name]);

  const switchCam = () => {
    const next = facing === 'user' ? 'environment' : 'user';
    try { localStorage.setItem('rondoufit:formCam', next); } catch (e) {}
    setCount(0); setSec(0);
    setZoomCaps(null); setLenses([]); setCamReady(false);
    setLens(savedLens(next));
    setFacing(next);
  };
  const levels = zoomLevels(zoomCaps);
  const setZoomTo = z => {
    const t = trackRef.current;
    if (!t || !zoomCaps) return;
    if (run.current) run.current.holdUntil = Date.now() + 2500;
    setZoom(z);
    saveZoom(facing, z);
    try { const p = t.applyConstraints({ advanced: [{ zoom: z }] }); if (p && p.catch) p.catch(() => {}); } catch (e) { /* rien */ }
  };
  const nextLens = () => {
    if (lenses.length < 2) return;
    const k = Math.max(0, lenses.findIndex(l => l.id === lens)); // sans choix : la caméra par défaut compte comme le n° 1
    const id = lenses[(k + 1) % lenses.length].id;
    saveLens(facing, id);
    saveZoom(facing, null); // chaque objectif repart de son zoom normal
    setCamReady(false);
    setLens(id);
  };
  const lensIdx = Math.max(0, lenses.findIndex(l => l.id === lens));
  const canTune = phase === 'wait' || phase === 'calib';
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
        {canTune && (zoomCaps || lenses.length > 1) && (
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5" data-testid="cam-tune">
            {zoomCaps && (
              <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700 rounded-xl p-1" data-testid="cam-zoom">
                <button type="button" onClick={() => setZoomTo(nextZoom(levels, zoom, -1))} disabled={zoom <= zoomCaps.min + 0.01} aria-label="Dézoomer" data-testid="cam-zoom-out" className="w-9 h-9 rounded-lg bg-slate-800 text-white text-xl font-black disabled:opacity-30">−</button>
                <span className="min-w-[3.2rem] text-center text-sm font-black text-white" data-testid="cam-zoom-value">{zoomText(zoom)}</span>
                <button type="button" onClick={() => setZoomTo(nextZoom(levels, zoom, 1))} disabled={zoom >= zoomCaps.max - 0.01} aria-label="Zoomer" data-testid="cam-zoom-in" className="w-9 h-9 rounded-lg bg-slate-800 text-white text-xl font-black disabled:opacity-30">+</button>
              </div>
            )}
            {lenses.length > 1 && (
              <button type="button" onClick={nextLens} data-testid="cam-lens" className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs font-black text-white">Objectif {lensIdx + 1}/{lenses.length}</button>
            )}
          </div>
        )}
        {phase === 'rec' && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none">
            <p className="flex items-center gap-1.5 text-xs font-black text-rose-300"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />ANALYSE EN COURS</p>
            <p className="text-6xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] leading-none" data-testid="form-cam-count">{P.iso ? `${sec} s` : count}</p>
            <p className="text-xs font-bold text-slate-200 drop-shadow">{P.iso ? (holdTarget ? `sur ${holdTarget} s` : 'tenue') : targetReps ? `sur ${targetReps} reps` : 'reps'}</p>
            <p className="text-[11px] font-bold text-slate-300 drop-shadow" data-testid="form-cam-count-note">compte indicatif</p>
          </div>
        )}
        {phase !== 'rec' && (
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-slate-950/85 border border-slate-700 p-3 text-center space-y-1.5" data-testid="form-cam-status">
            {phase === 'loading' && <p className="text-sm font-bold text-slate-200">Ouverture de la caméra et de la détection du corps… <span className="block text-xs text-slate-400 font-normal mt-0.5">La 1re fois, environ 20 Mo sont téléchargés (Wi-Fi conseillé).</span></p>}
            {phase === 'wait' && (<>
              <p className="text-base font-black text-white">Mets-toi en place</p>
              <p className="text-sm text-slate-300">{placementText(P)}</p>
              <p className="text-xs text-slate-400">L’analyse démarre toute seule dès que tout ton corps est visible.</p>
              {calibMsg && <p className="text-xs font-bold text-emerald-300" data-testid="chin-calib-done">{calibMsg}</p>}
              {camReady && (zoomCaps || lenses.length > 1) && <p className="text-xs text-slate-400">{zoomCaps && zoomCaps.min < 0.95 ? 'Tu peux dézoomer (grand angle) ou zoomer en haut à gauche, avant que l’analyse démarre.' : lenses.length > 1 ? 'Change d’objectif (grand angle…) ou de zoom en haut à gauche, avant que l’analyse démarre.' : 'Tu peux zoomer en haut à gauche, avant que l’analyse démarre.'}</p>}
              {camReady && !zoomCaps && lenses.length < 2 && <p className="text-[11px] text-slate-500" data-testid="cam-zoom-none">Zoom et grand angle : ce téléphone ne les donne pas au navigateur. Recule le téléphone si tu n’es pas en entier dans l’image.</p>}
              {usesChin && <button type="button" onClick={() => run.current && run.current.startCalib && run.current.startCalib()} className="mt-1 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-black text-white" data-testid="chin-calib">{getChinCal() ? 'Recalibrer le menton' : 'Calibrer le menton'}</button>}
            </>)}
            {phase === 'calib' && (<>
              <p className="text-base font-black text-white">Calibrer le menton</p>
              <p className="text-sm text-slate-300">Monte et garde le menton <b>juste au niveau de la barre</b>, sans bouger, 2 secondes (tu peux t’aider d’un banc).</p>
              <p className="text-xs text-slate-400">Ça règle la mesure sur ton visage et ta prise. À refaire si tu changes la place du téléphone.</p>
              <button type="button" onClick={() => run.current && run.current.cancelCalib && run.current.cancelCalib()} className="mt-1 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200" data-testid="chin-calib-cancel">Annuler</button>
            </>)}
            {phase === 'analyzing' && <p className="text-base font-black text-white">Analyse de ta série…</p>}
            {phase === 'error' && <p className="text-sm font-bold text-rose-200" data-testid="form-cam-error">{err}</p>}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pt-3 pb-4 space-y-2 max-w-md w-full mx-auto">
        {info && <p className="text-center text-sm font-bold text-slate-300">{info}</p>}
        {phase === 'rec' && <p className="text-center text-xs text-slate-400" data-testid="form-cam-manual">La vidéo tourne jusqu’à ce que tu appuies : termine toutes tes reps, puis touche le bouton.</p>}
        {phase === 'rec' ? (
          <button type="button" onClick={() => run.current && run.current.finish && run.current.finish()} data-key className="w-full py-4 rounded-2xl text-lg font-black text-white bg-pink-600 active:bg-pink-500" data-testid="form-cam-stop">{P.iso ? '■ Stop' : 'Série terminée'}</button>
        ) : (
          <button type="button" onClick={onClose} className="w-full py-3 rounded-2xl bg-slate-800 text-slate-100 font-bold">{phase === 'error' ? 'Fermer' : 'Annuler'}</button>
        )}
        {onStopAuto && phase !== 'rec' && <button type="button" onClick={onStopAuto} className="w-full py-1 text-xs font-bold text-slate-500 underline underline-offset-2" data-testid="form-cam-stop-auto">Ne plus filmer cet exercice</button>}
        <p className="text-center text-[11px] text-slate-500">La vidéo reste sur ton téléphone, rien n’est envoyé. Tu pourras la garder si tu veux.</p>
      </div>
    </div>
  );
}
