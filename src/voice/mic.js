// Micro du navigateur (reconnaissance vocale en français), commun à toute l'appli : dictée de séance, coach, « Raconte ton passé ».
// Sur ordinateur, la reconnaissance échouait souvent en silence. Ici :
//  1. on demande d'abord l'accès au micro (getUserMedia) : la fenêtre d'autorisation s'affiche vraiment, et on sait s'il y a un micro ;
//  2. Chrome / Edge sur PC arrêtent l'écoute après quelques secondes de silence : on relance tant que la personne n'a pas appuyé sur Stop ;
//  3. chaque échec donne un message clair (micro bloqué, aucun micro, navigateur sans reconnaissance vocale…).

export const getSpeechRec = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null) || null;

const isBrave = () => typeof navigator !== 'undefined' && !!navigator.brave;
const isFirefox = () => typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent || '');

/** Message affiché quand le navigateur ne propose pas la reconnaissance vocale. */
export function noSpeechMessage() {
  if (isFirefox()) return 'Firefox ne propose pas la reconnaissance vocale. Ouvre l’appli dans Chrome ou Edge, ou dicte avec Windows + H dans la zone de texte.';
  return 'Ce navigateur ne propose pas la reconnaissance vocale. Ouvre l’appli dans Chrome ou Edge, ou dicte avec Windows + H (ou le micro du clavier du téléphone) dans la zone de texte.';
}

/** Explication d'une erreur de reconnaissance (code de SpeechRecognition ou de getUserMedia). '' = rien à dire. */
export function micErrorMessage(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Le micro est bloqué pour ce site. Clique sur le cadenas à gauche de l’adresse → Micro → Autoriser, puis réessaie. Sur Windows, vérifie aussi Paramètres → Confidentialité → Microphone (accès autorisé pour le navigateur).';
    case 'audio-capture':
    case 'NotFoundError':
    case 'NotReadableError':
      return 'Aucun micro utilisable : branche ou active ton micro (il est peut-être pris par une autre appli, comme Teams ou Zoom), puis réessaie.';
    case 'network':
      return isBrave()
        ? 'Brave ne fournit pas la reconnaissance vocale. Ouvre l’appli dans Chrome ou Edge, ou dicte avec Windows + H dans la zone de texte.'
        : 'La reconnaissance vocale passe par internet et n’a pas répondu (certains navigateurs comme Brave, Opera ou Vivaldi ne la fournissent pas). Réessaie, ou utilise Chrome ou Edge, ou Windows + H.';
    case 'language-not-supported':
      return 'Le français n’est pas disponible pour la reconnaissance vocale de ce navigateur. Utilise Chrome ou Edge, ou Windows + H.';
    case 'no-speech':
    case 'aborted':
      return '';
    default:
      return 'Le micro n’a pas pu démarrer. Réessaie, ou dicte avec Windows + H dans la zone de texte.';
  }
}

/** Demande l'accès au micro ; renvoie '' si c'est bon, sinon le nom de l'erreur. */
export async function askMicPermission() {
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null;
  if (!md || !md.getUserMedia) return ''; // ancien navigateur : la reconnaissance demandera elle-même
  try {
    const stream = await md.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return '';
  } catch (e) {
    return (e && e.name) || 'NotAllowedError';
  }
}

/**
 * Lance l'écoute. Renvoie { stop() } ; `stop` termine pour de bon (onEnd est alors appelé une fois).
 * callbacks : onStart(), onFinal(texte), onInterim(texte), onError(message), onEnd()
 */
export function startListening({ interim = false, onStart, onFinal, onInterim, onError, onEnd }) {
  const SpeechRec = getSpeechRec();
  let wanted = true;
  let rec = null;
  let started = false;
  let restarts = 0;
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    wanted = false;
    if (onEnd) onEnd();
  };
  const fail = code => {
    const msg = micErrorMessage(code);
    if (msg && onError) onError(msg);
    finish();
  };
  if (!SpeechRec) {
    if (onError) onError(noSpeechMessage());
    finish();
    return { stop() {} };
  }
  const launch = () => {
    try {
      rec = new SpeechRec();
      rec.lang = 'fr-FR';
      rec.continuous = true;
      rec.interimResults = interim;
      rec.onstart = () => { if (!started) { started = true; if (onStart) onStart(); } };
      rec.onresult = ev => {
        let fin = '';
        let mid = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) fin += ev.results[i][0].transcript + ' ';
          else mid += ev.results[i][0].transcript;
        }
        restarts = 0;
        if (fin.trim() && onFinal) onFinal(fin.trim());
        if (onInterim) onInterim(mid);
      };
      rec.onerror = ev => {
        const code = ev && ev.error;
        if (code === 'no-speech' || code === 'aborted') return; // silence : onend relancera
        wanted = false;
        fail(code);
      };
      rec.onend = () => {
        // Chrome / Edge sur PC s'arrêtent après un silence : on relance (au plus 20 fois sans rien entendre)
        if (wanted && restarts < 20) { restarts++; launch(); return; }
        finish();
      };
      rec.start();
    } catch (e) {
      fail((e && e.name) || 'start');
    }
  };
  askMicPermission().then(err => {
    if (!wanted) return;
    if (err) { fail(err); return; }
    launch();
  });
  return {
    stop() {
      if (!wanted) return;
      wanted = false;
      try { rec && rec.stop(); } catch (e) { /* rien */ }
      if (!rec) finish();
    },
  };
}
