// Synchronisation des photos souvenirs : un fichier `photos/<id>.json` par photo dans le compte de données.
// Aucune dépendance à React ni au navigateur : tout passe par `ports` (voir les tests).
//
// Pour chaque photo, on compare trois choses : cet appareil, le serveur, et l'état de la dernière synchronisation (`meta`).
//  - nouvelle ici ou là-bas → copiée de l'autre côté ;
//  - modifiée d'un seul côté → copiée ; des deux côtés → la plus récente gagne ;
//  - supprimée d'un côté (elle était connue à la dernière synchro) → supprimée aussi de l'autre.
// Sécurités : un appareil neuf (sans photo ni mémoire de synchro) ne supprime jamais rien ;
// si les photos de l'appareil ont disparu d'un coup (navigateur vidé), on les retélécharge au lieu de les supprimer sur le serveur ;
// avec `local.deleted()` (liste des photos supprimées volontairement ici), seule une photo de cette liste est supprimée du
// serveur : une photo perdue par le navigateur, même si d'autres restent ou si une nouvelle a été prise, est retéléchargée.

const DIR = 'photos';

const fileOf = id => `${DIR}/${id}.json`;
const idOf = name => (name.endsWith('.json') ? name.slice(0, -5) : null);

/**
 * @param cfg   réglages le serveur { owner, repo, path, branch, token }
 * @param ports {
 *   api:   { listDir(cfg, dir), getFile(cfg), putFile(cfg, content, sha, message), deleteFile(cfg, sha, message) },
 *   local: { index() -> { id: updatedAt }, get(id) -> photo, put(photo), del(id) }   (put/del ne déclenchent pas d'envoi),
 *   getMeta() -> { id: { sha, at } } | null, setMeta(meta),
 * }
 * @returns {Promise<{ up: number, down: number, removedLocal: number, removedRemote: number }>}
 */
export async function syncPhotos(cfg, ports) {
  const stats = { up: 0, down: 0, removedLocal: 0, removedRemote: 0 };
  const remoteFiles = await ports.api.listDir(cfg, DIR);
  const remote = new Map();
  for (const f of remoteFiles) {
    const id = idOf(f.name);
    if (id) remote.set(id, f.sha);
  }
  const localIdx = await ports.local.index();
  let meta = ports.getMeta() || {};

  // Photos de l'appareil disparues d'un coup alors qu'on en connaissait beaucoup : stockage vidé, pas suppression voulue.
  if (Object.keys(localIdx).length === 0 && Object.keys(meta).length > 0) meta = {};

  const deletedSet = ports.local.deleted ? new Set(await ports.local.deleted()) : null;
  const save = () => ports.setMeta(meta);
  const cfgFor = id => ({ ...cfg, path: fileOf(id) });
  const download = async id => {
    const r = await ports.api.getFile(cfgFor(id));
    if (!r.content) return null;
    try {
      const p = JSON.parse(r.content);
      return p && p.id && p.img ? { photo: p, sha: r.sha } : null;
    } catch {
      return null; // fichier abîmé : on l'ignore plutôt que de tout bloquer
    }
  };
  const upload = async (id, sha) => {
    const photo = await ports.local.get(id);
    if (!photo) return;
    const newSha = await ports.api.putFile(cfgFor(id), JSON.stringify(photo), sha || null, `Photo du ${photo.date}`);
    meta[id] = { sha: newSha, at: photo.updatedAt || photo.createdAt || 0 };
    save();
    stats.up++;
  };
  const adopt = async (id, got) => {
    await ports.local.put(got.photo);
    meta[id] = { sha: got.sha, at: got.photo.updatedAt || got.photo.createdAt || 0 };
    save();
    stats.down++;
  };

  const ids = new Set([...Object.keys(localIdx), ...remote.keys()]);
  for (const id of ids) {
    const inLocal = id in localIdx;
    const inRemote = remote.has(id);
    const m = meta[id];
    if (inLocal && inRemote) {
      const remoteSha = remote.get(id);
      if (m && m.sha === remoteSha && localIdx[id] <= m.at) continue; // rien de neuf
      if (m && m.sha === remoteSha) { await upload(id, remoteSha); continue; } // modifiée ici seulement
      const got = await download(id);
      if (!got) { await upload(id, remoteSha); continue; }
      const remoteAt = got.photo.updatedAt || got.photo.createdAt || 0;
      const localAt = localIdx[id];
      if (m && localAt <= m.at) await adopt(id, got); // modifiée sur le serveur seulement
      else if (remoteAt > localAt) await adopt(id, got); // modifiée des deux côtés (ou historique inconnu) : la plus récente gagne
      else if (!m && remoteAt === localAt) { meta[id] = { sha: got.sha, at: localAt }; save(); } // même photo des deux côtés
      else await upload(id, remoteSha);
    } else if (inLocal) {
      if (m) {
        await ports.local.del(id); // supprimée sur le serveur depuis la dernière synchro
        delete meta[id];
        save();
        stats.removedLocal++;
      } else {
        await upload(id, null); // nouvelle photo
      }
    } else if (inRemote) {
      // absente d'ici : supprimée volontairement (liste des suppressions) → on la supprime du serveur ;
      // sinon le navigateur a perdu l'image → on la retélécharge (jamais de perte)
      const userDeleted = deletedSet ? deletedSet.has(id) : !!m;
      if (m && userDeleted) {
        await ports.api.deleteFile(cfgFor(id), remote.get(id), 'Photo supprimée'); // supprimée ici
        if (ports.local.forgetDeleted) ports.local.forgetDeleted(id);
        delete meta[id];
        save();
        stats.removedRemote++;
      } else {
        const got = await download(id); // nouvelle photo d'un autre appareil
        if (got) await adopt(id, got);
      }
    }
  }
  // Mémoire des photos qui n'existent plus nulle part
  for (const id of Object.keys(meta)) if (!ids.has(id)) delete meta[id];
  save();
  return stats;
}
