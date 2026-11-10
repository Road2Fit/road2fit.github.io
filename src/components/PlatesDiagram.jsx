import { platesFor } from '../lib/plates';

// Schéma des disques à mettre sur la barre (4.21, remplace le texte « Disques : 15 + 2,5 de chaque côté ») :
// une moitié de barre (« 20 kg » écrit dedans), les disques d'un côté avec leur poids écrit DANS le disque, puis « × 2 ».
// Hauteur de chaque disque selon son poids (comme à la salle). Le texte reste lu par les lecteurs d'écran.
const SIZE = { 25: [17, 58], 20: [16, 58], 15: [15, 52], 10: [14, 44], 5: [13, 37], 2.5: [13, 33], 1.25: [13, 31] };
const fmt = v => String(v).replace('.', ',');
const NEON = 'var(--neon, #ec4899)';

export function PlatesDiagram({ total, testId, className = '' }) {
  const r = platesFor(total);
  if (!r) return null;
  const plates = r.perSide;
  const text = plates.length ? `Disques : ${plates.map(fmt).join(' + ')} de chaque côté` : 'Disques : barre seule';
  if (!plates.length) {
    return <p className={`text-center text-xs text-slate-500 ${className}`} data-testid={testId}><span className="sr-only">{text}</span><span aria-hidden="true">Barre seule (20 kg)</span></p>;
  }
  const H = 62, mid = H / 2, gap = 2;
  const barW = 52, collar = 5; // barre (avec « 20 kg ») puis butée
  let x = barW + collar + 2;
  const discs = plates.map((p, i) => {
    const [w, h] = SIZE[p];
    const px = x;
    x += w + gap;
    const cx = px + w / 2;
    return (
      <g key={i}>
        <rect x={px} y={mid - h / 2} width={w} height={h} rx="2" fill={NEON} />
        <text x={cx} y={mid} transform={`rotate(-90 ${cx} ${mid})`} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="800" fill="#0b0b0b">{fmt(p)}</text>
      </g>
    );
  });
  const end = x + 3; // bout de la barre qui dépasse
  const W = end + 40;
  return (
    <div className={`flex justify-center ${className}`} data-testid={testId}>
      <span className="sr-only">{text}</span>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: Math.round(W * 1.15), maxWidth: '70%', height: 'auto' }} aria-hidden="true">
        <rect x="0" y={mid - 7} width={barW} height="14" rx="3" fill="#94a3b8" />
        <text x={barW / 2} y={mid} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="800" fill="#0b0b0b">20 kg</text>
        <rect x={barW} y={mid - 3} width={end - barW} height="6" rx="2" fill="#94a3b8" />
        <rect x={barW} y={mid - 10} width={collar} height="20" rx="1" fill="#94a3b8" />
        {discs}
        <text x={end + 8} y={mid} dominantBaseline="central" fontSize="20" fontWeight="800" fill="#fff">× 2</text>
      </svg>
    </div>
  );
}
