// Silhouette (face + dos) colorée selon le travail de chaque muscle sur les 4 dernières semaines.
// Mode optimisé : une couleur par muscle ; mode simplifié : chaque zone prend la couleur de son grand groupe
// (bras et épaules = « Épaules & Bras », obliques = abdominaux, lombaires = dos, tout le bas du corps = jambes).
import { coarseOf } from '../../data/muscles';
const COLORS = { none: '#334155', low: '#f43f5e', mid: '#fbbf24', good: '#10b981', high: '#a78bfa' };

// [cx, cy, rx, ry] par muscle ; deux vues
const FRONT = {
  'Épaules': [[33, 38, 9, 7], [77, 38, 9, 7]],
  Pectoraux: [[46, 46, 9, 8], [64, 46, 9, 8]],
  Biceps: [[27, 58, 5, 10], [83, 58, 5, 10]],
  'Avant-bras': [[24, 82, 4, 11], [86, 82, 4, 11]],
  Abdominaux: [[55, 69, 7, 15]],
  Obliques: [[42, 70, 5, 12], [68, 70, 5, 12]],
  Hanches: [[40, 93, 6, 6], [70, 93, 6, 6]],
  Quadriceps: [[44, 120, 9, 20], [66, 120, 9, 20]],
  Mollets: [[43, 162, 6, 16], [67, 162, 6, 16]],
};
const BACK = {
  'Épaules': [[143, 38, 9, 7], [187, 38, 9, 7]],
  Dos: [[165, 54, 17, 17]],
  Triceps: [[137, 58, 5, 10], [193, 58, 5, 10]],
  'Avant-bras': [[134, 82, 4, 11], [196, 82, 4, 11]],
  Lombaires: [[165, 79, 9, 7]],
  Fessiers: [[155, 97, 9, 8], [175, 97, 9, 8]],
  'Ischio-jambiers': [[154, 126, 8, 18], [176, 126, 8, 18]],
  Mollets: [[153, 162, 6, 16], [177, 162, 6, 16]],
};

// `worked` (liste de muscles) : mode « séance » du grand rond — muscles travaillés pleins, les autres pâles, en couleur du texte (currentColor)
export function MuscleBodyMap({ rows = [], mini = false, worked = null }) {
  if (worked) return <WorkedMap worked={new Set(worked)} />;
  const byArena = {};
  rows.forEach(r => { byArena[r.arena] = r; });
  const rowOf = a => byArena[a] || byArena[coarseOf(a)];
  const colorOf = a => {
    const r = rowOf(a);
    return !r || r.avg === 0 ? COLORS.none : COLORS[r.status] || COLORS.none;
  };
  const draw = shapes => Object.entries(shapes).flatMap(([a, list]) =>
    list.map(([cx, cy, rx, ry], i) => (
      <ellipse key={a + i} cx={cx} cy={cy} rx={rx} ry={ry} fill={colorOf(a)} fillOpacity={0.85} stroke="#0f172a" strokeWidth="1">
        <title>{rowOf(a) ? `${rowOf(a).arena} : ${rowOf(a).avg} séries/sem.` : a}</title>
      </ellipse>
    ))
  );
  return (
    <div className="flex flex-col items-center gap-1.5" data-testid={mini ? 'muscle-map-mini' : 'muscle-map'}>
      <svg viewBox={mini ? '0 0 220 170' : '0 0 220 190'} className={mini ? 'w-[68px] sm:w-[110px] h-auto' : 'w-full max-w-xs'} role="img" aria-label="Silhouette des muscles travaillés, vue de face et de dos">
        <circle cx="55" cy="16" r="11" fill="#475569" />
        <circle cx="165" cy="16" r="11" fill="#475569" />
        <rect x="46" y="28" width="18" height="8" rx="3" fill="#475569" />
        <rect x="156" y="28" width="18" height="8" rx="3" fill="#475569" />
        {draw(FRONT)}
        {draw(BACK)}
        {!mini && <text x="55" y="188" textAnchor="middle" fontSize="9" fill="#94a3b8">Face</text>}
        {!mini && <text x="165" y="188" textAnchor="middle" fontSize="9" fill="#94a3b8">Dos</text>}
      </svg>
      {!mini && <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: COLORS.good }} />dans la cible</span>
        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: COLORS.mid }} />un peu juste</span>
        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: COLORS.low }} />insuffisant</span>
        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: COLORS.high }} />au-delà</span>
        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: COLORS.none }} />pas travaillé</span>
      </div>}
    </div>
  );
}

function WorkedMap({ worked }) {
  const on = a => worked.has(a) || worked.has(coarseOf(a));
  const draw = shapes => Object.entries(shapes).flatMap(([a, list]) =>
    list.map(([cx, cy, rx, ry], i) => (
      <ellipse key={a + i} cx={cx} cy={cy} rx={rx} ry={ry} fill="currentColor" fillOpacity={on(a) ? 0.95 : 0.16} data-on={on(a) ? '1' : undefined} />
    ))
  );
  return (
    <svg viewBox="0 0 220 180" className="w-full h-auto" role="img" aria-label="Muscles travaillés pendant la séance, vue de face et de dos" data-testid="session-muscles">
      <circle cx="55" cy="16" r="11" fill="currentColor" fillOpacity="0.3" />
      <circle cx="165" cy="16" r="11" fill="currentColor" fillOpacity="0.3" />
      <rect x="46" y="28" width="18" height="8" rx="3" fill="currentColor" fillOpacity="0.3" />
      <rect x="156" y="28" width="18" height="8" rx="3" fill="currentColor" fillOpacity="0.3" />
      {draw(FRONT)}
      {draw(BACK)}
    </svg>
  );
}
