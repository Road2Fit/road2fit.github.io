// Fusion à trois voies de deux versions de la sauvegarde (cet appareil / sauvegarde en ligne) à partir de leur ancêtre commun.
// Objectif : ne jamais perdre de séance saisie sur un appareil quand un autre appareil a aussi modifié les données.
//
//  - si un seul côté a changé par rapport à l'ancêtre, on prend ce côté ;
//  - listes d'éléments avec `id` (quêtes, séances d'une quête, pesées) : réunies élément par élément,
//    une suppression n'est appliquée que si l'autre côté n'a pas modifié l'élément ;
//  - listes de valeurs simples « ensembles » (trophées, dates de match…) : réunies ;
//  - `xp` : somme des gains des deux côtés (local + distant - ancêtre) ;
//  - autre valeur modifiée des deux côtés : la version la plus récente gagne.

/** Listes de valeurs simples à traiter comme des ensembles (clé -> faut-il les trier ?). */
const SET_KEYS = {
  unlockedAchievements: false,
  claimedChallenges: false,
  weeklyClaimed: false,
  matchDates: true,
  volleyDays: true,
  volleySkips: true,
  volleyExtra: true,
  gymSkips: true,
  gymExtra: true,
  deloadWeeks: true,
  rankTrials: true,
};

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Liste d'objets tous dotés d'un `id` unique ? */
function isIdList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const seen = new Set();
  for (const x of arr) {
    if (!isPlainObject(x) || (typeof x.id !== 'string' && typeof x.id !== 'number') || seen.has(x.id)) return false;
    seen.add(x.id);
  }
  return true;
}

const asList = v => (Array.isArray(v) ? v : []);

function mergeSets(key, base, local, remote) {
  const b = new Set(asList(base));
  const l = new Set(asList(local));
  const r = new Set(asList(remote));
  const out = [];
  const seen = new Set();
  for (const x of [...asList(local), ...asList(remote)]) {
    if (seen.has(x)) continue;
    seen.add(x);
    const removedLocally = b.has(x) && !l.has(x);
    const removedRemotely = b.has(x) && !r.has(x);
    if (removedLocally || removedRemotely) continue;
    out.push(x);
  }
  return SET_KEYS[key] ? out.sort() : out;
}

function byId(list) {
  return new Map(asList(list).map(x => [x.id, x]));
}

/** Fusionne deux listes d'éléments à `id`. */
function mergeIdLists(base, local, remote, ctx) {
  const B = byId(base);
  const L = byId(local);
  const R = byId(remote);
  const ids = [...L.keys(), ...[...R.keys()].filter(id => !L.has(id))];
  const out = [];
  for (const id of ids) {
    const l = L.get(id);
    const r = R.get(id);
    const b = B.get(id);
    if (l && r) {
      out.push(deepEqual(l, r) ? l : mergeItem(b, l, r, ctx));
    } else if (l) {
      // absent côté distant : supprimé là-bas (s'il était dans l'ancêtre) sauf si modifié ici depuis
      if (b && deepEqual(l, b)) continue;
      out.push(l);
    } else if (r) {
      if (b && deepEqual(r, b)) continue;
      out.push(r);
    }
  }
  // listes chronologiques (séances, pesées) : on remet dans l'ordre des dates, sans bousculer les égalités
  if (out.every(x => typeof x.date === 'string')) {
    return out.map((x, i) => [x, i]).sort((a, b) => (a[0].date < b[0].date ? -1 : a[0].date > b[0].date ? 1 : a[1] - b[1])).map(p => p[0]);
  }
  return out;
}

/** Élément modifié des deux côtés : champs simples du plus récent, sous-listes à `id` fusionnées. */
function mergeItem(b, l, r, ctx) {
  const winner = ctx.preferLocal ? l : r;
  const other = ctx.preferLocal ? r : l;
  const out = { ...winner };
  for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
    if (isIdList(l[k]) || isIdList(r[k])) {
      out[k] = mergeIdLists(b?.[k], l[k], r[k], ctx);
    } else if (!(k in winner) && k in other) {
      out[k] = other[k];
    }
  }
  return out;
}

function merge3(base, local, remote, ctx, key, parent) {
  if (deepEqual(local, remote)) return local;
  if (base !== undefined && deepEqual(local, base)) return remote;
  if (base !== undefined && deepEqual(remote, base)) return local;
  if (local === undefined) return remote;
  if (remote === undefined) return local;
  if (isPlainObject(local) && isPlainObject(remote)) {
    const out = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      out[k] = merge3(isPlainObject(base) ? base[k] : undefined, local[k], remote[k], ctx, k, key);
    }
    return out;
  }
  if (Array.isArray(local) && Array.isArray(remote)) {
    if (isIdList(local) || isIdList(remote)) return mergeIdLists(base, local, remote, ctx);
    if (key in SET_KEYS) return mergeSets(key, base, local, remote);
  }
  // prénom / pseudo : une valeur vide (appareil resté sur une vieille copie) n'efface jamais un prénom déjà donné
  if (key === 'heroName' && typeof local === 'string' && typeof remote === 'string' && (!local.trim() || !remote.trim())) {
    return local.trim() ? local : remote;
  }
  // EXP : les gains des deux appareils s'additionnent (ici pour le total et pour chaque semaine de `xpWeeks`)
  if ((key === 'xp' || parent === 'xpWeeks') && typeof local === 'number' && typeof remote === 'number') {
    return typeof base === 'number' ? Math.max(0, local + remote - base) : Math.max(local, remote);
  }
  return ctx.preferLocal ? local : remote;
}

/**
 * @param base   état commun lors de la dernière synchronisation (ou null si inconnu)
 * @param local  état de cet appareil
 * @param remote état lu en ligne
 * @param preferLocal en cas de désaccord sur une valeur simple, garder la version de cet appareil (la plus récente)
 */
export function mergeStates(base, local, remote, { preferLocal = false } = {}) {
  return merge3(base ?? undefined, local, remote, { preferLocal }, '');
}
