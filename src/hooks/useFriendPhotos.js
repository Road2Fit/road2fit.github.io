// Photos entre amis (4.16, docs/supabase-photos-amis.sql) :
//  - ma DERNIÈRE photo de séance est envoyée aux amis seulement si je l'ai activé (gameState.friendsPhotoShare) ;
//  - je peux taguer un ami MUTUEL sur une de mes photos : elle apparaît dans ses Souvenirs (pastille tant qu'il ne les a pas ouverts).
import { useCallback, useEffect, useRef, useState } from 'react';
import { SUPABASE, supabaseReady } from '../config';
import { sharedPhotos } from '../sync/supabase';
import { usePhotos } from '../lib/photos';

/** Dernière photo (la plus récente par date, puis par heure de prise). */
export function latestPhoto(list) {
  return (list || []).filter(p => p && p.img && p.date).sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : a.date < b.date ? 1 : -1))[0] || null;
}

export function useFriendPhotos({ gameState, setGameState, user, enabled, activeTab }) {
  const cfg = SUPABASE;
  const on = supabaseReady(cfg) && !!user && !!enabled;
  const photos = usePhotos();

  // 1. ma dernière photo de séance, si je l'ai activé (sinon on la retire du serveur)
  const lastKey = useRef('');
  const share = !!gameState.friendsPhotoShare;
  useEffect(() => {
    if (!on) return;
    if (!share) {
      if (lastKey.current !== 'off') { lastKey.current = 'off'; sharedPhotos.removeLast(cfg).catch(() => { lastKey.current = ''; }); }
      return;
    }
    const last = latestPhoto(photos);
    if (!last) return;
    const key = `${last.id}:${last.updatedAt || last.createdAt || 0}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    sharedPhotos.putLast(cfg, { date: last.date, note: last.note || last.label || '', data: last.img }).catch(() => { lastKey.current = ''; });
  }, [on, share, photos, cfg]);

  // 2. photos où l'on m'a tagué (relues à l'ouverture, au retour sur l'appli et en ouvrant Souvenirs)
  const [tagged, setTagged] = useState([]);
  const refreshTagged = useCallback(async () => {
    if (!on) return;
    try {
      const rows = await sharedPhotos.taggedMe(cfg);
      setTagged(prev => (JSON.stringify(prev.map(r => r.id + r.created_at)) === JSON.stringify(rows.map(r => r.id + r.created_at)) ? prev : rows));
    } catch (e) { /* hors ligne ou pas encore installé : rien */ }
  }, [on, cfg]);
  useEffect(() => {
    if (!on) { setTagged([]); return undefined; }
    refreshTagged();
    const onFocus = () => { if (typeof document === 'undefined' || !document.hidden) refreshTagged(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => { document.removeEventListener('visibilitychange', onFocus); window.removeEventListener('focus', onFocus); };
  }, [on, refreshTagged]);
  const seenAt = gameState.taggedSeenAt || '';
  const unseen = tagged.filter(t => !seenAt || String(t.created_at) > seenAt).length;

  // 3. taguer : mes amis mutuels et les tags de mes photos (lus en ouvrant Souvenirs)
  const [mutual, setMutual] = useState([]);
  const [myTags, setMyTags] = useState({});
  useEffect(() => {
    if (!on || activeTab !== 'photos') return;
    refreshTagged();
    sharedPhotos.mutual(cfg).then(setMutual).catch(() => {});
    sharedPhotos.myTags(cfg).then(setMyTags).catch(() => {});
  }, [on, activeTab, cfg, refreshTagged]);
  // Souvenirs ouvert : les photos où l'on m'a tagué sont vues (la pastille disparaît)
  useEffect(() => {
    if (activeTab !== 'photos' || !unseen || !setGameState) return;
    const newest = tagged.reduce((m, t) => (String(t.created_at) > m ? String(t.created_at) : m), seenAt);
    setGameState(prev => ({ ...prev, taggedSeenAt: newest }));
  }, [activeTab, unseen, tagged, seenAt, setGameState]);

  const setTags = async (photo, ids) => {
    const clean = [...new Set(ids)].filter(id => mutual.includes(id));
    if (clean.length) await sharedPhotos.putTag(cfg, { photoId: photo.id, date: photo.date, note: photo.note || photo.label || '', data: photo.img, tagged: clean });
    else await sharedPhotos.removeTag(cfg, photo.id);
    setMyTags(prev => { const n = { ...prev }; if (clean.length) n[photo.id] = clean; else delete n[photo.id]; return n; });
  };
  const friendLast = userId => sharedPhotos.friendLast(cfg, userId);

  return { on, share, tagged, unseen, mutual, myTags, setTags, friendLast, refreshTagged };
}
