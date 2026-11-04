import { Art } from './Art';
import { useEffect, useState } from 'react';

// « Nouvelle version disponible » : s'affiche quand lib/updateCheck.js détecte une mise à jour (événement rondoufit-update,
// ou window.__r2fUpdate si elle a été trouvée avant l'affichage). `detail` = la note de la nouvelle version (version.json).
// « Plus tard » réduit le bandeau en une petite pastille qui reste visible en haut de l'écran, même en faisant défiler la page.
export function UpdateBanner() {
  const [note, setNote] = useState(() => (typeof window !== 'undefined' && window.__r2fUpdate) || null);
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const h = e => { setNote(e.detail || {}); setSmall(false); };
    window.addEventListener('rondoufit-update', h);
    if (window.__r2fUpdate) setNote(window.__r2fUpdate);
    return () => window.removeEventListener('rondoufit-update', h);
  }, []);
  if (!note) return null;
  if (small) {
    return (
      <button
        type="button"
        onClick={() => setSmall(false)}
        className="fixed top-2 right-2 z-[90] px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black shadow-xl"
        data-testid="update-pill"
      >
        ⬆ Mise à jour à faire
      </button>
    );
  }
  const items = Array.isArray(note.items) ? note.items.slice(0, 3) : [];
  return (
    <div className="fixed top-3 inset-x-3 z-[90] flex justify-center" role="status" data-testid="update-banner">
      <div className="max-w-md w-full bg-emerald-950 border border-emerald-400/60 rounded-2xl p-4 shadow-2xl text-sm text-emerald-100 space-y-2">
        <p className="font-black text-white"><Art name="sparkle" size={20} />Une nouvelle version est disponible</p>
        {note.title && <p className="font-bold">{note.version ? `Version ${note.version} : ` : ''}{note.title}</p>}
        {items.length > 0 && <ul className="list-disc pl-5 space-y-0.5 text-xs text-emerald-200">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>}
        <p className="text-xs text-emerald-300">Rafraîchis la page pour en profiter (tes données sont gardées).</p>
        <div className="flex gap-2">
          <button onClick={() => window.location.reload()} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black">Rafraîchir</button>
          <button onClick={() => setSmall(true)} className="px-4 py-2.5 rounded-xl bg-emerald-900 text-emerald-200 font-bold">Plus tard</button>
        </div>
      </div>
    </div>
  );
}
