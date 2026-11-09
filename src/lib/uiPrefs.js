// Préférences d'affichage propres à cet appareil (jamais synchronisées) : taille du texte, style de l'interface.
const KEY = 'rondoufit:ui';
const DEFAULTS = { bigText: false, theme: 'neon', neon: 'lime' }; // style « néon de salle » (essai de novembre 2026) ; « classic » = l'ancien style

export function readUiPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { ...DEFAULTS }; }
}

/** « Texte plus grand » : tout le texte est en rem, il suit la taille de base de la page. Style : data-theme sur <html>. */
export function applyUiPrefs(prefs) {
  try {
    document.documentElement.style.fontSize = prefs.bigText ? '18px' : '';
    document.documentElement.dataset.neon = prefs.neon || 'lime'; // couleur du néon choisie (⚙️ Réglages et données → Couleur du néon)
    if (prefs.theme === 'neon') document.documentElement.dataset.theme = 'neon';
    else delete document.documentElement.dataset.theme;
  } catch (e) { /* rien */ }
}

export function saveUiPrefs(prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* rien */ }
  applyUiPrefs(prefs);
}
