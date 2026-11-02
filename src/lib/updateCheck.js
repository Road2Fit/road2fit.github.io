// Détection d'une nouvelle version de l'application : on relit la page d'accueil et on compare le fichier
// d'application (nom haché par Vite) à celui qui tourne. Rien à faire hors ligne (l'erreur est ignorée).

/** Nom du fichier JS de l'application dans le texte HTML d'une page (ou '' s'il n'y en a pas). */
export function appScriptName(html) {
  const m = /assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(html || '');
  return m ? m[1] : '';
}

export function startUpdateCheck(onUpdate, { intervalMs = 10 * 60 * 1000 } = {}) {
  const current = appScriptName(Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src')).join(' '));
  if (!current) return () => {};
  let stopped = false;
  const check = async () => {
    if (stopped) return;
    try {
      const html = await fetch('./', { cache: 'no-store' }).then(r => (r.ok ? r.text() : ''));
      const latest = appScriptName(html);
      if (latest && latest !== current) {
        stopped = true;
        // résumé de la nouvelle version (version.json, écrit à la publication) ; sans lui, le bandeau reste simple
        const note = await fetch('./version.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
        onUpdate(note);
      }
    } catch (e) { /* hors ligne */ }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') check(); };
  document.addEventListener('visibilitychange', onVisible);
  const id = setInterval(check, intervalMs);
  check();
  return () => { stopped = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
}
