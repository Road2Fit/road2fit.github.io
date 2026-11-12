// Rappel le jour de la séance (4.22) : réglage dans les Réglages du Coach. Voir lib/sessionReminder.js.
// `useSessionReminder` (monté par CoachPanel) tient à jour les dates laissées au service worker.
import { useEffect, useState } from 'react';
import { Art } from '../Art';
import { card } from './ui';
import { getCoachSettings } from '../../coach/settings';
import { upcomingSessions } from '../../ai/context';
import { formatDayFr, getTodayISODate } from '../../lib/dates';
import { disableReminders, downloadCalendar, enableReminders, reminderSupport, storePlan } from '../../lib/sessionReminder';

const dow = iso => new Date(`${iso}T12:00:00`).getDay();

/** Prochaines séances prévues, avec l'heure du créneau de salle si elle est réglée. */
function nextSessions(gameState, n = 8) {
  const coach = getCoachSettings(gameState);
  let dates = [];
  try { dates = upcomingSessions(gameState, getTodayISODate(), null, n); } catch (e) { dates = []; }
  return dates.map(iso => ({ iso, start: ((coach.gymSlots || {})[dow(iso)] || {}).start || '18:00', minutes: Number(coach.sessionMinutes) || 60, title: 'Séance de musculation' }));
}

export function useSessionReminder(gameState) {
  const on = !!getCoachSettings(gameState).reminders;
  const key = on ? nextSessions(gameState).map(s => s.iso).join() : '';
  useEffect(() => {
    if (on) storePlan(key ? key.split(',') : [], 'Ton coach a préparé ta séance. Ouvre l’appli quand tu es prêt.');
  }, [on, key]);
}

export function CoachReminders({ gameState, setGameState }) {
  const on = !!getCoachSettings(gameState).reminders;
  const [msg, setMsg] = useState('');
  const set = v => setGameState(prev => ({ ...prev, coach: { ...getCoachSettings(prev), reminders: v } }));
  const toggle = async () => {
    if (on) { set(false); disableReminders(); setMsg(''); return; }
    const ok = await enableReminders();
    if (ok) { set(true); setMsg(''); }
    else setMsg(reminderSupport() === 'denied' ? 'Les notifications sont bloquées pour l’appli : autorise-les dans les réglages du téléphone.' : 'Cet appareil ne permet pas les notifications : utilise l’agenda ci-dessous.');
  };
  const sessions = nextSessions(gameState);
  return (
    <section className={card} data-testid="coach-reminders">
      <h3 className="font-black text-white"><Art name="calendar" />Rappel de séance</h3>
      <button type="button" role="switch" aria-checked={on} onClick={toggle} data-testid="reminder-toggle"
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-sm font-black ${on ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-200'}`}>
        <span>Me prévenir le jour de la séance</span><span>{on ? 'Activé' : 'Désactivé'}</span>
      </button>
      {msg && <p className="text-xs text-amber-200" data-testid="reminder-msg">{msg}</p>}
      {on && <p className="text-xs text-slate-400">Notification dans la journée, sur l’appli installée. L’heure dépend du téléphone : pour une heure précise, ajoute tes séances à ton agenda.</p>}
      {sessions.length > 0 && (
        <button type="button" onClick={() => downloadCalendar(sessions)} data-testid="reminder-calendar" className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-100 text-sm font-bold">
          Ajouter mes {sessions.length} prochaines séances à mon agenda
          <span className="block text-xs font-normal text-slate-400">de {formatDayFr(sessions[0].iso)} à {formatDayFr(sessions[sessions.length - 1].iso)}, alarme 30 min avant</span>
        </button>
      )}
    </section>
  );
}
