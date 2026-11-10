import { platesFor } from '../lib/plates';

// Schéma des disques à mettre sur la barre (4.21, remplace le texte « Disques : 15 + 2,5 de chaque côté ») :
// la barre entière (« 20 kg » écrit au milieu), les mêmes disques de chaque côté avec leur poids écrit DANS le disque,
// en miroir (gauche lu de bas en haut, droite de haut en bas). Hauteur de chaque disque selon son poids.
// 4.21.2 : barre striée (moletage) et butées claires ; disques pleins de la couleur du thème. Le texte reste lu par les lecteurs d'écran.
const SIZE = { 25: [17, 58], 20: [16, 58], 15: [15, 52], 10: [14, 44], 5: [13, 37], 2.5: [13, 33], 1.25: [13, 31] };
const fmt = v => String(v).replace('.', ',');
const NEON = 'var(--neon, #ec4899)';
const TXT = { fontSize: 10, fontWeight: 600, letterSpacing: 0.6 }; // assez fin pour que « 10 » ne se colle pas
// Taille dynamique (4.21.3) : le schéma suit la largeur de l'écran (≈ 0,9 × sa taille de dessin sur un téléphone de 375 px,
// un peu plus sur un grand écran) et le nombre de disques (plus de disques = plus large). Plancher : les chiffres restent
// à 9 px au moins (échelle 0,9 pour une police de 10) ; plafond : échelle 1,2 et 92 % de la largeur disponible.
const MIN_TEXT_PX = 9;
const sizeCss = W => {
  const min = Math.round(W * Math.max(0.9, MIN_TEXT_PX / TXT.fontSize));
  return `clamp(${min}px, ${(W / 4.15).toFixed(1)}vw, ${Math.round(W * 1.2)}px)`;
};

export function PlatesDiagram({ total, testId, className = '' }) {
  const r = platesFor(total);
  if (!r) return null;
  const plates = r.perSide;
  const text = plates.length ? `Disques : ${plates.map(fmt).join(' + ')} de chaque côté` : 'Disques : barre seule';
  if (!plates.length) {
    return <p className={`text-center text-xs text-slate-500 ${className}`} data-testid={testId}><span className="sr-only">{text}</span><span aria-hidden="true">Barre seule (20 kg)</span></p>;
  }
  const H = 62, mid = H / 2, gap = 2, collar = 4, stub = 4, centre = 56;
  const sideW = plates.reduce((s, p) => s + SIZE[p][0] + gap, 0);
  const left = stub + sideW + collar + 1; // bord gauche de la partie centrale
  const W = 2 * left + centre;
  // disques d'un côté, du manchon vers l'extérieur (dir = +1 à droite, −1 à gauche)
  const side = (x0, dir, k) => {
    let x = x0;
    return plates.map((p, i) => {
      const [w, h] = SIZE[p];
      const px = dir > 0 ? x : x - w;
      x += dir * (w + gap);
      const cx = px + w / 2;
      return (
        <g key={`${k}${i}`}>
          <rect x={px} y={mid - h / 2} width={w} height={h} rx="2" fill={NEON} />
          <text x={cx} y={mid} transform={`rotate(${dir > 0 ? 90 : -90} ${cx} ${mid})`} textAnchor="middle" dominantBaseline="central" fill="#0b0b0b" {...TXT}>{fmt(p)}</text>
        </g>
      );
    });
  };
  // stries du manchon central (comme le moletage d'une vraie barre)
  const knurl = [];
  for (const base of [left + 5, left + centre - 11]) for (let k = 0; k < 3; k++) knurl.push(<line key={`${base}-${k}`} x1={base + k * 3} y1={mid - 6} x2={base + k * 3} y2={mid + 6} stroke="#64748b" strokeWidth="0.9" />);
  return (
    <div className={`flex justify-center ${className}`} data-testid={testId}>
      <span className="sr-only">{text}</span>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: sizeCss(W), maxWidth: '92%', height: 'auto', display: 'block', margin: '0 auto' }} aria-hidden="true">
        <rect x="0" y={mid - 3} width={W} height="6" rx="3" fill="#64748b" />
        <rect x={left + 2} y={mid - 7} width={centre - 4} height="14" rx="3" fill="#94a3b8" />
        {knurl}
        <text x={W / 2} y={mid} textAnchor="middle" dominantBaseline="central" fill="#0b0b0b" {...TXT}>20 kg</text>
        <rect x={left - collar - 1} y={mid - 10} width={collar} height="20" rx="1" fill="#cbd5e1" />
        <rect x={left + centre + 1} y={mid - 10} width={collar} height="20" rx="1" fill="#cbd5e1" />
        {side(left - collar - 3, -1, 'l')}
        {side(left + centre + collar + 3, 1, 'r')}
      </svg>
    </div>
  );
}
