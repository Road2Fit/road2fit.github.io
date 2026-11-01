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
    <div className="bg-pink-950/60 border border-pink-500/60 rounded-xl p-3 flex items-center gap-3">
      <span className="text-2xl">📸</span>
      <div className="flex-1">
        <p className="text-xs font-black text-white">Séance faite aujourd’hui : pense à ta photo souvenir !</p>
        <button onClick={onGo} className="text-xs font-bold text-pink-300 underline">Ouvrir mes souvenirs</button>
      </div>
      <button onClick={() => { try { localStorage.setItem('rondoufit_photo_snooze', today); } catch (e) {} setHidden(true); }} className="text-slate-400 hover:text-white text-sm" title="Plus tard">✕</button>
    </div>
  );
}
