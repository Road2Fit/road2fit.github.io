import { musclesOf } from './muscles';
import { currentLook, lookFor } from './avatar';
import { Aura, HeadBackSide, HeadFrontBack, HeadFrontItems, HeadSideItems, HeadTopItems, LegItems, LogoSide, NeckFront, NeckSide, NumberFront, PatternDefs, Strap, WaistFront, WaistSide, WristItems, handColor } from './avatarItems';
import { ik, poseAt, SEG, solveFront, solvePose, solveTop, tracePath, traceFront, traceTop } from './skeleton';

// Dessin SVG d'une scène à un instant donné : décor (machine, banc…), personnage habillé, muscles (rouges, selon l'effort), charge, trajet.
// scene = { keys:[poses], trace:'wrist'|'ankle'|…, equip:[éléments fixes], follow:[éléments liés au corps] }
// Éléments fixes : pad, rect, circle, line, stack, pulley, post · liés : plate, db, handle, cable, lever, ball

const C = {
  frame: '#6b7280', frameDark: '#4b5563', pad: '#7b8492', plate: '#a9b0ba', plateIn: '#d1d5db',
  trace: '#fbbf24', ground: '#2e323a', cable: '#cbd5e1', accent: '#38bdf8', bg: '#1f2228',
};
// Tenue du personnage : celle de l'avatar de la personne (anim/avatar.js, 4.39), sinon le personnage d'avant.
// L.top : tee | tank | long | bra ; L.bottom : shorts | bike | leggings | joggers ; L.hairStyle ; L.body : m | f.
const BAD = { shirt: '#b4233c', shirtFar: '#8a1a2e', line: '#6d1424' }; // erreur fréquente : maillot rouge
const MUSCLE = '#e5484d';

function Fixed({ e, i }) {
  switch (e.k) {
    case 'pad': return <line key={i} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke={e.dark ? C.frameDark : C.pad} strokeWidth={e.w || 9} strokeLinecap="round" />;
    case 'line': return <line key={i} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke={e.c || C.frame} strokeWidth={e.w || 3} strokeLinecap="round" strokeDasharray={e.dash} />;
    case 'rect': return <rect key={i} x={e.x} y={e.y} width={e.w} height={e.h} rx={e.r === undefined ? 2 : e.r} fill={e.c || C.frame} opacity={e.o || 1} />;
    case 'circle': return <circle key={i} cx={e.c[0]} cy={e.c[1]} r={e.r} fill={e.fill || 'none'} stroke={e.stroke || C.frame} strokeWidth={e.w || 2} />;
    case 'pulley': return <g key={i}><circle cx={e.c[0]} cy={e.c[1]} r={e.r || 6} fill={C.frameDark} stroke={C.plate} strokeWidth="2" /><circle cx={e.c[0]} cy={e.c[1]} r="1.6" fill={C.plateIn} /></g>;
    case 'stack': {
      const n = e.n || 8; const hh = e.h / n;
      return (
        <g key={i}>
          <rect x={e.x - 2} y={e.y - 3} width={e.w + 4} height={e.h + 6} rx="3" fill="none" stroke={C.frame} strokeWidth="2" />
          {Array.from({ length: n }, (_, k) => <rect key={k} x={e.x + 1} y={e.y + k * hh + 1} width={e.w - 2} height={hh - 2} rx="1.5" fill={k === (e.sel === undefined ? 2 : e.sel) ? C.accent : C.frameDark} />)}
        </g>
      );
    }
    case 'text': return <text key={i} x={e.p[0]} y={e.p[1]} fontSize={e.s || 9} fill={e.c || '#94a3b8'} textAnchor={e.anchor || 'start'} fontWeight="700">{e.t}</text>;
    default: return null;
  }
}

function Follow({ e, j, i }) {
  const p0 = j[e.at || 'wrist'] || j.wrist;
  const p = e.k === 'padAt' ? p0 : [p0[0] + (e.dx || 0), p0[1] + (e.dy || 0)];
  switch (e.k) {
    case 'plate': return <g key={i} opacity="0.88"><circle cx={p[0]} cy={p[1]} r={e.r || 13} fill={C.plate} stroke={C.plateIn} strokeWidth="2" /><circle cx={p[0]} cy={p[1]} r="3.2" fill="#1e293b" /></g>;
    case 'db': return <g key={i}><circle cx={p[0]} cy={p[1]} r={e.r || 7} fill={C.plate} stroke={C.plateIn} strokeWidth="1.5" /><circle cx={p[0]} cy={p[1]} r="2" fill="#1e293b" /></g>;
    case 'ball': return <circle key={i} cx={p[0]} cy={p[1]} r={e.r || 10} fill="#f59e0b" stroke="#fde68a" strokeWidth="2" />;
    case 'handle': return <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={C.plateIn} />;
    case 'cable': return <line key={i} x1={e.from[0]} y1={e.from[1]} x2={p[0]} y2={p[1]} stroke={C.cable} strokeWidth="1.6" strokeDasharray={e.dash} />;
    case 'lever': return <g key={i}><line x1={e.pivot[0]} y1={e.pivot[1]} x2={p[0]} y2={p[1]} stroke={C.pad} strokeWidth={e.w || 7} strokeLinecap="round" /><circle cx={e.pivot[0]} cy={e.pivot[1]} r="4" fill={C.frameDark} stroke={C.plate} strokeWidth="1.5" /></g>;
    case 'seg': { const a = j[e.a]; const b = j[e.b]; return <line key={i} x1={a[0] + (e.dx || 0)} y1={a[1] + (e.dy || 0)} x2={b[0] + (e.dx || 0)} y2={b[1] + (e.dy || 0)} stroke={e.c || C.pad} strokeWidth={e.w || 9} strokeLinecap="round" />; }
    case 'padAt': return <rect key={i} x={p[0] + (e.dx || 0)} y={p[1] + (e.dy || 0)} width={e.w || 20} height={e.h || 6} rx="3" fill={C.pad} />;
    case 'tilt': { const a = (e.ang * Math.PI) / 180; const u = [Math.cos(a) * e.len / 2, Math.sin(a) * e.len / 2]; return <line key={i} x1={p[0] - u[0]} y1={p[1] - u[1]} x2={p[0] + u[0]} y2={p[1] + u[1]} stroke={C.pad} strokeWidth={e.w || 8} strokeLinecap="round" />; }
    case 'bar': return <line key={i} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke={C.plate} strokeWidth="3" />;
    default: return null;
  }
}

/** Membre qui s'affine, bouts arrondis. */
function Taper({ a, b, ra, rb, c }) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [[a[0] + nx * ra, a[1] + ny * ra], [b[0] + nx * rb, b[1] + ny * rb], [b[0] - nx * rb, b[1] - ny * rb], [a[0] - nx * ra, a[1] - ny * ra]];
  return (
    <g fill={c}>
      <polygon points={pts.map(p => p.join(',')).join(' ')} />
      <circle cx={a[0]} cy={a[1]} r={ra} />
      <circle cx={b[0]} cy={b[1]} r={rb} />
    </g>
  );
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rNum = n => Math.round(n * 100) / 100;
const xy = p => `${rNum(p[0])} ${rNum(p[1])}`;
const unit = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
const ARM_ZONES = ['shoulder', 'biceps', 'triceps', 'forearm'];
const isArmZone = m => ARM_ZONES.includes(m.z);

/** Bras : manche sur le haut, peau ensuite, poing. `far` = côté éloigné (plus sombre). */
function Arm({ s, e, w, fist, L, far = false, main = false }) {
  const shirt = far ? L.shirtFar : L.shirt;
  const skin = far ? L.skinFar : L.skin;
  const hand = handColor(L, skin);
  const k = far ? 0.88 : 1;
  const top = L.top || 'tee';
  return (
    <g>
      <Taper a={e} b={w} ra={3.3 * k} rb={2.5 * k} c={skin} />
      <Taper a={s} b={e} ra={4.3 * k} rb={3.4 * k} c={skin} />
      {top === 'tee' && <Taper a={s} b={mix(s, e, 0.62)} ra={4.6 * k} rb={4 * k} c={shirt} />}
      {top === 'long' && <><Taper a={s} b={e} ra={4.6 * k} rb={3.7 * k} c={shirt} /><Taper a={e} b={w} ra={3.6 * k} rb={2.8 * k} c={shirt} /></>}
      {L.items && <WristItems L={L} e={e} w={w} k={k} main={main} />}
      {fist ? <Taper a={w} b={fist} ra={3.1 * k} rb={3.3 * k} c={hand} /> : <circle cx={w[0]} cy={w[1]} r={3.6 * k} fill={hand} />}
      {L.items && <Strap L={L} w={w} fist={fist} />}
    </g>
  );
}

/** Jambe : short sur le haut de la cuisse, peau, chaussure. */
function Leg({ h, k: kn, a, t, L, far = false }) {
  const shorts = far ? L.shortsFar : L.shorts;
  const skin = far ? L.skinFar : L.skin;
  const shoe = far ? L.shoeFar : L.shoe;
  const z = far ? 0.9 : 1;
  return (
    <g>
      <Taper a={kn} b={a} ra={4.2 * z} rb={2.9 * z} c={skin} />
      <Taper a={h} b={kn} ra={5.6 * z} rb={4.3 * z} c={skin} />
      {(!L.bottom || L.bottom === 'shorts') && <Taper a={h} b={mix(h, kn, 0.72)} ra={6 * z} rb={5 * z} c={shorts} />}
      {L.bottom === 'bike' && <Taper a={h} b={mix(h, kn, 0.95)} ra={6 * z} rb={4.6 * z} c={shorts} />}
      {L.bottom === 'leggings' && <><Taper a={h} b={kn} ra={5.8 * z} rb={4.5 * z} c={shorts} /><Taper a={kn} b={a} ra={4.4 * z} rb={3.1 * z} c={shorts} /></>}
      {L.bottom === 'joggers' && <><Taper a={h} b={kn} ra={6.3 * z} rb={5 * z} c={shorts} /><Taper a={kn} b={a} ra={5 * z} rb={3.7 * z} c={shorts} /></>}
      <Taper a={a} b={t} ra={3.4 * z} rb={2.7 * z} c={shoe} />
      {L.items && <LegItems L={L} h={h} kn={kn} a={a} t={t} z={z} Taper={Taper} />}
    </g>
  );
}

/** Tête de profil : `up` = sens du haut du crâne ; le visage est du côté `front` (1 = à droite du haut du crâne, -1 = à gauche). */
function HeadSide({ c, up, L, face = 1 }) {
  const ang = (Math.atan2(up[1], up[0]) * 180) / Math.PI;
  const hs = L.hairStyle || 'short';
  return (
    <g transform={`translate(${rNum(c[0])},${rNum(c[1])}) rotate(${rNum(ang + 90)}) scale(${face},1)`}>
      {L.items && <HeadBackSide L={L} />}
      {hs === 'ponytail' && <ellipse cx="-11" cy="3" rx="3" ry="6.5" transform="rotate(18 -11 3)" fill={L.hair} />}
      {hs === 'bun' && <circle cx="-5.6" cy="-8.4" r="4.2" fill={L.hair} />}
      {hs === 'curly' && <circle cx="-1" cy="-1.4" r="10.8" fill={L.hair} />}
      {hs === 'scarf' && <circle cx="-0.6" cy="-0.2" r="10.6" fill={L.hair} />}
      {hs === 'scarf' ? <ellipse cx="3.6" cy="1" rx="5.6" ry="7.2" fill={L.skin} /> : <circle r="9" fill={L.skin} />}
      {hs !== 'none' && hs !== 'scarf' && <path d="M-3.7 8.8 A9.5 9.5 0 1 1 9.3 -2 Q1 -3.4 -3.7 8.8 Z" fill={L.hair} opacity={hs === 'buzz' ? 0.55 : 1} />}
      {hs !== 'scarf' && <circle cx="-0.7" cy="0.7" r="1.9" fill={L.skinFar} />}
      <circle cx="5.6" cy="-1.3" r="1.1" fill={L.eye} />
      <path d="M8.6 0.4 L10.3 1.9 L8.3 2.5 Z" fill={L.skin} />
      {L.items && <HeadSideItems L={L} />}
    </g>
  );
}

function HeadFront({ c, back, L }) {
  const [x, y] = [rNum(c[0]), rNum(c[1])];
  const hs = L.hairStyle || 'short';
  if (back) {
    return (
      <g>
        {L.items && <HeadFrontBack L={L} x={x} y={y} back />}
        {hs === 'bun' && <circle cx={x} cy={y - 9.4} r="4.2" fill={L.hair} />}
        {hs !== 'scarf' && <><ellipse cx={x - 9.2} cy={y + 1} rx="1.8" ry="2.8" fill={L.skin} /><ellipse cx={x + 9.2} cy={y + 1} rx="1.8" ry="2.8" fill={L.skin} /></>}
        <circle cx={x} cy={y} r={hs === 'curly' ? 11 : hs === 'scarf' ? 10.8 : 9.4} fill={hs === 'none' ? L.skin : L.hair} opacity={hs === 'buzz' ? 0.7 : 1} />
        {hs === 'buzz' && <circle cx={x} cy={y} r="9.4" fill={L.skin} opacity="0.35" />}
        {hs === 'ponytail' && <ellipse cx={x} cy={y + 10} rx="3" ry="6.2" fill={L.hair} />}
        {L.items && <HeadFrontItems L={L} x={x} y={y} back />}
        <path d={`M${x - 5} ${y + 6.8} Q${x} ${y + 4.6} ${x + 5} ${y + 6.8} L${x + 4} ${y + 10} L${x - 4} ${y + 10} Z`} fill={L.skin} />
      </g>
    );
  }
  return (
    <g>
      {hs === 'bun' && <circle cx={x} cy={y - 10.4} r="4" fill={L.hair} />}
      {hs === 'curly' && <circle cx={x} cy={y - 1.5} r="11" fill={L.hair} />}
      {hs === 'scarf' && <circle cx={x} cy={y} r="10.8" fill={L.hair} />}
      {hs !== 'scarf' && <><ellipse cx={x - 9.2} cy={y + 1} rx="1.8" ry="2.8" fill={L.skinFar} /><ellipse cx={x + 9.2} cy={y + 1} rx="1.8" ry="2.8" fill={L.skinFar} /></>}
      {hs === 'scarf' ? <ellipse cx={x} cy={y + 1.2} rx="6.3" ry="7.4" fill={L.skin} /> : <circle cx={x} cy={y} r="9" fill={L.skin} />}
      {hs !== 'none' && hs !== 'scarf' && <path d={`M${x - 9.4} ${y - 1} A9.5 9.5 0 0 1 ${x + 9.4} ${y - 1} Q${x} ${y - 6.5} ${x - 9.4} ${y - 1} Z`} fill={L.hair} opacity={hs === 'buzz' ? 0.55 : 1} />}
      <circle cx={x - 3.4} cy={y + 0.8} r="1.1" fill={L.eye} />
      <circle cx={x + 3.4} cy={y + 0.8} r="1.1" fill={L.eye} />
      <path d={`M${x - 2.4} ${y + 4.8} Q${x} ${y + 5.8} ${x + 2.4} ${y + 4.8}`} fill="none" stroke={L.skinFar} strokeWidth="0.9" strokeLinecap="round" />
      {L.items && <HeadFrontItems L={L} x={x} y={y} />}
    </g>
  );
}

/** Bande rouge le long d'un segment, décalée de `off` selon la direction `n`. */
function Band({ a, b, n = [0, 0], off = 0, w, op }) {
  const p = t => [a[0] + (b[0] - a[0]) * t + n[0] * off, a[1] + (b[1] - a[1]) * t + n[1] * off];
  const [x1, y1] = p(0.2);
  const [x2, y2] = p(0.8);
  return <line x1={rNum(x1)} y1={rNum(y1)} x2={rNum(x2)} y2={rNum(y2)} stroke={MUSCLE} strokeWidth={w} strokeLinecap="round" opacity={op} />;
}
const Dot = ({ p, r, op }) => <circle cx={rNum(p[0])} cy={rNum(p[1])} r={r} fill={MUSCLE} opacity={op} />;

const levelOp = (lvl, effort) => rNum(Math.min(0.92, lvl * (0.2 + 0.75 * effort)));
/** Direction perpendiculaire à a→b, du côté du point `toward` (si le membre est tendu : du côté de `fallback`). */
function sideOf(a, b, toward, fallback) {
  const u = unit(a, b);
  const n = [-u[1], u[0]];
  const d = (toward[0] - a[0]) * n[0] + (toward[1] - a[1]) * n[1];
  if (Math.abs(d) < 1.5) return n[0] * fallback[0] + n[1] * fallback[1] >= 0 ? n : [-n[0], -n[1]];
  return d >= 0 ? n : [-n[0], -n[1]];
}

/** Muscles de profil, placés du bon côté du membre (biceps à l'intérieur du coude, ischios derrière la cuisse…). */
function sideMuscles(j, muscles, effort, Q, front) {
  const out = [];
  const back = [-front[0], -front[1]];
  const armIn = sideOf(j.shoulder, j.elbow, j.wrist, front);
  const legBack = sideOf(j.hip, j.knee, j.ankle, back);
  const footDir = unit(j.ankle, j.toe);
  const calf = sideOf(j.knee, j.ankle, [j.ankle[0] - footDir[0] * 9, j.ankle[1] - footDir[1] * 9], back);
  muscles.forEach(({ z, lvl }) => {
    const op = levelOp(lvl, effort);
    if (z === 'chest') out.push(<path key={z} d={`M${xy(Q(1.5, 0.08))} Q${xy(Q(10, 0.26))} ${xy(Q(3.5, 0.46))} Q${xy(Q(-1, 0.28))} ${xy(Q(1.5, 0.08))}Z`} fill={MUSCLE} opacity={op} />);
    if (z === 'back') out.push(<path key={z} d={`M${xy(Q(-1, 0.1))} Q${xy(Q(-8, 0.42))} ${xy(Q(-4.2, 0.72))} Q${xy(Q(1, 0.46))} ${xy(Q(-1, 0.1))}Z`} fill={MUSCLE} opacity={op} />);
    if (z === 'core') out.push(<path key={z} d={`M${xy(Q(1, 0.44))} L${xy(Q(6.6, 0.44))} Q${xy(Q(6.8, 0.65))} ${xy(Q(5, 0.88))} L${xy(Q(0, 0.88))}Z`} fill={MUSCLE} opacity={op} />);
    if (z === 'shoulder') out.push(<Dot key={z} p={j.shoulder} r={5} op={op} />);
    if (z === 'biceps') out.push(<Band key={z} a={j.shoulder} b={j.elbow} n={armIn} off={1.4} w={4.4} op={op} />);
    if (z === 'triceps') out.push(<Band key={z} a={j.shoulder} b={j.elbow} n={armIn} off={-1.4} w={4.4} op={op} />);
    if (z === 'forearm') out.push(<Band key={z} a={j.elbow} b={j.wrist} n={armIn} w={3.6} op={op} />);
    if (z === 'glutes') out.push(<Dot key={z} p={Q(-3.2, 1.04)} r={5.6} op={op} />);
    if (z === 'quads') out.push(<Band key={z} a={j.hip} b={j.knee} n={legBack} off={-1.8} w={6} op={op} />);
    if (z === 'hams') out.push(<Band key={z} a={j.hip} b={j.knee} n={legBack} off={1.8} w={6} op={op} />);
    if (z === 'calves') out.push(<Band key={z} a={j.knee} b={mix(j.knee, j.ankle, 0.8)} n={calf} off={1} w={4.6} op={op} />);
  });
  return out;
}

/** Muscles du buste et des jambes vus de face ou de dos : seuls ceux qu'on voit de ce côté-là. */
function frontBodyMuscles(f, muscles, effort, back, { X, cy, waist, sw, flare }) {
  const out = [];
  const H = f.hy - cy;
  const mid = rNum(cy + H * 0.5);
  muscles.forEach(({ z, lvl }) => {
    const op = levelOp(lvl, effort);
    if (z === 'chest' && !back) [-1, 1].forEach(d => out.push(<ellipse key={z + d} cx={rNum(X + d * sw * 0.45)} cy={rNum(cy + H * 0.2)} rx={rNum(sw * 0.44)} ry={rNum(Math.max(2.5, H * 0.15))} fill={MUSCLE} opacity={op} />));
    if (z === 'core' && !back) out.push(<rect key={z} x={rNum(X - 6)} y={rNum(cy + H * 0.4)} width="12" height={rNum(H * 0.5)} rx="3" fill={MUSCLE} opacity={op} />);
    if (z === 'back') {
      [-1, 1].forEach(d => out.push(<path key={z + d} d={`M${rNum(X + d * (sw + 1))} ${rNum(cy + 3)} Q${rNum(X + d * (sw + flare - 1))} ${mid} ${rNum(X + d * 9)} ${rNum(waist - 1)} Q${rNum(X + d * 4)} ${rNum(mid + 4)} ${rNum(X + d * 6)} ${rNum(cy + 8)}Z`} fill={MUSCLE} opacity={back ? op : rNum(op * 0.55)} />));
      if (back) out.push(<path key="traps" d={`M${X - 7} ${rNum(cy + 2)} L${X + 7} ${rNum(cy + 2)} L${X + 2.6} ${mid} L${X - 2.6} ${mid}Z`} fill={MUSCLE} opacity={rNum(op * 0.8)} />);
    }
    if (z === 'glutes' && back) [-1, 1].forEach(d => out.push(<ellipse key={z + d} cx={f.c + d * 6} cy={f.hy + 2} rx="6" ry="6.5" fill={MUSCLE} opacity={op} />));
    [f.L, f.R].forEach((sd, k) => {
      const id = z + k;
      if (z === 'quads' && !back) out.push(<Band key={id} a={sd.hip} b={sd.knee} w={6.5} op={op} />);
      if (z === 'hams' && back) out.push(<Band key={id} a={sd.hip} b={sd.knee} w={6.5} op={op} />);
      if (z === 'calves' && back) out.push(<Band key={id} a={sd.knee} b={mix(sd.knee, sd.ankle, 0.8)} w={5} op={op} />);
    });
  });
  return out;
}

/** Muscles des bras (vue de face, de dos ou de dessus). Celui qu'on voit moins de ce côté-là reste plus pâle. */
function armMuscles(sides, muscles, effort, back) {
  const out = [];
  muscles.forEach(({ z, lvl }) => {
    const op = levelOp(lvl, effort);
    const dim = rNum(op * 0.55);
    sides.forEach((sd, k) => {
      const id = z + k;
      if (z === 'shoulder') out.push(<Dot key={id} p={sd.shoulder} r={5} op={op} />);
      if (z === 'biceps') out.push(<Band key={id} a={sd.shoulder} b={sd.elbow} w={5} op={back ? dim : op} />);
      if (z === 'triceps') out.push(<Band key={id} a={sd.shoulder} b={sd.elbow} w={5} op={back ? op : dim} />);
      if (z === 'forearm' && sd.wrist) out.push(<Band key={id} a={sd.elbow} b={sd.wrist} w={3.6} op={op} />);
    });
  });
  return out;
}

function Trace({ tr }) {
  const a = tr[tr.length - 1];
  const b = tr[Math.max(0, tr.length - 4)];
  const ang = (Math.atan2(a[1] - b[1], a[0] - b[0]) * 180) / Math.PI;
  return (
    <g>
      <polyline points={tr.map(q => q.map(rNum).join(',')).join(' ')} fill="none" stroke={C.trace} strokeWidth="2" strokeDasharray="4 4" opacity="0.9" />
      <circle cx={rNum(tr[0][0])} cy={rNum(tr[0][1])} r="3" fill="none" stroke={C.trace} strokeWidth="1.5" />
      <polygon points="0,0 -8,-4 -8,4" fill={C.trace} transform={`translate(${rNum(a[0])},${rNum(a[1])}) rotate(${rNum(ang)})`} />
    </g>
  );
}

// Cadrage automatique : la scène remplit l'image (personnage, machine et trajet compris), sans bouger d'une image à l'autre.
const BOXES = new WeakMap();
const VIEW_RATIO = 320 / 244;
function jointsOf(scene, pose) {
  if (scene.view === 'top') { const t = solveTop(pose); return [t.head, t.hipL, t.hipR, ...[t.L, t.R].flatMap(a => [a.shoulder, a.elbow, a.wrist])]; }
  if (scene.view === 'front') {
    const f = solveFront(pose);
    return [f.headC, ...[f.L, f.R].flatMap(a => (scene.noLegs ? [a.shoulder, a.elbow, a.wrist] : [a.shoulder, a.elbow, a.wrist, a.hip, a.knee, a.ankle]))];
  }
  const j = solvePose(pose);
  return [j.hip, j.shoulder, j.headC, j.elbow, j.wrist, j.fist, j.knee, j.ankle, j.toe, j.farElbow, j.farWrist, j.farKnee, j.farAnkle].filter(Boolean);
}
function equipPoints(scene) {
  const out = [];
  (scene.equip || []).forEach(e => {
    if (e.a) out.push(e.a, e.b);
    if (e.k === 'text') { const w = String(e.t).length * (e.s || 9) * 0.55; const x = e.anchor === 'middle' ? e.p[0] - w / 2 : e.anchor === 'end' ? e.p[0] - w : e.p[0]; out.push([x, e.p[1] - (e.s || 9)], [x + w, e.p[1] + 2]); }
    if (e.k === 'rect' || e.k === 'stack') out.push([e.x, e.y], [e.x + e.w, e.y + e.h]);
    if ((e.k === 'circle' || e.k === 'pulley') && e.c) { const r = e.r || 6; out.push([e.c[0] - r, e.c[1] - r], [e.c[0] + r, e.c[1] + r]); }
  });
  (scene.follow || []).forEach(e => {
    if (e.from) out.push(e.from);
    if (e.pivot) out.push(e.pivot);
    if (e.a && e.b && Array.isArray(e.a)) out.push(e.a, e.b);
  });
  return out;
}
export function sceneBox(scene) {
  if (scene.box) return scene.box;
  if (BOXES.has(scene)) return BOXES.get(scene);
  const pts = [...equipPoints(scene)];
  for (let i = 0; i <= 8; i++) pts.push(...jointsOf(scene, poseAt(scene.keys, i / 8)));
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const m = 15;
  let x0 = Math.min(...xs) - m;
  let x1 = Math.max(...xs) + m;
  let y0 = Math.min(...ys) - m;
  let y1 = Math.max(...ys) + m;
  if (scene.view !== 'top') y1 = Math.max(y1, 208); // le sol reste visible
  let w = x1 - x0;
  let h = y1 - y0;
  if (w / h < VIEW_RATIO) { const nw = h * VIEW_RATIO; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / VIEW_RATIO; y0 -= nh - h; h = nh; }
  const box = [rNum(x0), rNum(y0), rNum(w), rNum(h)];
  BOXES.set(scene, box);
  return box;
}

const Stage = ({ scene, ghost, label, children, L }) => (
  <svg viewBox={sceneBox(scene).join(' ')} className="w-full h-auto select-none" style={ghost ? { opacity: 0.3 } : undefined} aria-hidden={ghost ? true : undefined} role="img" aria-label={scene.title || label}>
    {L && L.items && <PatternDefs L={L} />}
    {!ghost && <rect x="-400" y="-400" width="1400" height="1400" fill={C.bg} />}
    {children}
  </svg>
);

/** Vue de dessus : bassin, épaules qui tournent, tête, bras. */
function TopFigure({ scene, pose, showTrace, muscles, ghost, L, effort }) {
  const t = solveTop(pose);
  const traces = showTrace && !ghost && scene.trace !== false ? traceTop(scene.keys) : null;
  const pol = p => p.map(q => q.map(rNum).join(',')).join(' ');
  const th = ((pose.twist || 0) * Math.PI) / 180;
  const axis = 56;
  return (
    <Stage L={L} scene={scene} ghost={ghost} label="Animation du mouvement (vue de dessus)">
      {!ghost && (scene.equip || []).map((e, i) => <Fixed key={i} e={e} i={i} />)}
      {!ghost && (
        <g>
          <line x1={t.c - 52} y1={t.s0[1]} x2={t.c + 52} y2={t.s0[1]} stroke="#6b7280" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={rNum(t.s0[0] - Math.cos(th) * axis)} y1={rNum(t.s0[1] - Math.sin(th) * axis)} x2={rNum(t.s0[0] + Math.cos(th) * axis)} y2={rNum(t.s0[1] + Math.sin(th) * axis)} stroke={C.accent} strokeWidth="1.6" />
        </g>
      )}
      {traces && traces.map((tr, k) => <Trace key={k} tr={tr} />)}
      {!ghost && L.items && <Aura L={L} c={[t.c, t.y]} r={52} />}
      {scene.legs === 'seated' && [t.hipL, t.hipR].map((h, k) => <Taper key={'t' + k} a={h} b={[h[0] + (k === 0 ? -3 : 3), h[1] - 40]} ra={6} rb={4.6} c={L.shorts} />)}
      {scene.legs === 'standing' && [-18, 18].map((dx, k) => <ellipse key={'f' + k} cx={t.c + dx} cy={t.y + 12} rx="5" ry="10" fill={L.shoe} />)}
      <polygon points={pol([t.hipR, t.hipL, [t.c - 13, t.y - 2], [t.c + 13, t.y - 2]])} fill={L.shorts} stroke={L.shorts} strokeWidth="5" strokeLinejoin="round" />
      <polygon points={pol([t.L.shoulder, t.R.shoulder, [t.c + 13, t.y], [t.c - 13, t.y]])} fill={L.shirt} stroke={L.shirt} strokeWidth="6" strokeLinejoin="round" />
      {muscles.filter(m => ['core', 'back', 'chest'].includes(m.z)).map(m => <Band key={m.z} a={t.s0} b={[t.c, t.y + 6]} w={15} op={levelOp(m.lvl, effort)} />)}
      {[t.L, t.R].map((sd, k) => <Arm key={'a' + k} s={sd.shoulder} e={sd.elbow} w={sd.wrist} L={L} main={k === 0} />)}
      {armMuscles([t.L, t.R], muscles.filter(isArmZone), effort, false)}
      {L.hairStyle === 'ponytail' && <ellipse cx={rNum(t.head[0] - Math.sin(th) * 10)} cy={rNum(t.head[1] + Math.cos(th) * 10)} rx="3" ry="3" fill={L.hair} />}
      <circle cx={rNum(t.head[0])} cy={rNum(t.head[1])} r={L.hairStyle === 'curly' ? 10.6 : 9.4} fill={L.hairStyle === 'none' ? L.skin : L.hair} />
      {L.hairStyle === 'bun' && <circle cx={rNum(t.head[0])} cy={rNum(t.head[1])} r="4" fill={L.hair} stroke={L.skinFar} strokeWidth="0.8" />}
      {L.items && <HeadTopItems L={L} c={t.head} th={th} />}
      <circle cx={rNum(t.head[0] + Math.sin(th) * 7)} cy={rNum(t.head[1] - Math.cos(th) * 7)} r="2" fill={L.skin} />
      {(ghost ? [] : scene.follow || []).map((e, i) => <Follow key={i} e={e} j={t} i={i} />)}
    </Stage>
  );
}

function FrontFigure({ scene, pose, showTrace, muscles, ghost, L, effort }) {
  const f = solveFront(pose);
  const back = !!scene.back;
  const traces = showTrace && !ghost && scene.trace !== false ? traceFront(scene.keys, scene.trace || 'wrist') : null;
  const sides = [f.L, f.R];
  const X = rNum(f.c + f.shift);
  const cy = f.sy + 4;
  const sw = f.shHalf;
  const H = f.hy - cy;
  const top = cy - 3;
  const waist = cy + H * 0.72;
  const flare = 2 + 2.4 * (muscles.some(m => m.z === 'back') ? effort : 0.3);
  const n = rNum;
  const fem = L.body === 'f';
  const wW = fem ? 8.6 : 10; // taille
  const hW = fem ? 12.4 : 11; // hanches
  const torso = `M${n(X - sw - 3)} ${n(top + 3)} Q${n(X - sw - 2)} ${n(top - 3)} ${n(X - 6)} ${n(top - 4)} L${n(X + 6)} ${n(top - 4)} Q${n(X + sw + 2)} ${n(top - 3)} ${n(X + sw + 3)} ${n(top + 3)} Q${n(X + sw + flare)} ${n(cy + H * 0.36)} ${n(f.c + wW)} ${n(waist)} L${n(f.c + hW)} ${n(f.hy)} L${n(f.c - hW)} ${n(f.hy)} L${n(f.c - wW)} ${n(waist)} Q${n(X - sw - flare)} ${n(cy + H * 0.36)} ${n(X - sw - 3)} ${n(top + 3)}Z`;
  const braY = n(cy + H * 0.42);
  const bra = `M${n(X - sw - 3)} ${n(top + 3)} Q${n(X - sw - 2)} ${n(top - 3)} ${n(X - 6)} ${n(top - 4)} L${n(X + 6)} ${n(top - 4)} Q${n(X + sw + 2)} ${n(top - 3)} ${n(X + sw + 3)} ${n(top + 3)} L${n(X + sw + 1.5)} ${braY} L${n(X - sw - 1.5)} ${braY}Z`;
  const scapX = 11 - 4 * effort;
  const shape = { X, cy, waist, sw, flare };
  return (
    <Stage L={L} scene={scene} ghost={ghost} label="Animation du mouvement">
      {!ghost && <line x1="-400" y1="200" x2="800" y2="200" stroke={C.ground} strokeWidth="3" />}
      {!ghost && <ellipse cx={f.c} cy="201" rx="40" ry="3" fill="#000" opacity="0.28" />}
      {!ghost && (scene.equip || []).map((e, i) => <Fixed key={i} e={e} i={i} />)}
      {traces && traces.map((tr, k) => <Trace key={k} tr={tr} />)}
      {!ghost && L.items && <Aura L={L} c={[X, (cy + f.hy) / 2]} r={68} />}
      {!scene.noLegs && sides.map((s, k) => <Leg key={'l' + k} h={s.hip} k={s.knee} a={s.ankle} t={[s.ankle[0] + (k === 0 ? -3 : 3), s.ankle[1] + 5]} L={L} />)}
      {!scene.noHead && <line x1={X} y1={n(cy)} x2={n(f.headC[0])} y2={n(f.headC[1])} stroke={L.skin} strokeWidth="6.5" strokeLinecap="round" />}
      <path d={torso} fill={L.top === 'bra' ? L.skin : L.shirt} />
      {L.top === 'bra' && <path d={bra} fill={L.shirt} />}
      {!scene.noLegs && <path d={`M${n(f.c - wW - 0.5)} ${n(waist + 2)} L${n(f.c + wW + 0.5)} ${n(waist + 2)} L${n(f.c + hW + 1.5)} ${f.hy + 7} L${n(f.c - hW - 1.5)} ${f.hy + 7}Z`} fill={L.shorts} />}
      {L.items && <NumberFront L={L} X={X} y={cy + H * (back ? 0.5 : 0.58)} back={back} />}
      {L.items && <WaistFront L={L} c={f.c} waist={waist} hy={f.hy} wW={wW} back={back} />}
      {back
        ? (
          <g fill="none" stroke={L.line} strokeLinecap="round" strokeWidth="1.1">
            {[-1, 1].map(d => <path key={d} d={`M${n(X + d * (scapX - 1))} ${n(cy + 3)} L${n(X + d * (scapX + 4.5))} ${n(cy + 4)} Q${n(X + d * (scapX + 1.5))} ${n(cy + H * 0.2)} ${n(X + d * (scapX - 0.5))} ${n(cy + H * 0.34)}`} />)}
            <path d={`M${X} ${n(cy - 1)} L${f.c} ${f.hy - 3}`} strokeDasharray="0.6 3" />
          </g>
        )
        : <path d={`M${X} ${n(cy + 1)} L${X} ${n(cy + H * 0.34)}`} fill="none" stroke={L.line} strokeLinecap="round" strokeWidth="0.9" />}
      {frontBodyMuscles(f, muscles.filter(m => !isArmZone(m)), effort, back, shape)}
      {L.items && <NeckFront L={L} X={X} top={top} cy={cy} H={H} sw={sw} back={back} />}
      {sides.map((s, k) => <Arm key={'a' + k} s={s.shoulder} e={s.elbow} w={s.wrist} L={L} main={k === 0} />)}
      {armMuscles(sides, muscles.filter(isArmZone), effort, back)}
      {!scene.noHead && <HeadFront c={f.headC} back={back} L={L} />}
      {(ghost ? [] : scene.follow || []).filter(e => e.k === 'hbar').map((e, i) => { const y = Math.min(f.L[e.at || 'wrist'][1], f.R[e.at || 'wrist'][1]) + (e.dy || 0); const x1 = f.L[e.at || 'wrist'][0] - (e.ext || 16); const x2 = f.R[e.at || 'wrist'][0] + (e.ext || 16); return <g key={'hb' + i}><line x1={x1} y1={y} x2={x2} y2={y} stroke={C.plate} strokeWidth="3" />{e.plates !== false && [x1, x2].map((x, q) => <rect key={q} x={x - 3} y={y - (e.r || 12)} width="6" height={(e.r || 12) * 2} rx="2" fill={C.plate} stroke={C.plateIn} strokeWidth="1" />)}</g>; })}
      {(ghost ? [] : scene.follow || []).filter(e => e.k !== 'hbar').map((e, i) => sides.map((s, k) => {
        if (e.side === 'R' && k === 0) return null;
        const m = x => (k === 0 ? 2 * f.c - x : x); // la gauche est le miroir de la droite
        const ee = e.k === 'cable' ? { ...e, from: [m(e.from[0]), e.from[1]] } : e.k === 'lever' ? { ...e, pivot: [m(e.pivot[0]), e.pivot[1]] } : e;
        return <Follow key={i + '-' + k} e={ee} j={s} i={i} />;
      }))}
    </Stage>
  );
}

export function Figure({ scene, pose, showTrace = false, muscleText = '', ghost = false, bad = false, effort = 0.8, showMuscles = true, avatar = null }) {
  const look = avatar ? lookFor(avatar) : currentLook();
  const L = bad ? { ...look, ...BAD } : look;
  const muscles = muscleText && !ghost && showMuscles ? musclesOf(muscleText) : [];
  const common = { scene, pose, showTrace, muscles, ghost, L, effort };
  if (scene.view === 'top') return <TopFigure {...common} />;
  if (scene.view === 'front') return <FrontFigure {...common} />;
  const j = solvePose(pose);
  const sh = p => [p[0] - 4, p[1]];
  const tr = showTrace && !ghost && scene.trace !== false ? tracePath(scene.keys, scene.trace || 'wrist') : null;
  // Repère du buste : `front` = côté de la poitrine, Q(f, d) = point à f devant l'axe du buste et à d (fraction) de l'épaule vers la hanche.
  // Normalement la poitrine est à droite du sens hanche → épaule ; `supine: true` inverse ce côté (allongé sur le dos tête à droite, ou sur le ventre tête à gauche).
  const down = unit(j.shoulder, j.hip);
  const flip = scene.supine ? -1 : 1;
  const front = [down[1] * flip, -down[0] * flip];
  const TL = Math.hypot(j.hip[0] - j.shoulder[0], j.hip[1] - j.shoulder[1]);
  const Q = (f, d) => [j.shoulder[0] + front[0] * f + down[0] * d * TL, j.shoulder[1] + front[1] * f + down[1] * d * TL];
  const chest = L.body === 'f' ? 9.4 : 8.2;
  const torso = `M${xy(Q(-5.7, -0.04))} Q${xy(Q(0, -0.16))} ${xy(Q(4.8, -0.02))} Q${xy(Q(chest, 0.3))} ${xy(Q(5, 0.72))} L${xy(Q(5.8, 1.02))} L${xy(Q(-6.2, 1.02))} L${xy(Q(-5.7, 0.7))} Q${xy(Q(-7, 0.28))} ${xy(Q(-5.7, -0.04))}Z`;
  const bra = `M${xy(Q(-5.7, -0.04))} Q${xy(Q(0, -0.16))} ${xy(Q(4.8, -0.02))} Q${xy(Q(chest, 0.26))} ${xy(Q(7, 0.44))} L${xy(Q(-6.6, 0.44))} Q${xy(Q(-7, 0.24))} ${xy(Q(-5.7, -0.04))}Z`;
  const shorts = `M${xy(Q(5.4, 0.78))} L${xy(Q(-6, 0.76))} L${xy(Q(-6.9, 1.1))} L${xy(Q(6.3, 1.1))}Z`;
  const up = [j.headC[0] - j.shoulder[0], j.headC[1] - j.shoulder[1]];
  const farReach = !j.farElbow && scene.farHand ? ik(j.shoulder, scene.farHand, SEG.uarm, SEG.farm, 1) : null;
  return (
    <Stage L={L} scene={scene} ghost={ghost} label="Animation du mouvement">
      {!ghost && <line x1="-400" y1="200" x2="800" y2="200" stroke={C.ground} strokeWidth="3" />}
      {!ghost && <ellipse cx={rNum(Math.max(36, Math.min(284, (j.hip[0] + j.ankle[0]) / 2)))} cy="201" rx="44" ry="3" fill="#000" opacity="0.28" />}
      {!ghost && (scene.equip || []).map((e, i) => <Fixed key={i} e={e} i={i} />)}
      {/* côté éloigné (plus sombre) */}
      {j.farKnee
        ? <Leg h={j.hip} k={j.farKnee} a={j.farAnkle} t={[j.farAnkle[0] + SEG.foot, j.farAnkle[1] + 2]} L={L} far />
        : <Leg h={sh(j.hip)} k={sh(j.knee)} a={sh(j.ankle)} t={sh(j.toe)} L={L} far />}
      {j.farElbow && <Arm s={j.shoulder} e={j.farElbow} w={j.farWrist} L={L} far />}
      {!j.farElbow && farReach && <Arm s={sh(j.shoulder)} e={sh(farReach.mid)} w={scene.farHand} L={L} far />}
      {!j.farElbow && !farReach && <Arm s={sh(j.shoulder)} e={sh(j.elbow)} w={sh(j.wrist)} L={L} far />}
      {tr && tr.length > 2 && <Trace tr={tr} />}
      {!ghost && L.items && <Aura L={L} c={mix(j.hip, j.shoulder, 0.4)} r={62} />}
      {/* buste, tête */}
      <line x1={rNum(j.shoulder[0])} y1={rNum(j.shoulder[1])} x2={rNum(j.headC[0])} y2={rNum(j.headC[1])} stroke={L.skin} strokeWidth="5.8" strokeLinecap="round" />
      <path d={torso} fill={L.top === 'bra' ? L.skin : L.shirt} />
      {L.top === 'bra' && <path d={bra} fill={L.shirt} />}
      <path d={shorts} fill={L.shorts} />
      {L.items && <WaistSide L={L} Q={Q} xy={xy} />}
      {L.items && <LogoSide L={L} Q={Q} xy={xy} />}
      {L.items && <NeckSide L={L} Q={Q} xy={xy} />}
      {sideMuscles(j, muscles.filter(m => ['chest', 'back', 'core', 'glutes'].includes(m.z)), effort, Q, front)}
      <HeadSide c={j.headC} up={up} L={L} face={flip} />
      {/* côté proche */}
      <Leg h={j.hip} k={j.knee} a={j.ankle} t={j.toe} L={L} />
      {sideMuscles(j, muscles.filter(m => ['quads', 'hams', 'calves'].includes(m.z)), effort, Q, front)}
      <Arm s={j.shoulder} e={j.elbow} w={j.wrist} fist={j.fist} L={L} main />
      {sideMuscles(j, muscles.filter(isArmZone), effort, Q, front)}
      {(ghost ? [] : scene.follow || []).map((e, i) => <Follow key={i} e={e} j={j} i={i} />)}
    </Stage>
  );
}
