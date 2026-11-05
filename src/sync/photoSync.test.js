import { describe, expect, it } from 'vitest';
import { syncPhotos } from './photoSync';

// ── Faux serveur de photos ─────────────────────────────────────────────────────────
function fakeRepo() {
  const files = new Map();
  let n = 0;
  return {
    files,
    api: {
      async listDir() { return [...files.entries()].map(([p, f]) => ({ name: p.replace('photos/', ''), sha: f.sha })); },
      async getFile(cfg) { const f = files.get(cfg.path); return f ? { content: f.content, sha: f.sha } : { content: null, sha: null }; },
      async putFile(cfg, content, sha) {
        const cur = files.get(cfg.path);
        if ((cur ? cur.sha : null) !== (sha || null)) throw new Error('conflit');
        files.set(cfg.path, { content, sha: 'sha' + ++n });
        return 'sha' + n;
      },
      async deleteFile(cfg, sha) {
        const cur = files.get(cfg.path);
        if (!cur || cur.sha !== sha) throw new Error('conflit');
        files.delete(cfg.path);
      },
    },
  };
}

let clock = 1000; // horloge commune aux faux appareils
// ── Faux appareil : photos en mémoire + mémoire de synchro ──────────────────────────────────────
function device(repo, { meta = null } = {}) {
  const photos = new Map();
  let m = meta;
  const d = {
    photos,
    get meta() { return m; },
    /** L'utilisateur ajoute / modifie une photo. */
    add(id, extra = {}) { photos.set(id, { id, date: '2026-10-21', label: '', note: '', img: 'data:image/jpeg;base64,AAAA', createdAt: 1, ...extra, updatedAt: ++clock }); },
    remove(id) { photos.delete(id); },
    sync() {
      return syncPhotos({ owner: 'a', repo: 'b', path: 'x.json', branch: 'main', token: 't' }, {
        api: repo.api,
        local: {
          index: async () => Object.fromEntries([...photos].map(([id, p]) => [id, p.updatedAt])),
          get: async id => photos.get(id) || null,
          put: async p => { photos.set(p.id, p); },
          del: async id => { photos.delete(id); },
        },
        getMeta: () => m,
        setMeta: x => { m = JSON.parse(JSON.stringify(x)); },
      });
    },
  };
  return d;
}

describe('synchronisation des photos', () => {
  it('envoie les nouvelles photos puis les autres appareils les reprennent', async () => {
    const repo = fakeRepo();
    const tel = device(repo);
    tel.add('ph_1'); tel.add('ph_2');
    expect(await tel.sync()).toMatchObject({ up: 2, down: 0 });
    expect([...repo.files.keys()].sort()).toEqual(['photos/ph_1.json', 'photos/ph_2.json']);
    const pc = device(repo);
    expect(await pc.sync()).toMatchObject({ up: 0, down: 2 });
    expect([...pc.photos.keys()].sort()).toEqual(['ph_1', 'ph_2']);
    expect(pc.photos.get('ph_1').img).toBe('data:image/jpeg;base64,AAAA');
    expect(await pc.sync()).toEqual({ up: 0, down: 0, removedLocal: 0, removedRemote: 0 }); // plus rien à faire
  });

  it('propage une suppression dans les deux sens', async () => {
    const repo = fakeRepo();
    const tel = device(repo); const pc = device(repo);
    tel.add('ph_1'); tel.add('ph_2');
    await tel.sync(); await pc.sync();
    tel.remove('ph_1');
    expect(await tel.sync()).toMatchObject({ removedRemote: 1 });
    expect(repo.files.has('photos/ph_1.json')).toBe(false);
    expect(await pc.sync()).toMatchObject({ removedLocal: 1 });
    expect([...pc.photos.keys()]).toEqual(['ph_2']);
  });

  it('propage la modification d’une note', async () => {
    const repo = fakeRepo();
    const tel = device(repo); const pc = device(repo);
    tel.add('ph_1'); await tel.sync(); await pc.sync();
    pc.add('ph_1', { note: 'Belle séance' }); // même id : modification
    expect(await pc.sync()).toMatchObject({ up: 1 });
    expect(await tel.sync()).toMatchObject({ down: 1 });
    expect(tel.photos.get('ph_1').note).toBe('Belle séance');
  });

  it('modifiée des deux côtés : la plus récente gagne', async () => {
    const repo = fakeRepo();
    const tel = device(repo); const pc = device(repo);
    tel.add('ph_1'); await tel.sync(); await pc.sync();
    tel.add('ph_1', { note: 'tel' });
    pc.add('ph_1', { note: 'pc (plus récent)' });
    pc.photos.get('ph_1').updatedAt = 99999;
    await tel.sync(); // le téléphone part d'abord… mais sa version est plus ancienne que celle du PC
    await pc.sync();
    await tel.sync();
    expect(tel.photos.get('ph_1').note).toBe('pc (plus récent)');
    expect(JSON.parse(repo.files.get('photos/ph_1.json').content).note).toBe('pc (plus récent)');
  });

  it('un appareil neuf ne supprime jamais rien', async () => {
    const repo = fakeRepo();
    const tel = device(repo); tel.add('ph_1'); await tel.sync();
    const neuf = device(repo);
    await neuf.sync();
    expect(repo.files.size).toBe(1);
    expect(neuf.photos.size).toBe(1);
  });

  it('photos de l’appareil disparues d’un coup (navigateur vidé) : on les retélécharge, le serveur n’est pas touché', async () => {
    const repo = fakeRepo();
    const tel = device(repo); tel.add('ph_1'); tel.add('ph_2'); await tel.sync();
    tel.photos.clear(); // stockage vidé, mais la mémoire de synchro a survécu
    const r = await tel.sync();
    expect(r).toMatchObject({ removedRemote: 0, down: 2 });
    expect(repo.files.size).toBe(2);
    expect(tel.photos.size).toBe(2);
  });

  it('une photo d’un autre appareil déjà présente ici (mémoire perdue) n’est pas dupliquée ni écrasée', async () => {
    const repo = fakeRepo();
    const tel = device(repo); tel.add('ph_1'); await tel.sync();
    const pc = device(repo);
    pc.photos.set('ph_1', { ...tel.photos.get('ph_1') }); // même photo, même date de modification
    const r = await pc.sync();
    expect(r).toMatchObject({ up: 0, down: 0 });
    expect(pc.meta.ph_1.sha).toBe(repo.files.get('photos/ph_1.json').sha);
  });

  it('ignore un fichier abîmé sans bloquer les autres photos', async () => {
    const repo = fakeRepo();
    repo.files.set('photos/ph_x.json', { content: '{ pas du json', sha: 'shaX' });
    const tel = device(repo); tel.add('ph_ok');
    await tel.sync();
    expect(tel.photos.has('ph_ok')).toBe(true);
    expect(repo.files.has('photos/ph_ok.json')).toBe(true);
  });
});

describe('photos perdues par le navigateur (cas réel du 05/11/2026)', () => {
  // appareil réel : l'index des photos peut être faux, la liste des suppressions volontaires est tenue à part
  function realDevice(repo) {
    const photos = new Map();
    const deleted = new Set();
    let m = null;
    return {
      photos, deleted,
      add(id) { photos.set(id, { id, date: '2026-10-21', img: 'data:image/jpeg;base64,AAAA', createdAt: 1, updatedAt: ++clock }); },
      userDelete(id) { photos.delete(id); deleted.add(id); },
      lose(id) { photos.delete(id); }, // le navigateur a vidé l'image
      sync() {
        return syncPhotos({}, {
          api: repo.api,
          local: {
            index: async () => Object.fromEntries([...photos].map(([id, p]) => [id, p.updatedAt])),
            get: async id => photos.get(id) || null,
            put: async p => { photos.set(p.id, p); },
            del: async id => { photos.delete(id); },
            deleted: async () => [...deleted],
            forgetDeleted: id => { deleted.delete(id); },
          },
          getMeta: () => m,
          setMeta: x => { m = JSON.parse(JSON.stringify(x)); },
        });
      },
    };
  }

  it('anciennes photos perdues + une nouvelle prise aujourd’hui : rien n’est supprimé du serveur, tout revient', async () => {
    const repo = fakeRepo();
    const tel = realDevice(repo);
    ['ph_a', 'ph_b', 'ph_c', 'ph_d'].forEach(id => tel.add(id));
    await tel.sync();
    ['ph_a', 'ph_b', 'ph_c', 'ph_d'].forEach(id => tel.lose(id));
    tel.add('ph_today');
    const r = await tel.sync();
    expect(r.removedRemote).toBe(0);
    expect(repo.files.size).toBe(5);
    expect([...tel.photos.keys()].sort()).toEqual(['ph_a', 'ph_b', 'ph_c', 'ph_d', 'ph_today']);
  });

  it('une photo supprimée volontairement l’est aussi sur le serveur', async () => {
    const repo = fakeRepo();
    const tel = realDevice(repo);
    tel.add('ph_a'); tel.add('ph_b');
    await tel.sync();
    tel.userDelete('ph_a');
    expect(await tel.sync()).toMatchObject({ removedRemote: 1 });
    expect(repo.files.has('photos/ph_a.json')).toBe(false);
    expect(tel.deleted.size).toBe(0);
  });
});
