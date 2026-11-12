// Zoom et choix de l'objectif de la caméra pour filmer une série (4.30, demande de Gabin : utiliser le grand angle).
// - Zoom : contrainte `zoom` de la piste vidéo (Chrome sur Android, quand le téléphone la donne). Sur certains téléphones
//   le minimum est sous 1× (0,5 ou 0,6) : c'est le grand angle.
// - Objectifs : quand le navigateur présente les objectifs comme des caméras séparées (enumerateDevices), on peut passer
//   de l'un à l'autre ; le choix est gardé par sens de caméra (rondoufit:formLens).
// Les réglages ne changent qu'AVANT l'enregistrement : changer d'échelle pendant la série fausserait l'analyse.
const ZOOM_KEY = 'rondoufit:formZoom';
const LENS_KEY = 'rondoufit:formLens';
const STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

/** Niveaux de zoom proposés d'après les capacités { min, max } de la caméra (le minimum exact toujours inclus). */
export function zoomLevels(caps) {
  if (!caps || !(caps.max > caps.min)) return [];
  const out = [caps.min, ...STEPS.filter(z => z > caps.min + 0.04 && z < caps.max - 0.04), caps.max];
  return [...new Set(out.map(z => Math.round(z * 100) / 100))];
}
/** Niveau suivant (dir = +1 zoomer, −1 dézoomer). */
export function nextZoom(levels, cur, dir) {
  if (!levels.length) return cur;
  if (dir > 0) return levels.find(z => z > cur + 0.01) ?? levels[levels.length - 1];
  return [...levels].reverse().find(z => z < cur - 0.01) ?? levels[0];
}
export const zoomText = z => `${String(Math.round(z * 10) / 10).replace('.', ',')}×`;

const BACK = /back|rear|arri[eè]re|environment|world/i;
const FRONT = /front|avant|user|face|selfie/i;
/** Objectifs (caméras vidéo) du sens demandé. Sans indication dans le nom, toutes les caméras sont gardées. */
export function lensesFor(devices, facing) {
  const cams = (devices || []).filter(d => d.kind === 'videoinput' && d.deviceId);
  if (!cams.length) return [];
  const want = facing === 'user' ? FRONT : BACK;
  const named = cams.filter(d => BACK.test(d.label || '') || FRONT.test(d.label || ''));
  const list = named.length ? cams.filter(d => want.test(d.label || '')) : cams;
  return list.map(d => ({ id: d.deviceId, label: d.label || '' }));
}

const read = k => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
const write = (k, facing, v) => { try { const o = read(k); if (v == null) delete o[facing]; else o[facing] = v; localStorage.setItem(k, JSON.stringify(o)); } catch (e) { /* rien */ } };
export const savedZoom = facing => { const v = Number(read(ZOOM_KEY)[facing]); return Number.isFinite(v) && v > 0 ? v : null; };
export const saveZoom = (facing, z) => write(ZOOM_KEY, facing, z);
export const savedLens = facing => read(LENS_KEY)[facing] || null;
export const saveLens = (facing, id) => write(LENS_KEY, facing, id);
