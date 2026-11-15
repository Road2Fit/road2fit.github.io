// Détection du corps image par image : MediaPipe Pose Landmarker (Google, modèle « full » : 33 repères 2D + 3D).
// Chargée seulement quand on filme une série (fichiers téléchargés une fois puis gardés par le navigateur).
// Tout tourne sur le téléphone : la vidéo n'est ni enregistrée ni envoyée ; seuls les fichiers du modèle sont téléchargés.
// Tests : window.__r2fPoseMock = { frames: [{ t, lm, wl }], aspect } remplace caméra et détection.
const VERSION = '0.10.35'; // même version que le paquet @mediapipe/tasks-vision installé
export const POSE_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
export const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

import { MAX_POSES } from './pickPerson';
import { uncrop } from './cropRoi';

let pending = null;
const copy = arr => (arr ? arr.map(p => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility })) : null);

export function poseMock() {
  return (typeof window !== 'undefined' && window.__r2fPoseMock) || null;
}

/** Charge le détecteur (une seule fois). Renvoie { detect(video, tempsMs) → { lm, wl } }. */
export function loadPose() {
  const mock = poseMock();
  if (mock) return Promise.resolve(mock);
  if (!pending) {
    pending = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks(POSE_WASM);
      const make = delegate => PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate },
        runningMode: 'VIDEO', numPoses: MAX_POSES, // 4.31 : plusieurs personnes, la bonne est choisie par pickPerson
        minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      });
      let landmarker, canvas = null;
      try { landmarker = await make('GPU'); } catch (e) { landmarker = await make('CPU'); } // carte graphique indisponible : processeur
      return {
        // crop = morceau de l'image autour de la personne (cropRoi.js, 4.47.8) ou null = image entière
        detect(video, ts, crop = null) {
          let src = video;
          if (crop) {
            if (!canvas) canvas = document.createElement('canvas');
            if (canvas.width !== crop.w || canvas.height !== crop.h) { canvas.width = crop.w; canvas.height = crop.h; }
            canvas.getContext('2d').drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
            src = canvas;
          }
          const r = landmarker.detectForVideo(src, ts);
          const vw = video.videoWidth, vh = video.videoHeight;
          const all = (r.landmarks || []).map((l, i) => ({ lm: crop ? uncrop(copy(l), crop, vw, vh) : copy(l), wl: copy(r.worldLandmarks && r.worldLandmarks[i]) }));
          return { lm: all[0] ? all[0].lm : null, wl: all[0] ? all[0].wl : null, all };
        },
      };
    })();
    pending.catch(() => { pending = null; }); // réessayer à la prochaine ouverture (connexion revenue…)
  }
  return pending;
}
