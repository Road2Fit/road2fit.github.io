// Silhouette (face + dos) colorée selon le travail de chaque muscle sur les 4 dernières semaines.
// Mode optimisé : une couleur par muscle ; mode simplifié : chaque zone prend la couleur de son grand groupe
// (bras et épaules = « Épaules & Bras », obliques = abdominaux, lombaires = dos, tout le bas du corps = jambes).
import { coarseOf } from '../../data/muscles';
const COLORS = { none: '#334155', low: '#f43f5e', mid: '#fbbf24', good: '#10b981', high: '#a78bfa' };
// le cœur, entraîné comme un muscle (coach/cardio.js) : dessiné sur la poitrine, côté gauche de la personne
const HEART_D = 'M12 20.8S3.2 15.6 3.2 9.2c0-2.8 2.1-4.9 4.7-4.9 1.8 0 3.2 1 4.1 2.4.9-1.4 2.3-2.4 4.1-2.4 2.6 0 4.7 2.1 4.7 4.9 0 6.4-8.8 11.6-8.8 11.6Z';
const Heart = props => <path d={HEART_D} transform="translate(56.5 40) scale(0.55)" {...props} />;

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
export function MuscleBodyMap({ rows = [], mini = false, worked = null, heart = null }) {
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
        {heart && <Heart fill={COLORS[heart.status] || COLORS.none} stroke="#0f172a" strokeWidth="2" data-testid="map-heart"><title>{`Cœur : ${heart.week.points} min cette semaine`}</title></Heart>}
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
      {worked.has('Cœur') && <Heart fill="currentColor" fillOpacity="0.95" data-on="1" data-testid="session-heart" />}
    </svg>
  );
}

// 4.23 : même silhouette pour signaler une douleur. Chaque muscle est vert ; un clic le passe en rouge (et retour).
// Face : la personne nous regarde, sa droite est donc à gauche de l'image ; dos : sa droite est à droite de l'image.
// Muscles au milieu (dos, abdominaux, lombaires) et cou : sans côté. `isOn(zone, side)` et `onToggle(zone, side)`.
const PAIN_COLORS = { ok: '#10b981', hurt: '#f43f5e' };
export function PainBodyMap({ isOn, onToggle, labelOf, zoneOf }) {
  const shape = (view, a, i, n, [cx, cy, rx, ry]) => {
    const side = n < 2 ? null : (view === 'front' ? (i === 0 ? 'right' : 'left') : (i === 0 ? 'left' : 'right'));
    const zone = zoneOf(a);
    const on = isOn(zone, side);
    const label = labelOf(zone, side);
    return (
      <ellipse key={view + a + i} cx={cx} cy={cy} rx={rx} ry={ry} fill={on ? PAIN_COLORS.hurt : PAIN_COLORS.ok} fillOpacity={on ? 0.95 : 0.7}
        stroke={on ? '#fecdd3' : '#0f172a'} strokeWidth={on ? 1.5 : 1} role="button" tabIndex={0} aria-pressed={on} aria-label={label}
        data-testid={`painmap-${zone}-${side || 'c'}-${view}`} className="cursor-pointer outline-none focus:stroke-white"
        onClick={() => onToggle(zone, side)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(zone, side); } }}>
        <title>{label}</title>
      </ellipse>
    );
  };
  const draw = (view, shapes) => Object.entries(shapes).flatMap(([a, list]) => list.map((s, i) => shape(view, a, i, list.length, s)));
  const neckOn = isOn('neck', null);
  const neck = x => (
    <rect key={'neck' + x} x={x} y="28" width="18" height="8" rx="3" fill={neckOn ? PAIN_COLORS.hurt : PAIN_COLORS.ok} fillOpacity={neckOn ? 0.95 : 0.7}
      role="button" tabIndex={0} aria-pressed={neckOn} aria-label={labelOf('neck', null)} data-testid={`painmap-neck-c-${x < 100 ? 'front' : 'back'}`} className="cursor-pointer outline-none"
      onClick={() => onToggle('neck', null)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle('neck', null); } }}>
      <title>{labelOf('neck', null)}</title>
    </rect>
  );
  const side = (x, t) => <text x={x} y="110" textAnchor="middle" fontSize="8" fontWeight="700" fill="#64748b">{t}</text>;
  return (
    <svg viewBox="0 0 220 190" className="w-full max-w-xs mx-auto select-none" role="group" aria-label="Touche les muscles qui te font mal, vue de face et de dos" data-testid="pain-map">
      <circle cx="55" cy="16" r="11" fill="#475569" />
      <circle cx="165" cy="16" r="11" fill="#475569" />
      {neck(46)}{neck(156)}
      {draw('front', FRONT)}
      {draw('back', BACK)}
      {side(10, 'D')}{side(100, 'G')}{side(120, 'G')}{side(210, 'D')}
      <text x="55" y="188" textAnchor="middle" fontSize="9" fill="#94a3b8">Face</text>
      <text x="165" y="188" textAnchor="middle" fontSize="9" fill="#94a3b8">Dos</text>
    </svg>
  );
}
