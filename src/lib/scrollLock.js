// Blocage du défilement de la page quand une fenêtre est ouverte (pour toute l'appli, sans rien à faire dans chaque fenêtre).
// Sur téléphone (surtout iPhone), `overflow: hidden` ne suffit pas : le doigt fait défiler la page DERRIÈRE la fenêtre.
// On fige donc le corps de la page (position fixe, décalé de la hauteur déjà défilée) tant qu'un calque plein écran
// (`fixed inset-0`) est affiché, puis on le remet exactement au même endroit à la fermeture.
// Les fenêtres elles-mêmes défilent dans leur calque (`overflow-y-auto`), avec `overscroll-behavior: contain` (styles.css).

const OVERLAY = '.fixed.inset-0';

export function startScrollLock(doc = document, win = window) {
  let locked = false;
  let savedY = 0;
  const body = doc.body;
  const lock = () => {
    savedY = win.scrollY || doc.documentElement.scrollTop || 0;
    Object.assign(body.style, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
    locked = true;
  };
  const unlock = () => {
    Object.assign(body.style, { position: '', top: '', left: '', right: '', width: '', overflow: '' });
    locked = false;
    try { win.scrollTo(0, savedY); } catch (e) { /* rien */ }
  };
  let queued = false;
  const check = () => {
    queued = false;
    const open = !!doc.querySelector(OVERLAY);
    if (open && !locked) lock();
    else if (!open && locked) unlock();
  };
  const schedule = () => { if (!queued) { queued = true; Promise.resolve().then(check); } };
  const obs = new win.MutationObserver(schedule);
  obs.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  check();
  return () => { obs.disconnect(); if (locked) unlock(); };
}
