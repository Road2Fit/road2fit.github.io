// Dessins des objets de la boutique (4.40) pour Figure.jsx. Chaque objet est dessiné là où il se voit : profil (repère
// local de la tête : visage vers +x, haut vers −y, rayon 9), face / dos (centre de la tête x, y), dessus.
// L.items = { emplacement: objet } (anim/shop.js) ; L.hair = couleur des cheveux (barbe, moustache).
const n = v => Math.round(v * 10) / 10;
const mixP = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------- motifs de vêtements (définitions SVG, une par motif et par couleur) ----------
export function PatternDefs({ L }) {
  const defs = L.defs || [];
  const auras = L.items && L.items.aura ? [L.items.aura] : [];
  if (!defs.length && !auras.length) return null;
  return (
    <defs>
      {defs.map(d => {
        const { id, kind, base, dark, light } = d;
        if (kind === 'stripes') return <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="8" height="6"><rect width="8" height="6" fill={base} /><rect width="8" height="2" fill={light} /></pattern>;
        if (kind === 'check') return <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill={base} /><rect width="4" height="4" fill={dark} /><rect x="4" y="4" width="4" height="4" fill={dark} /></pattern>;
        if (kind === 'stars') return <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="12" height="12"><rect width="12" height="12" fill={base} /><path d="M3 1.4 L3.6 2.8 L5 2.9 L3.9 3.8 L4.3 5.2 L3 4.4 L1.7 5.2 L2.1 3.8 L1 2.9 L2.4 2.8Z M9 7.4 L9.6 8.8 L11 8.9 L9.9 9.8 L10.3 11.2 L9 10.4 L7.7 11.2 L8.1 9.8 L7 8.9 L8.4 8.8Z" fill={light} /></pattern>;
        // camouflage
        return (
          <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="18" height="18">
            <rect width="18" height="18" fill={base} />
            <path d="M1 2 Q5 0 7 3 Q6 6 2 6 Q-1 4 1 2Z M10 9 Q15 7 17 11 Q14 14 10 13 Q8 11 10 9Z" fill={dark} />
            <path d="M9 1 Q12 0 13 2.6 Q11 4.4 8.6 3.4Z M2 11 Q5 10 6 13 Q4 16 1.4 15 Q0 13 2 11Z M13 15 Q16 14 17.6 16.4 Q15 18 12.6 17Z" fill={light} />
          </pattern>
        );
      })}
      {auras.map(a => (
        <radialGradient key={a.id} id={`r2f-aura-${a.id}`}>
          <stop offset="0" stopColor={a.c} stopOpacity="0.45" />
          <stop offset="0.6" stopColor={a.c} stopOpacity="0.16" />
          <stop offset="1" stopColor={a.c} stopOpacity="0" />
        </radialGradient>
      ))}
    </defs>
  );
}

export function Aura({ L, c, r }) {
  const a = L.items && L.items.aura;
  if (!a) return null;
  return <circle cx={n(c[0])} cy={n(c[1])} r={r} fill={`url(#r2f-aura-${a.id})`} />;
}

// ---------- tête, vue de profil (repère local) ----------
const DOME_S = 'M-9.5 0.6 A9.6 9.6 0 0 1 9.3 -2.4 Q0 -3.4 -9.5 0.6Z';
/** Objets derrière la tête (avant la peau) */
export function HeadBackSide({ L }) {
  const h = L.items && L.items.head;
  if (!h) return null;
  if (h.kind === 'bandana') return <path d="M-9 0.6 L-14 3.4 L-12.6 5.6 Z M-9 1.4 L-13 6.4 L-10.6 7.2 Z" fill={h.c} />;
  if (h.kind === 'capBack') return <path d="M-8.8 0.4 L-15 2.6 L-15.2 4 L-8.6 2.4Z" fill={h.c2} />;
  return null;
}
/** Objets par-dessus la tête de profil */
export function HeadSideItems({ L }) {
  const it = L.items || {};
  const h = it.head; const e = it.eyes; const f = it.face;
  const out = [];
  if (f) {
    if (f.kind === 'moustache') out.push(<path key="f" d="M5.8 3 Q7.6 2.2 9.2 3.4 Q7.6 3.8 5.8 3.8Z" fill={L.hair} />);
    if (f.kind === 'beard') out.push(<path key="f" d="M-1.6 3.4 Q0 9.4 6 9 Q9.2 7.8 9.4 4.2 L8.4 4.6 Q7 6.8 4.6 6.4 Q1.6 6 0.2 2.6Z" fill={L.hair} />);
    if (f.kind === 'beardLong') out.push(<path key="f" d="M-1.6 3.4 Q-1 11 4 14.5 Q8.2 12 9.4 4.2 L8.4 4.6 Q7 6.8 4.6 6.4 Q1.6 6 0.2 2.6Z" fill={L.hair} />);
  }
  if (e) {
    if (e.kind === 'sunglasses') out.push(<g key="e"><line x1="-0.4" y1="-0.6" x2="4" y2="-1.5" stroke={e.c} strokeWidth="1" /><ellipse cx="6.2" cy="-1.3" rx="3" ry="2.1" fill={e.c} /></g>);
    if (e.kind === 'sportGlasses') out.push(<g key="e"><path d="M0.6 -2.4 L9.7 -3.3 L9.7 0.1 L0.6 0.3Z" fill={e.c} /><line x1="4" y1="-2.2" x2="9" y2="-2.6" stroke={e.c2} strokeWidth="0.7" /></g>);
    if (e.kind === 'roundGlasses') out.push(<g key="e"><line x1="-0.4" y1="-0.6" x2="3.4" y2="-1.3" stroke={e.c} strokeWidth="0.8" /><circle cx="5.8" cy="-1.3" r="2.4" fill="none" stroke={e.c} strokeWidth="0.9" /></g>);
  }
  if (h) {
    const k = h.kind;
    if (k === 'band') out.push(<g key="h">{h.glow && <path d="M-9.6 -1.8 Q0 -7 9.3 -3.6 L8.9 0 Q0 -2.6 -9.8 1.2Z" fill={h.c} opacity="0.35" />}<path d="M-9.2 -2.2 Q0 -6.2 8.9 -3.2 L8.5 -0.6 Q0 -3.4 -9.4 0.6Z" fill={h.c} /></g>);
    if (k === 'cap') out.push(<g key="h"><path d={DOME_S} fill={h.c} /><path d="M8.6 -2.6 L15.5 -1.4 L15.2 0 L8.4 -0.8Z" fill={h.c2} /></g>);
    if (k === 'capBack') out.push(<path key="h" d={DOME_S} fill={h.c} />);
    if (k === 'beanie') out.push(<g key="h"><path d="M-10 1 A10.2 10.6 0 0 1 9.8 -2.4 Q0 -3.4 -10 1Z" fill={h.c} /><path d="M-9.8 0.8 L9.6 -2.2 L9.9 0.6 L-9.6 3.4Z" fill={h.c2} /></g>);
    if (k === 'bob') out.push(<g key="h"><path d={DOME_S} fill={h.c} /><line x1="-13.4" y1="1.4" x2="13.8" y2="-2.4" stroke={h.c2} strokeWidth="2.6" strokeLinecap="round" /></g>);
    if (k === 'bandana') out.push(<g key="h"><path d={DOME_S} fill={h.c} /><circle cx="2" cy="-6" r="0.8" fill={h.c2} /><circle cx="-3" cy="-5.4" r="0.8" fill={h.c2} /><circle cx="6" cy="-4.6" r="0.8" fill={h.c2} /></g>);
    if (k === 'headphones') out.push(<g key="h"><path d="M-0.7 0.7 L-1.6 -10.4" stroke={h.c} strokeWidth="2.2" strokeLinecap="round" /><circle cx="-0.7" cy="0.7" r="3.7" fill={h.c} /><circle cx="-0.7" cy="0.7" r="1.9" fill={h.c2} /></g>);
    if (k === 'crown') out.push(<path key="h" d="M-5.5 -8 L-6 -12.6 L-3 -10 L0 -13.6 L3 -10 L6 -12.6 L5.5 -8Z" fill={h.c} stroke={h.c2} strokeWidth="0.6" />);
  }
  return out.length ? <g>{out}</g> : null;
}

// ---------- tête, face et dos ----------
export function HeadFrontBack({ L, x, y, back }) {
  const h = L.items && L.items.head;
  if (!h) return null;
  if (h.kind === 'bandana' && back) return <path d={`M${x - 2} ${y + 6} L${x - 5} ${y + 11} L${x - 2.4} ${y + 11.6}Z M${x + 2} ${y + 6} L${x + 5} ${y + 11} L${x + 2.4} ${y + 11.6}Z`} fill={h.c} />;
  return null;
}
export function HeadFrontItems({ L, x, y, back }) {
  const it = L.items || {};
  const h = it.head; const e = back ? null : it.eyes; const f = back ? null : it.face;
  const dome = `M${n(x - 9.6)} ${n(y - 1.2)} A9.6 9.6 0 0 1 ${n(x + 9.6)} ${n(y - 1.2)} Z`;
  const out = [];
  if (f) {
    if (f.kind === 'moustache') out.push(<path key="f" d={`M${n(x - 3.4)} ${n(y + 3.9)} Q${x} ${n(y + 2.6)} ${n(x + 3.4)} ${n(y + 3.9)} Q${x} ${n(y + 4.7)} ${n(x - 3.4)} ${n(y + 3.9)}Z`} fill={L.hair} />);
    if (f.kind === 'beard' || f.kind === 'beardLong') {
      const b = f.kind === 'beard' ? 10.4 : 15;
      out.push(<path key="f" d={`M${n(x - 8.6)} ${n(y + 1)} Q${n(x - 8)} ${n(y + b - 1)} ${x} ${n(y + b)} Q${n(x + 8)} ${n(y + b - 1)} ${n(x + 8.6)} ${n(y + 1)} L${n(x + 7)} ${n(y + 2)} Q${n(x + 5)} ${n(y + 7.4)} ${x} ${n(y + 7.6)} Q${n(x - 5)} ${n(y + 7.4)} ${n(x - 7)} ${n(y + 2)}Z`} fill={L.hair} />);
    }
  }
  if (e) {
    if (e.kind === 'sunglasses') out.push(<g key="e" fill={e.c}><ellipse cx={n(x - 3.4)} cy={n(y + 0.8)} rx="2.9" ry="2.1" /><ellipse cx={n(x + 3.4)} cy={n(y + 0.8)} rx="2.9" ry="2.1" /><rect x={n(x - 1)} y={n(y + 0.2)} width="2" height="0.8" /></g>);
    if (e.kind === 'sportGlasses') out.push(<g key="e"><rect x={n(x - 8.2)} y={n(y - 1.2)} width="16.4" height="3.8" rx="1.8" fill={e.c} /><line x1={n(x - 5)} y1={n(y - 0.2)} x2={n(x + 4)} y2={n(y - 0.2)} stroke={e.c2} strokeWidth="0.7" /></g>);
    if (e.kind === 'roundGlasses') out.push(<g key="e" fill="none" stroke={e.c} strokeWidth="0.9"><circle cx={n(x - 3.4)} cy={n(y + 0.8)} r="2.4" /><circle cx={n(x + 3.4)} cy={n(y + 0.8)} r="2.4" /><line x1={n(x - 1)} y1={n(y + 0.6)} x2={n(x + 1)} y2={n(y + 0.6)} /></g>);
  }
  if (h) {
    const k = h.kind;
    if (k === 'band') out.push(<g key="h">{h.glow && <rect x={n(x - 10.2)} y={n(y - 6)} width="20.4" height="4.6" rx="2" fill={h.c} opacity="0.35" />}<rect x={n(x - 9.5)} y={n(y - 5.2)} width="19" height="3" rx="1.2" fill={h.c} /></g>);
    if (k === 'cap') out.push(<g key="h"><path d={dome} fill={h.c} />{!back && <ellipse cx={x} cy={n(y - 1.4)} rx="9.4" ry="2.4" fill={h.c2} />}</g>);
    if (k === 'capBack') out.push(<g key="h"><path d={dome} fill={h.c} />{back && <ellipse cx={x} cy={n(y - 1.4)} rx="9.4" ry="2.4" fill={h.c2} />}</g>);
    if (k === 'beanie') out.push(<g key="h"><path d={`M${n(x - 10)} ${n(y - 0.4)} A10 10.8 0 0 1 ${n(x + 10)} ${n(y - 0.4)} Z`} fill={h.c} /><rect x={n(x - 10)} y={n(y - 3.4)} width="20" height="3.4" rx="1" fill={h.c2} /></g>);
    if (k === 'bob') out.push(<g key="h"><path d={dome} fill={h.c} /><ellipse cx={x} cy={n(y - 1.2)} rx="14" ry="2.4" fill={h.c2} /></g>);
    if (k === 'bandana') out.push(<g key="h"><path d={dome} fill={h.c} /><circle cx={n(x - 4)} cy={n(y - 5)} r="0.8" fill={h.c2} /><circle cx={n(x + 3)} cy={n(y - 6.4)} r="0.8" fill={h.c2} /></g>);
    if (k === 'headphones') out.push(<g key="h"><path d={`M${n(x - 10.2)} ${n(y + 1)} A10.4 11 0 0 1 ${n(x + 10.2)} ${n(y + 1)}`} fill="none" stroke={h.c} strokeWidth="2.2" /><ellipse cx={n(x - 10.2)} cy={n(y + 1.4)} rx="2.6" ry="4" fill={h.c} /><ellipse cx={n(x + 10.2)} cy={n(y + 1.4)} rx="2.6" ry="4" fill={h.c} /></g>);
    if (k === 'crown') out.push(<path key="h" d={`M${n(x - 6.5)} ${n(y - 7)} L${n(x - 6.5)} ${n(y - 12.5)} L${n(x - 3.2)} ${n(y - 9.5)} L${x} ${n(y - 13.5)} L${n(x + 3.2)} ${n(y - 9.5)} L${n(x + 6.5)} ${n(y - 12.5)} L${n(x + 6.5)} ${n(y - 7)}Z`} fill={h.c} stroke={h.c2} strokeWidth="0.6" />);
  }
  return out.length ? <g>{out}</g> : null;
}

/** Tête vue de dessus */
export function HeadTopItems({ L, c, th }) {
  const h = L.items && L.items.head;
  if (!h) return null;
  const [x, y] = [n(c[0]), n(c[1])];
  const fx = Math.sin(th); const fy = -Math.cos(th);
  if (h.kind === 'crown') return <circle cx={x} cy={y} r="6.4" fill="none" stroke={h.c} strokeWidth="2.4" />;
  if (h.kind === 'band') return <circle cx={x} cy={y} r="9" fill="none" stroke={h.c} strokeWidth="2" />;
  if (h.kind === 'headphones') return <line x1={n(x - Math.cos(th) * 10)} y1={n(y - Math.sin(th) * 10)} x2={n(x + Math.cos(th) * 10)} y2={n(y + Math.sin(th) * 10)} stroke={h.c} strokeWidth="2.4" />;
  const visor = h.kind === 'cap' ? 1 : h.kind === 'capBack' ? -1 : 0;
  return (
    <g>
      {h.kind === 'bob' && <circle cx={x} cy={y} r="13" fill={h.c2} />}
      <circle cx={x} cy={y} r={h.kind === 'beanie' ? 10.2 : 9.6} fill={h.c} />
      {visor !== 0 && <ellipse cx={n(x + fx * visor * 10)} cy={n(y + fy * visor * 10)} rx="5" ry="3" transform={`rotate(${n((th * 180) / Math.PI)} ${n(x + fx * visor * 10)} ${n(y + fy * visor * 10)})`} fill={h.c2} />}
    </g>
  );
}

// ---------- cou et épaules ----------
/** Profil : Q(f, d) = repère du buste de Figure.jsx */
export function NeckSide({ L, Q, xy }) {
  const it = L.items && L.items.neck;
  if (!it) return null;
  if (it.kind === 'towel') return <path d={`M${xy(Q(5.6, 0.14))} Q${xy(Q(1, -0.16))} ${xy(Q(-5.8, 0.02))} L${xy(Q(-6.8, 0.36))}`} fill="none" stroke={it.c} strokeWidth="4.6" strokeLinecap="round" />;
  const cord = it.kind === 'whistle' || it.kind === 'medal' ? (it.kind === 'medal' ? it.c2 : '#cbd5e1') : it.c;
  const end = Q(5.2, it.kind === 'chain' ? 0.18 : 0.3);
  return (
    <g>
      <path d={`M${xy(Q(-4.6, -0.02))} Q${xy(Q(1, 0.2))} ${xy(end)}`} fill="none" stroke={cord} strokeWidth={it.kind === 'chain' ? 1.2 : 0.9} />
      {it.kind === 'whistle' && <rect x={n(end[0] - 1.6)} y={n(end[1] - 1)} width="3.4" height="2.2" rx="0.8" fill={it.c} />}
      {it.kind === 'medal' && <circle cx={n(end[0])} cy={n(end[1] + 1.4)} r="2.6" fill={it.c} />}
    </g>
  );
}
/** Face / dos */
export function NeckFront({ L, X, top, cy, H, sw, back }) {
  const it = L.items && L.items.neck;
  if (!it) return null;
  if (it.kind === 'towel') return <path d={`M${n(X - sw - 2)} ${n(cy + H * 0.36)} L${n(X - sw + 0.5)} ${n(top - 1.5)} L${n(X - sw + 7)} ${n(top + 1)}`} fill="none" stroke={it.c} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />;
  const cord = it.kind === 'chain' ? it.c : it.kind === 'medal' ? it.c2 : '#cbd5e1';
  if (back) return <path d={`M${n(X - 5)} ${n(top - 2)} Q${X} ${n(top + 2.5)} ${n(X + 5)} ${n(top - 2)}`} fill="none" stroke={cord} strokeWidth="1.1" />;
  const by = cy + H * (it.kind === 'chain' ? 0.24 : 0.34);
  return (
    <g>
      <path d={`M${n(X - 5)} ${n(top - 2)} Q${X} ${n(by + 2)} ${n(X + 5)} ${n(top - 2)}`} fill="none" stroke={cord} strokeWidth={it.kind === 'chain' ? 1.2 : it.kind === 'medal' ? 1.6 : 0.9} />
      {it.kind === 'whistle' && <rect x={n(X - 1.6)} y={n(by - 0.4)} width="3.2" height="2.4" rx="0.8" fill={it.c} />}
      {it.kind === 'medal' && <circle cx={X} cy={n(by + 2.2)} r="3" fill={it.c} stroke="#a16207" strokeWidth="0.6" />}
    </g>
  );
}

// ---------- taille ----------
export function WaistSide({ L, Q, xy }) {
  const it = L.items && L.items.waist;
  if (!it) return null;
  if (it.kind === 'fanny') return <g><path d={`M${xy(Q(5.6, 0.8))} L${xy(Q(-6.4, 0.8))}`} stroke={it.c2} strokeWidth="1.2" /><ellipse cx={n(Q(7.4, 0.84)[0])} cy={n(Q(7.4, 0.84)[1])} rx="3.4" ry="2.6" fill={it.c} /></g>;
  const b = Q(6, 0.81);
  return <g><path d={`M${xy(Q(5.4, 0.72))} L${xy(Q(6.1, 0.9))} L${xy(Q(-6.6, 0.9))} L${xy(Q(-6.1, 0.72))}Z`} fill={it.c} /><rect x={n(b[0] - 1.4)} y={n(b[1] - 1.6)} width="2.8" height="3.2" rx="0.6" fill={it.c2} /></g>;
}
export function WaistFront({ L, c, waist, hy, wW, back }) {
  const it = L.items && L.items.waist;
  if (!it) return null;
  const h = (hy - waist) * 0.6;
  if (it.kind === 'fanny') return <g><rect x={n(c - wW - 1)} y={n(waist + 1)} width={n(2 * wW + 2)} height="1.4" fill={it.c2} />{!back && <ellipse cx={c} cy={n(waist + 3.4)} rx="5.4" ry="3" fill={it.c} />}</g>;
  return <g><rect x={n(c - wW - 1.4)} y={n(waist - 0.6)} width={n(2 * wW + 2.8)} height={n(h)} rx="1" fill={it.c} />{!back && <rect x={n(c - 2.2)} y={n(waist - 0.2)} width="4.4" height={n(h - 0.8)} rx="0.8" fill="none" stroke={it.c2} strokeWidth="1.1" />}</g>;
}

// ---------- maillot numéro ----------
export function NumberFront({ L, X, y, back }) {
  const it = L.items && L.items.topPattern;
  if (!it || it.kind !== 'number' || L.top === 'bra') return null;
  return <text x={X} y={n(y)} fontSize={back ? 11 : 8} fontWeight="900" textAnchor="middle" fill={L.numberInk || '#f8fafc'} fontFamily="sans-serif">23</text>;
}

// ---------- bras : poignets et mains ----------
export function WristItems({ L, e, w, k, main }) {
  const wr = L.items && L.items.wrists;
  if (!wr) return null;
  const a = mixP(e, w, 0.76); const b = mixP(e, w, 0.94);
  const seg = (p, q, c, ra) => {
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const nx = -Math.sin(ang) * ra; const ny = Math.cos(ang) * ra;
    return `M${n(p[0] + nx)} ${n(p[1] + ny)} L${n(q[0] + nx)} ${n(q[1] + ny)} L${n(q[0] - nx)} ${n(q[1] - ny)} L${n(p[0] - nx)} ${n(p[1] - ny)}Z`;
  };
  if (wr.kind === 'watch') return main ? <g><path d={seg(mixP(e, w, 0.82), mixP(e, w, 0.94), wr.c, 2.9 * k)} fill={wr.c} /><circle cx={n(mixP(e, w, 0.88)[0])} cy={n(mixP(e, w, 0.88)[1])} r={1.3 * k} fill={wr.c2} /></g> : null;
  if (wr.kind === 'bracelets') return <g><path d={seg(mixP(e, w, 0.8), mixP(e, w, 0.85), wr.c, 2.9 * k)} fill={wr.c} /><path d={seg(mixP(e, w, 0.89), mixP(e, w, 0.94), wr.c2, 2.8 * k)} fill={wr.c2} /></g>;
  return <g><path d={seg(a, b, wr.c, 3 * k)} fill={wr.c} />{wr.c2 && <path d={seg(mixP(e, w, 0.84), mixP(e, w, 0.87), wr.c2, 3.05 * k)} fill={wr.c2} />}</g>;
}
/** Couleur de la main (gants, magnésie) ou null ; sangle : petit trait jaune */
export function handColor(L, skin) {
  const h = L.items && L.items.hands;
  if (!h) return skin;
  if (h.kind === 'gloves') return h.c;
  if (h.kind === 'chalk') return '#ece7e1';
  return skin;
}
export function Strap({ L, w, fist }) {
  const h = L.items && L.items.hands;
  if (!h || h.kind !== 'straps') return null;
  const end = fist || [w[0], w[1] + 5];
  return <line x1={n(w[0])} y1={n(w[1])} x2={n(end[0] + (end[0] - w[0]) * 0.6)} y2={n(end[1] + (end[1] - w[1]) * 0.6 + 2)} stroke={h.c} strokeWidth="1.8" strokeLinecap="round" />;
}

// ---------- jambes : genoux, chaussettes, bandes, chaussures d'haltéro ----------
export function LegItems({ L, h, kn, a, t, z, Taper }) {
  const it = L.items || {};
  const out = [];
  if (it.socks) {
    const s = it.socks;
    out.push(<Taper key="so" a={mixP(kn, a, 0.6)} b={a} ra={3.5 * z} rb={3.1 * z} c={s.c} />);
    if (s.c2) out.push(<Taper key="so2" a={mixP(kn, a, 0.68)} b={mixP(kn, a, 0.76)} ra={3.6 * z} rb={3.5 * z} c={s.c2} />, <Taper key="so3" a={mixP(kn, a, 0.84)} b={mixP(kn, a, 0.92)} ra={3.4 * z} rb={3.3 * z} c={s.c2} />);
  }
  if (it.knees) out.push(<Taper key="kn" a={mixP(h, kn, 0.84)} b={mixP(kn, a, 0.16)} ra={5.4 * z} rb={4.9 * z} c={it.knees.c} />);
  const bp = it.bottomPattern;
  if (bp && bp.kind === 'sideStripe') {
    const end = L.bottom === 'leggings' || L.bottom === 'joggers' ? a : mixP(h, kn, L.bottom === 'bike' ? 0.95 : 0.72);
    out.push(<Taper key="st" a={h} b={L.bottom === 'leggings' || L.bottom === 'joggers' ? kn : end} ra={1.1 * z} rb={1.1 * z} c={bp.c} />);
    if (L.bottom === 'leggings' || L.bottom === 'joggers') out.push(<Taper key="st2" a={kn} b={a} ra={1.1 * z} rb={1 * z} c={bp.c} />);
  }
  if (it.shoes && it.shoes.kind === 'lifting') out.push(<Taper key="lf" a={mixP(a, t, 0.1)} b={mixP(a, t, 0.4)} ra={3.6 * z} rb={3.4 * z} c={it.shoes.c2} />);
  return out.length ? <g>{out}</g> : null;
}
