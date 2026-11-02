import { Art } from './Art';
import { useEffect, useState } from 'react';

// « Nouvelle version disponible » : s'affiche quand main.jsx détecte une mise à jour (événement rondoufit-update).
// `detail` = la note de la nouvelle version, lue dans version.json (écrit à la publication) : son titre et ses premiers points.
export function UpdateBanner() {
  const [note, setNote] = useState(null);
  useEffect(() => {
    const h = e => setNote(e.detail || {});
    window.addEventListener('rondoufit-update', h);
    return () => window.removeEventListener('rondoufit-update', h);
  }, []);
  if (!note) return null;
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
          <button onClick={() => setNote(null)} className="px-4 py-2.5 rounded-xl bg-emerald-900 text-emerald-200 font-bold">Plus tard</button>
        </div>
      </div>
    </div>
  );
}
