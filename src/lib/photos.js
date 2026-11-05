import { useEffect, useState } from 'react';

// ===== Souvenirs photo (stockés dans IndexedDB, hors sauvegarde principale) =====
// Chaque photo : { id, date, label, note, img (JPEG en base64), createdAt, updatedAt }.
// Elles sont sauvegardées dans le compte par sync/photoSync.js. Un petit index { id: updatedAt } est gardé dans
// localStorage pour que la synchro n'ait pas à relire toutes les images.
const INDEX_KEY = 'rondoufit:photoIdx';
const readIdx = () => { try { return JSON.parse(localStorage.getItem(INDEX_KEY) || 'null'); } catch (e) { return null; } };
const writeIdx = idx => { try { localStorage.setItem(INDEX_KEY, JSON.stringify(idx)); } catch (e) {} };
const DELETED_KEY = 'rondoufit:photoDeleted';
// 'rondoufit-photos' : l'affichage doit se rafraîchir ; 'rondoufit-photos-local' : l'utilisateur a changé quelque chose (à envoyer).
const notify = remote => {
  window.dispatchEvent(new Event('rondoufit-photos'));
  if (!remote) window.dispatchEvent(new Event('rondoufit-photos-local'));
};

export const PhotoDB = {
  _db: null,
  _mem: [],
  // index { id: updatedAt } refait d'après les photos vraiment présentes sur l'appareil (jamais d'après une copie gardée à part)
  async index() {
    const idx = {};
    for (const p of await this.all()) if (p && p.id && p.img) idx[p.id] = p.updatedAt || p.createdAt || 0;
    writeIdx(idx);
    return idx;
  },
  // photos supprimées volontairement sur cet appareil (seules celles-ci sont supprimées du serveur)
  deleted() { try { return JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'); } catch (e) { return []; } },
  forgetDeleted(id) { try { localStorage.setItem(DELETED_KEY, JSON.stringify(this.deleted().filter(x => x !== id))); } catch (e) { /* rien */ } },
  async get(id) {
    return (await this.all()).find(p => p.id === id) || null;
  },
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('rondoufit_photos', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
        r.onsuccess = () => { this._db = r.result; res(r.result); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async all() {
    try {
      const db = await this.open();
      return await new Promise((res, rej) => {
        const q = db.transaction('photos').objectStore('photos').getAll();
        q.onsuccess = () => res(q.result || []);
        q.onerror = () => rej(q.error);
      });
    } catch (e) { return this._mem.slice(); }
  },
  // remote = true : photo reçue de la sauvegarde en ligne (on garde sa date de modification et on ne la renvoie pas)
  async put(photo, { remote = false } = {}) {
    const p = remote ? photo : { ...photo, updatedAt: Date.now() };
    const idx = readIdx() || {};
    idx[p.id] = p.updatedAt || p.createdAt || 0;
    writeIdx(idx);
    try {
      const db = await this.open();
      await new Promise((res, rej) => {
        const t = db.transaction('photos', 'readwrite');
        t.objectStore('photos').put(p);
        t.oncomplete = res; t.onerror = () => rej(t.error);
      });
    } catch (e) { this._mem = this._mem.filter(x => x.id !== p.id).concat(p); }
    notify(remote);
  },
  async del(id, { remote = false } = {}) {
    if (!remote) { try { localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set([...this.deleted(), id])].slice(-200))); } catch (e) { /* rien */ } }
    const idx = readIdx() || {};
    delete idx[id];
    writeIdx(idx);
    try {
      const db = await this.open();
      await new Promise((res, rej) => {
        const t = db.transaction('photos', 'readwrite');
        t.objectStore('photos').delete(id);
        t.oncomplete = res; t.onerror = () => rej(t.error);
      });
    } catch (e) { this._mem = this._mem.filter(x => x.id !== id); }
    notify(remote);
  }
};

export function usePhotos() {
  const [list, setList] = useState([]);
  useEffect(() => {
    let ok = true;
    const load = () => PhotoDB.all().then(a => { if (ok) setList(a); });
    load();
    window.addEventListener('rondoufit-photos', load);
    return () => { ok = false; window.removeEventListener('rondoufit-photos', load); };
  }, []);
  return list;
}

// Réduit la photo (≈ 900 px, JPEG) pour qu'elle reste légère.
function compressImage(file, maxSide = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}

export async function addPhotoFile(file, date, label) {
  const img = await compressImage(file);
  const p = { id: 'ph_' + Date.now() + '_' + Math.floor(Math.random() * 1000), date, label: label || '', note: '', img, createdAt: Date.now() };
  await PhotoDB.put(p);
  return p;
}
