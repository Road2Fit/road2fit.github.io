// Rangées qui défilent sur le côté avec une barre masquée (classe `no-scrollbar` : groupes de l'onglet Exercices, pages du
// Coach, suggestions du chat). Au doigt on glisse ; à la souris il n'y avait aucun moyen d'atteindre la fin (retour de
// Gabin, 4.47) : la molette les fait maintenant défiler sur le côté.
export function startWheelHScroll() {
  if (typeof window === 'undefined' || window.__r2fHScroll) return;
  window.__r2fHScroll = true;
  window.addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // zoom, ou déjà un défilement horizontal (pavé tactile)
    const row = e.target && e.target.closest && e.target.closest('.no-scrollbar');
    if (!row || row.scrollWidth <= row.clientWidth + 1) return;
    const max = row.scrollWidth - row.clientWidth;
    const next = Math.max(0, Math.min(max, row.scrollLeft + e.deltaY));
    if (next === row.scrollLeft) return; // au bout : on laisse la page défiler normalement
    row.scrollLeft = next;
    e.preventDefault();
  }, { passive: false });
}
