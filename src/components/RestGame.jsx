// Petit jeu pendant le repos (4.18) : un personnage court sans fin ; il SAUTE au-dessus des haltères posés au sol et SE BAISSE
// sous les barres de traction. Style néon de l'appli : traits lumineux de la couleur du néon choisie, obstacles dans la couleur
// complémentaire (--key), fond noir.
// Fin du repos : la partie se met en PAUSE (gardée en mémoire) et reprend au repos suivant si elle n'était pas perdue.
import { useEffect, useRef, useState } from 'react';

const W = 360;
const H = 170;
const GROUND = 140;
const PLAYER_X = 46;
const STAND_H = 40;
const DUCK_H = 22;
const GRAVITY = 0.0028; // px / ms²
const JUMP_V = -0.78;   // px / ms
const BEST_KEY = 'rondoufit:gameBest';
const SWIPE = 18; // px de glissement pour un saut / un « baissé »

const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; } };
const writeBest = v => { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* rien */ } };

// partie en cours, gardée d'un repos à l'autre (le composant disparaît à la fin du repos)
let saved = null;
/** Le jeu était ouvert au dernier repos : on le rouvre (en pause) au repos suivant. */
export const restGameWasOpen = () => !!(saved && saved.open);
export const closeRestGame = () => { if (saved) saved.open = false; };

const fresh = () => ({ t: 0, dist: 0, speed: 0.22, y: 0, vy: 0, duck: false, obstacles: [], nextIn: 900, over: false, open: true });

const cssColor = (name, fallback) => {
  try { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; } catch (e) { return fallback; }
};

export function RestGame({ onClose }) {
  const canvasRef = useRef(null);
  const st = useRef(saved && !saved.over ? { ...saved, open: true } : fresh());
  const [paused, setPaused] = useState(!!(saved && !saved.over && saved.t > 0)); // reprise d'une partie : on attend un toucher
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(Math.floor(st.current.dist / 10));
  const [best, setBest] = useState(readBest);
  const swipe = useRef(null);
  // téléphone (écran tactile) : tout se fait en glissant le doigt, sans boutons
  const touch = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // à la fin du repos (le composant disparaît) : partie gardée en pause
  useEffect(() => () => { saved = { ...st.current }; }, []);

  const jump = () => {
    const s = st.current;
    if (s.over) return;
    if (pausedRef.current) { setPaused(false); return; }
    if (s.y === 0) { s.vy = JUMP_V; s.duck = false; }
  };
  const setDuck = v => { const s = st.current; if (!s.over && !pausedRef.current) { s.duck = v; if (v && s.y < 0) s.vy = Math.max(s.vy, 0.6); } };
  const restart = () => { st.current = fresh(); setOver(false); setScore(0); setPaused(false); };

  // clavier (ordinateur) : espace / flèche haut = sauter, flèche bas = se baisser
  useEffect(() => {
    const down = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } if (e.code === 'ArrowDown') { e.preventDefault(); setDuck(true); } };
    const up = e => { if (e.code === 'ArrowDown') setDuck(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv && cv.getContext && cv.getContext('2d');
    if (!ctx) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const neon = cssColor('--neon', '#c6ff3d');
    const key = cssColor('--key', '#ff3d6e');
    let raf = 0;
    let last = 0;
    let lastScore = -1;

    const glow = (color, blur = 10) => { ctx.strokeStyle = color; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = blur; };
    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

    const drawPlayer = s => {
      glow(neon, 12);
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      const base = GROUND + s.y;
      const phase = Math.floor(s.t / 90) % 2;
      if (s.duck && s.y === 0) {
        // accroupi : tête basse, dos penché
        ctx.beginPath(); ctx.arc(PLAYER_X + 14, base - 17, 5, 0, Math.PI * 2); ctx.stroke();
        line(PLAYER_X - 6, base - 12, PLAYER_X + 9, base - 15);
        line(PLAYER_X - 6, base - 12, PLAYER_X - 10, base);
        line(PLAYER_X - 6, base - 12, PLAYER_X + 4, base);
        line(PLAYER_X + 4, base - 14, PLAYER_X + 14, base - 8);
      } else {
        ctx.beginPath(); ctx.arc(PLAYER_X, base - 34, 6, 0, Math.PI * 2); ctx.stroke();
        line(PLAYER_X, base - 28, PLAYER_X, base - 13); // buste
        if (s.y < 0) { line(PLAYER_X, base - 13, PLAYER_X - 7, base - 4); line(PLAYER_X, base - 13, PLAYER_X + 8, base - 6); }
        else if (phase) { line(PLAYER_X, base - 13, PLAYER_X - 8, base); line(PLAYER_X, base - 13, PLAYER_X + 6, base); }
        else { line(PLAYER_X, base - 13, PLAYER_X - 3, base); line(PLAYER_X, base - 13, PLAYER_X + 9, base - 2); }
        line(PLAYER_X, base - 24, phase ? PLAYER_X + 9 : PLAYER_X - 8, base - 17); // bras
      }
    };
    const drawObstacle = o => {
      glow(key, 12);
      ctx.lineWidth = 3;
      if (o.kind === 'dumbbell') {
        const y = GROUND - 9;
        line(o.x + 6, y, o.x + o.w - 6, y);
        ctx.strokeRect(o.x, y - 9, 7, 18);
        ctx.strokeRect(o.x + o.w - 7, y - 9, 7, 18);
      } else {
        // barre de traction : barre horizontale tenue par deux montants qui descendent du haut
        const y = GROUND - 30;
        line(o.x, y, o.x + o.w, y);
        line(o.x + 3, 0, o.x + 3, y);
        line(o.x + o.w - 3, 0, o.x + o.w - 3, y);
      }
    };
    const hit = (s, o) => {
      const ph = s.duck && s.y === 0 ? DUCK_H : STAND_H;
      const top = GROUND + s.y - ph;
      const bottom = GROUND + s.y;
      const left = PLAYER_X - 8;
      const right = PLAYER_X + (s.duck ? 16 : 9);
      if (right < o.x + 2 || left > o.x + o.w - 2) return false;
      if (o.kind === 'dumbbell') return bottom > GROUND - 18;
      return top < GROUND - 27; // la barre est à 30 px du sol : debout ou en l'air on la touche, accroupi on passe dessous
    };

    const frame = now => {
      const s = st.current;
      const dt = last ? Math.min(40, now - last) : 16;
      last = now;
      if (!pausedRef.current && !s.over) {
        s.t += dt;
        s.speed = Math.min(0.55, 0.22 + s.t / 90000);
        s.dist += s.speed * dt;
        // saut
        if (s.y < 0 || s.vy < 0) { s.vy += GRAVITY * dt; s.y = Math.min(0, s.y + s.vy * dt); if (s.y === 0) s.vy = 0; }
        // obstacles
        s.nextIn -= dt;
        if (s.nextIn <= 0) {
          const bar = s.t > 4000 && Math.random() < 0.38;
          s.obstacles.push(bar ? { kind: 'bar', x: W + 10, w: 34 } : { kind: 'dumbbell', x: W + 10, w: 30 });
          s.nextIn = 650 + Math.random() * 900 * (0.3 / s.speed);
        }
        s.obstacles.forEach(o => { o.x -= s.speed * dt; });
        s.obstacles = s.obstacles.filter(o => o.x + o.w > -10);
        if (s.obstacles.some(o => hit(s, o))) {
          s.over = true;
          const sc = Math.floor(s.dist / 10);
          if (sc > readBest()) { writeBest(sc); setBest(sc); }
          setOver(true);
        }
        const sc = Math.floor(s.dist / 10);
        if (sc !== lastScore) { lastScore = sc; setScore(sc); }
      }
      // dessin
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, W, H);
      glow(neon, 8); ctx.lineWidth = 2;
      line(0, GROUND + 1, W, GROUND + 1);
      // petits traits du sol qui défilent
      ctx.shadowBlur = 0; ctx.globalAlpha = 0.35;
      for (let i = 0; i < 9; i++) { const x = ((i * 47 - s.dist * 0.9) % W + W) % W; line(x, GROUND + 8, x + 10, GROUND + 8); }
      ctx.globalAlpha = 1;
      s.obstacles.forEach(drawObstacle);
      drawPlayer(s);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="w-full space-y-2" data-testid="rest-game">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-slate-400">Record : <span className="text-white" data-testid="game-best">{best}</span></span>
        <span className="text-pink-300 font-black" data-testid="game-score">{score}</span>
        <button type="button" onClick={() => { closeRestGame(); onClose && onClose(); }} className="text-slate-400 underline" data-testid="game-close">Fermer le jeu</button>
      </div>
      {/* au doigt : glisser vers le HAUT = sauter (saut complet), glisser vers le BAS = se baisser tant que le doigt reste posé ;
          un simple toucher = sauter */}
      <div className="relative touch-none select-none" data-testid="game-area"
        onPointerDown={e => { swipe.current = { y: e.clientY, done: false, id: e.pointerId }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* rien */ } }}
        onPointerMove={e => {
          const sw = swipe.current;
          if (!sw || sw.id !== e.pointerId) return;
          const dy = e.clientY - sw.y;
          if (!sw.done && dy < -SWIPE) { sw.done = 'up'; jump(); }
          else if (sw.done !== 'down' && dy > SWIPE) { sw.done = 'down'; setDuck(true); }
        }}
        onPointerUp={e => { const sw = swipe.current; swipe.current = null; if (!sw) return; if (sw.done === 'down') setDuck(false); else if (!sw.done) jump(); }}
        onPointerCancel={() => { const sw = swipe.current; swipe.current = null; if (sw && sw.done === 'down') setDuck(false); }}>
        <canvas ref={canvasRef} style={{ width: '100%', aspectRatio: `${W} / ${H}` }}
          className="block rounded-2xl border border-slate-800" aria-label="Jeu : glisse vers le haut pour sauter au-dessus des haltères, vers le bas pour te baisser sous les barres" />
        {(paused || over) && (
          <button type="button" onClick={over ? restart : () => setPaused(false)} data-testid={over ? 'game-restart' : 'game-resume'}
            className="absolute inset-0 rounded-2xl bg-slate-950/70 flex flex-col items-center justify-center gap-1 text-white">
            <span className="text-lg font-black">{over ? 'Perdu !' : 'Partie en pause'}</span>
            <span className="text-xs text-slate-300">{over ? `Score ${score} · touche pour rejouer` : 'Touche pour reprendre'}</span>
          </button>
        )}
      </div>
      {touch
        ? <p className="text-xs text-slate-400 text-center" data-testid="game-help">Glisse vers le haut pour sauter · vers le bas (et garde le doigt) pour te baisser</p>
        : <div className="grid grid-cols-2 gap-2">
        <button type="button" onPointerDown={e => { e.preventDefault(); setDuck(true); }} onPointerUp={() => setDuck(false)} onPointerLeave={() => setDuck(false)} onPointerCancel={() => setDuck(false)}
          className="tap-free py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-white select-none touch-none" data-testid="game-duck">▼ Se baisser</button>
        <button type="button" onPointerDown={e => { e.preventDefault(); jump(); }}
          className="tap-free py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-white select-none touch-none" data-testid="game-jump">▲ Sauter</button>
      </div>}
    </div>
  );
}
