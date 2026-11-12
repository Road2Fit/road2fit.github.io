// Rappel le jour de la séance (4.22, coach.reminders). Deux moyens, sans serveur :
//  1) une notification du téléphone le jour prévu, envoyée par le service worker quand le navigateur le réveille
//     (« periodic background sync » : appli installée sur Android / Chrome ; l'heure n'est pas garantie) ;
//     l'appli lui laisse les dates des prochaines séances dans un petit cache (PLAN_CACHE) ;
//  2) un fichier d'agenda (.ics) : les prochaines séances dans l'agenda du téléphone, avec une alarme (fiable partout).
// Même logique que lib/restNotify.js : rien n'est demandé tant que la personne n'active pas le rappel.
export const PLAN_CACHE = 'r2f-data'; // ne commence pas par « rondoufit- » : public/sw.js efface ces caches-là à chaque mise à jour
export const PLAN_URL = './__r2f-plan.json';
const TAG = 'r2f-session-day';

export function reminderSupport() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'none';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

/** Demande l'autorisation (au toucher du réglage) puis inscrit le réveil périodique s'il existe. Renvoie true si autorisé. */
export async function enableReminders() {
  try {
    if (reminderSupport() === 'none') return false;
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (p !== 'granted') return false;
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.ready);
    if (reg && reg.periodicSync) { try { await reg.periodicSync.register(TAG, { minInterval: 6 * 3600 * 1000 }); } catch (e) { /* non accordé par le navigateur : l'agenda reste possible */ } }
    return true;
  } catch (e) { return false; }
}

export async function disableReminders() {
  try {
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.ready);
    if (reg && reg.periodicSync) await reg.periodicSync.unregister(TAG);
    if (typeof caches !== 'undefined') { const c = await caches.open(PLAN_CACHE); await c.delete(PLAN_URL); }
  } catch (e) { /* rien */ }
}

/** Laisse au service worker les prochaines séances : { dates: ['AAAA-MM-JJ'], title }. */
export async function storePlan(dates, title = '') {
  try {
    if (typeof caches === 'undefined') return;
    const c = await caches.open(PLAN_CACHE);
    await c.put(PLAN_URL, new Response(JSON.stringify({ dates, title }), { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) { /* rien */ }
}

const pad = n => String(n).padStart(2, '0');
const stamp = (iso, hm) => `${iso.replace(/-/g, '')}T${hm.replace(':', '')}00`;

/** Fichier d'agenda : une entrée par séance prévue, alarme au début. sessions = [{ iso, start: '18:00', minutes, title }]. */
export function calendarFile(sessions, now = new Date()) {
  const dt = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Road2Fit//Seances//FR', 'CALSCALE:GREGORIAN'];
  sessions.forEach(s => {
    const start = s.start || '18:00';
    const [h, m] = start.split(':').map(Number);
    const endMin = h * 60 + m + (Number(s.minutes) || 60);
    const end = `${pad(Math.floor(endMin / 60) % 24)}:${pad(endMin % 60)}`;
    lines.push('BEGIN:VEVENT', `UID:r2f-${s.iso}@road2fit`, `DTSTAMP:${dt}`, `DTSTART:${stamp(s.iso, start)}`, `DTEND:${stamp(s.iso, end)}`,
      `SUMMARY:${String(s.title || 'Séance de musculation').replace(/[,;\\]/g, ' ')}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Séance prévue', 'TRIGGER:-PT30M', 'END:VALARM', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadCalendar(sessions) {
  try {
    const blob = new Blob([calendarFile(sessions)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'road2fit-seances.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch (e) { return false; }
}
