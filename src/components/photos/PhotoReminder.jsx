import { useState } from 'react';
import { getTodayISODate } from '../../lib/dates';
import { usePhotos } from '../../lib/photos';
import { isStartEntry } from '../../lib/quests';

// Rappel : séance faite aujourd'hui mais pas de photo
export function PhotoReminder({ gameState, onGo }) {
  const photos = usePhotos();
  const today = getTodayISODate();
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('rondoufit_photo_snooze') === today; } catch (e) { return false; } });
  const done = (gameState.quests || []).some(q => (q.history || []).some(h => h.date === today && !isStartEntry(h)));
  if (hidden || !done || photos.some(p => p.date === today)) return null;
  return (
    // 4.47.3 : notification fixe en HAUT, opaque (sur téléphone elle se mêlait à « Parle à ton coach » en bas de la page)
    <div data-testid="photo-reminder" className="toast-in fixed top-3 inset-x-3 sm:inset-x-auto sm:right-5 sm:top-5 sm:max-w-md z-[60] bg-slate-900 border border-pink-500 shadow-2xl rounded-2xl p-3 flex items-center gap-3" style={{ marginTop: 'env(safe-area-inset-top)' }}>
      <span className="text-2xl">📸</span>
      <div className="flex-1">
        <p className="text-xs font-black text-white">Séance faite aujourd’hui : pense à ta photo souvenir !</p>
        <button onClick={onGo} className="text-xs font-bold text-pink-300 underline">Ouvrir mes souvenirs</button>
      </div>
      <button onClick={() => { try { localStorage.setItem('rondoufit_photo_snooze', today); } catch (e) {} setHidden(true); }} className="text-slate-400 hover:text-white text-sm" title="Plus tard">✕</button>
    </div>
  );
}
