// Suivi des erreurs de l'appli (4.47, phase « 10 testeurs ») : quand quelque chose plante chez quelqu'un, une ligne part dans
// la table Supabase `app_errors` (docs/supabase-phase1.sql) : message, début de la pile d'appels, version, type d'appareil,
// onglet. JAMAIS de données de la personne (pas de poids, pas de séances, pas d'e-mail : ils sont effacés du message).
// Au plus 10 erreurs différentes par ouverture de l'appli ; les mêmes sont comptées (count). Silencieux s'il échoue.
import { SUPABASE, supabaseReady } from '../config';
import { APP_VERSION } from './updateCheck';
import { readAccount } from '../sync/storage';

const MAX_PER_SESSION = 10;
const queue = new Map(); // message → ligne
let sent = 0;
let timer = null;

/** Retire ce qui pourrait identifier quelqu'un : e-mails, longues suites de chiffres, jetons, paramètres d'adresse. */
export function scrub(text, max) {
  return String(text || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
    .replace(/\b(eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, '<jeton>')
    .replace(/([?&][\w-]+=)[^&\s)]+/g, '$1…')
    .replace(/\b\d{6,}\b/g, '<n>')
    .slice(0, max);
}

/** Type d'appareil, sans détail inutile : « Android · Chrome », « iPhone · Safari », « Windows · Edge »… */
export function deviceLabel(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'autre';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'autre';
  const app = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ? ' · appli installée' : '';
  return `${os} · ${br}${app}`;
}

const screenNow = () => {
  try { return String((document.querySelector('[data-tab][aria-current="page"], [data-tab][aria-selected="true"]') || {}).dataset?.tab || location.hash || '').slice(0, 60); } catch { return ''; }
};

async function flush() {
  timer = null;
  const rows = [...queue.values()];
  queue.clear();
  if (!rows.length || !supabaseReady(SUPABASE)) return;
  try {
    const acc = readAccount();
    const token = acc && acc.session && acc.session.expires_at - 30 > Date.now() / 1000 ? acc.session.access_token : null;
    const headers = { apikey: SUPABASE.anonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch(`${SUPABASE.url.replace(/\/+$/, '')}/rest/v1/app_errors`, { method: 'POST', headers, body: JSON.stringify(rows), cache: 'no-store', keepalive: true });
  } catch { /* hors ligne ou service indisponible : tant pis, rien d'important ne se perd */ }
}

/** Signale une erreur (appelé par les écouteurs globaux et par l'écran « Oups »). */
export function reportError(err, where = '') {
  try {
    const message = scrub((err && (err.message || err.reason)) || String(err), 500) || 'Erreur inconnue';
    if (/ResizeObserver loop|Script error\.?$|Load failed|NetworkError|Failed to fetch/i.test(message)) return; // bruit sans intérêt
    const key = message;
    if (queue.has(key)) { queue.get(key).count = Math.min(100, queue.get(key).count + 1); return; }
    if (sent >= MAX_PER_SESSION) return;
    sent += 1;
    queue.set(key, { message, stack: scrub(err && err.stack, 4000), app_version: String(APP_VERSION || '').slice(0, 20), device: deviceLabel().slice(0, 200), screen: (where || screenNow()).slice(0, 60), count: 1 });
    if (!timer) timer = setTimeout(flush, 5000);
  } catch { /* ne jamais planter en signalant un plantage */ }
}

/** À appeler une fois au démarrage (main.jsx). */
export function startErrorReport() {
  if (typeof window === 'undefined' || window.__r2fErrors) return;
  window.__r2fErrors = true;
  window.addEventListener('error', e => reportError(e.error || { message: e.message }));
  window.addEventListener('unhandledrejection', e => reportError(e.reason || { message: 'Promesse rejetée' }));
}
