/* Service worker de RondouFit : fonctionnement hors ligne.
   - pages : réseau d'abord (3 s max), puis copie en cache ;
   - fichiers de l'application (hachés par Vite) : cache d'abord ;
   - Service de sauvegarde en ligne (Supabase) et tout ce qui vient d'un autre site : jamais mis en cache. */
const CACHE = 'rondoufit-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rondoufit-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // toujours la version publiée, jamais une copie en cache
  if (req.mode !== 'navigate' && req.cache === 'no-store') return; // vérification de mise à jour : toujours le réseau

  if (req.mode === 'navigate') {
    event.respondWith(
      withTimeout(fetch(req), 3000)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(self.registration.scope, copy));
          return res;
        })
        .catch(async () => (await caches.match(self.registration.scope)) || (await caches.match('./index.html')) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// notification « Repos terminé » touchée : on revient sur l'appli déjà ouverte (ou on l'ouvre)
// Fin de repos (4.51.1, retour de Gabin : notification en retard, et restée après la séance) : la page confie la fin du
// repos au service worker, qui n'est pas ralenti quand l'écran est éteint ; 'rest-cancel' (série suivante, fin de séance,
// retour sur l'appli) annule l'attente ET retire la notification déjà affichée.
let restTimer = null;
let restDone = null;
const REST_TAG = 'rondoufit-rest';
const closeRest = () => self.registration.getNotifications({ tag: REST_TAG }).then((list) => list.forEach((n) => n.close())).catch(() => {});
const cancelRest = () => { if (restTimer) clearTimeout(restTimer); restTimer = null; if (restDone) restDone(); restDone = null; };
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'rest-cancel') { cancelRest(); event.waitUntil(closeRest()); return; }
  if (d.type === 'rest-close') { event.waitUntil(closeRest()); return; } // retour sur l'appli : on retire seulement ce qui est affiché
  if (d.type !== 'rest') return;
  cancelRest();
  if (session) return; // séance guidée : sa notification de suivi annonce déjà la fin du repos
  const wait = Math.max(0, Math.min(15 * 60 * 1000, Number(d.endAt) - Date.now()));
  event.waitUntil(closeRest().then(() => new Promise((resolve) => {
    restDone = resolve;
    restTimer = setTimeout(() => {
      restTimer = null; restDone = null;
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        if (list.some((c) => c.visibilityState === 'visible')) return null; // appli à l'écran : son et vibration suffisent
        return self.registration.showNotification('Repos terminé', {
          body: String(d.next || 'À toi pour la série suivante').slice(0, 120), tag: REST_TAG, renotify: true,
          vibrate: [200, 100, 200], icon: './neutral/icon-192.png', badge: './neutral/favicon-48.png', timestamp: Number(d.endAt) || Date.now(),
        });
      }).catch(() => {}).then(resolve);
    }, wait);
  })));
});

// Notification de suivi de séance (4.51.2, demande de Gabin) : séance guidée en cours et appli quittée → une notification
// « où j'en suis » (exercice, série, charge, temps de séance) ; pendant le repos, le temps restant, mis à jour toutes les
// 5 s, puis « Repos terminé » qui vibre. Silencieuse sinon. Retirée dès qu'on revient dans l'appli ou à la fin de la séance.
// La page renvoie l'état à chaque changement et toutes les 15 s (chaque message relance l'attente du service worker).
const SESSION_TAG = 'rondoufit-session';
let session = null;      // dernier état reçu
let sessionWake = null;  // réveil de la boucle
let sessionLoop = null;  // promesse de la boucle (gardée vivante par waitUntil)
const mmss = (ms) => { const t = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const anyVisible = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => l.some((c) => c.visibilityState === 'visible')).catch(() => false);
const closeTag = (tag) => self.registration.getNotifications({ tag }).then((l) => l.forEach((n) => n.close())).catch(() => {});
async function renderSession(alert) {
  if (!session) return closeTag(SESSION_TAG);
  if (await anyVisible()) return closeTag(SESSION_TAG);
  const now = Date.now();
  const elapsed = mmss(now - session.startedAt);
  const resting = session.rest && session.rest.endAt > now;
  const title = resting ? `Repos : ${mmss(session.rest.endAt - now)} · séance ${elapsed}` : alert ? `Repos terminé · séance ${elapsed}` : `Séance en cours · ${elapsed}`;
  const body = resting ? `Ensuite : ${session.rest.next || `${session.name} · ${session.set}`}` : `${session.name} · ${session.set} · ${session.detail}\n${session.progress}`;
  return self.registration.showNotification(title, {
    body, tag: SESSION_TAG, renotify: !!alert, silent: !alert, vibrate: alert ? [200, 100, 200] : undefined,
    requireInteraction: true, icon: './neutral/icon-192.png', badge: './neutral/favicon-48.png',
  }).catch(() => {});
}
function runSessionLoop() {
  if (sessionLoop) { if (sessionWake) sessionWake(); return sessionLoop; }
  sessionLoop = (async () => {
    let last = Date.now();
    let wasResting = false;
    while (session && Date.now() - session.at < 10 * 60 * 1000) { // plus de nouvelles depuis 10 min : on s'arrête
      const now = Date.now();
      const resting = !!(session.rest && session.rest.endAt > now);
      const ended = wasResting && !resting && session.rest;
      await renderSession(ended);
      if (ended) session.rest = null;
      wasResting = resting;
      const wait = resting ? Math.min(5000, Math.max(250, session.rest.endAt - now)) : 30000;
      await new Promise((r) => { sessionWake = r; setTimeout(r, wait); });
      sessionWake = null;
      last = now;
    }
    sessionLoop = null;
    if (!session) await closeTag(SESSION_TAG);
  })();
  return sessionLoop;
}
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'session') {
    session = { ...d, at: Date.now() };
    event.waitUntil(Promise.race([runSessionLoop(), new Promise((r) => setTimeout(r, 4 * 60 * 1000))]));
  } else if (d.type === 'session-end') {
    session = null;
    if (sessionWake) sessionWake();
    event.waitUntil(closeTag(SESSION_TAG));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list.find((w) => 'focus' in w);
    return c ? c.focus() : self.clients.openWindow('./');
  }));
});

// Rappel le jour de la séance (4.22, src/lib/sessionReminder.js) : quand le navigateur réveille le service worker
// (« periodic background sync », appli installée), on lit les prochaines séances laissées par l'appli et, si l'une est
// aujourd'hui et qu'on n'a pas encore prévenu aujourd'hui, on affiche une notification.
const PLAN_CACHE = 'r2f-data';
const PLAN_URL = './__r2f-plan.json';
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
async function remindSession() {
  const cache = await caches.open(PLAN_CACHE);
  const hit = await cache.match(PLAN_URL);
  if (!hit) return;
  const plan = await hit.json();
  const today = todayIso();
  if (!Array.isArray(plan.dates) || !plan.dates.includes(today) || plan.notified === today) return;
  if (new Date().getHours() < 7) return; // pas de notification en pleine nuit : on réessaiera au prochain réveil
  await self.registration.showNotification('Séance prévue aujourd’hui', {
    body: plan.title || 'Ton coach a préparé ta séance.', tag: 'rondoufit-session-day', icon: './neutral/icon-192.png', badge: './neutral/favicon-48.png',
  });
  await cache.put(PLAN_URL, new Response(JSON.stringify({ ...plan, notified: today }), { headers: { 'Content-Type': 'application/json' } }));
}
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'r2f-session-day') event.waitUntil(remindSession().catch(() => {}));
});
