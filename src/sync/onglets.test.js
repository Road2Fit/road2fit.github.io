// 4.47.5 : perte réelle de séances (14/11/2026). Deux onglets du même site (ou l'appli installée + un onglet) partagent
// le localStorage. Un onglet resté ouvert avec de vieilles données ne doit JAMAIS écraser les séances enregistrées
// ailleurs : ses marqueurs de synchro (version vue, état commun, « à envoyer ») sont les siens (createTabMarkers).
import { describe, expect, it } from 'vitest';
import { syncOnce } from './engine';
import { SyncError } from './errors';
import { deepEqual } from './merge';
import { createTabMarkers } from './storage';

function fakeServer(initial) {
  let file = { content: JSON.stringify(initial), sha: '231' };
  let n = 231;
  return {
    get data() { return JSON.parse(file.content); },
    api: {
      async getFile() { return { ...file }; },
      async putFile(_c, content, sha) {
        if (sha !== file.sha) throw new SyncError('conflit', 409);
        file = { content, sha: String(++n) };
        return file.sha;
      },
    },
  };
}

function memStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

let clock = 1000;
// un onglet : son état en mémoire + ses marqueurs (ou ceux partagés de l'ancienne version, pour montrer le bug)
function tab(server, state, markers) {
  let s = state;
  let version = 0;
  return {
    get state() { return s; },
    edit(fn) { s = fn(s); version++; markers.markDirty(); },
    sync() {
      return syncOnce({}, {
        api: server.api,
        getLocal: () => s,
        isPristine: () => false,
        normalize: o => o,
        getLocalTs: () => clock,
        isDirty: () => markers.isDirty(),
        version: () => version,
        markDirty: () => { version++; markers.markDirty(); },
        clearDirty: v => { if (v === version) markers.clearDirty(); },
        getSynced: () => markers.readSynced(),
        setSynced: x => markers.writeSynced(x),
        applyRemote: x => { s = x; },
        now: () => ++clock,
      });
    },
  };
}

// anciens marqueurs : lus et écrits directement dans le stockage partagé (comportement d'avant 4.47.5)
function sharedMarkers(storage) {
  return {
    readSynced: () => JSON.parse(storage.getItem('rondoufit:sync') || 'null'),
    writeSynced: x => storage.setItem('rondoufit:sync', JSON.stringify(x)),
    isDirty: () => storage.getItem('rondoufit:dirty') === '1',
    markDirty: () => storage.setItem('rondoufit:dirty', '1'),
    clearDirty: () => storage.removeItem('rondoufit:dirty'),
  };
}

const V231 = { xp: 1000, quests: [{ id: 'volley', name: 'Volley-ball', history: [{ id: 'v12', date: '2026-11-12', durationMin: 120 }] }] };
const withNewSessions = s => ({
  ...s, xp: s.xp + 300,
  quests: [
    { ...s.quests[0], history: [...s.quests[0].history, { id: 'v13', date: '2026-11-13', durationMin: 120 }] },
    { id: 'run', name: 'Course', history: [{ id: 'r14', date: '2026-11-14', durationMin: 30 }] },
  ],
});

async function scenario(makeMarkers) {
  const server = fakeServer(V231);
  const storage = memStorage();
  const base = { sha: '231', base: V231 };
  // onglet ancien (ouvert depuis la veille) et onglet récent : même ordinateur, même stockage
  const mA = makeMarkers(storage);
  mA.writeSynced(base);
  const old = tab(server, V231, mA);
  const fresh = tab(server, V231, makeMarkers(storage));
  // séances notées dans l'onglet récent (ou l'appli installée)
  fresh.edit(withNewSessions);
  await fresh.sync();
  // l'ancien onglet change un petit réglage, puis se synchronise
  old.edit(s => ({ ...s, quests: s.quests.map(q => ({ ...q, note: 'x' })) }));
  await old.sync();
  return server.data;
}

describe('plusieurs onglets ouverts (4.47.5)', () => {
  it('avant : l’ancien onglet écrasait les séances notées ailleurs (bug reproduit)', async () => {
    const data = await scenario(sharedMarkers);
    expect(data.quests.some(q => q.id === 'run')).toBe(false);
  });

  it('maintenant : les séances notées dans l’autre onglet sont gardées, l’EXP aussi', async () => {
    const data = await scenario(st => createTabMarkers(st));
    const ids = data.quests.flatMap(q => (q.history || []).map(h => h.id));
    expect(ids).toEqual(expect.arrayContaining(['v12', 'v13', 'r14']));
    expect(data.xp).toBe(1300);
    expect(data.quests.find(q => q.id === 'volley').note).toBe('x'); // la modification de l'ancien onglet est gardée aussi
  });

  it('les marqueurs d’un onglet sont relus au démarrage et réécrits avec ses données', () => {
    const st = memStorage();
    st.setItem('rondoufit:sync', JSON.stringify({ sha: '7', base: { a: 1 } }));
    const m = createTabMarkers(st);
    expect(m.readSynced().sha).toBe('7');
    st.setItem('rondoufit:sync', JSON.stringify({ sha: '9', base: {} })); // écrit par un autre onglet
    expect(m.readSynced().sha).toBe('7'); // cet onglet garde le sien
    m.persist();
    expect(JSON.parse(st.getItem('rondoufit:sync')).sha).toBe('7');
    expect(deepEqual(m.readSynced().base, { a: 1 })).toBe(true);
  });
});
