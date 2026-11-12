// Calibration personnelle de l'analyse vidéo (4.25) : écart menton – barre des tractions, en longueurs de buste
// (+ = le menton est en réalité plus haut que mesuré). Gardée sur l'appareil (la position de la caméra et la façon de
// tenir la barre comptent autant que la personne).
const KEY = 'rondoufit:chinCal';
export function getChinCal() {
  try { const v = Number(localStorage.getItem(KEY)); return Number.isFinite(v) ? v : 0; } catch (e) { return 0; }
}
export function setChinCal(v) {
  try { if (v) localStorage.setItem(KEY, String(v)); else localStorage.removeItem(KEY); } catch (e) {}
}
