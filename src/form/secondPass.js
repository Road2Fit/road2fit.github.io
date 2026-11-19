// Deuxième analyse de la vidéo (4.48, idée validée par Gabin : lancée par la personne, jamais automatique).
// Pendant la série, la détection tourne en direct : le téléphone filme, enregistre, dessine le squelette et compte en même
// temps, et ne cherche le corps que sur une partie des images (≈ 10 par seconde dans les signalements du 15/11/2026).
// Ici, on relit la vidéo enregistrée (gardée en mémoire, form/clip.js) au ralenti, en cherchant le corps sur CHAQUE image
// (≈ 30 par seconde de vidéo) avec le zoom sur la personne (cropRoi.js), puis on refait l'analyse complète.
// La vitesse de lecture s'adapte à la vitesse du téléphone pour ne sauter aucune image. Rien n'est envoyé.
import { loadPose, poseMock } from './pose';
import { pickPerson } from './pickPerson';
import { cropTracker } from './cropRoi';

export const PASS_FPS = 30; // images par seconde de vidéo visées
const MIN_RATE = 0.1, MAX_RATE = 1, STALL_MS = 8000;

/** Vitesse de lecture pour ne pas sauter d'image : une image toutes les 1/PASS_FPS s de vidéo, détection comprise. */
export function rateFor(detectMs) {
  if (!(detectMs > 0)) return 0.5;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, ((1000 / PASS_FPS) / detectMs) * 0.85));
}

/** Durée estimée de la deuxième analyse (s), d'après la durée de la vidéo. */
export function passEstimate(videoSec, detectMs = 45) {
  return Math.round(videoSec / rateFor(detectMs));
}

/**
 * Relit la vidéo et renvoie les images { t, lm, wl } (t en ms sur l'horloge de la série : clip.t0 + temps de la vidéo).
 * video = élément <video> affiché (certains navigateurs ne décodent pas une vidéo invisible) ; onProgress(0..1) ;
 * cancelled() → true pour arrêter (renvoie null).
 */
export async function runSecondPass({ clip, video, onProgress = () => {}, cancelled = () => false }) {
  const mock = poseMock();
  if (mock && mock.pass2) {
    // tests : images « relues » fournies à l'avance
    if (mock.pass2Hold) await mock.pass2Hold; // tests : analyse qui dure
    onProgress(1);
    return mock.pass2;
  }
  const pose = await loadPose();
  const aspectOf = () => (video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : clip.aspect || 9 / 16);
  const liveDur = clip.frames && clip.frames.length > 1 ? (clip.frames[clip.frames.length - 1].t - clip.frames[0].t) / 1000 : 0;
  video.muted = true;
  video.playsInline = true;
  video.src = clip.url;
  await new Promise((ok, ko) => {
    if (video.readyState >= 2) return ok();
    video.onloadeddata = () => ok();
    video.onerror = () => ko(new Error('video'));
  });
  if (cancelled()) return null;
  const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : liveDur || 60;
  const frames = [];
  const crops = cropTracker();
  let crop = null, track = null, lastMedia = -1, detAvg = 0, lastStep = Date.now() + 4000; // marge pour le démarrage
  const base = performance.now();
  const step = mediaTime => {
    if (lastMedia >= 0 && mediaTime - lastMedia < 0.9 / PASS_FPS) return; // au plus ≈ PASS_FPS images par seconde de vidéo
    lastMedia = mediaTime;
    lastStep = Date.now();
    const vw = video.videoWidth, vh = video.videoHeight, aspect = aspectOf();
    const t0 = performance.now();
    let res = null;
    try { res = pose.detect(video, base + mediaTime * 1000, crop); } catch (e) { crop = null; crops.reset(); }
    const ms = performance.now() - t0;
    detAvg = detAvg ? detAvg * 0.85 + ms * 0.15 : ms;
    const cands = res ? (res.all && res.all.length ? res.all : res.lm ? [res] : []) : [];
    let pick = null;
    if (cands.length) {
      const pk = pickPerson(cands, aspect, track, !!track);
      track = pk.track;
      pick = pk.pose;
    }
    crop = crops.next(pick ? track : null, !!pick, vw, vh);
    frames.push({ t: clip.t0 + mediaTime * 1000, lm: (pick && pick.lm) || null, wl: (pick && pick.wl) || null });
    video.playbackRate = rateFor(detAvg);
    onProgress(Math.min(0.99, mediaTime / dur));
  };
  let finished = false;
  await new Promise((done, fail) => {
    let timer = 0, poll = 0, lastVF = 0, stalled = 0, prevCheck = Date.now();
    const end = ok => { clearInterval(timer); clearInterval(poll); video.pause(); finished = ok; done(); };
    video.onended = () => end(true);
    timer = setInterval(() => {
      if (cancelled()) return end(false);
      const now = Date.now();
      // appli quittée (page cachée) : la lecture s'arrête, on attend le retour sans compter ce temps
      if (typeof document !== 'undefined' && document.hidden) { lastStep += now - prevCheck; if (!video.paused) video.pause(); }
      else if (video.paused && !video.ended) video.play().catch(() => {});
      prevCheck = now;
      if (now - lastStep > STALL_MS) { clearInterval(timer); clearInterval(poll); video.pause(); fail(new Error('stall')); }
    }, 250);
    // image affichée : requestVideoFrameCallback (temps exact de l'image) ; sinon on lit le temps de la vidéo
    if (typeof video.requestVideoFrameCallback === 'function') {
      const onVF = (now, meta) => { if (cancelled()) return; lastVF = Date.now(); step(meta.mediaTime); video.requestVideoFrameCallback(onVF); };
      video.requestVideoFrameCallback(onVF);
    }
    poll = setInterval(() => { if (Date.now() - lastVF > 300 && video.readyState >= 2 && !video.paused) step(video.currentTime); }, 8);
    video.playbackRate = 0.5;
    video.currentTime = 0;
    video.play().catch(() => {});
  });
  // arrêtée avant la fin (annulée) : rien ; une vidéo à moitié relue ne remplace jamais la première analyse
  if (cancelled() || !finished) return null;
  onProgress(1);
  return frames;
}
