// Petit jeu pendant le repos (4.18) : un personnage court sans fin ; il SAUTE au-dessus des haltères posés au sol et SE BAISSE
// sous les barres de traction. Style néon de l'appli : traits lumineux de la couleur du néon choisie, obstacles dans la couleur
// complémentaire (--key), fond noir.
// Fin du repos : la partie se met en PAUSE (gardée en mémoire) et reprend au repos suivant si elle n'était pas perdue.
import { useEffect, useRef, useState } from 'react';
import { Art } from './Art';

const W = 360;
const H = 340; // zone haute : de la place pour glisser le doigt (4.18.1)
const GROUND = 300;
const PLAYER_X = 46;
const STAND_H = 40;
const DUCK_H = 22;
const GRAVITY = 0.0028; // px / ms²
const JUMP_V = -0.626;  // px / ms : un saut monte à ≈ 70 px ; deux haltères empilés (≈ 80 px) demandent un DOUBLE saut
const STACK_H = 80;
const DOUBLE_KEY = 'rondoufit:gameDouble'; // double saut déjà réussi une fois : plus d'astuce
const BEST_KEY = 'rondoufit:gameBest';
const TUTO_KEY = 'rondoufit:gameTuto'; // les deux gestes ont été faits au moins une fois : plus de tuto
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
  // astuce « deux haltères : swipe 2 fois » à l'arrivée des premières piles, tant qu'aucun double saut n'a été fait
  const [hint, setHint] = useState(false);
  const doubleKnown = useRef((() => { try { return localStorage.getItem(DOUBLE_KEY) === '1'; } catch (e) { return false; } })());
  const learnDouble = () => { if (!doubleKnown.current) { doubleKnown.current = true; setHint(false); try { localStorage.setItem(DOUBLE_KEY, '1'); } catch (e) { /* rien */ } } };
  const hintRef = useRef(null);
  hintRef.current = () => { if (doubleKnown.current) return; setHint(true); setTimeout(() => setHint(false), 3500); };
  // tuto « swipe » (flèches haut / bas) en surbrillance à droite, jusqu'à ce que les deux gestes aient été faits une fois
  const [tuto, setTuto] = useState(() => { try { return localStorage.getItem(TUTO_KEY) !== '1'; } catch (e) { return true; } });
  const learned = useRef({ up: false, down: false });
  const learn = dir => {
    learned.current[dir] = true;
    if (learned.current.up && learned.current.down) { setTuto(false); try { localStorage.setItem(TUTO_KEY, '1'); } catch (e) { /* rien */ } }
  };
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
    if (s.y === 0) { s.vy = JUMP_V; s.duck = false; s.doubled = false; }
    else if (!s.doubled) { s.vy = JUMP_V; s.doubled = true; learnDouble(); } // 2e swipe en l'air : double saut
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
    const dumbbell = (x, w, cy, ph) => {
      line(x + 6, cy, x + w - 6, cy);
      ctx.strokeRect(x, cy - ph / 2, 7, ph);
      ctx.strokeRect(x + w - 7, cy - ph / 2, 7, ph);
    };
    const drawObstacle = o => {
      glow(key, 12);
      ctx.lineWidth = 3;
      if (o.kind === 'dumbbell') {
        dumbbell(o.x, o.w, GROUND - 9, 18);
      } else if (o.kind === 'stack') {
        // deux gros haltères posés l'un sur l'autre
        const ph = STACK_H / 2 - 2;
        dumbbell(o.x, o.w, GROUND - ph / 2 - 1, ph);
        dumbbell(o.x, o.w, GROUND - ph * 1.5 - 4, ph);
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
      if (o.kind === 'stack') return bottom > GROUND - STACK_H + 2;
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
          const r = Math.random();
          const stack = s.t > 7000 && r < 0.22;
          const bar = !stack && s.t > 4000 && r < 0.55;
          s.obstacles.push(stack ? { kind: 'stack', x: W + 10, w: 34 } : bar ? { kind: 'bar', x: W + 10, w: 34 } : { kind: 'dumbbell', x: W + 10, w: 30 });
          if (stack && hintRef.current) hintRef.current();
          s.nextIn = 650 + (stack ? 350 : 0) + Math.random() * 900 * (0.3 / s.speed);
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
          if (!sw.done && dy < -SWIPE) { sw.done = 'up'; jump(); learn('up'); }
          else if (sw.done !== 'down' && dy > SWIPE) { sw.done = 'down'; setDuck(true); learn('down'); }
        }}
        onPointerUp={e => { const sw = swipe.current; swipe.current = null; if (!sw) return; if (sw.done === 'down') setDuck(false); else if (!sw.done) jump(); }}
        onPointerCancel={() => { const sw = swipe.current; swipe.current = null; if (sw && sw.done === 'down') setDuck(false); }}>
        <canvas ref={canvasRef} style={{ width: '100%', aspectRatio: `${W} / ${H}` }}
          className="block rounded-2xl border border-slate-800" aria-label="Jeu : glisse vers le haut pour sauter au-dessus des haltères, vers le bas pour te baisser sous les barres" />
        {touch && tuto && !paused && !over && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 px-3 py-3 rounded-2xl border-2 game-tuto" data-testid="game-tuto">
            <Art name="arrowUp" size={30} bare />
            <span className="text-sm font-black uppercase tracking-widest">Swipe</span>
            <Art name="arrowDown" size={30} bare />
          </div>
        )}
        {hint && !paused && !over && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 px-3 py-2 rounded-xl border-2 game-hint text-sm font-black text-center whitespace-nowrap" data-testid="game-hint">
            <Art name="arrowUp" size={18} bare /><Art name="arrowUp" size={18} bare /> 2 haltères : swipe 2 fois !
          </div>
        )}
        {(paused || over) && (
          <button type="button" onClick={over ? restart : () => setPaused(false)} data-testid={over ? 'game-restart' : 'game-resume'}
            className="absolute inset-0 rounded-2xl bg-slate-950/70 flex flex-col items-center justify-center gap-1 text-white">
            <span className="text-lg font-black">{over ? 'Perdu !' : 'Partie en pause'}</span>
            <span className="text-xs text-slate-300">{over ? `Score ${score} · touche pour rejouer` : 'Touche pour reprendre'}</span>
          </button>
        )}
      </div>
      {!touch && <div className="grid grid-cols-2 gap-2">
        <button type="button" onPointerDown={e => { e.preventDefault(); setDuck(true); }} onPointerUp={() => setDuck(false)} onPointerLeave={() => setDuck(false)} onPointerCancel={() => setDuck(false)}
          className="tap-free py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-white select-none touch-none" data-testid="game-duck">▼ Se baisser</button>
        <button type="button" onPointerDown={e => { e.preventDefault(); jump(); }}
          className="tap-free py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-white select-none touch-none" data-testid="game-jump">▲ Sauter</button>
      </div>}
    </div>
  );
}
