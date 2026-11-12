// Bip à chaque rep comptée pendant l'analyse vidéo (4.35, demande de Gabin) : on l'entend dans ses écouteurs pendant la
// série (le son du navigateur sort là où sort le son du téléphone : écouteurs branchés ou Bluetooth, sinon haut-parleur).
// Un seul AudioContext, « débloqué » au toucher qui ouvre la caméra : sur téléphone, un son lancé sans toucher récent
// (ce qui est le cas pendant la série) est sinon bloqué.
const KEY = 'rondoufit:formBeep';
let ctx = null;

export function beepOn() {
  try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } // activé par défaut
}
export function setBeepOn(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* rien */ }
}

export function unlockBeep() {
  try {
    const A = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!A) return null;
    if (!ctx) ctx = new A();
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
    return ctx;
  } catch (e) { return null; }
}

/** Bip court et net (deux notes montantes) : rep validée. Renvoie vrai si le son a été lancé. */
export function playRepBeep() {
  const c = unlockBeep();
  if (!c) return false;
  try {
    const t = c.currentTime;
    [[1046.5, 0, 0.09], [1568, 0.08, 0.14]].forEach(([f, d, len]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + d);
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
      o.connect(g); g.connect(c.destination);
      o.start(t + d); o.stop(t + d + len + 0.02);
    });
    return true;
  } catch (e) { return false; }
}
