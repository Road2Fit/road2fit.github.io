// Banc de test de l'interface : l'application complète tourne dans un faux navigateur (jsdom),
// avec une horloge et un hasard figés, pour des tests rapides et reproductibles.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import * as esbuild from 'esbuild';
import { DEMO_STATE } from './demo.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FIXED_NOW = new Date(2026, 9, 21, 10, 0, 0).getTime();
export const sleep = ms => new Promise(r => setTimeout(r, ms));

let bundle = null;
/** Compile l'application (src/main.jsx) en un seul script, une fois pour tous les tests. */
export async function buildApp() {
  if (!bundle) {
    const r = await esbuild.build({
      entryPoints: [path.join(ROOT, 'src/main.jsx')],
      outfile: path.join(ROOT, 'tests/ui/.sortie.js'),
      bundle: true, format: 'iife', write: false, jsx: 'automatic', jsxImportSource: 'art-jsx', alias: { 'art-jsx/jsx-runtime': path.join(ROOT, 'src/jsx/jsx-runtime.js') }, logLevel: 'error',
      loader: { '.js': 'jsx', '.css': 'empty' },
      define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.PROD': 'false' },
    });
    bundle = r.outputFiles.find(f => f.path.endsWith('.js')).text;
  }
  return bundle;
}

const PRELUDE = `
(function () {
  const RealDate = Date; const FIXED = ${FIXED_NOW};
  const vt = { now: 0, seq: 0, timers: new Map() };
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(FIXED + vt.now); else super(...a); }
    static now() { return FIXED + vt.now; }
  }
  window.Date = FakeDate;
  const realSet = window.setTimeout.bind(window), realClear = window.clearTimeout.bind(window);
  const realSetI = window.setInterval.bind(window), realClearI = window.clearInterval.bind(window);
  // Minuteries longues (>= 200 ms) : horloge virtuelle, avancée à la main par les tests.
  window.setTimeout = (fn, ms, ...a) => { ms = Number(ms) || 0; if (ms < 200) return realSet(fn, ms, ...a); const id = -(++vt.seq); vt.timers.set(id, { id, fn: () => fn(...a), due: vt.now + ms, every: 0 }); return id; };
  window.setInterval = (fn, ms, ...a) => { ms = Number(ms) || 0; if (ms < 200) return realSetI(fn, ms, ...a); const id = -(++vt.seq); vt.timers.set(id, { id, fn: () => fn(...a), due: vt.now + ms, every: ms }); return id; };
  window.clearTimeout = id => { if (id < 0) vt.timers.delete(id); else realClear(id); };
  window.clearInterval = id => { if (id < 0) vt.timers.delete(id); else realClearI(id); };
  window.__advance = ms => {
    const target = vt.now + ms;
    for (;;) {
      let next = null;
      for (const t of vt.timers.values()) if (t.due <= target && (!next || t.due < next.due || (t.due === next.due && t.id > next.id))) next = t;
      if (!next) break;
      vt.now = next.due;
      if (next.every) next.due += next.every; else vt.timers.delete(next.id);
      try { next.fn(); } catch (e) { console.error(e); }
    }
    vt.now = target;
  };
  let s = 1234567;
  Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
})();
`;

/**
 * Démarre l'application. `storage` : contenu initial du localStorage. `fetchImpl` : faux réseau.
 * Les erreurs de la page sont collectées dans `h.errors`.
 */
// Par défaut l'appli de test s'ouvre sur le lien PRIVÉ (?rondoudou = édition Rondoudou, comme avant). `__classic` dans `storage` = lien public (version classique Road2Fit).
export async function launch({ storage: storage0 = {}, fetchImpl, empty = false, openCoach = false } = {}) {
  const { __classic, ...rest } = storage0;
  let storage = rest;
  const START_URL = __classic ? 'https://road2fit.github.io/' : 'https://road2fit.github.io/?rondoudou';
  // sans précision, l'application de test démarre avec les données de démonstration (l'application réelle démarre vide)
  if (!empty && !('rondoudou_save_v1' in storage) && !('rondoufit:account' in storage)) storage = { ...storage, rondoudou_save_v1: JSON.stringify(DEMO_STATE) };
  const code = await buildApp();
  const errors = [];
  const dom = new JSDOM('<!doctype html><html lang="fr"><body><div id="root"></div></body></html>', {
    url: START_URL, runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  Object.defineProperty(w, 'indexedDB', { value: new IDBFactory(), configurable: true });
  w.IDBKeyRange = IDBKeyRange;
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  w.fetch = fetchImpl || (() => Promise.reject(new TypeError('Failed to fetch')));
  w.scrollTo = () => {};
  w.Element.prototype.scrollIntoView = () => {};
  const ctx2d = new Proxy(function () {}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}), set: () => true, apply: () => undefined });
  w.HTMLCanvasElement.prototype.getContext = () => ctx2d;
  w.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(new w.Blob(['x'], { type: 'image/png' })); };
  w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AAAA';
  w.confirm = () => true; w.alert = () => {}; w.prompt = () => null;
  w.URL.createObjectURL = () => 'blob:fake'; w.URL.revokeObjectURL = () => {};
  w.addEventListener('error', e => errors.push('ERREUR PAGE: ' + (e.error?.stack || e.message)));
  w.console.error = (...a) => { errors.push('console.error: ' + a.map(String).join(' ').slice(0, 300)); };
  w.console.warn = () => {};
  w.console.log = () => {};
  w.eval(PRELUDE);
  w.eval(code);
  await sleep(120);
  // L'appli s'ouvre sur le Coach ; la plupart des parcours partent de la page Exercices
  const h = { dom, w, doc: w.document, errors, close: () => w.close() };
  const tab = w.document.querySelector('[data-tab="quests"]');
  if (tab && !openCoach) { await clickEl(h, tab); }
  return h;
}

export const rootHtml = h => h.doc.getElementById('root').innerHTML;
export const pageText = h => h.doc.body.textContent;

/** Fait avancer l'horloge virtuelle (minuteries longues) et laisse React / les promesses se terminer. */
export async function advance(h, ms = 300) {
  await sleep(25);
  h.w.__advance(ms);
  await sleep(25);
}

/** Plus petits éléments dont le texte contient `text`. */
export function findByText(h, text, selector = 'button, a, [role=button], div, span, label') {
  const hits = [...h.doc.querySelectorAll(selector)].filter(el => (el.textContent || '').replace(/\s+/g, ' ').includes(text));
  return hits.filter(el => !hits.some(o => o !== el && el.contains(o)));
}

export async function clickEl(h, el) {
  el.dispatchEvent(new h.w.MouseEvent('click', { bubbles: true, cancelable: true, view: h.w }));
  await advance(h);
}

/** Déplie les « Pourquoi ? / Ajuster » de la prochaine séance du coach (repliés par défaut). */
export async function expandCoachDetails(h) {
  for (const b of [...h.doc.querySelectorAll('button')].filter(x => x.textContent.includes('Pourquoi ? / Ajuster'))) await clickEl(h, b);
}

export async function clickText(h, text) {
  let [el] = findByText(h, text);
  // actions rangées dans le bouton « + » (course, exercice…) ou dans le menu ⚙️ (exporter, réinitialiser…)
  if (!el) {
    const fab = h.doc.querySelector('button[aria-label="Ajouter"]');
    if (fab) { await clickEl(h, fab); [el] = findByText(h, text); }
  }
  if (!el) {
    const more = h.doc.querySelector('button[aria-label="Réglages et données"]');
    if (more) { await clickEl(h, more); [el] = findByText(h, text); }
  }
  if (!el) throw new Error('Texte introuvable : ' + text);
  await clickEl(h, el.closest('button, a, [role=button]') || el);
}

export async function setInput(h, el, value) {
  const proto = el.tagName === 'SELECT' ? h.w.HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? h.w.HTMLTextAreaElement.prototype : h.w.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new h.w.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  if (el.tagName !== 'SELECT') el.dispatchEvent(new h.w.Event('change', { bubbles: true }));
  await advance(h);
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const SKIP = /Exporter|Importer|Réinitialiser|tout effacer|Oui, |☁️|⏳|⚠️|Réessayer/i;

/** « Singe » : N actions au hasard (clics, saisies) pour débusquer les plantages. */
export async function monkey(h, seed, steps) {
  const rand = rng(seed);
  let done = 0;
  for (let i = 0; i < steps; i++) {
    const cands = [...h.doc.querySelectorAll('button:not([disabled]), input[type=checkbox], input[type=range], select, input[type=number], input[type=text], input[type=date], textarea')]
      .filter(el => !(el.tagName === 'BUTTON' && SKIP.test(el.textContent || '')))
      .filter(el => el.type !== 'file');
    if (!cands.length) break;
    const el = cands[Math.floor(rand() * cands.length)];
    if (el.tagName === 'BUTTON' || el.type === 'checkbox') await clickEl(h, el);
    else if (el.tagName === 'SELECT') { const o = el.options[Math.floor(rand() * el.options.length)]; if (o) await setInput(h, el, o.value); }
    else if (el.type === 'range') await setInput(h, el, String(Math.floor(rand() * 10)));
    else if (el.type === 'date') await setInput(h, el, `2026-10-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`);
    else if (el.type === 'number') await setInput(h, el, String(Math.floor(rand() * 120)));
    else await setInput(h, el, ['Test', 'Tractions', '12', 'x'][Math.floor(rand() * 4)]);
    done++;
  }
  return done;
}

/**
 * Faux Supabase : comptes (inscription avec code d'invitation, connexion, renouvellement, déconnexion) et table `saves`
 * avec la règle « chacun ne voit que sa ligne » (le jeton désigne l'utilisateur) et la version optimiste (PATCH ... version=eq.N).
 */
export const SUPABASE_URL = 'https://fake-project.supabase.co';
export function fakeSupabase({ invite = 'MOTSECRET', confirmEmail = false } = {}) {
  const users = new Map(); // email -> { id, password }
  const tokens = new Map(); // access_token -> user id
  const saves = new Map(); // user id -> { data, version }
  const srv = { users, saves, photos: new Map(), history: new Map(), profiles: new Map(), friendships: new Map(), attempts: new Map(), calls: [], offline: false, expireAll: false, n: 0 };
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
  const session = (email, id) => {
    const access_token = `at_${id}_${++srv.n}`;
    tokens.set(access_token, id);
    return { access_token, refresh_token: `rt_${id}_${srv.n}`, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id, email } };
  };
  srv.fetch = async (url, opts = {}) => {
    url = String(url);
    if (!url.startsWith(SUPABASE_URL)) return res(404, {});
    if (srv.offline) throw new TypeError('Failed to fetch');
    const u = new URL(url);
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    srv.calls.push(`${method} ${u.pathname}${u.search}`);
    const bearer = (opts.headers && (opts.headers.Authorization || '')).replace('Bearer ', '');
    if (u.pathname === '/auth/v1/signup') {
      if ((body.data && body.data.invite) !== invite) return res(500, { msg: 'Database error saving new user' });
      if (users.has(body.email)) return res(422, { msg: 'User already registered' });
      if (body.password.length < 6) return res(422, { msg: 'Password should be at least 6 characters' });
      const id = `u${users.size + 1}`;
      users.set(body.email, { id, password: body.password });
      return confirmEmail ? res(200, { id, email: body.email }) : res(200, session(body.email, id));
    }
    if (u.pathname === '/auth/v1/token') {
      if (u.searchParams.get('grant_type') === 'password') {
        const usr = users.get(body.email);
        if (!usr || usr.password !== body.password) return res(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
        return res(200, session(body.email, usr.id));
      }
      const m = /^rt_(u\d+)_/.exec(body.refresh_token || '');
      if (!m || srv.expireAll) return res(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' });
      const email = [...users.entries()].find(([, v]) => v.id === m[1])[0];
      return res(200, session(email, m[1]));
    }
    if (u.pathname === '/auth/v1/logout') return res(204, null);
    if (u.pathname === '/auth/v1/recover') return res(200, {});
    if (u.pathname === '/rest/v1/saves') {
      const uid = tokens.get(bearer);
      if (!uid) return res(401, { message: 'JWT expired' });
      const filter = u.searchParams.get('user_id');
      const own = filter === `eq.${uid}`; // règle RLS : seulement SA ligne
      if (method === 'GET') {
        const row = own ? saves.get(uid) : null;
        return res(200, row ? [{ data: row.data, version: row.version }] : []);
      }
      if (method === 'POST') {
        if (body.user_id !== uid) return res(403, { message: 'new row violates row-level security policy' });
        if (saves.has(uid)) return res(409, { code: '23505', message: 'duplicate key' });
        saves.set(uid, { data: body.data, version: 1 });
        return res(201, [{ version: 1 }]);
      }
      if (method === 'PATCH') {
        const row = own ? saves.get(uid) : null;
        const want = Number((u.searchParams.get('version') || '').replace('eq.', ''));
        if (!row || row.version !== want) return res(200, []);
        const hist = srv.history.get(uid) || [];
        hist.unshift({ id: ++srv.n, version: row.version, data: row.data, saved_at: new Date().toISOString() }); // déclencheur : copie de l'ancienne version
        srv.history.set(uid, hist.slice(0, 21));
        saves.set(uid, { data: body.data, version: body.version });
        return res(200, [{ version: body.version }]);
      }
      if (method === 'DELETE') { if (own) saves.delete(uid); return res(204, null); }
    }
    if (u.pathname === '/rest/v1/saves_history' && method === 'GET') {
      const uid = tokens.get(bearer);
      if (!uid) return res(401, { message: 'JWT expired' });
      if (u.searchParams.get('user_id') !== `eq.${uid}`) return res(200, []);
      const want = (u.searchParams.get('id') || '').replace('eq.', '');
      const rows = (srv.history.get(uid) || []).filter(r => !want || String(r.id) === want);
      return res(200, rows.map(r => ({ id: r.id, version: r.version, saved_at: r.saved_at, data: r.data })));
    }
    if (u.pathname === '/rest/v1/photos') {
      const uid = tokens.get(bearer);
      if (!uid) return res(401, { message: 'JWT expired' });
      if (u.searchParams.get('user_id') !== `eq.${uid}`) return method === 'GET' ? res(200, []) : res(200, []); // règle RLS
      const mine = srv.photos.get(uid) || new Map();
      srv.photos.set(uid, mine);
      const idq = u.searchParams.get('id');
      const id = idq ? idq.replace('eq.', '') : null;
      if (method === 'GET') {
        const rows = [...mine.entries()].filter(([k]) => !id || k === id).map(([k, r]) => ({ id: k, data: r.data, version: r.version }));
        return res(200, rows);
      }
      if (method === 'POST') {
        if (mine.has(body.id)) return res(409, { code: '23505' });
        mine.set(body.id, { data: body.data, version: 1 });
        return res(201, [{ version: 1 }]);
      }
      if (method === 'PATCH') {
        const row = mine.get(id);
        const want = Number((u.searchParams.get('version') || '').replace('eq.', ''));
        if (!row || row.version !== want) return res(200, []);
        mine.set(id, { data: body.data, version: body.version });
        return res(200, [{ version: body.version }]);
      }
      if (method === 'DELETE') { mine.delete(id); return res(204, null); }
    }
    // ---- Amis (reproduit docs/supabase-amis.sql) ----
    if (u.pathname === '/rest/v1/profiles' || u.pathname.startsWith('/rest/v1/rpc/friend_')) {
      const uid = tokens.get(bearer);
      if (!uid) return res(401, { message: 'JWT expired' });
      const bad = message => res(400, { code: 'P0001', message });
      const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const makeCode = () => { let n = ++srv.n * 7919 + 12345; let c = ''; for (let i = 0; i < 7; i++) { c += ALPHA[n % 32]; n = Math.floor(n / 32) + 31 * (i + 1); } return c; };
      if (u.pathname === '/rest/v1/profiles') {
        if (method === 'GET') {
          const p = srv.profiles.get(uid);
          return res(200, p && u.searchParams.get('user_id') === `eq.${uid}` ? [{ friend_code: p.friend_code, share: p.share }] : []);
        }
        if (body.user_id !== uid) return res(403, { message: 'new row violates row-level security policy' });
        const prev = srv.profiles.get(uid);
        const p = { friend_code: prev ? prev.friend_code : makeCode(), share: body.share !== false, summary: body.summary, updated_at: body.updated_at || new Date().toISOString() };
        srv.profiles.set(uid, p);
        return res(201, [{ friend_code: p.friend_code, share: p.share }]);
      }
      const fn = u.pathname.replace('/rest/v1/rpc/', '');
      if (fn === 'friend_add') {
        const att = srv.attempts.get(uid) || 0;
        if (att >= 8) return bad('FRIEND_LOCKED');
        const code = String(body.p_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const hit = [...srv.profiles.entries()].find(([, p]) => p.friend_code === code && p.share);
        if (!hit) { srv.attempts.set(uid, att + 1); return bad('FRIEND_NOT_FOUND'); }
        if (hit[0] === uid) return bad('FRIEND_SELF');
        const mine = srv.friendships.get(uid) || new Set();
        mine.add(hit[0]);
        srv.friendships.set(uid, mine);
        return res(200, { user_id: hit[0], summary: hit[1].summary, updated_at: hit[1].updated_at });
      }
      if (fn === 'friend_list') {
        const mine = srv.friendships.get(uid) || new Set();
        return res(200, [...mine].map(id => srv.profiles.get(id) && srv.profiles.get(id).share ? { user_id: id, summary: srv.profiles.get(id).summary, updated_at: srv.profiles.get(id).updated_at, added_at: '2026-10-21T10:00:00Z' } : null).filter(Boolean));
      }
      if (fn === 'friend_remove') { (srv.friendships.get(uid) || new Set()).delete(body.p_user); return res(204, null); }
      if (fn === 'friend_regenerate_code') {
        const p = srv.profiles.get(uid);
        if (p) p.friend_code = makeCode();
        for (const set of srv.friendships.values()) set.delete(uid);
        return res(200, p ? p.friend_code : null);
      }
    }
    return res(404, {});
  };
  srv.addUser = (email, password = 'motdepasse1') => {
    const id = `u${users.size + 1}`;
    users.set(email, { id, password });
    return { id, session: session(email, id) };
  };
  return srv;
}
