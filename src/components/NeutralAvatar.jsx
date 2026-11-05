// Avatar sobre de l'édition neutre : initiale du prénom (ou un haltère) sur un rond aux couleurs du thème (variables de palette : bleu en classique, vert citron en néon).
export function NeutralAvatar({ name = '', size = 64 }) {
  const first = String(name || '').replace(/^Dresseur\s+/i, '').trim().charAt(0).toUpperCase();
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="select-none" aria-hidden="true">
      <circle cx="60" cy="60" r="52" fill="rgb(var(--slate-900))" stroke="rgb(var(--sky-400))" strokeWidth="3" />
      {first ? (
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fontSize="54" fontWeight="800" fill="rgb(var(--sky-100))" fontFamily="system-ui, sans-serif">{first}</text>
      ) : (
        <g fill="rgb(var(--sky-300))">
          <rect x="22" y="48" width="8" height="24" rx="3" /><rect x="32" y="40" width="9" height="40" rx="3" />
          <rect x="41" y="56" width="38" height="8" rx="3" fill="rgb(var(--sky-200))" />
          <rect x="79" y="40" width="9" height="40" rx="3" /><rect x="90" y="48" width="8" height="24" rx="3" />
        </g>
      )}
    </svg>
  );
}
