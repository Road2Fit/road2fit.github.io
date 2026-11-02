// Coach intelligent : appel de la fonction Edge Supabase « coach-ai » (qui seule détient la clé de l'API Claude).
// L'appli n'envoie que le nécessaire (exercices, séances récentes, réglages du coach) : jamais de photo, d'e-mail ni de mot de passe.
import { SUPABASE, supabaseReady } from '../config';
import { freshSession } from '../sync/supabase';
import { isAccountConnected } from '../sync/storage';

export class AiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/** 'ok' | 'no_service' | 'no_account' | 'no_consent' | 'offline' */
export function aiStatus(state) {
  if (!supabaseReady(SUPABASE)) return 'no_service';
  if (!isAccountConnected()) return 'no_account';
  if (!(state && state.aiConsent)) return 'no_consent';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  return 'ok';
}

const MESSAGES = {
  network: 'Pas de connexion internet pour le coach intelligent.',
  not_configured: 'Le coach intelligent n’est pas encore branché (la clé de l’API manque sur le serveur).',
  quota: 'Tu as beaucoup sollicité le coach intelligent aujourd’hui : réessaie demain.',
  auth: 'Session expirée : reconnecte-toi à ton compte.',
  refused: 'Le coach intelligent n’a pas pu traiter cette demande.',
  timeout: 'Le coach intelligent met trop de temps à répondre, réessaie.',
};

/** Appelle une tâche (« dictation », « coach », « program ») ; renvoie le JSON produit, ou lance une AiError (message en français). */
export async function callAi(task, payload, { timeoutMs = 90000 } = {}) {
  let s;
  try {
    s = await freshSession(SUPABASE);
  } catch {
    throw new AiError(MESSAGES.auth, 'auth');
  }
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  let res;
  try {
    res = await fetch(`${String(SUPABASE.url).replace(/\/+$/, '')}/functions/v1/coach-ai`, {
      method: 'POST',
      headers: { apikey: SUPABASE.anonKey, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, ...payload }),
      signal: ctrl ? ctrl.signal : undefined,
    });
  } catch (e) {
    throw new AiError(e && e.name === 'AbortError' ? MESSAGES.timeout : MESSAGES.network, e && e.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    if (timer) clearTimeout(timer);
  }
  let json = null;
  try { json = await res.json(); } catch { /* corps vide */ }
  if (!res.ok || !json || !json.ok) {
    const code = (json && json.error) || (res.status === 401 ? 'auth' : 'server');
    throw new AiError(MESSAGES[code] || 'Le coach intelligent ne répond pas pour le moment, réessaie.', code);
  }
  return json.data;
}
