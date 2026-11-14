// Marqueurs de synchronisation et session du compte, gardés dans le navigateur de chaque appareil.
// (Le mot de passe n'est jamais enregistré ; la session est un jeton temporaire.)

const KEYS = {
  synced: 'rondoufit:sync',       // { sha, base } : version de la sauvegarde en ligne vue en dernier + état commun à ce moment-là
  dirty: 'rondoufit:dirty',       // '1' tant que des modifications de cet appareil n'ont pas été envoyées
  localTs: 'rondoudou_local_ts',  // date (ms) de la dernière modification faite sur cet appareil
  photoMetaAcc: 'rondoufit:photoSyncAccount', // état des photos à la dernière synchro avec le compte
  account: 'rondoufit:account',   // compte de l'application : { session, expired? } (jamais le mot de passe)
  lastUser: 'rondoufit:lastUser', // dernier compte connecté sur cet appareil (pour ne jamais mélanger deux personnes)
};
const LEGACY_GITHUB = ['rondoufit:github', 'rondoufit:photoSync']; // ancienne sauvegarde GitHub (abandonnée)

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* stockage plein ou interdit : on continue sans */
  }
}

/**
 * Marqueurs de synchro PROPRES À CET ONGLET (4.47.5, perte réelle de séances le 14/11/2026).
 * Avant, « version vue en ligne + état commun » (`rondoufit:sync`) et « à envoyer » (`rondoufit:dirty`) étaient lus
 * directement dans le localStorage, PARTAGÉ par tous les onglets (et par l'appli installée) du même site. Un onglet resté
 * ouvert avec de vieilles données lisait alors la version vue par un AUTRE onglet, croyait la sauvegarde en ligne
 * inchangée et l'écrasait avec ses vieilles données (séances perdues). Maintenant chaque onglet garde les siens en
 * mémoire, lus une fois au démarrage, et les écrit avec ses données (`persistTabMarkers`) : la paire reste cohérente.
 */
export function createTabMarkers(storage = null) {
  const rd = k => { try { return storage ? storage.getItem(k) : read(k); } catch { return null; } };
  const wr = (k, v) => { if (!storage) return write(k, v); try { if (v === null) storage.removeItem(k); else storage.setItem(k, v); } catch { /* rien */ } };
  let synced; // undefined = pas encore lu
  let dirty;
  const parse = () => { try { const x = JSON.parse(rd(KEYS.synced) || 'null'); return x && x.sha ? x : null; } catch { return null; } };
  return {
    readSynced() { if (synced === undefined) synced = parse(); return synced; },
    writeSynced(x) { synced = x && x.sha ? x : null; wr(KEYS.synced, synced ? JSON.stringify(synced) : null); },
    isDirty() { if (dirty === undefined) dirty = rd(KEYS.dirty) === '1'; return dirty; },
    markDirty() { dirty = true; wr(KEYS.dirty, '1'); },
    clearDirty() { dirty = false; wr(KEYS.dirty, null); },
    // à appeler juste après l'écriture des données de l'onglet : ses marqueurs vont avec ses données
    persist() {
      if (synced !== undefined) wr(KEYS.synced, synced ? JSON.stringify(synced) : null);
      if (dirty !== undefined) wr(KEYS.dirty, dirty ? '1' : null);
    },
  };
}
const tab = createTabMarkers();

export const readSynced = () => tab.readSynced();
export const writeSynced = s => tab.writeSynced(s);
export const persistTabMarkers = () => tab.persist();

export function readPhotoMetaAccount() {
  try {
    return JSON.parse(read(KEYS.photoMetaAcc) || 'null');
  } catch {
    return null;
  }
}
export const writePhotoMetaAccount = m => write(KEYS.photoMetaAcc, m ? JSON.stringify(m) : null);

export const isDirty = () => tab.isDirty();
export const markDirty = () => tab.markDirty();
export const clearDirty = () => tab.clearDirty();

export const getLocalTs = () => Number(read(KEYS.localTs)) || 0;
export const setLocalTs = t => write(KEYS.localTs, String(t));

// ---- Compte de l'application (Supabase) ----
export function readAccount() {
  try {
    const a = JSON.parse(read(KEYS.account) || 'null');
    return a && typeof a === 'object' ? a : null;
  } catch {
    return null;
  }
}
export const writeAccount = a => write(KEYS.account, a ? JSON.stringify(a) : null);
export const isAccountConnected = () => { const a = readAccount(); return !!(a && a.session && a.session.user && a.session.user.id); };
export const readLastUser = () => read(KEYS.lastUser);
export const writeLastUser = id => write(KEYS.lastUser, id || null);

/** Efface la clé GitHub (et la mémoire des photos GitHub) qui traînent encore sur cet appareil : plus aucun usage. */
export function purgeLegacyGithub() {
  for (const k of LEGACY_GITHUB) write(k, null);
}
