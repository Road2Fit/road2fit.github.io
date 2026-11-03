// Comptes et sauvegarde dans le nuage via Supabase (sans bibliothèque : appels HTTP simples, testés avec un faux serveur).
//  - comptes : e-mail + mot de passe (service « Auth » de Supabase : mots de passe chiffrés côté serveur, jamais lus par l'appli) ;
//  - sauvegarde : une ligne par personne dans la table `saves` (user_id, data jsonb, version), protégée côté serveur par une règle
//    « chacun ne voit et ne modifie que SA ligne » (Row Level Security, voir docs/supabase.sql).
// La clé « anon » publique est faite pour être visible dans l'appli ; la clé secrète (service_role) n'est JAMAIS utilisée ici.
// Interface attendue par sync/engine.js : getFile / putFile avec un numéro de version (« sha »).
import { SyncError } from './errors';
import * as store from './storage';

export class AccountError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const trimSlash = u => String(u || '').replace(/\/+$/, '');

function baseHeaders(cfg, token) {
  const h = { apikey: cfg.anonKey, 'Content-Type': 'application/json' };
  // Nouvelle clé « publishable » (sb_publishable_…) : elle ne se met que dans l'en-tête apikey. Ancienne clé « anon » (JWT, eyJ…) : aussi en Authorization.
  if (token) h.Authorization = `Bearer ${token}`;
  else if (/^eyJ/.test(cfg.anonKey)) h.Authorization = `Bearer ${cfg.anonKey}`;
  return h;
}

/** Message simple en français pour une réponse d'erreur de Supabase. */
function friendly(status, body) {
  const raw = String((body && (body.error_description || body.msg || body.message || body.error)) || '').toLowerCase();
  if (/invalid login credentials|invalid_grant/.test(raw)) return 'E-mail ou mot de passe incorrect.';
  if (/already registered|already been registered|user_already_exists/.test(raw)) return 'Un compte existe déjà avec cet e-mail : connecte-toi.';
  if (/database error saving new user|invitation invalide/.test(raw)) return 'Inscription refusée : code d’invitation incorrect (ou inscriptions fermées).';
  if (/password should be at least|weak_password|at least 6/.test(raw)) return 'Mot de passe trop court (6 caractères minimum, mieux : 10).';
  if (/email not confirmed/.test(raw)) return 'Adresse e-mail pas encore confirmée : ouvre le message reçu.';
  if (/rate limit|too many|over_email_send_rate_limit|429/.test(raw) || status === 429) return 'Trop de tentatives, réessaie dans quelques minutes.';
  if (/valid email|invalid format|email_address_invalid/.test(raw)) return 'Adresse e-mail invalide.';
  if (status === 401 || status === 403) return 'Session expirée : reconnecte-toi.';
  if (status >= 500) return 'Le service de sauvegarde ne répond pas pour le moment (réessaie plus tard).';
  return 'Erreur du service de comptes.';
}

async function call(cfg, method, path, { token, body, headers, query } = {}) {
  let res;
  try {
    res = await fetch(`${trimSlash(cfg.url)}${path}${query || ''}`, {
      method,
      headers: { ...baseHeaders(cfg, token), ...(headers || {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new AccountError('Pas de connexion au service de sauvegarde.', 0, 'network');
  }
  let json = null;
  try { json = await res.json(); } catch { /* corps vide */ }
  if (!res.ok) {
    const err = new AccountError(friendly(res.status, json), res.status, json && (json.error_code || json.code));
    err.raw = String((json && (json.message || json.msg || json.error)) || '');
    throw err;
  }
  return json;
}

/** Session enregistrée : { access_token, refresh_token, expires_at (s), user: { id, email } } */
function toSession(r) {
  if (!r || !r.access_token) return null;
  const expiresAt = r.expires_at || Math.floor(Date.now() / 1000) + (Number(r.expires_in) || 3600);
  return { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: expiresAt, user: { id: r.user && r.user.id, email: r.user && r.user.email } };
}

export async function signUp(cfg, email, password, invite) {
  const r = await call(cfg, 'POST', '/auth/v1/signup', { body: { email, password, data: { invite: invite || '' } } });
  const session = toSession(r);
  // Si le projet demande de confirmer l'e-mail, il n'y a pas encore de session.
  return session ? { session } : { needsConfirmation: true };
}

export async function signIn(cfg, email, password) {
  const r = await call(cfg, 'POST', '/auth/v1/token', { query: '?grant_type=password', body: { email, password } });
  const session = toSession(r);
  if (!session) throw new AccountError('Connexion impossible.', 0, 'no_session');
  return session;
}

export async function refresh(cfg, session) {
  const r = await call(cfg, 'POST', '/auth/v1/token', { query: '?grant_type=refresh_token', body: { refresh_token: session.refresh_token } });
  const next = toSession(r);
  if (!next) throw new AccountError('Session expirée : reconnecte-toi.', 401, 'no_session');
  return next;
}

export async function signOut(cfg, session) {
  try { await call(cfg, 'POST', '/auth/v1/logout', { token: session && session.access_token }); } catch { /* déconnexion locale quand même */ }
}

export const requestPasswordReset = (cfg, email, redirectTo) => call(cfg, 'POST', '/auth/v1/recover', { body: { email }, query: redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '' });

/** Nouveau mot de passe (après le lien « mot de passe oublié » : session temporaire de récupération). */
export async function updatePassword(cfg, accessToken, password) {
  return call(cfg, 'PUT', '/auth/v1/user', { token: accessToken, body: { password } });
}

/** Session valide (renouvelée si elle expire dans moins d'une minute, et enregistrée). */
export async function freshSession(cfg) {
  const acc = store.readAccount();
  if (!acc || !acc.session) throw new AccountError('Pas connecté.', 401, 'no_session');
  if (acc.session.expires_at - 60 > Date.now() / 1000) return acc.session;
  try {
    const next = await refresh(cfg, acc.session);
    store.writeAccount({ ...acc, session: next });
    return next;
  } catch (e) {
    // Réseau coupé : on garde la session, la synchro réessaiera. Refus du serveur : il faut se reconnecter.
    if (e instanceof AccountError && e.status === 0) throw e;
    store.writeAccount({ ...acc, session: null, expired: true });
    throw e;
  }
}

// ---- Sauvegarde (une ligne par personne) ----

const asConflict = () => new SyncError('Conflit : la sauvegarde a été modifiée ailleurs.', 409);

/** Lit la sauvegarde du compte. `content` et `sha` valent null s'il n'y en a pas encore ; `sha` = numéro de version. */
export async function getFile(cfg) {
  const s = await freshSession(cfg);
  const rows = await call(cfg, 'GET', '/rest/v1/saves', { token: s.access_token, query: `?select=data,version&user_id=eq.${encodeURIComponent(s.user.id)}` });
  if (!Array.isArray(rows) || rows.length === 0) return { content: null, sha: null };
  return { content: JSON.stringify(rows[0].data), sha: String(rows[0].version) };
}

/** Écrit la sauvegarde ; refuse (conflit) si la version a changé entre-temps. Renvoie la nouvelle version. */
export async function putFile(cfg, content, sha) {
  const s = await freshSession(cfg);
  const data = JSON.parse(content);
  const prefer = { Prefer: 'return=representation' };
  if (sha === null || sha === undefined) {
    try {
      const rows = await call(cfg, 'POST', '/rest/v1/saves', { token: s.access_token, headers: prefer, body: { user_id: s.user.id, data } });
      return String(Array.isArray(rows) && rows[0] ? rows[0].version : 1);
    } catch (e) {
      if (e instanceof AccountError && (e.status === 409 || e.code === '23505')) throw asConflict();
      throw e;
    }
  }
  const v = Number(sha);
  const rows = await call(cfg, 'PATCH', '/rest/v1/saves', {
    token: s.access_token, headers: prefer,
    query: `?user_id=eq.${encodeURIComponent(s.user.id)}&version=eq.${v}`,
    body: { data, version: v + 1, updated_at: new Date().toISOString() },
  });
  if (!Array.isArray(rows) || rows.length === 0) throw asConflict(); // la version a changé : le moteur relit et fusionne
  return String(rows[0].version);
}

/** Versions précédentes gardées automatiquement par le serveur (une copie au plus toutes les 8 h, les 21 dernières) : [{ id, version, saved_at }]. */
export async function listHistory(cfg) {
  const s = await freshSession(cfg);
  const rows = await call(cfg, 'GET', '/rest/v1/saves_history', { token: s.access_token, query: `?select=id,version,saved_at&user_id=eq.${encodeURIComponent(s.user.id)}&order=saved_at.desc&limit=30` });
  return Array.isArray(rows) ? rows : [];
}

/** Contenu d'une version précédente. */
export async function getHistory(cfg, id) {
  const s = await freshSession(cfg);
  const rows = await call(cfg, 'GET', '/rest/v1/saves_history', { token: s.access_token, query: `?select=data&user_id=eq.${encodeURIComponent(s.user.id)}&id=eq.${encodeURIComponent(id)}` });
  return Array.isArray(rows) && rows[0] ? rows[0].data : null;
}

// ---- Photos souvenirs : table `photos` (user_id, id, data jsonb, version), mêmes règles « chacun les siennes » ----
const photoId = path => String(path || '').replace(/^photos\//, '').replace(/\.json$/, '');
const uid = s => encodeURIComponent(s.user.id);

export const photos = {
  /** [{ name: '<id>.json', sha: '<version>' }] : toutes les photos du compte (le dossier est ignoré). */
  async listDir(cfg) {
    const s = await freshSession(cfg);
    const rows = await call(cfg, 'GET', '/rest/v1/photos', { token: s.access_token, query: `?select=id,version&user_id=eq.${uid(s)}` });
    return (Array.isArray(rows) ? rows : []).map(r => ({ name: `${r.id}.json`, sha: String(r.version) }));
  },
  async getFile(cfg) {
    const s = await freshSession(cfg);
    const rows = await call(cfg, 'GET', '/rest/v1/photos', { token: s.access_token, query: `?select=data,version&user_id=eq.${uid(s)}&id=eq.${encodeURIComponent(photoId(cfg.path))}` });
    if (!Array.isArray(rows) || rows.length === 0) return { content: null, sha: null };
    return { content: JSON.stringify(rows[0].data), sha: String(rows[0].version) };
  },
  async putFile(cfg, content, sha) {
    const s = await freshSession(cfg);
    const id = photoId(cfg.path);
    const data = JSON.parse(content);
    const prefer = { Prefer: 'return=representation' };
    if (sha === null || sha === undefined) {
      try {
        const rows = await call(cfg, 'POST', '/rest/v1/photos', { token: s.access_token, headers: prefer, body: { user_id: s.user.id, id, data } });
        return String(Array.isArray(rows) && rows[0] ? rows[0].version : 1);
      } catch (e) {
        if (e instanceof AccountError && (e.status === 409 || e.code === '23505')) throw asConflict();
        throw e;
      }
    }
    const v = Number(sha);
    const rows = await call(cfg, 'PATCH', '/rest/v1/photos', { token: s.access_token, headers: prefer, query: `?user_id=eq.${uid(s)}&id=eq.${encodeURIComponent(id)}&version=eq.${v}`, body: { data, version: v + 1, updated_at: new Date().toISOString() } });
    if (!Array.isArray(rows) || rows.length === 0) throw asConflict();
    return String(rows[0].version);
  },
  async deleteFile(cfg) {
    const s = await freshSession(cfg);
    await call(cfg, 'DELETE', '/rest/v1/photos', { token: s.access_token, query: `?user_id=eq.${uid(s)}&id=eq.${encodeURIComponent(photoId(cfg.path))}` });
  },
};

// ---- Amis : code à 7 caractères (voir docs/supabase-amis.sql). Tout passe par des fonctions du serveur ----
export const FRIEND_CODE_LENGTH = 7;
export const normalizeFriendCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const FRIEND_ERRORS = {
  FRIEND_NOT_FOUND: 'Code introuvable. Vérifie-le avec ton ami (7 caractères, ou la personne ne partage plus son profil).',
  FRIEND_SELF: 'C’est ton propre code : donne-le plutôt à quelqu’un d’autre.',
  FRIEND_LOCKED: 'Trop d’essais ratés. Réessaie dans un quart d’heure.',
  FRIEND_FULL: 'Tu as atteint la limite de 100 amis.',
};
function friendError(e) {
  if (!(e instanceof AccountError)) return e;
  const key = Object.keys(FRIEND_ERRORS).find(k => (e.raw || '').includes(k));
  if (key) return new AccountError(FRIEND_ERRORS[key], e.status, key);
  if (/relation .*(profiles|friendships)|function .*friend_|schema cache|404/i.test(e.raw || '') || e.status === 404) {
    return new AccountError('La fonction « amis » n’est pas encore installée sur le serveur.', e.status, 'not_installed');
  }
  return e;
}

export const friends = {
  /** Publie mon résumé de profil et mon réglage de partage ; renvoie { friend_code, share }. */
  async publish(cfg, summary, share = true) {
    const s = await freshSession(cfg);
    try {
      const rows = await call(cfg, 'POST', '/rest/v1/profiles', {
        token: s.access_token,
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        query: '?on_conflict=user_id',
        body: { user_id: s.user.id, summary, share, updated_at: new Date().toISOString() },
      });
      return Array.isArray(rows) && rows[0] ? { friend_code: rows[0].friend_code, share: rows[0].share } : null;
    } catch (e) { throw friendError(e); }
  },
  /** Mon code et mon réglage de partage (null si pas encore de profil). */
  async mine(cfg) {
    const s = await freshSession(cfg);
    try {
      const rows = await call(cfg, 'GET', '/rest/v1/profiles', { token: s.access_token, query: `?select=friend_code,share,summary&user_id=eq.${uid(s)}` });
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    } catch (e) { throw friendError(e); }
  },
  async add(cfg, code) {
    const s = await freshSession(cfg);
    try { return await call(cfg, 'POST', '/rest/v1/rpc/friend_add', { token: s.access_token, body: { p_code: normalizeFriendCode(code) } }); } catch (e) { throw friendError(e); }
  },
  /** [{ user_id, summary, updated_at, added_at }] */
  async list(cfg) {
    const s = await freshSession(cfg);
    try {
      const rows = await call(cfg, 'POST', '/rest/v1/rpc/friend_list', { token: s.access_token, body: {} });
      return Array.isArray(rows) ? rows : [];
    } catch (e) { throw friendError(e); }
  },
  async remove(cfg, userId) {
    const s = await freshSession(cfg);
    try { await call(cfg, 'POST', '/rest/v1/rpc/friend_remove', { token: s.access_token, body: { p_user: userId } }); } catch (e) { throw friendError(e); }
  },
  /** Nouveau code ; retire aussi tous ceux qui m'avaient ajouté. Renvoie le nouveau code. */
  async regenerateCode(cfg) {
    const s = await freshSession(cfg);
    try { return await call(cfg, 'POST', '/rest/v1/rpc/friend_regenerate_code', { token: s.access_token, body: {} }); } catch (e) { throw friendError(e); }
  },
};

/** Catalogue commun : exercices créés par le coach intelligent (lecture seule pour les comptes, docs/supabase-exercices.sql). */
export const sharedExercises = {
  async list(cfg) {
    const s = await freshSession(cfg);
    const rows = await call(cfg, 'GET', '/rest/v1/shared_exercises', { token: s.access_token, query: '?select=id,data&order=created_at.asc' });
    return Array.isArray(rows) ? rows : [];
  },
};
