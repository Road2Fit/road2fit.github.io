import { describe, expect, it } from 'vitest';
import { syncOnce } from './engine';
import { SyncError } from './errors';
import { deepEqual, mergeStates } from './merge';

// ── Faux serveur de sauvegarde : un seul fichier, avec un « sha » qui change à chaque écriture ──────────────────
function fakeRemote() {
  let file = null;
  let n = 0;
  const gh = {
    puts: 0,
    gets: 0,
    beforePut: null,
    get file() { return file; },
    set(content) { file = { content: typeof content === 'string' ? content : JSON.stringify(content), sha: 'sha' + ++n }; },
    api: {
      async getFile() {
        gh.gets++;
        return file ? { content: file.content, sha: file.sha } : { content: null, sha: null };
      },
      async putFile(_cfg, content, sha) {
        if (gh.beforePut) { const f = gh.beforePut; gh.beforePut = null; f(); }
        if ((file ? file.sha : null) !== (sha || null)) throw new SyncError('conflit', 409);
        gh.puts++;
        file = { content, sha: 'sha' + ++n };
        return file.sha;
      },
    },
    json() { return JSON.parse(file.content); },
  };
  return gh;
}

const PRISTINE = { xp: 0, quests: [], weightHistory: [], unlockedAchievements: [], coach: { matchDates: [] } };
const cfg = { owner: 'a', repo: 'b', path: 'f.json', branch: 'main', token: 't' };

// ── Faux appareil : état, suivi des modifications, enregistrement de synchro ─────────────────────
let clock = 1000;
function device(gh, initial = PRISTINE, opts = {}) {
  let state = initial;
  let version = 0;
  let dirty = !!opts.dirty;
  let synced = opts.synced ?? null;
  let localTs = opts.localTs ?? 0;
  const d = {
    get state() { return state; },
    get dirty() { return dirty; },
    get synced() { return synced; },
    /** Modification faite par l'utilisateur. */
    edit(fn) { state = fn(state); version++; dirty = true; localTs = ++clock; },
    sync() {
      return syncOnce(cfg, {
        api: gh.api,
        getLocal: () => state,
        isPristine: s => deepEqual(s, PRISTINE),
        normalize: o => ({ ...PRISTINE, ...o }),
        getLocalTs: () => localTs,
        isDirty: () => dirty,
        version: () => version,
        markDirty: () => { dirty = true; version++; },
        clearDirty: v => { if (v === version) dirty = false; },
        getSynced: () => synced,
        setSynced: s => { synced = s; },
        applyRemote: s => { state = s; },
        now: () => ++clock,
      });
    },
  };
  return d;
}

const quest = (id, history = []) => ({ id, name: id, history });
const entry = (id, date) => ({ id, date, value: 1 });

describe('mergeStates (fusion à trois voies)', () => {
  const base = { xp: 100, quests: [quest('q1', [entry('e1', '2026-10-01')])], weightHistory: [], unlockedAchievements: ['a'], coach: { matchDates: ['2026-11-01'] } };

  it('garde les séances ajoutées sur les deux appareils et additionne l’expérience', () => {
    const local = { ...base, xp: 130, quests: [quest('q1', [entry('e1', '2026-10-01'), entry('e2', '2026-10-03')])] };
    const remote = { ...base, xp: 120, quests: [quest('q1', [entry('e1', '2026-10-01'), entry('e3', '2026-10-02')])] };
    const m = mergeStates(base, local, remote);
    expect(m.xp).toBe(150);
    expect(m.quests).toHaveLength(1);
    expect(m.quests[0].history.map(e => e.id)).toEqual(['e1', 'e3', 'e2']); // ordre chronologique
  });

  it('réunit les animations signalées comme fausses sur les deux appareils', () => {
    const f = id => ({ id, animId: 'squat', view: 'side', name: 'Squat', at: '2026-10-29T10:00:00Z' });
    const b = { ...base, animFlags: [f('af1')] };
    const m = mergeStates(b, { ...b, animFlags: [f('af1'), f('af2')] }, { ...b, animFlags: [f('af1'), f('af3')] });
    expect(m.animFlags.map(x => x.id).sort()).toEqual(['af1', 'af2', 'af3']);
  });

  it('prend simplement le côté qui a changé', () => {
    const remote = { ...base, xp: 140 };
    expect(mergeStates(base, base, remote)).toEqual(remote);
    expect(mergeStates(base, remote, base)).toEqual(remote);
  });

  it('applique une suppression si l’autre appareil n’a pas touché l’élément, la refuse sinon', () => {
    const local = { ...base, quests: [] }; // quête supprimée ici
    expect(mergeStates(base, local, { ...base, xp: 110 }).quests).toEqual([]);
    const edited = { ...base, xp: 110, quests: [quest('q1', [entry('e1', '2026-10-01'), entry('e9', '2026-10-05')])] };
    expect(mergeStates(base, local, edited).quests.map(q => q.id)).toEqual(['q1']); // modifiée là-bas : on la garde
  });

  it('réunit les ensembles (trophées, dates de match)', () => {
    const local = { ...base, unlockedAchievements: ['a', 'b'], coach: { matchDates: ['2026-11-01', '2026-11-08'] } };
    const remote = { ...base, unlockedAchievements: ['a', 'c'], coach: { matchDates: ['2026-11-01', '2026-11-05'] } };
    const m = mergeStates(base, local, remote);
    expect(m.unlockedAchievements).toEqual(['a', 'b', 'c']);
    expect(m.coach.matchDates).toEqual(['2026-11-01', '2026-11-05', '2026-11-08']);
  });

  it('sans ancêtre connu, réunit tout sans rien perdre', () => {
    const local = { xp: 50, quests: [quest('q1'), quest('q2')], weightHistory: [] };
    const remote = { xp: 80, quests: [quest('q1'), quest('q3')], weightHistory: [] };
    const m = mergeStates(null, local, remote);
    expect(m.quests.map(q => q.id).sort()).toEqual(['q1', 'q2', 'q3']);
    expect(m.xp).toBe(80);
  });

  it('valeur simple modifiée des deux côtés : la plus récente gagne', () => {
    const local = { ...base, userWeightKg: 80 };
    const remote = { ...base, userWeightKg: 79 };
    expect(mergeStates(base, local, remote, { preferLocal: true }).userWeightKg).toBe(80);
    expect(mergeStates(base, local, remote, { preferLocal: false }).userWeightKg).toBe(79);
  });
});

describe('syncOnce (synchronisation avec la sauvegarde en ligne)', () => {
  it('appareil neuf + fichier existant : reprend les données sans rien écraser', async () => {
    const gh = fakeRemote();
    gh.set({ ...PRISTINE, xp: 500, quests: [quest('q1')], _savedAt: 5 });
    const tel = device(gh);
    expect((await tel.sync()).action).toBe('pulled');
    expect(tel.state.xp).toBe(500);
    expect(gh.puts).toBe(0);
  });

  it('appareil neuf + aucun fichier : n’envoie jamais l’état de départ', async () => {
    const gh = fakeRemote();
    const tel = device(gh);
    expect((await tel.sync()).action).toBe('none');
    expect(gh.file).toBeNull();
  });

  it('appareil avec des données + aucun fichier : crée le fichier', async () => {
    const gh = fakeRemote();
    const tel = device(gh, { ...PRISTINE, xp: 40, quests: [quest('q1')] });
    expect((await tel.sync()).action).toBe('created');
    expect(gh.json().xp).toBe(40);
    expect(gh.json()._savedAt).toBeGreaterThan(0);
  });

  it('refuse d’écraser un fichier illisible ou qui n’est pas une sauvegarde', async () => {
    const gh = fakeRemote();
    gh.set('{ pas du json');
    const tel = device(gh, { ...PRISTINE, xp: 40 }, { dirty: true });
    await expect(tel.sync()).rejects.toThrow(/JSON valide/);
    gh.set({ truc: 1 });
    await expect(tel.sync()).rejects.toThrow(/format/);
    expect(gh.puts).toBe(0);
  });

  it('envoie une modification locale, puis l’autre appareil la reprend', async () => {
    const gh = fakeRemote();
    const tel = device(gh, { ...PRISTINE, xp: 10, quests: [quest('q1')] });
    await tel.sync();
    const pc = device(gh);
    await pc.sync();
    expect(pc.state.xp).toBe(10);
    tel.edit(s => ({ ...s, xp: 25 }));
    expect((await tel.sync()).action).toBe('pushed');
    expect(tel.dirty).toBe(false);
    expect((await pc.sync()).action).toBe('pulled');
    expect(pc.state.xp).toBe(25);
    expect((await pc.sync()).action).toBe('none');
  });

  it('deux appareils modifient en même temps : tout est conservé', async () => {
    const gh = fakeRemote();
    const tel = device(gh, { ...PRISTINE, xp: 100, quests: [quest('q1', [entry('e1', '2026-10-01')])] });
    await tel.sync();
    const pc = device(gh);
    await pc.sync();
    tel.edit(s => ({ ...s, xp: 130, quests: [quest('q1', [...s.quests[0].history, entry('e2', '2026-10-02')])] }));
    pc.edit(s => ({ ...s, xp: 120, quests: [quest('q1', [...s.quests[0].history, entry('e3', '2026-10-03')])] }));
    await tel.sync(); // tel part le premier
    expect((await pc.sync()).action).toBe('merged');
    expect(pc.state.xp).toBe(150);
    expect(pc.state.quests[0].history.map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect((await tel.sync()).action).toBe('pulled');
    expect(deepEqual(tel.state, pc.state)).toBe(true);
    expect(pc.dirty).toBe(false);
  });

  it('première synchro avec des données des deux côtés (migration) : réunit sans perte', async () => {
    const gh = fakeRemote();
    gh.set({ ...PRISTINE, xp: 80, quests: [quest('q1'), quest('qSheets')], _savedAt: 5 });
    const tel = device(gh, { ...PRISTINE, xp: 60, quests: [quest('q1'), quest('qTel')] });
    expect((await tel.sync()).action).toBe('merged');
    expect(gh.json().quests.map(q => q.id).sort()).toEqual(['q1', 'qSheets', 'qTel']);
  });

  it('réessaie quand quelqu’un écrit entre la lecture et l’écriture', async () => {
    const gh = fakeRemote();
    const tel = device(gh, { ...PRISTINE, xp: 100, quests: [quest('q1')] });
    await tel.sync();
    tel.edit(s => ({ ...s, xp: 110 }));
    gh.beforePut = () => gh.set({ ...gh.json(), xp: 100, quests: [quest('q1'), quest('qAutre')], _savedAt: 9 });
    const r = await tel.sync();
    expect(r.action).toBe('merged');
    expect(gh.json().quests.map(q => q.id)).toEqual(['q1', 'qAutre']);
    expect(gh.json().xp).toBe(110);
  });

  it('une modification faite pendant la synchronisation n’est pas perdue', async () => {
    const gh = fakeRemote();
    const tel = device(gh, { ...PRISTINE, xp: 100, quests: [quest('q1')] });
    await tel.sync();
    const pc = device(gh);
    await pc.sync();
    pc.edit(s => ({ ...s, xp: 200 }));
    await pc.sync();
    // pendant que le téléphone lit la sauvegarde en ligne, l’utilisateur saisit une séance
    const lire = gh.api.getFile;
    gh.api.getFile = async () => { const r = await lire(); gh.api.getFile = lire; tel.edit(s => ({ ...s, quests: [quest('q1', [entry('e7', '2026-10-07')])] })); return r; };
    await tel.sync();
    expect(tel.state.xp).toBe(200);
    expect(tel.state.quests[0].history.map(e => e.id)).toEqual(['e7']);
    expect(gh.json().quests[0].history.map(e => e.id)).toEqual(['e7']);
    expect(tel.dirty).toBe(false);
  });

  it('ne fait rien quand tout est à jour', async () => {
    const gh = fakeRemote();
    const tel = device(gh, { ...PRISTINE, xp: 1, quests: [quest('q1')] });
    await tel.sync();
    const puts = gh.puts;
    expect((await tel.sync()).action).toBe('none');
    expect(gh.puts).toBe(puts);
  });
});

describe('prénom', () => {
  it('un prénom vide ne remplace jamais un prénom donné, même sans état commun', async () => {
    const { mergeStates } = await import('./merge');
    expect(mergeStates(null, { heroName: '' }, { heroName: 'Léa' }, { preferLocal: true }).heroName).toBe('Léa');
    expect(mergeStates(null, { heroName: 'Léa' }, { heroName: '' }).heroName).toBe('Léa');
    expect(mergeStates(null, { heroName: 'Lélé' }, { heroName: 'Léa' }, { preferLocal: true }).heroName).toBe('Lélé');
  });
});
