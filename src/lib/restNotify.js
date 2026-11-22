// Fin du repos quand l'appli n'est pas à l'écran (téléphone verrouillé, autre appli) : une notification du téléphone.
// L'autorisation est demandée UNE fois, au premier repos (après le toucher de « Série faite »). Refus = rien ne change.
const ASKED = 'rondoufit:notifAsked';

export function askRestNotifyOnce() {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default' || localStorage.getItem(ASKED)) return;
    localStorage.setItem(ASKED, '1');
    Notification.requestPermission().catch(() => {});
  } catch (e) { /* rien */ }
}

export function notifyRestEnd(next) {
  try {
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return false; // à l'écran : le son et la vibration suffisent
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const title = 'Repos terminé';
    const opts = { body: next || 'À toi pour la série suivante', tag: 'rondoufit-rest', renotify: true, vibrate: [200, 100, 200], icon: './neutral/icon-192.png', badge: './neutral/favicon-48.png' };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(r => r.showNotification(title, opts)).catch(() => { try { new Notification(title, opts); } catch (e) { /* rien */ } });
    } else new Notification(title, opts);
    return true;
  } catch (e) { return false; }
}

// 4.51.1 : la fin du repos est confiée au service worker (pas ralenti écran éteint) ; la page ne notifie plus elle-même
// quand c'est le cas (sinon deux notifications). Annulée à la série suivante, à la fin de la séance et au retour sur l'appli.
let swScheduled = false;
const sw = () => (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) || null;

export function scheduleRestEnd(endAt, next) {
  swScheduled = false;
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !sw()) return false;
    sw().postMessage({ type: 'rest', endAt, next: next || '' });
    swScheduled = true;
    return true;
  } catch (e) { return false; }
}
export const restScheduledBySw = () => swScheduled;

/** Retour sur l'appli : retire la notification affichée, sans annuler un repos qui court encore. */
export function cancelRestNotifyShown() {
  try { if (sw()) sw().postMessage({ type: 'rest-close' }); } catch (e) { /* rien */ }
}

/** Plus de notification de repos : attente annulée et notification déjà affichée retirée. */
export function cancelRestNotify() {
  swScheduled = false;
  try {
    if (sw()) sw().postMessage({ type: 'rest-cancel' });
    else if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(r => r && r.getNotifications({ tag: 'rondoufit-rest' })).then(l => (l || []).forEach(n => n.close())).catch(() => {});
    }
  } catch (e) { /* rien */ }
}
