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
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list.find((w) => 'focus' in w);
    return c ? c.focus() : self.clients.openWindow('./');
  }));
});
