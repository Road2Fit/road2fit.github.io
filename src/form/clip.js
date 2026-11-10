// Vidéo de la dernière série filmée (4.20) : gardée EN MÉMOIRE seulement (jamais envoyée, jamais écrite sans demande),
// pour revoir l'extrait d'un point relevé, puis effacée à la série suivante, sauf si la personne choisit de la garder
// (téléchargement sur son téléphone). Un seul extrait à la fois : le précédent est libéré.
let current = null;

const revoke = c => { try { if (c && c.url && c.url.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(c.url); } catch (e) {} };

/** c = { id, url, blob, mime, frames (repères par image), t0 (horloge de la 1re image, ms), mirror, aspect, name } */
export function setClip(c) {
  if (current && (!c || current.url !== c.url)) revoke(current);
  current = c || null;
}
export const getClip = id => (current && id && current.id === id ? current : null);
export const clearClip = () => setClip(null);

/** Format d'enregistrement : MP4 si le navigateur sait le faire (lisible partout), sinon WebM. */
export function pickMime() {
  const MR = typeof window !== 'undefined' && window.MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== 'function') return '';
  return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => { try { return MR.isTypeSupported(t); } catch (e) { return false; } }) || '';
}

/** Garde la vidéo : téléchargement sur le téléphone (dossier Téléchargements / galerie). */
export function saveClip(c) {
  if (!c || !c.url) return false;
  const ext = /mp4/.test(c.mime || '') ? 'mp4' : 'webm';
  const day = new Date().toISOString().slice(0, 10);
  const safe = String(c.name || 'serie').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  try {
    const a = document.createElement('a');
    a.href = c.url;
    a.download = `road2fit-${safe}-${day}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch (e) { return false; }
}
