// Détection d'une nouvelle version de l'application. Deux moyens, le premier suffit :
//  1. version.json en ligne (écrit à la publication, jamais mis en cache par le service worker) comparé au numéro de la
//     version qui tourne (__APP_VERSION__, fixé à la construction) ;
//  2. la page d'accueil relue sur le réseau : son fichier d'application (nom haché par Vite) comparé à celui qui tourne.
// Vérifie au démarrage, toutes les 5 minutes, au retour sur l'appli, au retour du réseau et pendant qu'on fait défiler la page
// (au plus une fois toutes les 2 minutes). Rien à faire hors ligne (l'erreur est ignorée).
// La mise à jour trouvée est gardée dans window.__r2fUpdate : le bandeau la retrouve même s'il s'affiche après coup.

/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

/** Nom du fichier JS de l'application dans le texte HTML d'une page (ou '' s'il n'y en a pas). */
export function appScriptName(html) {
  const m = /assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(html || '');
  return m ? m[1] : '';
}

/** La version `a` est-elle plus récente que `b` ? (« 3.10 » > « 3.9 », « 3.7.1 » > « 3.7 ») */
export function isNewerVersion(a, b) {
  const pa = String(a || '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map(n => parseInt(n, 10) || 0);
  if (!String(a || '') || !String(b || '')) return false;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

export function startUpdateCheck(onUpdate, { intervalMs = 5 * 60 * 1000, scrollGapMs = 2 * 60 * 1000, current = APP_VERSION } = {}) {
  const script = appScriptName(Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src')).join(' '));
  if (!script && !current) return () => {};
  let stopped = false;
  let busy = false;
  let last = 0;
  const found = note => {
    stopped = true;
    window.__r2fUpdate = note || {};
    onUpdate(window.__r2fUpdate);
  };
  const check = async () => {
    if (stopped || busy) return;
    busy = true;
    last = Date.now();
    try {
      const note = await fetch('./version.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
      if (note && current && isNewerVersion(note.version, current)) { found(note); return; }
      if (script) {
        const html = await fetch('./', { cache: 'no-store' }).then(r => (r.ok ? r.text() : ''));
        const latest = appScriptName(html);
        // même numéro mais fichier différent : publication corrective ; numéro plus ancien en ligne : copie pas encore à jour, on ignore
        if (latest && latest !== script && !(note && current && isNewerVersion(current, note.version))) found(note);
      }
    } catch (e) { /* hors ligne */ } finally { busy = false; }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') check(); };
  const onScroll = () => { if (Date.now() - last >= scrollGapMs) check(); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', check);
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  const id = setInterval(check, intervalMs);
  check();
  return () => {
    stopped = true;
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', check);
    window.removeEventListener('scroll', onScroll, { capture: true });
  };
}
